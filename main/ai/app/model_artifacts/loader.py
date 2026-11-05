"""受領後に使用するstate_dictのCPU loader。学習・推論確認は行わない。"""

import hashlib
import re
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def verified_artifact(path: str | Path, *, expected_sha256: str):
    """固定したSHA-256に一致するファイルだけをloaderへ渡す。"""
    if not isinstance(expected_sha256, str) or not re.fullmatch(
        r"[0-9a-f]{64}", expected_sha256
    ):
        raise ValueError("artifact SHA-256 is required")

    # 同じファイル記述子を巻き戻し、検査後のpath差し替えを避ける。
    with Path(path).open("rb") as source:
        actual = hashlib.file_digest(source, "sha256").hexdigest()
        if actual != expected_sha256:
            raise ValueError("artifact SHA-256 mismatch")
        source.seek(0)
        yield source


def load_model(path: str | Path, *, expected_sha256: str):
    """CPUで厳密にロードする。既知出力の再現性は別途確認する。"""
    with verified_artifact(path, expected_sha256=expected_sha256) as source:

        # 未接続の入力サーバーにPyTorch依存を要求しない。
        import torch

        from app.model_artifacts.conv1d import Conv1DNet

        state_dict = torch.load(source, map_location="cpu", weights_only=True)
        model = Conv1DNet().to("cpu")
        model.load_state_dict(state_dict, strict=True)
        if any(
            not torch.isfinite(value).all().item()
            for value in model.state_dict().values()
        ):
            raise ValueError("model_weights_nonfinite")
        model.eval()
        return model
