// =============================================================
//  dashboard.h — Embedded HTML Web Dashboard (PROGMEM)
// =============================================================

#ifndef DASHBOARD_H
#define DASHBOARD_H

const char DASHBOARD_HTML[] PROGMEM = R"HTMLEOF(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ESP32 MPU6050 Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg-base:       #0a0d14;
      --bg-card:       #111827;
      --bg-card-2:     #1a2235;
      --border:        rgba(99,179,237,0.12);
      --border-glow:   rgba(99,179,237,0.35);
      --text-primary:  #e2e8f0;
      --text-secondary:#94a3b8;
      --text-dim:      #475569;
      --accent-blue:   #63b3ed;
      --accent-cyan:   #22d3ee;
      --accent-purple: #a78bfa;
      --accent-green:  #34d399;
      --accent-orange: #fb923c;
      --accent-red:    #f87171;
      --accel-color:   #63b3ed;
      --gyro-color:    #a78bfa;
      --temp-color:    #fb923c;
      --shadow-card:   0 4px 32px rgba(0,0,0,0.5);
      --radius-card:   16px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed; inset: 0;
      background-image:
        linear-gradient(rgba(99,179,237,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,179,237,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none; z-index: 0;
    }
    .container {
      max-width: 1400px; margin: 0 auto;
      padding: 0 24px 48px;
      position: relative; z-index: 1;
    }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 28px 0 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .header-icon {
      width: 48px; height: 48px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 0 24px rgba(99,179,237,0.4);
    }
    h1 {
      font-size: 1.5rem; font-weight: 700;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }
    .status-pill {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 50px;
      background: var(--bg-card); border: 1px solid var(--border);
      font-size: 0.8rem; color: var(--text-secondary);
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
      animation: pulse-dot 2s ease-in-out infinite;
    }
    .status-dot.offline { background: var(--accent-red); box-shadow: 0 0 8px var(--accent-red); }
    @keyframes pulse-dot {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.6; transform:scale(0.85); }
    }
    .section-title {
      font-size: 0.7rem; font-weight: 600;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--text-dim); margin-bottom: 16px;
    }
    .sensor-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px; margin-bottom: 32px;
    }
    .axis-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-card); padding: 20px;
      position: relative; overflow: hidden;
      transition: border-color 0.3s, transform 0.2s, box-shadow 0.3s;
    }
    .axis-card:hover {
      border-color: var(--border-glow);
      transform: translateY(-2px); box-shadow: var(--shadow-card);
    }
    .axis-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: var(--card-accent, var(--accent-blue));
    }
    .axis-card.accel { --card-accent: var(--accel-color); }
    .axis-card.gyro  { --card-accent: var(--gyro-color);  }
    .card-label {
      font-size: 0.7rem; font-weight: 600;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-dim); margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .card-label-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--card-accent, var(--accent-blue));
    }
    .card-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.6rem; font-weight: 500;
      color: var(--text-primary); transition: color 0.3s; white-space: nowrap;
    }
    .card-unit { font-size: 0.7rem; color: var(--text-dim); margin-top: 4px; }
    .card-bar-wrap {
      margin-top: 12px; height: 4px;
      background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;
    }
    .card-bar {
      height: 100%; border-radius: 4px;
      background: var(--card-accent, var(--accent-blue));
      transition: width 0.35s ease; min-width: 2px;
    }
    .info-row {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px; margin-bottom: 32px;
    }
    @media (max-width: 640px) { .info-row { grid-template-columns: 1fr; } }
    .info-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-card); padding: 20px;
      display: flex; align-items: center; gap: 20px;
    }
    .info-icon {
      font-size: 2rem; width: 56px; height: 56px;
      background: var(--bg-card-2); border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .info-label { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px; }
    .info-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.75rem; font-weight: 600; color: var(--temp-color);
    }
    .device-info { flex-direction: column; align-items: flex-start; gap: 8px; }
    .device-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
    .device-key { color: var(--text-dim); min-width: 70px; }
    .device-val { color: var(--accent-cyan); font-family: 'JetBrains Mono', monospace; }
    .orientation-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-card); padding: 24px; margin-bottom: 32px;
      display: flex; align-items: center; justify-content: center;
      gap: 48px; flex-wrap: wrap;
    }
    .cube-scene { width: 120px; height: 120px; perspective: 400px; }
    .cube {
      width: 100%; height: 100%; position: relative;
      transform-style: preserve-3d; transition: transform 0.1s linear;
    }
    .cube-face {
      position: absolute; width: 120px; height: 120px;
      border: 2px solid rgba(99,179,237,0.4);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em; border-radius: 4px;
    }
    .cube-face.front  { background: rgba(99,179,237,0.08); transform: translateZ(60px); color: var(--accel-color); }
    .cube-face.back   { background: rgba(99,179,237,0.05); transform: rotateY(180deg) translateZ(60px); color: var(--text-dim); }
    .cube-face.left   { background: rgba(167,139,250,0.06); transform: rotateY(-90deg) translateZ(60px); color: var(--gyro-color); }
    .cube-face.right  { background: rgba(167,139,250,0.06); transform: rotateY(90deg) translateZ(60px); color: var(--gyro-color); }
    .cube-face.top    { background: rgba(52,211,153,0.06); transform: rotateX(90deg) translateZ(60px); color: var(--accent-green); }
    .cube-face.bottom { background: rgba(52,211,153,0.04); transform: rotateX(-90deg) translateZ(60px); color: var(--text-dim); }
    .orientation-legend { font-size: 0.8rem; color: var(--text-secondary); }
    .orient-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .orient-label { color: var(--text-dim); width: 60px; }
    .orient-val { font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
    .charts-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px; margin-bottom: 32px;
    }
    @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }
    .chart-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-card); padding: 20px 24px 16px;
    }
    .chart-title {
      font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);
      margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
    }
    .chart-title-dot { width: 8px; height: 8px; border-radius: 50%; }
    .chart-wrap { position: relative; height: 200px; }
    footer {
      text-align: center; padding: 16px 0;
      border-top: 1px solid var(--border);
      font-size: 0.75rem; color: var(--text-dim);
    }
    @keyframes value-flash {
      0%   { color: var(--accent-cyan); }
      100% { color: var(--text-primary); }
    }
    .flashing { animation: value-flash 0.4s ease-out; }
  </style>
