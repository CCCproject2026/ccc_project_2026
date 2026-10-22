"""デバイス別の時系列 Buffer 管理（未実装）。

SensorSample の連続区間を保持し、100 点・6 軸の immutable Window を返す。
点数不足では Window を返さず、欠落や切断を跨いだ Window は生成しない。
受信 Queue とは別に、単一 Pipeline Worker がこの状態を管理する。
"""
