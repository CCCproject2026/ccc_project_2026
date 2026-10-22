"""推論前処理（未実装）。

既存モデルに対応する StandardScaler を起動時に一度読み込む。
Window (100, 6) に既存 Scaler の transform を適用し、学習時の
Feature 順・単位・dtype・形状に合う Tensor へ整形する。再学習は行わない。
"""
