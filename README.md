# 🦅 AI Bird Detection & Autonomous Deterrence System

[![GitHub License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/AI%20Model-YOLOv8-FF7F00?logo=ultralytics&logoColor=white)](https://github.com/ultralytics/ultralytics)
[![OpenCV](https://img.shields.io/badge/Vision-OpenCV-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2018%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Cloudinary](https://img.shields.io/badge/Cloud%20Media-Cloudinary-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![ESP32-CAM](https://img.shields.io/badge/Hardware-ESP32--CAM-E7352C?logo=espressif&logoColor=white)](https://www.espressif.com/)
[![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

An end-to-end, edge-to-cloud IoT and Computer Vision solution designed for **agricultural crop preservation**, **solar panel array protection**, and **industrial bird damage mitigation**. 

The system pairs an edge **ESP32-CAM** device with a hardware siren, an **OpenCV + Ultralytics YOLOv8** computer vision microservice, a **Node.js Express + WebSockets** central gateway, and a modern **React 19 Vite** monitoring dashboard.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [How It Works](#-how-it-works)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Hardware Wiring & Assembly](#-hardware-wiring--assembly)
- [Environment Configuration](#-environment-configuration)
- [Local Installation & Setup](#-local-installation--setup)
  - [Prerequisites](#prerequisites)
  - [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
  - [Method 2: Manual Step-by-Step Setup](#method-2-manual-step-by-step-setup)
- [ESP32-CAM Firmware Flashing](#-esp32-cam-firmware-flashing)
- [Cloud Deployment (Render & Atlas)](#-cloud-deployment-render--atlas)
- [API & WebSocket Reference](#-api--websocket-reference)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)
- [Contributing & License](#-contributing--license)

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph EdgeHardware["1. Edge Hardware (IoT)"]
        A["ESP32-CAM (AI-Thinker)"] -->|Periodic Snapshot| B["JPEG Capture Engine"]
        H["Active Buzzer / Siren"] <---|PWM Tone Signal (LEDC)| A
    end

    subgraph BackendGateway["2. Node.js & WebSocket Gateway (:5000)"]
        C["Express API Gateway"]
        WS["WebSocket Server (ws)"]
        C <--> WS
        DB[("MongoDB Atlas")]
        Cloud["Cloudinary Media CDN"]
        C --> DB
        C --> Cloud
    end

    subgraph AIMicroservice["3. Python AI Vision Microservice (:5001)"]
        D["Lanczos 2x Upscaling"]
        E["Gaussian Blur + LAB CLAHE"]
        F["Preloaded YOLOv8 (yolov8n.pt)"]
        G["In-Memory Bounding Box Renderer"]
        D --> E --> F --> G
    end

    subgraph ClientUI["4. React Dashboard (:5173)"]
        UI["React 19 + Vite Dashboard"]
        UI1["Telemetry Cards & Status"]
        UI2["Live Image Comparison"]
        UI3["Manual Testing Sandbox"]
        UI4["Dynamic Settings Manager"]
        UI --> UI1 & UI2 & UI3 & UI4
    end

    B -->|"HTTP POST /detect (multipart)"| C
    C -->|"Forward Image Stream"| D
    G -->|"Base64 Detections + Metrics"| C
    C -->|"If Confidence >= Trigger Conf"| WS
    WS -->|"Broadcast { event: 'trigger' }"| A
    C -->|"Real-time Poll & REST API"| UI
```

---

## 🔄 How It Works

1. **Edge Capture**: The ESP32-CAM captures high-resolution frame buffers at user-defined intervals (e.g., every 3 minutes) and automatically checks connection health with retry back-offs.
2. **Cloud/Local Routing**: The ESP32 streams the frame via `multipart/form-data` to the Node.js Express server (`/detect`).
3. **Advanced Image Pre-processing**:
   - **2x Lanczos-4 Upscaling**: Enhances pixel details for distant or small birds in open fields.
   - **Gaussian Filtering**: Suppresses camera sensor noise and outdoor grain.
   - **LAB Contrast Limited Adaptive Histogram Equalization (CLAHE)**: Normalizes dynamic range and equalizes harsh sunlight or deep shadow.
4. **YOLOv8 Deep Learning Inference**: The pre-loaded YOLOv8 model runs detection specifically isolated for class `14` (`bird`).
5. **Instant Deterrence Triggering**:
   - If the detected bird's confidence equals or exceeds the configurable `trigger_confidence` threshold, an active trigger event is broadcast via **WebSockets** back to the ESP32-CAM.
   - The ESP32 immediately executes a non-blocking multi-frequency **LEDC siren sweep (800Hz - 2000Hz)** through its onboard speaker to humanely disperse the birds.
6. **Data Storage & Dashboard Sync**:
   - Detection metadata (bird count, latency, confidence, timestamp) is persisted in **MongoDB Atlas**.
   - Raw, pre-processed, and bounding-box images are uploaded to **Cloudinary** (or cached as in-memory base64 when offline).
   - The **React SPA Dashboard** surfaces real-time telemetry, 24-hour analytics, and manual inference testing.

---

## ✨ Key Features

- **🚀 Dual-Backend Architecture**: Decoupled Python Flask microservice (optimized solely for fast matrix math & model inference) and Node.js Express server (handles WebSockets, authentication, database persistence, and CDN uploads).
- **⚡ In-Memory Zero-Disk Pipeline**: Image processing, bounding-box overlays, and transformations are kept entirely in memory using OpenCV byte buffers to protect flash storage and deliver sub-second response times.
- **📡 Bidirectional WebSocket Communication**: Allows cloud servers hosted anywhere (e.g., Render) to reach edge ESP32 devices behind NAT or mobile hotspots with zero port forwarding.
- **🌐 Responsive React 19 Dashboard**:
  - **Live Telemetry Cards**: System Status (Safe/Active), Today's Total Bird Detections, Average Confidence Score, and Inference Latency.
  - **Side-by-Side Image Inspector**: Compare raw sensor frames, CLAHE contrast-enhanced frames, and YOLO bounding-box detections.
  - **Manual Testing Suite**: Drag-and-drop any test image to evaluate the AI model in real time without needing an active ESP32.
  - **Live Configuration**: Tune YOLO threshold, Deterrence Trigger threshold, ESP32 IP, and database auto-cleanup days directly from the web interface.
- **🧹 Automatic Data Retention & Smart Pruning**: Automatically purges detection logs older than a configurable number of days (default: 7 days) to remain within free-tier database limits.
- **🐳 Cloud & Container Ready**: Includes pre-configured `docker-compose.yml` for 1-step local deployment and a zero-config `render.yaml` blueprint for cloud hosting.

---

## 🛠 Tech Stack

| Domain | Technology / Library | Purpose |
| :--- | :--- | :--- |
| **Edge Hardware** | ESP32-CAM (AI-Thinker) | OV2640 Image capture, Wi-Fi networking |
| **Firmware** | C++ (Arduino Core) | FreeRTOS tasks, HTTPClient, WebSocketsClient, LEDC PWM |
| **AI & Vision** | Python 3.10, Ultralytics YOLOv8 | Object detection (COCO class: `bird`) |
| **Image Processing** | OpenCV (`cv2`), NumPy | Lanczos-4 upscaling, Gaussian Blur, LAB CLAHE |
| **Python Server** | Flask, Gunicorn | Dedicated AI microservice running on port 5001 |
| **API Gateway** | Node.js, Express | Gateway server, WebSocket broadcaster, port 5000 |
| **WebSockets** | `ws` (Node.js) | Real-time push commands from cloud to hardware |
| **Database** | MongoDB Atlas (Mongoose) | Telemetry persistence, historical logs, settings |
| **Cloud Storage** | Cloudinary CDN | Cloud media hosting for detected bird snapshots |
| **Frontend** | React 19, Vite, React Router 7 | Modern Single Page Application dashboard |
| **Styling & UI** | Bootstrap 5, React-Bootstrap, Lucide Icons | Dark-mode, responsive mobile/desktop dashboard |
| **DevOps** | Docker, Docker Compose, Render | Multi-container virtualization and cloud deployment |

---

## 📂 Repository Structure

```
AI-Bird_Detection/
├── backend/                              # Python AI Inference Microservice
│   ├── app.py                            # Flask server (Image enhancement + YOLOv8)
│   ├── Dockerfile                        # Container definition for Python AI service
│   ├── requirements.txt                  # Python dependencies (Ultralytics, OpenCV, etc.)
│   └── yolov8n.pt                        # Pre-trained YOLOv8 Nano weights
│
├── backend-node/                         # Node.js Express Gateway & WebSocket Server
│   ├── models/
│   │   ├── Detection.js                  # MongoDB schema for detection events
│   │   └── Settings.js                   # MongoDB schema for dynamic system config
│   ├── server.js                         # Express API, WebSocket handler, Cloudinary bridge
│   ├── Dockerfile                        # Container definition for Node gateway
│   ├── package.json                      # Node.js dependencies
│   └── .env.example                      # Sample environment variables
│
├── esp_code/                             # Embedded Firmware
│   └── esp32_cam_bird_deterrence/
│       └── esp32_cam_bird_deterrence.ino # ESP32-CAM Arduino sketch (Wi-Fi, WS, Camera, PWM)
│
├── frontend/                             # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/
│   │   │   └── Navigation.jsx            # Top navigation bar
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx             # Real-time metrics & historical chart
│   │   │   ├── LiveImages.jsx            # Raw, processed, and detected frame view
│   │   │   ├── ManualTesting.jsx         # Upload test images for manual inference
│   │   │   └── Settings.jsx              # System thresholds and camera parameters
│   │   ├── utils/
│   │   │   └── api.js                    # Auto-resolving API client with SSL awareness
│   │   ├── App.jsx                       # Routing setup
│   │   └── main.jsx                      # Vite entry point
│   ├── package.json                      # Frontend dependencies
│   └── vite.config.js                    # Vite configuration
│
├── docker-compose.yml                    # Multi-container local orchestration
├── render.yaml                           # Infrastructure as Code blueprint for Render
├── requirements.txt                      # Root requirements file
└── README.md                             # Comprehensive project documentation
```

---

## 🔌 Hardware Wiring & Assembly

### ESP32-CAM (AI-Thinker) Pin Connections

| ESP32-CAM Pin | Peripheral / Component | Notes |
| :--- | :--- | :--- |
| **5V** | 5V DC Power Supply (2A+) | Dedicated power supply recommended to avoid brownouts |
| **GND** | Common Ground | Tie power supply and peripheral grounds together |
| **GPIO 14** | Buzzer / Siren Control Pin | Driven by PWM (`LEDC` channel 1) via NPN transistor |
| **GPIO 4** | Onboard Flash LED (Optional) | Can be toggled for night-time illumination |
| **GPIO 0** | GND (During flashing only) | Connect to GND to enter download mode; disconnect to run |
| **U0TXD / U0RXD**| FTDI USB-to-TTL Programmer | Connect TX->RX and RX->TX for uploading code |

> [!IMPORTANT]
> **Power Supply Stability**: The ESP32-CAM draws up to 310mA during Wi-Fi transmission bursts. Powering it solely from a low-quality USB-UART adapter can trigger the brownout detector. Always supply a regulated 5V (2A minimum) power source.

### Deterrent Speaker Circuit
To drive a 5V/12V buzzer or loudspeaker from GPIO 14:
1. Connect **GPIO 14** to a 1kΩ resistor leading to the **Base** of an NPN transistor (e.g., 2N2222 or BC547).
2. Connect the **Emitter** to GND.
3. Connect the negative terminal of the speaker/buzzer to the **Collector**.
4. Connect the positive terminal of the speaker/buzzer to 5V (or 12V).
5. Place a flyback diode (1N4007) in reverse-parallel across the buzzer terminals for inductive spike protection.

---

## ⚙ Environment Configuration

### 1. Node.js Backend (`backend-node/.env`)
Create a `.env` file in `backend-node/`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/bird_deterrent?retryWrites=true&w=majority
PYTHON_BACKEND_URL=http://localhost:5001

# Optional: Cloudinary configuration for persistent cloud image hosting
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

### 2. Frontend (`frontend/.env`)
Create a `.env` file in `frontend/`:
```env
# Point this to your Node.js Gateway URL (omit trailing slash)
VITE_API_URL=http://localhost:5000
```

---

## 💻 Local Installation & Setup

### Prerequisites
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.10 recommended)
- [Docker & Docker Compose](https://www.docker.com/) (Optional, for containerized run)
- [Arduino IDE](https://www.arduino.cc/en/software) (for ESP32-CAM programming)

---

### Method 1: Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Praveen-D-dev/AI-Bird_Detection.git
   cd AI-Bird_Detection
   ```

2. **Configure your MongoDB URI** in `docker-compose.yml` or in `backend-node/.env`.

3. **Build and spin up the containers:**
   ```bash
   docker compose up --build
   ```
   - Node.js Gateway will be live at `http://localhost:5000`
   - Python AI Engine will be live at `http://localhost:5001`

4. **Start the Frontend development server:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

### Method 2: Manual Step-by-Step Setup

#### Step 1: Start the Python AI Microservice
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python app.py
```
*The AI service starts on port `5001`.*

#### Step 2: Start the Node.js Express Gateway
```bash
cd backend-node
npm install
npm run dev # or npm start
```
*The API & WebSocket gateway starts on port `5000`.*

#### Step 3: Start the React Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*The dashboard will be available at `http://localhost:5173`.*

---

## 📷 ESP32-CAM Firmware Flashing

1. Open **Arduino IDE**.
2. Install the **ESP32 Board Package** by Espressif:
   - Go to `File` > `Preferences` > `Additional Board Manager URLs`.
   - Add: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`.
   - Open `Tools` > `Board` > `Boards Manager...` and install `esp32`.
3. Install required library:
   - `WebSockets` by *Markus Sattler (Links2004)* via Library Manager.
4. Open `esp_code/esp32_cam_bird_deterrence/esp32_cam_bird_deterrence.ino`.
5. Select Board: **AI Thinker ESP32-CAM**.
6. Set Camera and Wi-Fi credentials in the code:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   
   // For local testing (replace with your computer's LAN IP):
   const char* serverUrl = "http://192.168.1.50:5000/detect";
   const char* wsHost = "192.168.1.50";
   const int wsPort = 5000;
   ```
7. Connect **GPIO 0 to GND**, press the onboard **RST** button, and click **Upload**.
8. Once flashing completes, disconnect GPIO 0 from GND and press **RST** again.
9. Open the Serial Monitor at `115200 baud` to verify Wi-Fi connection and IP handshake.

---

## ☁ Cloud Deployment (Render & Atlas)

The project includes a ready-to-use [`render.yaml`](render.yaml) specification:

1. **Push your code** to your GitHub repository.
2. Log into [Render](https://render.com/) and navigate to **Blueprints**.
3. Select your `AI-Bird_Detection` repository.
4. Render will automatically configure 3 services:
   - `bird-deterrent-node-backend`: Node.js Web Service
   - `bird-deterrent-python-ai`: Docker Web Service running Flask + Gunicorn
   - `bird-deterrent-frontend`: Static Site serving the Vite React build
5. Under Environment Variables for `bird-deterrent-node-backend`:
   - Set `MONGODB_URI` to your MongoDB Atlas connection string.
   - Set `CLOUDINARY_URL` (optional, for persistent image hosting).
6. In `esp32_cam_bird_deterrence.ino`, switch to **Option A (Cloud Testing)**:
   ```cpp
   const char* serverUrl = "https://bird-deterrent-node-backend.onrender.com/detect";
   const char* wsHost = "bird-deterrent-node-backend.onrender.com";
   const int wsPort = 443;
   ```

---

## 📡 API & WebSocket Reference

### HTTP Endpoints

| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/detect` | Uploads an image frame for AI processing | Form-data: `image` (binary). Returns: JSON with bird count, confidence, trigger flag |
| `GET` | `/status` | Fetches the latest system status & daily metrics | Returns: Status (`Safe`/`ACTIVE`), today's bird count, inference latency |
| `GET` | `/settings` | Retrieves active system thresholds | Returns: JSON with `yolo_conf_threshold`, `trigger_confidence`, `esp32_ip` |
| `POST` | `/settings` | Updates active system thresholds | JSON: `{ "trigger_confidence": 0.5, "yolo_conf_threshold": 0.3 }` |
| `GET` | `/images-list`| Returns URLs for raw, processed, and detected frames | Returns: JSON image URLs (Cloudinary or local database) |
| `GET` | `/uploads/:file`| Serves stored image buffers directly from MongoDB | Returns: Binary JPEG image stream |
| `GET` | `/health` | Health check endpoint for monitoring | Returns: `{ "status": "ok", "database": "connected" }` |

### WebSocket Protocol

- **Endpoint**: `ws://<server-ip>:5000/` (or `wss://<cloud-domain>/`)
- **Server to Client Broadcast**:
  ```json
  {
    "event": "trigger",
    "confidence": 0.88
  }
  ```
  When the ESP32 receives this payload, it immediately plays the deterrence sound.

---

## ❓ Troubleshooting & FAQs

<details>
<summary><b>1. ESP32-CAM fails with "Camera init failed with error 0x20001" or brownout</b></summary>

- Ensure your power supply provides at least **5V 2A**. Powering the ESP32-CAM via a PC USB port or 3.3V pin often triggers brownout resets when initializing the camera sensor or connecting to Wi-Fi.
- In the code, `WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);` is included to suppress minor transient resets, but adequate hardware power is still essential.
</details>

<details>
<summary><b>2. YOLO model runs out of memory on Render Free Tier (512MB RAM)</b></summary>

- The project uses `yolov8n.pt` (Nano), which requires only ~80-120MB of RAM.
- Do not swap in larger models like `yolov8x.pt` or `yolov8l.pt` on 512MB RAM instances.
- The Python backend explicitly redirects matplotlib and Ultralytics caches to `/tmp` via environment variables to operate within cloud container constraints.
</details>

<details>
<summary><b>3. Images aren't showing in the React Dashboard</b></summary>

- Check that the `VITE_API_URL` environment variable matches your running Node.js server.
- The dashboard utilizes a self-healing URL resolver (`frontend/src/utils/api.js`) that automatically converts HTTP/HTTPS and handles localhost/cloud transitions.
</details>

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Praveen D**
- GitHub: [@Praveen-D-dev](https://github.com/Praveen-D-dev)
- Repository: [AI-Bird_Detection](https://github.com/Praveen-D-dev/AI-Bird_Detection)
