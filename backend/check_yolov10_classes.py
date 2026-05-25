from ultralytics import YOLO
import os

YOLO_MODEL_PATH = 'yolov10n.pt'
model = YOLO(YOLO_MODEL_PATH)

print("--- MODEL CLASSES ---")
print(f"Total classes: {len(model.names)}")
print(f"Class 14: {model.names.get(14)}")
print(f"All classes: {model.names}")

# Let's check detections on one of the uploaded images that failed to detect birds
test_img_path = os.path.join('uploads', '260524_1924.jpg')
if os.path.exists(test_img_path):
    print(f"\n--- RUNNING INFERENCE ON {test_img_path} ---")
    results = model(test_img_path)
    for result in results:
        boxes = result.boxes
        print(f"Total detections: {len(boxes)}")
        for i, box in enumerate(boxes):
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names.get(cls_id, f"unknown_{cls_id}")
            print(f"  [{i}] Class: {cls_id} ({label}), Confidence: {conf:.4f}, Box: {box.xyxy[0].tolist()}")
else:
    print(f"\nTest image {test_img_path} does not exist!")
