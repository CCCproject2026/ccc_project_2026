"""推論結果の生成と送信要求（未実装）。

判定、device_code、Window 時刻から契約に沿った結果 JSON を生成し、
mqtt_client に Publish を要求する。DB 保存、Alert 管理、Alarm 制御は
担当せず、Web 側の責務とする。
"""
