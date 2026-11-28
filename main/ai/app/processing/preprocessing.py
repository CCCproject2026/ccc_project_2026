"""学習済み6特徴ScalerによるWindowの標準化。再fitや補間はしない。"""

import warnings
from pathlib import Path

import joblib
import numpy as np
import torch
from sklearn.exceptions import InconsistentVersionWarning
from sklearn.preprocessing import StandardScaler
from sklearn.utils.validation import check_is_fitted

from app.model_artifacts.loader import verified_artifact

FEATURE_ORDER = ("ax", "ay", "az", "gx", "gy", "gz")


class WindowPreprocessor:
    def __init__(self, scaler: StandardScaler) -> None:
        if type(scaler) is not StandardScaler:
            raise ValueError("scaler_type")
        check_is_fitted(scaler)
        if scaler.n_features_in_ != 6:
            raise ValueError("scaler_feature_count")
        names = getattr(scaler, "feature_names_in_", None)
        if names is not None and tuple(names) != FEATURE_ORDER:
            raise ValueError("scaler_feature_order")
        if not scaler.with_mean or not scaler.with_std:
            # 提供コードはStandardScaler()。別設定はこの成果物組の契約外。
            raise ValueError("scaler_configuration")
        for name in ("mean_", "var_", "scale_"):
            values = np.asarray(getattr(scaler, name))
            if values.shape != (6,) or not np.isfinite(values).all():
                raise ValueError("scaler_statistics")
        if (scaler.var_ < 0).any() or (scaler.scale_ <= 0).any():
            raise ValueError("scaler_statistics")
        seen = np.asarray(scaler.n_samples_seen_)
        if seen.shape not in ((), (6,)) or not np.isfinite(seen).all():
            raise ValueError("scaler_sample_count")
        if (seen <= 0).any():
            raise ValueError("scaler_sample_count")
        self.scaler = scaler

    @classmethod
    def load(cls, path: str | Path, *, expected_sha256: str):
        # ユーザーが配置した信頼済み成果物だけをhash照合後に復元する。
        with verified_artifact(path, expected_sha256=expected_sha256) as source:
            with warnings.catch_warnings():
                warnings.simplefilter("error", InconsistentVersionWarning)
                scaler = joblib.load(source)
        return cls(scaler)

    def transform(self, values) -> torch.Tensor:
        window = np.asarray(values)
        if window.shape != (100, 6) or window.dtype.kind not in "iuf":
            raise ValueError("window_shape_or_dtype")
        if not np.isfinite(window).all():
            raise ValueError("window_nonfinite")
        # 学習コードと同様、transform前もfloat32にする。
        with np.errstate(over="ignore", invalid="ignore"):
            window = np.array(window, dtype=np.float32, copy=True)
        if not np.isfinite(window).all():
            raise ValueError("window_float32_overflow")
        scaled = self.scaler.transform(window)
        if scaled.shape != (100, 6) or not np.isfinite(scaled).all():
            raise ValueError("scaled_window_invalid")
        with np.errstate(over="ignore", invalid="ignore"):
            scaled = np.asarray(scaled, dtype=np.float32)
        if not np.isfinite(scaled).all():
            raise ValueError("scaled_float32_overflow")
        # 行=time、列=featureからNCLへ。元のWindowは変更しない。
        return torch.from_numpy(np.ascontiguousarray(scaled.T)).unsqueeze(0)
