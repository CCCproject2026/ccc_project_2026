"""受領済みモデルのCPU推論。Device・時系列・送達の判定は呼出元が担う。"""

import json
from dataclasses import dataclass
from pathlib import Path

import torch

from app.core.config import Settings
from app.model_artifacts.loader import load_model
from app.processing.preprocessing import FEATURE_ORDER, WindowPreprocessor

AI_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = AI_ROOT / "artifacts/model_manifest.json"


@dataclass(frozen=True, slots=True)
class Prediction:
    p_fall: float
    result: str
    model_version: str


class InferenceEngine:
    def __init__(self, model, preprocessor: WindowPreprocessor, version: str):
        self.model = model
        self.preprocessor = preprocessor
        self.model_version = version

    @classmethod
    def load(cls, settings: Settings):
        """MQTT開始前に一度だけロード。不一致・欠落は起動失敗とする。"""
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        version = manifest["model_version"]
        if not isinstance(version, str) or not version:
            raise ValueError("model_version_missing")
        if settings.model_version and settings.model_version != version:
            raise ValueError("model_version_mismatch")
        inp, out = manifest["input"], manifest["output"]
        if (
            manifest["manifest_version"] != 1
            or inp["raw_window_shape"] != [100, 6]
            or inp["feature_order"] != list(FEATURE_ORDER)
            or inp["units_from_provider_code"] != ["g"] * 3 + ["deg/s"] * 3
            or inp["tensor_shape"] != [1, 6, 100]
            or inp["tensor_layout"] != "NCL"
            or inp["tensor_dtype"] != "float32"
            or inp["raw_dtype"] != "float32"
            or inp["sampling_rate_hz"] != settings.sampling_rate
            or inp["window_size"] != settings.window_size
            or out["shape"] != [1, 1]
            or out["kind"] != "binary_fall_logit"
            or out["dtype_expected"] != "float32"
            or out["labels"] != {"0": "normal", "1": "fall"}
            or out["fall_label"] != 1
            or out["fall_output_index"] != 0
            or out["probability_transform"] != "sigmoid_once"
            or out["threshold"] != settings.inference_threshold
            or out["comparison"] != ">="
        ):
            raise ValueError("model_contract_mismatch")
        if (
            manifest["artifacts"]["model"]["format_from_provider_code"]
            != "pytorch_state_dict"
            or manifest["artifacts"]["scaler"]["format_from_provider_code"] != "joblib"
            or manifest["artifacts"]["model_class"]["symbol"] != "Conv1DNet"
        ):
            raise ValueError("model_artifact_format")

        def artifact(name, override):
            entry = manifest["artifacts"][name]
            path = Path(override or entry["path"])
            if not path.is_absolute():
                path = AI_ROOT / path
            return path, entry["sha256"]

        model_path, model_hash = artifact("model", settings.model_path)
        scaler_path, scaler_hash = artifact("scaler", settings.scaler_path)
        model = load_model(model_path, expected_sha256=model_hash)
        preprocessor = WindowPreprocessor.load(scaler_path, expected_sha256=scaler_hash)
        return cls(model, preprocessor, version)

    def predict(self, values) -> Prediction:
        """検証済み50Hz・物理単位の100×6 Windowを受け取る。"""
        tensor = self.preprocessor.transform(values)
        with torch.inference_mode():
            output = self.model(tensor)
            if (
                not isinstance(output, torch.Tensor)
                or tuple(output.shape) != (1, 1)
                or output.dtype != torch.float32
                or not torch.isfinite(output).all().item()
            ):
                raise ValueError("model_output_invalid")
            probability = torch.sigmoid(output)[0, 0].item()
        if not 0.0 <= probability <= 1.0:
            raise ValueError("model_probability_invalid")
        return Prediction(
            p_fall=probability,
            result="fall" if probability >= 0.5 else "normal",
            model_version=self.model_version,
        )
