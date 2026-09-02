# =============================================================
#  main.py — FastAPI Test Server for ESP32 MPU6050 data
#
#  Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
#  Then check: http://localhost:8000/docs  (Swagger UI)
# =============================================================

import math
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="ESP32 Fall Detection Test Server", version="1.0.0")


def now_iso() -> str:
    """Current UTC time as ISO string with timezone offset."""
    return datetime.now(timezone.utc).isoformat()

# Allow requests from any origin (for testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Data Models ───────────────────────────────────────────────
class Sample(BaseModel):
    t:  int    # timestamp ms
    ax: float  # accel X m/s²
    ay: float  # accel Y m/s²
    az: float  # accel Z m/s²
    gx: float  # gyro X rad/s
    gy: float  # gyro Y rad/s
    gz: float  # gyro Z rad/s

class SensorBatch(BaseModel):
    device_id: str
    samples:   list[Sample]

class FallResult(BaseModel):
    device_id:   str = ""
    fall_detected: bool
    confidence:  float
    reason:      str
    received_at: str
    sample_count: int
    peak_accel:  float

# ── Simple fall detection logic (threshold based) ─────────────
def detect_fall(samples: list[Sample]) -> FallResult:
    """
    Basic threshold fall detection for testing.
    Real AI model will replace this logic later.

    Fall pattern:
      1. FREE FALL phase  — total accel drops below 3 m/s²  (weightlessness)
      2. IMPACT phase     — total accel spikes above 20 m/s²
    """
    if not samples:
        return FallResult(
            device_id="", fall_detected=False, confidence=0.0,
            reason="No samples", received_at=now_iso(),
            sample_count=0, peak_accel=0.0
        )

    accels = [math.sqrt(s.ax**2 + s.ay**2 + s.az**2) for s in samples]
    peak   = max(accels)
    minval = min(accels)

    # Check for free-fall then impact pattern
    free_fall = minval < 3.0    # near weightlessness
    impact    = peak > 20.0     # hard impact

    fall_detected = free_fall and impact
    confidence    = min(1.0, (peak / 30.0)) if fall_detected else 0.0

    if fall_detected:
        reason = f"Free-fall detected (min={minval:.1f} m/s²) + Impact (peak={peak:.1f} m/s²)"
    elif impact:
        reason = f"High impact only, no free-fall (peak={peak:.1f} m/s²)"
    elif free_fall:
        reason = f"Free-fall only, no impact (min={minval:.1f} m/s²)"
    else:
        reason = f"Normal movement (peak={peak:.1f} m/s²)"

    return FallResult(
        fall_detected=fall_detected,
        confidence=round(confidence, 3),
        reason=reason,
        received_at=now_iso(),
        sample_count=len(samples),
        peak_accel=round(peak, 3)
    )

# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "ESP32 Fall Detection Test Server",
        "endpoints": {
            "POST /sensor": "Receive sensor batch from ESP32",
            "GET  /health": "Server health check",
            "GET  /docs":   "Swagger UI"
        }
    }

@app.get("/health")
def health():
    return {"status": "ok", "time": now_iso()}

@app.post("/sensor", response_model=FallResult)
def receive_sensor_data(batch: SensorBatch):
    """
    Receive a batch of MPU6050 samples from ESP32.
    Returns fall detection result.
    """
    if not batch.samples:
        raise HTTPException(status_code=400, detail="Empty sample batch")

    print(f"\n[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] "
          f"Received {len(batch.samples)} samples from '{batch.device_id}'")

    # Print sample summary
    accels = [math.sqrt(s.ax**2 + s.ay**2 + s.az**2) for s in batch.samples]
    print(f"  Peak accel: {max(accels):.2f} m/s²  |  Min accel: {min(accels):.2f} m/s²")

    result = detect_fall(batch.samples)
    result.device_id = batch.device_id

    if result.fall_detected:
        print(f"  🚨 FALL DETECTED! Confidence: {result.confidence:.1%}")
    else:
        print(f"  ✅ Normal: {result.reason}")

    return result
