# AI-04 モデル・Scaler受領契約

対象: [Issue #189](https://github.com/CCCproject2026/ccc_project_2026/issues/189)。更新日: 2026-11-06。

提供者のコードと、ユーザーが配置した `sisfall_model/best_1dcnn_pytorch.pth` / `scaler.pkl` を受領済み。
SHA-256・保存形式のメタデータを取得し、manifestへ記録した。学習・推論・テストは実行していない。
既知入出力・許容誤差・学習runtimeの全versionは未受領のため、**AI-04の再現性確認は未完了**。

## 実装済みの読込・推論経路

`core/lifespan.py` → `InferenceEngine.load()` → manifest検証 → モデル/Scalerのhash照合・ロード → MQTT受付開始。
モデル・Scalerのロード失敗は起動失敗とし、`MODEL_LOAD_FAILED` を記録する。
起動時の生成物は `Runtime.inference` が所有する。HTTPの推論Endpointは追加しない。

後続の単一Workerから呼ぶ処理は `Runtime.inference.predict(window_values)`。
`processing/preprocessing.py` で100×6・数値型・有限性を確認し、float32化、既存Scalerのtransform、
contiguousな `(1,6,100)` Tensor化を行う。`processing/inference.py` はinference_mode内でモデルを実行し、
float32の `(1,1)` logitを検証してsigmoidを1回適用する。0.5以上をfallとし、NaNや不正shapeをnormalに変換しない。
補間・再fit・重力除去・単位変換・再学習は行わない。

2026-11-07: 入力WorkerへDevice確認（設定時）・Window連続性・結果送信を接続した。
Device API未設定時の実行はローカル推論扱いであり、既知入出力による互換性確認とは区別する。
`/health/ready` は503を維持し、`model_loaded`、`model_version`、`model_compatibility_verified=false` を返す。
既知入力が未受領のため、設計04の起動時既知入力確認も未実施。ロード成功は互換性確認済みを意味しない。

## 追加したコードと成果物

- [Conv1DNet](../app/model_artifacts/conv1d.py): 提供クラスを抽出。層順・引数・forward・state_dictキーを維持し、importと書式のみ整理。学習ループは含まない。
- [CPU loader](../app/model_artifacts/loader.py): プロジェクト側の読込adapter。ユーザー配置ファイルから固定したSHA-256を必須とし、`map_location="cpu"`、`weights_only=True`、`strict=True`、`eval()`でロード。不一致時は例外とし、unsafe/非strict読込へfallbackしない。
- [model_manifest.json](model_manifest.json): 提供コードから確定できる仕様、成果物・ソースhash、未受領項目、後続の阻害条件を記録。
- [provider](provider/): Issueコメント原文の保存。`.txt`で保管し、自動実行しない。学習・評価コードは参照専用。
- [known_io.template.json](fixtures/known_io.template.json): 提供者が埋める入出力の形式。期待値は未受領のためnull。実fixtureではない。

loader成功だけでScalerとの対応や意味的互換性は証明できない。
今回のhashはユーザーが配置したファイルを固定するための値であり、提供者の別経路の署名・hash照合ではない。
model_versionは2ファイルのhashから作成したローカル識別子で、提供者のrelease名ではない。

scikit-learnはファイル内のversionに合わせ1.6.1へ固定。その他は導入候補環境を `uv.lock` に固定した。
NumPyは2.x（2.3未満）、Linux/WindowsのPyTorchは公式CPU配布を使い、CUDA runtimeを導入しない。
学習環境との一致は未確認であり、version情報受領後に更新する。
[scikit-learnの保存形式と互換性](https://scikit-learn.org/stable/model_persistence.html)も参照。

## 提供コードから確認した推論契約

| 項目           | 契約と確認状態                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------- |
| モデル保存     | `torch.save(model.state_dict(), "best_1dcnn_pytorch.pth")`。ZIP内のstate_dictキー・cuda:0保存をメタデータで確認。ロード実行は未実施                  |
| Scaler保存     | 学習WindowだけでfitしたStandardScalerを `joblib.dump(..., "scaler.pkl")`。推論でfitし直さない       |
| Window         | 50Hz、100点、6列、Step50                                                                            |
| 特徴順         | 提供コードはCSV先頭6列。プロジェクトの `ax,ay,az,gx,gy,gz` との列・軸向き対応は提供者/IoTの確認待ち |
| 単位           | 先頭3列はg、後半3列はdeg/s。学習用SisFallの生値から換算する係数が示されている                       |
| 学習時の減速   | 200Hzの4点平均で50Hzへ変換。既に50Hz・物理単位のIoT入力へ係数や4点平均を二重適用しない              |
| 標準化とTensor | `(100,6)`にtransform → float32 → transpose → batch追加で `(1,6,100)`                                |
| モデル出力     | `(1,1)`の単一Fall logit。末尾にsigmoidなし、学習lossはBCEWithLogitsLoss                             |
| ラベル / index | Normal=0、Fall=1。出力要素indexは0。2クラス出力のindex=1ではない                                    |
| 確率 / 閾値    | sigmoidを1回だけ適用。`p_fall >= 0.5` でfall、未満でnormal                                          |
| 推論時         | evalでBatchNorm/Dropoutを推論動作にし、推論処理側でinference_modeを使う                             |

SisFallでの学習前処理が分かったことは、MPU6050実機の軸向きや学習分布との一致を保証しない。IoTとの照合が終わるまで互換性確認済みとはしない。

## 受領後の再現手順（未実行）

本プロジェクトではテストの追加・実行を行わない。以下は提供者の再現結果を受け取るための手順であり、今回の実行実績ではない。

1. 同じ学習runの重みと学習済みScaler、配布元、model_version、双方のSHA-256を受領する。バイナリは既存のgitignoreに従い `main/ai/artifacts/sisfall_model/` へ置き、manifestに実際の相対pathを記録する。
2. Python・PyTorch・NumPy・scikit-learn・joblibの正確なversion、CPU/GPU・OS情報を提供者から受領する。学習時CUDAと配置先CPUでの再現性を区別する。
3. 提供者は小さな物理単位Window `(100,6)` と、同じScalerでtransformした `(100,6)`、生logit、sigmoid確率、判定を保存する。テンプレートのnullを実値で埋め、model/scaler hashと結び付ける。数値のatol/rtolは提供者の根拠とともに記録し、候補値を勝手に確定しない。
4. 互換環境で、信頼済みScalerをjoblibで読む。学習済み統計と6特徴を確認する。提供コードどおりWindowへtransformしfloat32にした後、転置・batch軸追加で `(1,6,100)` にする。再fit、再学習、暗黙の単位換算はしない。
5. `app.model_artifacts.loader.load_model(path, expected_sha256=...)` でモデルを読む。`torch.inference_mode()` 内でTensorを渡し、有限な `(1,1)` logitを得てsigmoidを1回適用する。
6. 提供者は標準化後の値・logit・確率をそれぞれ合意した許容誤差で照合し、判定の一致、実行環境、実測誤差を報告する。今回はこの再現作業を実行していないため `known_io.reproduced=false` を維持する。
7. 受領fixtureにSHA-256を付けてmanifestへ登録し、対応版の識別・軸対応・互換runtimeを埋める。全項目が確認されるまではmanifestのblocked状態を解除しない。

## 不足成果物と後続への影響

| 未受領・未確認               | 影響                                        |
| ---------------------------- | ------------------------------------------- |
| 受領済みpth・Scalerの学習run対応確認 | ファイル配置と同じ学習runの証明を区別する |
| 提供者のrelease識別子 | 現状は成果物組のhashによるローカルversionを使用 |
| 既知入出力と許容誤差         | 推論の再現性を確認できない                  |
| 互換runtime                  | 依存version・CPU互換性を固定できない        |
| 特徴列・軸向きと実機の照合   | IoT入力を学習時の入力契約と同一扱いできない |

モデル読込・前処理・推論コードは実装済み。本番の推論Ready化は残る契約・再現性確認の完了まで行わない。
