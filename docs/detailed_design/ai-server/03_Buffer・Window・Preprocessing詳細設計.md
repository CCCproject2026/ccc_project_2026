# 03 Buffer・Window・Preprocessing 詳細設計

## 1. Buffer契約

`BufferManager`は`dict[device_code, DeviceBuffer]`を持つ。各DeviceBufferは`deque(maxlen=100)`、直前計測時刻、最後の有効受信monotonic時刻、連続区間内の受付点数、次のWindow生成点数を持つ。Workerだけが更新する。UNKNOWN/INACTIVEをキー登録の契機にしない。

```text
ESP32-001 → Buffer[ESP32-001] → Window[ESP32-001]
ESP32-002 → Buffer[ESP32-002] → Window[ESP32-002]
```

将来のデバイスを分離できるが、今回の性能保証は1台のみ。内部安全上限128 Buffer、OFFLINE時に削除。上限到達時は新規Deviceを拒否しログを出す。生データはRAMのみ、再起動後は空から蓄積する。

関数契約:

| 関数 | 入力 | 出力・副作用 |
|---|---|---|
| `append(sample)` | 検証済み・ACTIVE・鮮度内サンプル | 必要点数未満はNone、到達時はWindowのコピー |
| `reset(device_code, reason)` | デバイス・理由 | deque、時刻、点数を削除 |
| `reset_all(reason)` | MQTT切断・Queue欠落等 | 全Window連続性を無効化 |
| `expire(now_mono)` | monotonic時刻 | OFFLINE対象を削除し状態変更を記録 |

## 2. 時系列の有効性

50Hzの公称間隔は20ms。100点の先頭と末尾の差は理想的に1.98秒であり、100/50=2秒というWindowの名目長と区別する。100点あるだけでは50Hzの条件を満たしたと判断しない。

| 条件 | 処理方針 | 数値・契約 |
|---|---|---|
| 同じdevice・同じmeasured_at | 重複として破棄。点数を増やさない | 同一timestamp内に複数サンプルを作らないことをIoTと確認 |
| measured_atが過去へ逆行 | Bufferをresetし該当点を破棄、次の新鮮な点から再開 | 並べ替え・過去点の挿入はしない |
| 前点からの時間差が許容外 | reset後、現在の新鮮な点を最初の点として採用 | 許容間隔 `[TBD]`、候補10〜30ms |
| 受信時点で古い／未来過ぎる | 破棄、既知Deviceならreset | 最大遅延 `[TBD]` 推奨2秒、未来許容 `[TBD]` 推奨1秒 |
| Worker待機／API待機で古くなった | 破棄・reset | 処理時にも同じ鮮度を検査 |
| Window全体の時刻幅が不適合 | Windowを出さずreset | `[TBD]`、候補1.98秒±0.10秒 |
| Schema不正・欠測 | 不正点を破棄。codeを安全に特定できればreset | code不明では次の間隔検査で欠落を検出 |
| MQTT切断／Queue満杯／Device無効化 | 対象または全Bufferをreset | 異なる連続区間を連結しない |

上の数値は端末の時刻精度・NTP同期・ネットワーク遅延の測定で合意する候補であり、基本設計の確定仕様ではない。補間、再サンプリング、padding、欠測ゼロ埋め、異常値clip、平滑化、重力除去、軸回転は追加しない。これらが既存の学習前処理に含まれる場合は確認事項として契約を修正する。

## 3. Window Size / Step

確定前提: 50Hz、Window Size=100、6 axes。`WINDOW_STEP`は`[TBD]`。

| 候補 | 最初のWindow | 以降の周期 | overlap | 推論負荷 | 評価 |
|---|---|---|---|---|---|
| Step 100 | 約2秒後 | 約2秒 | なし | 約0.5回/秒/台 | 最小負荷、境界付近の動作を跨ぎにくい |
| Step 50 | 約2秒後 | 約1秒 | 50% | 約1回/秒/台 | 結果更新が速いが同一動作を複数判定し得る |

