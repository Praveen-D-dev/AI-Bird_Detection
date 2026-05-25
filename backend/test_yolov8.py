import os
import cv2
import numpy as np
from app import app, load_state

# Setup test client
client = app.test_client()

# Prepare mock file
test_img_path = os.path.join('uploads', '260524_1827.jpg')

if os.path.exists(test_img_path):
    print("--- RUNNING DETECT WITH YOLOv8n ---")
    with open(test_img_path, 'rb') as img_file:
        data = {'image': (img_file, 'test_img.jpg')}
        res = client.post('/detect', data=data, content_type='multipart/form-data')
        
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.get_json()}")
    
    print("\n--- PERSISTED STATE AFTER RUN ---")
    state = load_state()
    print(f"Status: {state.get('status')}")
    print(f"Event: {state.get('event')}")
    print(f"Bird Count: {state.get('bird_count')}")
    print(f"Confidence (Average): {state.get('confidence')}")
else:
    print(f"Test bird image {test_img_path} not found!")

# Clean up
if os.path.exists('state.json'):
    os.remove('state.json')