</head>
<body>
<div class="container">
  <header>
    <div class="header-left">
      <div class="header-icon">📡</div>
      <div>
        <h1>MPU6050 Live Dashboard</h1>
        <p class="subtitle">ESP32 · Real-time Sensor Monitor</p>
      </div>
    </div>
    <div class="status-pill">
      <div class="status-dot" id="statusDot"></div>
      <span id="statusText">Connecting...</span>
    </div>
  </header>

  <p class="section-title">⚡ Accelerometer (g)</p>
    <div class="axis-card accel">
      <div class="card-label"><span class="card-label-dot"></span>Accel X</div>
      <div class="card-value" id="accel-x">—</div>
      <div class="card-unit">g</div>
      <div class="card-bar-wrap"><div class="card-bar" id="bar-ax" style="width:50%"></div></div>
    </div>
    <div class="axis-card accel">
      <div class="card-label"><span class="card-label-dot"></span>Accel Y</div>
      <div class="card-value" id="accel-y">—</div>
      <div class="card-unit">g</div>
      <div class="card-bar-wrap"><div class="card-bar" id="bar-ay" style="width:50%"></div></div>
    </div>
    <div class="axis-card accel">
      <div class="card-label"><span class="card-label-dot"></span>Accel Z</div>
      <div class="card-value" id="accel-z">—</div>
      <div class="card-unit">g</div>
      <div class="card-bar-wrap"><div class="card-bar" id="bar-az" style="width:50%"></div></div>
    </div>
  </div>

  <p class="section-title">🔄 Gyroscope (deg/s)</p>
    <div class="axis-card gyro">
      <div class="card-label"><span class="card-label-dot"></span>Gyro X</div>
      <div class="card-value" id="gyro-x">—</div>
      <div class="card-unit">deg/s</div>
      <div class="card-bar-wrap"><div class="card-bar" id="bar-gx" style="width:50%"></div></div>
    </div>
    <div class="axis-card gyro">
      <div class="card-label"><span class="card-label-dot"></span>Gyro Y</div>
      <div class="card-value" id="gyro-y">—</div>
      <div class="card-unit">deg/s</div>
      <div class="card-bar-wrap"><div class="card-bar" id="bar-gy" style="width:50%"></div></div>
    </div>
    <div class="axis-card gyro">
      <div class="card-label"><span class="card-label-dot"></span>Gyro Z</div>
      <div class="card-value" id="gyro-z">—</div>
      <div class="card-unit">deg/s</div>
      <div class="card-bar-wrap"><div class="card-bar" id="bar-gz" style="width:50%"></div></div>
    </div>
  </div>

  <div class="info-row">
    <div class="info-card">
      <div class="info-icon">🌡️</div>
      <div>
        <div class="info-label">Internal Temperature</div>
        <div class="info-value" id="temperature">—</div>
        <div style="font-size:0.7rem;color:var(--text-dim);margin-top:4px">MPU6050 die temp · °C</div>
      </div>
    </div>
    <div class="info-card device-info">
      <div class="device-row"><span class="device-key">IP</span><span class="device-val" id="dev-ip">—</span></div>
      <div class="device-row"><span class="device-key">WiFi</span><span class="device-val" id="dev-ssid">—</span></div>
      <div class="device-row"><span class="device-key">RSSI</span><span class="device-val" id="dev-rssi">—</span></div>
      <div class="device-row"><span class="device-key">Uptime</span><span class="device-val" id="dev-uptime">—</span></div>
      <div class="device-row"><span class="device-key">Heap</span><span class="device-val" id="dev-heap">—</span></div>
    </div>
  </div>

  <!-- 3D Orientation Cube -->
  <p class="section-title">🧊 Orientation Preview</p>
  <div class="orientation-card">
    <div class="cube-scene">
      <div class="cube" id="cube">
        <div class="cube-face front">FRONT</div>
        <div class="cube-face back">BACK</div>
        <div class="cube-face left">LEFT</div>
        <div class="cube-face right">RIGHT</div>
        <div class="cube-face top">TOP</div>
        <div class="cube-face bottom">BOT</div>
      </div>
    </div>
    <div class="orientation-legend">
      <div class="orient-row"><span class="orient-label">Roll</span><span class="orient-val" id="ori-roll">0.0°</span></div>
      <div class="orient-row"><span class="orient-label">Pitch</span><span class="orient-val" id="ori-pitch">0.0°</span></div>
      <div class="orient-row"><span class="orient-label">Yaw est.</span><span class="orient-val" id="ori-yaw">0.0°</span></div>
      <br/>
      <div style="font-size:0.72rem;color:var(--text-dim);max-width:180px;line-height:1.5">
        Roll &amp; Pitch from accelerometer.<br/>Yaw integrated from gyro Z.
      </div>
    </div>
  </div>

  <p class="section-title">📈 Live Charts (last 60 samples)</p>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-title">
        <span class="chart-title-dot" style="background:var(--accel-color)"></span>
        Accelerometer History
      </div>
      <div class="chart-wrap"><canvas id="accelChart"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">
        <span class="chart-title-dot" style="background:var(--gyro-color)"></span>
        Gyroscope History
      </div>
      <div class="chart-wrap"><canvas id="gyroChart"></canvas></div>
    </div>
  </div>

  <footer>ESP32 · MPU6050 · Web Dashboard &nbsp;|&nbsp; Polling every 200ms</footer>
