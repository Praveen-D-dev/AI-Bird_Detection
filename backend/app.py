import os

# Force writable directories for cloud environments (Render Free Tier)
os.environ['YOLO_CONFIG_DIR'] = '/tmp/Ultralytics'
os.environ['MPLCONFIGDIR'] = '/tmp/matplotlib'

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import time
import requests
import threading
import base64

app = Flask(__name__)
CORS(app)

# Default configuration fallback constants
TRIGGER_CONFIDENCE = 0.45
YOLO_CONF_THRESHOLD = 0.25
ESP32_IP = "192.168.1.100"

# Path to model files (Check parent directory or current directory)
YOLO_MODEL_PATH = '../yolov8n.pt' if os.path.exists('../yolov8n.pt') else 'yolov8n.pt'

from ultralytics import YOLO

print(f"Pre-loading YOLO model from {YOLO_MODEL_PATH} on startup...")
yolo_model = YOLO(YOLO_MODEL_PATH)

def to_base64(img):
    """Encodes OpenCV image array to base64 JPEG data URI in-memory"""
    try:
        # Optimized to 80% quality to reduce payload size and memory footprint by ~50-60%
        _, buffer = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
    except Exception as e:
        print(f"Error encoding image to base64: {e}")
        return None

@app.route('/sync-settings', methods=['POST'])
def sync_settings():
    """Endpoint for Node.js Express server to synchronize configuration states"""
    global TRIGGER_CONFIDENCE, YOLO_CONF_THRESHOLD, ESP32_IP
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data"}), 400
    if 'esp32_ip' in data:
        ESP32_IP = data['esp32_ip']
    if 'trigger_confidence' in data:
        TRIGGER_CONFIDENCE = float(data['trigger_confidence'])
    if 'yolo_conf_threshold' in data:
        YOLO_CONF_THRESHOLD = float(data['yolo_conf_threshold'])
    print(f"Synced settings from Node: IP={ESP32_IP}, TriggerConf={TRIGGER_CONFIDENCE}, YoloConf={YOLO_CONF_THRESHOLD}")
    return jsonify({"status": "success"})

@app.route('/detect_process', methods=['POST'])
def detect_process():
    """Main image processing and object detection endpoint. Runs entirely in-memory."""
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    file = request.files['image']
    
    # Read settings dynamically from the calling Express server
    yolo_conf = float(request.form.get('yolo_conf_threshold', YOLO_CONF_THRESHOLD))
    trigger_conf = float(request.form.get('trigger_confidence', TRIGGER_CONFIDENCE))
    esp_ip = request.form.get('esp32_ip', ESP32_IP)
    
    try:
        # Decode uploaded image buffer
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Failed to decode image"}), 400
            
        raw_b64 = to_base64(img)
        
        # 1. Full-Frame 2x Lanczos Upscaling
        h, w = img.shape[:2]
        img_upscaled = cv2.resize(img, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
        
        # 2. Gaussian Blur to remove noise
        img_blurred = cv2.GaussianBlur(img_upscaled, (3, 3), 0)
        
        # 3. CLAHE Contrast Equalization
        lab = cv2.cvtColor(img_blurred, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        merged = cv2.merge((cl, a_channel, b_channel))
        img_processed = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
        
        processed_b64 = to_base64(img_processed)
        
        # 4. Model Inference (Pre-loaded)
        start_time = time.time()
        results = yolo_model(img_processed, conf=yolo_conf)
        inference_time_ms = int((time.time() - start_time) * 1000)
        
        # 5. Drawing Bounding Boxes
        img_detect = img_processed.copy()
        bird_detected_final = False
        max_confidence = 0.0
        bird_count = 0
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Class 14 is 'bird' in COCO datasets
                if int(box.cls[0]) == 14:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])
                    
                    # Draw visual boxes
                    cv2.rectangle(img_detect, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    label = f"bird {int(conf * 100)}%"
                    
                    # Legible text banner
                    (w_text, h_text), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
                    cv2.rectangle(img_detect, (x1, y1 - 20), (x1 + w_text, y1), (0, 0, 255), -1)
                    cv2.putText(img_detect, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
                    
                    bird_detected_final = True
                    bird_count += 1
                    if conf > max_confidence:
                        max_confidence = conf
                        
        detected_b64 = to_base64(img_detect)
        
        status_text = "Safe"
        event_text = "none"
        
        if bird_detected_final:
            event_text = "bird"
            status_text = "ACTIVE"
            
            # Physical deterrent triggering is now delegated to the Node.js Express Gateway.
            # This prevents networking timeouts and unroutable local IP errors when this 
            # python container is hosted in the cloud.
            if max_confidence >= trigger_conf:
                print(f"Bird detected (Conf: {max_confidence:.2f}). Trigger logic delegated to Node.js gateway.")
                
        return jsonify({
            "event": event_text,
            "bird_count": bird_count,
            "confidence": round(max_confidence, 2),
            "status": status_text,
            "inference_time_ms": inference_time_ms,
            "raw_base64": raw_b64,
            "processed_base64": processed_b64,
            "detected_base64": detected_b64
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal processing error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
