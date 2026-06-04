## Elderly Fall Prevention & Posture Monitoring System

## Overview

This system detects falls and posture deterioration in elderly individuals in real time using IoT sensors and a deep learning CNN model. When a fall is detected, an instant alert is pushed to a nurse dashboard via WebSocket.
The architecture is designed to **minimize processing overhead and communication latency** by connecting components directly:

```
IoT Device → AI Inference Server (FastAPI) → Web App (Next.js) → Nurse Dashboard
```

> Created: 2026-05-23 | Version: V1.0

## Team

| Name | Role | Responsibilities

| **Kyi Pyar Hlaing** | PM + Web Developer | Next.js dashboard, API integration, GitHub management
| **Kyaw Htin Hein** | AI Lead | PyTorch CNN model,API inference server, dataset processing , AWS deploy,
| **Win Htut Oo** | IoT Engineer | Raspberry Pi Zero 2W, MPU6050 sensor, HTTP pipeline , AWS deploy

## System Architecture

### Data Flow Diagram

```
+----------------------------------+
|        IoT Device (Input)        |       +------------------------------------+
|  - Raspberry Pi Zero 2W  --------+-----> | COMMENT: Looking for an alternative|
|  - MPU6050 (3-Axis IMU)          |       | that is more comfortable / compact |
+----------------------------------+       | for daily wearable use.            |
                                           +------------------------------------+
                │
                │ ① センサーデータ送信 (HTTP POST / JSON)
                ▼
+----------------------------------+
|  AI Inference Server (FastAPI)   |
|  - 受信データのバッファリング    |
|  - Matplotlib による画像化処理   |
|  - CNN モデルによる転倒推論      |
+----------------------------------+
                │
                │ ② 判定結果転送 (HTTP POST / JSON)
                ▼
+----------------------------------+
|   Web Application (Next.js API)  |
|  - アラートエンドポイント        |
|  - Socket.io (WebSocket) サーバー|
+----------------------------------+
                │
                │ ③ リアルタイム通知 (WebSocket Push)
                ▼
+----------------------------------+
|    管理画面 (Frontend / Browser) |
|  - JavaScript アラーム音声再生   |
|  - 画面の警告表示切り替え        |
+----------------------------------+
```

### Sequence Diagram

```
[IoT Device]        [FastAPI (AI)]       [Next.js API]       [Dashboard]
     │                    │                    │                   │
     ├──① センサー取得──►│                    │                   │
     │  (過去3秒/JSON)    │                    │                   │
     │                    ├──② メモリ上画像化  │                   │
     │                    ├──③ CNN 推論実行    │                   │
     │                    │                    │                   │
     │                    ├──④ 結果転送(POST)─►│                   │
     │                    │                    ├──⑤ 転倒判定?      │
     │                    │                    ├──⑥ Alert Push────►│
     │                    │                    │   (WebSocket)     │
     │                    │                    │                   ├──⑦ 警告表示
     │                    │                    │                   └──⑧ 警告音再生
```

---

## How Each Component Works

### ① IoT Device → FastAPI (Sensor Data)

The Raspberry Pi collects raw sensor values and sends them directly to the AI server — **no heavy processing on the device**.

- **Sensor:** MPU6050 — 3-axis accelerometer + gyroscope
- **Data format:** 3 seconds of time-series data packed as a JSON array
- **Protocol:** HTTP POST over Wi-Fi
- **Endpoint:** `http://[AI_SERVER_IP]:8000/api/predict`
- **Benefit:** No image generation on the device → dramatically lower CPU load, memory usage, and battery consumption

### ② FastAPI (Image Conversion + CNN Inference)

FastAPI receives the raw numbers and uses Python's data ecosystem to convert them into an image for the CNN — all **in memory, no disk writes**.

- Parses the 3-second JSON array
- Generates a grayscale line graph using **Matplotlib** (`io.BytesIO` buffer — no file saved to disk)
- Reshapes to NumPy array → resizes to CNN input size (e.g. 64×64px, 1 channel)
- Runs inference with the trained **PyTorch / Keras CNN model**
- If fall probability exceeds threshold → `"status": "fallen"`

### ③ FastAPI → Next.js API (Result Transfer)

After inference, FastAPI acts as a client and POSTs the result to the web application backend.

- **Protocol:** HTTP POST
- **Endpoint:** `http://localhost:3000/api/alert`
- **Payload:**

{
isfall :  0   or    1, 
battery_per : 30.0,
device_name :  testDev_1,
status : active
}

### ④ Next.js → Dashboard (Real-time Alert)

Next.js receives the alert and immediately broadcasts it to all connected browsers via **Socket.io WebSocket**.

- Emits `"emergency-alert"` event to all clients
- Browser detects the event → plays alarm audio via the **Web Audio API**
- Screen changes to a red flashing warning with a popup — instantly notifying nursing staff

---

## 🛠️ Tech Stack

| Layer | Technology

| IoT Device | Raspberry Pi Zero 2W + MPU6050
| AI Inference | FastAPI + PyTorch CNN + Matplotlib (in-memory)
| Web Backend | Next.js API Routes + Socket.io
| Web Frontend | Next.js (React) + Browser Audio API
| Deployment | AWS EC2 — FastAPI + Next.js co-hosted on same instance
| Task Management | GitHub Projects
| Communication | Microsoft Teams

---

## 📁 Project Structure