</div>

<script>
Chart.defaults.color = '#475569';
Chart.defaults.font.family = "'Inter', sans-serif";

const MAX_POINTS = 60;
const labels = Array(MAX_POINTS).fill('');

function makeDataset(label, color) {
  return {
    label, borderColor: color, backgroundColor: color + '20',
    borderWidth: 1.5, pointRadius: 0, tension: 0.3,
    data: Array(MAX_POINTS).fill(null), fill: true,
  };
}

const chartOptions = {
  responsive: true, maintainAspectRatio: false, animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { labels: { boxWidth: 10, font: { size: 11 } } } },
  scales: {
    x: { display: false },
    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 10 }, maxTicksLimit: 5 } }
  }
};

const accelChart = new Chart(document.getElementById('accelChart'), {
  type: 'line',
  data: { labels: [...labels], datasets: [makeDataset('X','#63b3ed'), makeDataset('Y','#22d3ee'), makeDataset('Z','#34d399')] },
  options: chartOptions
});
const gyroChart = new Chart(document.getElementById('gyroChart'), {
  type: 'line',
  data: { labels: [...labels], datasets: [makeDataset('X','#a78bfa'), makeDataset('Y','#f472b6'), makeDataset('Z','#fb923c')] },
  options: chartOptions
});

function pushChart(chart, values) {
  chart.data.datasets.forEach((ds, i) => {
    ds.data.push(values[i]);
    if (ds.data.length > MAX_POINTS) ds.data.shift();
  });
  chart.update('none');
}

