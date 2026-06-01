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
cd web
npm install
npm run dev
```

### 4. IoT Device

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
