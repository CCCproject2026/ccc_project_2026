"""デバイスの稼働可否管理（未実装）。

device_code を使って Web の Device API を HTTPS で参照する。
最小限のキャッシュを管理し、ACTIVE / INACTIVE / UNKNOWN を返す。
API 障害と復旧状態を稼働判定へ通知する。
"""