let roll = 0, pitch = 0, yaw = 0;
let lastTime = Date.now();
let failCount = 0;

function flash(el) {
  el.classList.remove('flashing');
  void el.offsetWidth;
  el.classList.add('flashing');
}
function barWidth(val, max) {
  const clamped = Math.max(-max, Math.min(max, val));
  return ((clamped + max) / (2 * max) * 100).toFixed(1) + '%';
}
function formatMs(ms) {
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h > 0) return h+'h '+(m%60)+'m';
  if (m > 0) return m+'m '+(s%60)+'s';
  return s+'s';
}
function toDeg(rad) { return (rad * 180 / Math.PI).toFixed(1); }

function setOnline(ok) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = ok ? 'status-dot' : 'status-dot offline';
  txt.textContent = ok ? 'Live' : 'Disconnected';
}

async function fetchSensor() {
  try {
    const res = await fetch('/api/sensor', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    failCount = 0; setOnline(true);

    const ax = parseFloat(d.accelerometer.x);
    const ay = parseFloat(d.accelerometer.y);
    const az = parseFloat(d.accelerometer.z);
    const gx = parseFloat(d.gyroscope.x);
    const gy = parseFloat(d.gyroscope.y);
    const gz = parseFloat(d.gyroscope.z);
    const temp = parseFloat(d.temperature.value);

    ['accel-x','accel-y','accel-z','gyro-x','gyro-y','gyro-z'].forEach((id,i) => {
      const el = document.getElementById(id);
      el.textContent = [ax,ay,az,gx,gy,gz][i].toFixed(3);
      flash(el);
    });

    document.getElementById('bar-ax').style.width = barWidth(ax, 78);
    document.getElementById('bar-ay').style.width = barWidth(ay, 78);
    document.getElementById('bar-az').style.width = barWidth(az, 78);
    document.getElementById('bar-gx').style.width = barWidth(gx, 8.7);
    document.getElementById('bar-gy').style.width = barWidth(gy, 8.7);
    document.getElementById('bar-gz').style.width = barWidth(gz, 8.7);

    const tempEl = document.getElementById('temperature');
    tempEl.textContent = temp.toFixed(1) + ' °C'; flash(tempEl);

    if (d.device) {
      document.getElementById('dev-ip').textContent   = d.device.ip   || '—';
      document.getElementById('dev-ssid').textContent = d.device.ssid || '—';
      document.getElementById('dev-rssi').textContent = (d.device.rssi || '—') + ' dBm';
    }

    pushChart(accelChart, [ax, ay, az]);
    pushChart(gyroChart,  [gx, gy, gz]);

    const now = Date.now();
    const dt  = (now - lastTime) / 1000;
    lastTime  = now;
    const alpha = 0.96;
    const accelRoll  = Math.atan2(ay, az);
    const accelPitch = Math.atan2(-ax, Math.sqrt(ay*ay + az*az));
    roll  = alpha * (roll  + gx * dt) + (1 - alpha) * accelRoll;
    pitch = alpha * (pitch + gy * dt) + (1 - alpha) * accelPitch;
    yaw  += gz * dt;

    document.getElementById('ori-roll').textContent  = toDeg(roll) + '°';
    document.getElementById('ori-pitch').textContent = toDeg(pitch) + '°';
    document.getElementById('ori-yaw').textContent   = toDeg(yaw) + '°';

    const rollDeg  = roll  * 180 / Math.PI;
    const pitchDeg = pitch * 180 / Math.PI;
    const yawDeg   = yaw   * 180 / Math.PI;
    document.getElementById('cube').style.transform =
      `rotateX(${-pitchDeg}deg) rotateY(${yawDeg}deg) rotateZ(${rollDeg}deg)`;

  } catch (err) {
    failCount++;
    if (failCount >= 3) setOnline(false);
    console.warn('Fetch error:', err);
  }
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (!res.ok) return;
    const d = await res.json();
    document.getElementById('dev-uptime').textContent = formatMs(d.uptime_ms);
    document.getElementById('dev-heap').textContent   = Math.round(d.free_heap / 1024) + ' KB';
  } catch (_) {}
}

fetchSensor(); fetchStatus();
setInterval(fetchSensor, 200);
setInterval(fetchStatus, 5000);
</script>
</body>
</html>
)HTMLEOF";

#endif // DASHBOARD_H
