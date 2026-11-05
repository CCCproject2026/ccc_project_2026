# AI-04 モデル・Scaler受領契約

対象: [Issue #189](https://github.com/CCCproject2026/ccc_project_2026/issues/189)。更新日: 2026-11-04。

提供者の前処理・学習・評価コードは受領済み。学習済み成果物はまだ提供していない旨をユーザーに確認した。
重み・Scaler本体・既知入出力・互換runtimeは未受領であり、**AI-04は完了していない**。
学習を実行して代替成果物を作ったり、乱数weightやゼロ入力の出力を既知fixtureにしない。

## 追加したコードと成果物

- [Conv1DNet](../app/model_artifacts/conv1d.py): 提供クラスを抽出。層順・引数・forward・state_dictキーを維持し、importと書式のみ整理。学習ループは含まない。
- [CPU loader](../app/model_artifacts/loader.py): プロジェクト側の読込adapter。配布元と照合したSHA-256を必須とし、`map_location="cpu"`、`weights_only=True`、`strict=True`、`eval()`でロード。不一致時は例外とし、unsafe/非strict読込へfallbackしない。
- [model_manifest.json](model_manifest.json): 提供コードから確定できる仕様、ソースhash、未受領項目、後続の阻害条件を記録。
- [provider](provider/): Issueコメント原文の保存。`.txt`で保管し、自動実行しない。学習・評価コードは参照専用。
- [known_io.template.json](fixtures/known_io.template.json): 提供者が埋める入出力の形式。期待値は未受領のためnull。実fixtureではない。

loader成功だけで配布元の信頼性やScalerとの対応は証明できない。SHA-256には、受領したファイルから算出した値を無条件に採用せず、提供者が示した値との照合結果を記録する。
現在のFastAPI/Workerはこのコードをimportしない。PyTorch等の依存versionは推測で追加せず、提供環境の情報を受領してから固定する。既存のモデル未接続・ready=503は維持する。

## 提供コードから確認した推論契約

| 項目           | 契約と確認状態                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------- |
| モデル保存     | `torch.save(model.state_dict(), "best_1dcnn_pytorch.pth")`。実ファイル内容は未照合                  |
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

1. 同じ学習runの重みと学習済みScaler、配布元、model_version、双方のSHA-256を受領する。バイナリは既存のgitignoreに従い `main/ai/models/` 等へ置き、manifestに実際の相対pathを記録する。
2. Python・PyTorch・NumPy・scikit-learn・joblibの正確なversion、CPU/GPU・OS情報を提供者から受領する。学習時CUDAと配置先CPUでの再現性を区別する。
3. 提供者は小さな物理単位Window `(100,6)` と、同じScalerでtransformした `(100,6)`、生logit、sigmoid確率、判定を保存する。テンプレートのnullを実値で埋め、model/scaler hashと結び付ける。数値のatol/rtolは提供者の根拠とともに記録し、候補値を勝手に確定しない。
4. 互換環境で、信頼済みScalerをjoblibで読む。学習済み統計と6特徴を確認する。提供コードどおりWindowへtransformしfloat32にした後、転置・batch軸追加で `(1,6,100)` にする。再fit、再学習、暗黙の単位換算はしない。
5. `app.model_artifacts.loader.load_model(path, expected_sha256=...)` でモデルを読む。`torch.inference_mode()` 内でTensorを渡し、有限な `(1,1)` logitを得てsigmoidを1回適用する。
6. 提供者は標準化後の値・logit・確率をそれぞれ合意した許容誤差で照合し、判定の一致、実行環境、実測誤差を報告する。今回はこの再現作業を実行していないため `known_io.reproduced=false` を維持する。
7. 受領fixtureにSHA-256を付けてmanifestへ登録し、対応版の識別・軸対応・互換runtimeを埋める。全項目が確認されるまではmanifestのblocked状態を解除しない。

## 不足成果物と後続への影響

| 未受領・未確認               | 影響                                        |
| ---------------------------- | ------------------------------------------- |
| 学習済みpthとhash            | 実モデルをロードできない                    |
| 対応する学習済みScalerとhash | 標準化を再現できない                        |
| 成果物組のmodel_version      | モデルとScalerの対応版を固定できない        |
| 既知入出力と許容誤差         | 推論の再現性を確認できない                  |
| 互換runtime                  | 依存version・CPU互換性を固定できない        |
| 特徴列・軸向きと実機の照合   | IoT入力を学習時の入力契約と同一扱いできない |

モデル読込・前処理・推論の本番接続はこれらが揃うまでブロックする。モデルクラスの取り込みをもってIssue #189や推論機能を完了扱いにしない。