推奨案はStep 50。CPUでの実測と、同じ転倒の複数WindowをWebでどう扱うかの合意を条件とする。精度改善を保証する選択ではない。未合意のままデフォルトで確定せず、環境設定で選択する。Step 100も実装・試験可能とする。

```text
reset: accepted_count=0, next_emit=100, deque.clear()
valid sample:
  deque.append(sample); accepted_count += 1
  if accepted_count == next_emit:
    window = immutable copy of last 100 samples
    next_emit += WINDOW_STEP
    return window
```

例: Step 50は1〜100、51〜150、101〜200点を出力。Step 100は1〜100、101〜200点。推論やPublish失敗で点数を巻き戻さず、同じWindowを再生成しない。Windowはdevice_code、開始／終了計測時刻、float配列(100,6)、接続世代を持つ。

## 4. Feature order・Shape

| 段階 | Shape / dtype | 条件 |
|---|---|---|
| 1点 | `(6,)`、finite numeric | 候補順はacc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z |
| Window | `(100,6)`、NumPy numeric | 時間昇順。行=time、列=feature |
| Scaler入力 | `(100,6)`を候補 | 既存Scalerが6 featuresを学習している場合のみ |
| Scaler出力 | `(100,6)`を候補 | 欠損・非有限値・shape変化を拒否 |
| Tensor | 例`(1,6,100)`、contiguous、float32 | 既存モデルが`[batch,channels,sequence]`を要求する場合のみ |

Feature order、単位、軸向き、dtype、Tensor layoutの正本は既存学習・推論実装であり、上表は実物未確認の候補。例えば`(1,100,6)`を要求するモデルへ勝手にtransposeしない。`.pth`の拡張子や「1D-CNN」という名称だけからshapeを断定しない。

## 5. 既存StandardScaler

| 項目 | 設計 |
|---|---|
| scaler file | `SCALER_PATH`から取得。`scaler.pkl`は仮名、ファイル名・joblib/pickle等の保存形式 `[TBD]` |
| loading | 起動時1回。提供者の保存形式と同じloader・互換versionを使用 |
| fit禁止 | `fit` / `fit_transform` / `partial_fit`を呼ばず、受信データで統計を更新しない |
| feature order | 提供時の順序と完全一致。`feature_names_in_`があれば照合、なければ対応表で確認 |
| transform | 原則Window全行に一括`scaler.transform(X)`。学習時の`with_mean`・`with_std`を保持 |
| shape conversion | scaler変換後に既存実装のdtypeへ変換し、軸入替えとbatch付与を行う |
| version対応 | model_versionとモデル／Scalerのhash・学習時ライブラリversionを同じ対応表で固定 |
| loading failure | 不在、破損、未fit、型不正、互換性不明、不一致は起動失敗・非Ready |

`n_features_in_`、学習済み属性、変換結果のshape・有限性を検査する。`with_mean=False`等では属性がNoneになり得るので、属性の存在だけで不正と判定しない。`StandardScaler`のtransform契約は[公式仕様](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html)を参照する。

既存Scalerがflatten済み600特徴や別の変換単位を要求する場合、6特徴Scalerへ作り直さない。既存前処理を照合し、本書の候補shapeを更新するまでReadyにしない。shapeが一致してもFeatureの意味や単位の一致は証明できないため、04の既知入力・期待変換結果を併用する。

候補契約が実物で確認できた場合の処理例:

```python
# 実物が「6特徴Scaler + float32 / NCL」を要求すると確認した場合のみ
x = np.asarray(window.values)             # (100, 6)
scaled = scaler.transform(x)               # (100, 6); fitしない
assert scaled.shape == (100, 6)
assert np.isfinite(scaled).all()
x32 = np.asarray(scaled, dtype=np.float32)
assert np.isfinite(x32).all()               # cast時のoverflowも検査
tensor = torch.from_numpy(x32.T.copy()).unsqueeze(0)  # (1, 6, 100)
```
