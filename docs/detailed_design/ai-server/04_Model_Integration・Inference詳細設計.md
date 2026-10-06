# 04 Model Integration・Inference 詳細設計

## 1. 既存モデルを使う範囲

`best_1dcnn_pytorch.pth`と、その学習時に使用したStandardScalerを再利用する。モデルアーキテクチャ、学習、データセット、精度改善は本作業の対象外。既存モデルクラスの定義と既存推論処理を正とする。Conv層数・kernel・hidden units等を推定して実装しない。

`.pth`の内容は未入手のため、state_dict、checkpoint辞書、保存済みModule等の形式も`[TBD]`。state_dictだけではforwardの全処理やラベル意味は復元できない。既存クラスと提供時の利用コードが必要である。基本設計のCNN構造と実物が異なる場合は実物を優先し、差分表を更新する。

## 2. 実装開始前に受領する成果物

| 成果物・情報 | 確認内容 | 現状 |
|---|---|---|
| モデルファイル | best_1dcnn_pytorch.pth、配布元、hash | ファイル名のみ指定済み |
| 既存model class / loader | クラス定義、引数、forward、checkpointキー | `[TBD]` |
| 既存Scaler | ファイル、保存方式、学習済み統計、対応するmodel | `[TBD]` |
| Input契約 | 100 samples、50Hz、6 axes、順序・単位・軸向き・前処理・layout・dtype | 前半3項目以外 `[TBD]` |
| Output契約 | shape、logits/probability、Fallのclass index | `[TBD]` |
| Runtime | Python、PyTorch、NumPy、scikit-learn、joblib等の互換version | `[TBD]` |
| 既知入出力fixture | 固定Window、期待Scaler出力、期待モデル出力、許容誤差 | `[TBD]`。精度評価用Datasetの作成ではない |
| version | 成果物組を識別するmodel_version | `[TBD]`。prototype-phase-1は例示値 |

受領済み情報はモデルと同梱する小さな`model_manifest.json`（追加の環境変数は不要）に固定する。記録項目はmodel_version、model/scaler SHA-256、既存クラス識別、feature_order、単位・座標、window_size、sampling_rate、scaler入力形式、input_layout/dtype、output_kind/class index、互換runtime。自動モデル管理サービスは作らない。

## 3. 起動時ロードと互換性検証

```text
Server Start → 設定 / manifest検証
 → Model Load（CPUを初期候補） → Scaler Load
 → 成果物・Input / Output仕様の照合
 → model.eval() → inference_modeで既知入力確認
 → MQTT接続・購読 → Ready
```

1. MODEL_PATH / SCALER_PATHが信頼済みの読取可能ファイルで、hashが対応表と一致することを確認する。
2. state_dict形式なら既存クラスを同じ引数で生成し、`torch.load(..., map_location="cpu", weights_only=True)`、`load_state_dict(..., strict=True)`で読み込む。checkpoint辞書なら提供者が指定するキーを使用する。
3. 保存形式が別の場合はその形式の正式な既存loaderを確認する。読み込み失敗を理由に`weights_only=False`へ自動fallbackしたり、`strict=False`で不足weightを無視しない。信頼済みのfull Moduleでunsafe loaderが必要なら提供元と形式・互換環境を確認して明示実装する。
4. Scalerを対応loaderで読み、学習済み状態・feature数・順序・単位・Window条件を03に従って照合する。
5. `MODEL_VERSION`がmanifestと一致することを確認する。形状だけでモデルとScalerが対応すると判断しない。
6. `model.eval()`を設定し、既知Window→Scaler→Tensor→モデル→確率まで通す。期待値との誤差を照合する。許容誤差は提供環境の数値差を考慮し`[TBD]`（CPU float32ならatol/rtol 1e-5を初期候補）。
7. output shape・dtype・有限性・確率範囲を確認し、不一致はReadyにしない。ゼロ入力だけのsmoke testは意味的互換性の証明にはならない。