```
elderly-fall-prevention-system/
├── ai/                        # Kyaw Htin Hein
│   ├── data/                  # Dataset (UniMiB SHAR / SisFall)
│   ├── notebooks/             # EDA and training notebooks
│   ├── models/                # Saved .pt model files
│   ├── server/
│   │   └── main.py            # FastAPI inference server
│   └── requirements.txt
│
├── iot/                       # Win Htut Oo
│   ├── raspberry_pi/
│   │   └── sender.py          # HTTP POST pipeline
│   └── microbit/              # MicroPython sensor scripts
│
├── web/                       # Kyi Pyar Hlaing
│   ├── app/
│   │   ├── api/alert/         # Alert endpoint
│   │   └── dashboard/         # Nurse dashboard UI
│   ├── components/
│   ├── public/                # Alarm audio files
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   └── final_report.pdf
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Raspberry Pi Zero 2W + MPU6050

### 1. Clone the repo

```bash
git clone https://github.com/call-it-is/ccc_project_2026/
cd elderly-fall-prevention-system
```

### 2. AI Server

```bash
cd ai/server
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Web App

```bash
cd main/web
pnpm install
pnpm dev
```

### 4. Database / Prisma

This project uses PostgreSQL with Prisma.

For local development, Prisma Studio and Prisma CLI connect to Docker PostgreSQL through `localhost:5433`.
Inside Docker Compose, the `web-app` container connects to the same database through the internal service name `db:5432`.

```bash
docker compose up -d db
cd main/web
pnpm prisma:push
pnpm prisma:seed
pnpm prisma:studio
```

### 5. IoT Device

```bash
cd iot/raspberry_pi
python sender.py
```

---

## Why This Architecture?

| Component | Benefit

| **IoT Device** | No heavy libraries needed on device → lower CPU, memory, battery usage
| **Network** | Only lightweight JSON sent over Wi-Fi → minimal bandwidth
| **FastAPI** | Direct data reception → no Next.js relay overhead; full Python data ecosystem available

> **Key optimization:** FastAPI and Next.js are hosted on the **same AWS EC2 instance**. This means the ② AI → Next.js communication happens over `localhost` (loopback), reducing latency from hundreds of milliseconds to under 1ms. Total network hops = effectively **one** (IoT → EC2).

---

## Branch Strategy

```
main          ← stable, production-ready (PR + 1 review required)
dev           ← integration branch
feature/web   ← Kyi Pyar Hlaing
feature/ai    ← Kyaw Htin Hein
feature/iot   ← Win Htut Oo
```

> ⚠️ Never push directly to `main`. Always open a Pull Request.

## 📄 License

Graduation project — Kyi Pyar Hlaing, Kyaw Htin Hein, Win Htut Oo. All rights reserved.

---

## Scaffold Update (2026-05-28)

Feature-based baseline tree was created under `elderly-fall-prevention-system/` with:

- `ai/features/inference/` for FastAPI inference encapsulation
- `iot/raspberry_pi` and `iot/microbit` device scripts
- `web/src/app` kept routing-thin and implementation colocation under `web/src/features/*`
- `web/prisma/schema.prisma` initialized for PostgreSQL datasource

---

## Development Update (2026-06-04)

Today the project setup was cleaned up for GitHub safety, local database development, and Prisma seed data.

### GitHub Ignore Rules

Updated `.gitignore` so local/private/generated files are not pushed to GitHub:

- `.env`, `.env.*`, `main/web/.env`, `main/web/.env.*`
- `node_modules/`, `main/web/node_modules/`, `.pnpm-store/`
- Next.js build/cache output such as `main/web/.next/`
- Python cache and virtual environment folders
- Jupyter checkpoints
- AI datasets and model artifacts such as `main/ai/data/`, `main/ai/models/`, `*.pt`, `*.pth`, `*.onnx`
- local DB files, editor files, `.DS_Store`, `.codex/`, `.agents/`

The already-tracked `main/web/.next/` files were removed from Git tracking with `git rm --cached`, while keeping local files on disk.

### Web Package Manager

Confirmed that the Web app uses pnpm:

- `main/web/package.json` has `packageManager: "pnpm@9.15.0"`
- `main/web/pnpm-lock.yaml` is the only package lockfile
- `main/web/Dockerfile` uses `pnpm install` and `pnpm dev`

### Prisma / PostgreSQL Setup

Configured Prisma and PostgreSQL for both local development and Docker:

- `main/web/prisma/schema.prisma` now reads `DATABASE_URL` through `env("DATABASE_URL")`
- `main/web/prisma.config.ts` loads `main/web/.env` explicitly and defines the seed command
- `main/web/package.json` includes Prisma scripts:
  - `pnpm prisma:push`
  - `pnpm prisma:generate`
  - `pnpm prisma:seed`
  - `pnpm prisma:studio`
  - `pnpm prisma:validate`
- `docker-compose.yml` includes PostgreSQL service `db`
- Docker PostgreSQL is exposed to the host on `localhost:5433`
- Docker containers use the internal URL `db:5432`

Reason for using `localhost:5433`: on the local machine, port `5432` may already be used by another PostgreSQL instance. Prisma Studio was failing because it was connecting to the wrong database. Moving the Docker PostgreSQL host port to `5433` avoids that conflict.

### Current Database Models

The current Prisma schema contains:

- `User`: staff users such as nurses and caregivers
- `Elderly`: monitored elderly residents
- `Device`: IoT wearable devices linked 1:1 with elderly residents
- `AlertHistory`: fall and false-alarm history, including resolved/unresolved status

### Seed Data

Implemented `main/web/prisma/seed.ts` with development data suitable for the current schema:

- 2 users: one admin nurse and one caregiver
- 4 elderly residents
- 4 devices:
  - active devices
  - one maintenance device
  - one inactive unassigned device
- 3 alert histories:
  - one unresolved fall alert
  - one resolved fall alert
  - one resolved false alarm

Seed was verified with:

```bash
cd main/web
pnpm prisma:seed
```

Verification result:

```text
User: 2
Elderly: 4
Device: 4
AlertHistory: 3
Device.findMany: OK
```
