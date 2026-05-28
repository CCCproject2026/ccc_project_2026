# Elderly Fall Prevention System

高齢者見守り・転倒検知のための Feature-based モノレポ構成です。

## Data Flow

IoT (Python) -> AI (FastAPI) -> Web (Next.js App Router) -> WebSocket

## Main Stack

- pnpm
- Next.js (App Router)
- Tailwind CSS
- Clerk
- Prisma (PostgreSQL)
- Python (FastAPI, PyTorch)

## Structure

- `ai/`: 推論 API とモデル関連
- `iot/`: センサーデータ送信とデバイス制御
- `web/`: フロントエンドと API 連携
- `docs/`: 設計資料と最終レポート

# 👵 Elderly Fall Prevention System (高齢者見守り・転倒検知システム)

高齢者のベルトに装着した IoT デバイスからセンサーデータを取得し、Deep Learning（PyTorch）モデルを介してリアルタイムに見守り管理画面へアラートを通知する、Feature-based（機能ベース）設計を採用したモノレポ構成のシステムです。

---

## 🚀 アーキテクチャ & データフロー

データ処理のオーバーヘッドと通信レイテンシを最小化するため、コンポーネント間を最短で直結する「Direct Link アーキテクチャ」を採用しています。

```text
[IoT Device (Raspberry Pi)]
       │
       │ ① センサーデータ送信 (HTTP POST / 過去3秒分の生数値JSON)
       ▼
[AI Inference Server (FastAPI)]
       │ ② メモリ上での折れ線グラフ画像化 (Matplotlib)
       │ ③ CNNモデルによる転倒推論 (PyTorch)
       │ ④ 判定結果転送 (HTTP POST / 内部ループバック通信)
       ▼
[Web Application (Next.js App Router)]
       │ ⑤ 判定結果をDB(PostgreSQL)へ保存 (Prisma)
       │ ⑥ アラートのブロードキャスト (Socket.io)
       ▼
[管理画面 (Frontend Browser)]
         ⑦ 警告表示への切り替え ＆ 警告音再生 (Web Audio API)



elderly-fall-prevention-system/
├── ai/                                # 🧠 AI・推論レイヤー (担当: Kyaw Htin Hein)
│   ├── requirements.txt               # Python 依存ライブラリ
│   ├── data/                          # 教師データセット (UniMiB SHAR / SisFall)
│   ├── notebooks/                     # Jupyter Notebook (EDA・モデル学習用)
│   ├── models/                        # 学習済みモデルファイル (.pt)
│   └── features/                      # 機能カプセル化（推論エンジン）
│       └── inference/
│           ├── main.py                # FastAPI サーバー本体・エンドポイント
│           ├── config.py              # 判定閾値やモデルパスの設定
│           └── utils/
│               ├── image_processor.py # データをメモリ上で白黒グラフ画像化するロジック
│               └── predictor.py       # PyTorchを用いた転倒判定スクリプト
│
├── iot/                               # 🔌 IoT・エッジレイヤー (担当: Win Htut Oo)
│   ├── raspberry_pi/
│   │   ├── sender.py                  # センサーデータをパッキングしてFastAPIへPOST
│   │   └── mpu6050_driver.py          # MPU6050から物理データを取得するドライバ
│   └── microbit/
│       └── main.py                    # MicroPythonを用いた補助用センサースクリプト
│
├── web/                               # 🌐 Webアプリケーション層 (担当: Kyi Pyar Hlaing)
│   ├── prisma/                        # DBスキーマ & データベース管理
│   │   ├── schema.prisma              # PostgreSQLデータモデル定義
│   │   └── seed.ts                    # 開発用初期データ（シード）スクリプト
│   └── src/
│       ├── middleware.ts              # Clerk認証ガード用ミドルウェア
│       ├── app/                       # Next.js App Router (ルーティング定義のみ)
│       │   ├── layout.tsx
│       │   ├── page.tsx               # ランディング / ログイン誘導ページ
│       │   ├── api/
│       │   │   └── alert/route.ts     # AIサーバーからのアラート受信用API
│       │   └── dashboard/page.tsx     # 看護師用ダッシュボードのページエントリー
│       ├── components/                # アプリ共通のグローバルUIパーツ (ui/ボタン等)
│       └── features/                  # 【核心】機能ごとにUIとロジックをColocation配置
│           ├── auth/                  # 1. Clerk連携・認証ユーザー管理
│           ├── dashboard/             # 2. 入居者一覧・ステータス表示画面
│           ├── alerts/                # 3. WebSocket通信・警告画面・アラーム音再生
│           └── devices/               # 4. IoT端末管理・センサーID紐付け
│
├── docs/                              # 📝 各種ドキュメント
│   ├── architecture.md                # 構造設計・仕様書
│   └── final_report.pdf               # 最終成果報告書
└── README.md
```