`torch.load`の制約は[公式API](https://docs.pytorch.org/docs/stable/generated/torch.load.html)、`eval()`が必要な理由は[公式モデル保存・読込手順](https://docs.pytorch.org/tutorials/beginner/basics/saveloadrun_tutorial.html)を参照。Scalerのpickle/joblibも信頼済みファイルだけを読み、学習環境との互換性を固定する（[scikit-learn model persistence](https://scikit-learn.org/stable/model_persistence.html)）。

## 4. Model Architectureとの接続契約

| 項目 | 詳細設計 | 確認状態 |
|---|---|---|
| Framework / Model | PyTorch / 既存1D-CNN | 確定前提 |
| Input Shape | 原Windowは100×6。Tensorは既存実装に従う。候補[1,6,100] | `[TBD]` |
| Output Shape | 候補[1]、[1,1]、[1,2]等。実物で1つに固定 | `[TBD]` |
| dtype | float32を候補。既存weight/input仕様で固定 | `[TBD]` |
| CPU/GPU | 1台・約1回/秒を想定しCPUを推奨。CPU互換性・実測後に決定 | `[TBD]` |
| eval mode | 起動時`model.eval()`、運転中変更しない | 設計方針 |
| inference mode | 各推論実行スレッド内で`torch.inference_mode()`を使用 | 設計方針 |
| Batch | 1 Window / 1 Deviceずつ | 設計方針 |

`inference_mode()`は`eval()`の代替ではない。前者で勾配計算を無効化し、後者でDropout/BatchNorm等を推論時の動作にする。推論モードのスレッド局所性に留意し、起動スレッドだけで設定を済ませない（[PyTorch inference_mode](https://docs.pytorch.org/docs/stable/generated/torch.autograd.grad_mode.inference_mode.html)）。

## 5. 推論・確率への変換

```text
Window → 既存Scaler.transform → Tensor化
 → torch.inference_mode内のmodel(tensor)
 → 確定済みoutput_kindに従うp_fall
 → finite / range検証 → p_fall >= 0.5 ? fall : normal
```

| 既存モデルの出力意味 | 変換 | 注意 |
|---|---|---|
| Fallの単一logit | sigmoid(logit) | 学習ラベル1=Fallであることを確認 |
| 2クラスlogits | softmax(..., dim=class_axis)のFall index | class indexをmanifestで固定 |
| Fallの単一probability | その値を使用 | sigmoidを二重適用しない |
| 2クラスprobabilities | Fall indexの値を使用 | softmaxを二重適用しない。範囲・総和も契約に従い検証 |

shapeや値域だけを見てlogit/probabilityを自動判別しない。単一出力がNormal確率の場合は提供仕様に従う変換が必要で、本表を更新する。ラベルしか返さない等、閾値0.5の確率判定を実現できない場合は確認事項としてReadyにしない。

`p_fall`は有限かつ[0,1]内であることを要求する。ちょうど0.5はfallとする。0.5未満はnormal。推論エラー・NaN・不正shapeをnormalに変換しない。確率は内部診断用に持てるが、05の基本結果payloadへ無断追加しない。

結果生成直前にWindowのMQTT世代が現在と一致し、DeviceがOFFLINE期限を超えておらず、Window終端が鮮度制限内であることを再確認する。切断中に完了した推論や遅延した推論結果を新規通知しない。

## 6. 実行時間・障害境界

1 Workerでmodelを直列使用し、同一Windowの内部自動再推論はしない。単発例外は当該Windowを捨てログを記録、次のWindowで継続する。shape・互換性エラーや非有限出力の継続はモデル障害として非Readyにする。

推奨の性能基準は、正常なCache hit時にWindow完成からPublish受付までp95 200ms以内、推論Workerの処理能力がStep周期を下回ること。確定SLO・CPU種別は`[TBD]`。Web基本設計の「判定から画面表示1秒以内」は別区間として05で測定する。

native推論をスレッドのtimeoutだけで強制停止できるとは扱わない。処理中10秒を超えてWorkerが進捗しない場合は内部watchdogがlive/readyを503にし、プロセス終了・運用側再起動とする設計案。実測後にこの内部上限を調整する。終了後の再起動は空Bufferから開始する。
