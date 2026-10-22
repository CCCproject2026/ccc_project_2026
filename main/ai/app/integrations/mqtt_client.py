"""MQTT 通信管理（未実装）。

TLS 接続、購読、再接続、接続世代、Publish 完了を管理する。
callback は受信サイズを検査し、受信情報を bounded Queue へ非ブロッキング投入する。
HTTP 呼出し・推論・送達待機は callback 内で行わない。
"""
