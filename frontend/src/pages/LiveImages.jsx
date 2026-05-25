import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { Image as ImageIcon, Cpu, Sparkles, Eye } from 'lucide-react';
import { getApiUrl } from '../utils/api';


function LiveImages() {
  const [images, setImages] = useState({ latest_raw: null, latest_processed: null, latest_detected: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await axios.get(getApiUrl('/images-list'));
        setImages(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching images", err);
      }
    };

    fetchImages();
    const interval = setInterval(fetchImages, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  return (
    <Container className="pb-5">
      <Row className="mb-4">
        <Col>
          <h2 className="dashboard-title d-flex align-items-center">
            <ImageIcon className="me-2" /> FAER Processing Pipeline
          </h2>
          <p className="text-muted">Real-time breakdown of image preprocessing and object detection stages.</p>
        </Col>
      </Row>

      {/* 3-Stage Responsive Comparison Grid */}
      <Row className="g-4 mb-5">
        {/* Stage 1: Raw */}
        <Col lg={4} md={6}>
          <Card className="h-100 border border-secondary bg-dark">
            <Card.Header className="d-flex align-items-center bg-black text-light py-2">
              <Cpu size={16} className="me-2 text-danger" />
              <span>Stage 1: Raw Input</span>
            </Card.Header>
            <Card.Body className="text-center bg-black d-flex align-items-center justify-content-center p-2" style={{ minHeight: '260px' }}>
              {images.latest_raw ? (
                <img 
                  src={getApiUrl(images.latest_raw)} 
                  alt="Raw ESP32 Frame" 
                  className="img-fluid rounded"
                  style={{ maxHeight: '350px', width: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-muted small">No raw frame received yet</span>
              )}
            </Card.Body>
            <Card.Footer className="bg-dark text-muted small py-2">
              Original low-quality, noisy JPEG frame transmitted from the ESP32-CAM.
            </Card.Footer>
          </Card>
        </Col>

        {/* Stage 2: Preprocessed */}
        <Col lg={4} md={6}>
          <Card className="h-100 border border-secondary bg-dark">
            <Card.Header className="d-flex align-items-center bg-black text-light py-2">
              <Sparkles size={16} className="me-2 text-warning" />
              <span>Stage 2: Enhanced Preprocessing</span>
            </Card.Header>
            <Card.Body className="text-center bg-black d-flex align-items-center justify-content-center p-2" style={{ minHeight: '260px' }}>
              {images.latest_processed ? (
                <img 
                  src={getApiUrl(images.latest_processed)} 
                  alt="Processed Frame" 
                  className="img-fluid rounded"
                  style={{ maxHeight: '350px', width: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-muted small">No preprocessed frame yet</span>
              )}
            </Card.Body>
            <Card.Footer className="bg-dark text-muted small py-2">
              2x Lanczos upscaling + Gaussian Blur noise cleanup + CLAHE local contrast adjustment.
            </Card.Footer>
          </Card>
        </Col>

        {/* Stage 3: Detected */}
        <Col lg={4} md={12}>
          <Card className="h-100 border border-secondary bg-dark">
            <Card.Header className="d-flex align-items-center bg-black text-light py-2">
              <Eye size={16} className="me-2 text-success" />
              <span>Stage 3: YOLOv8n Detection</span>
            </Card.Header>
            <Card.Body className="text-center bg-black d-flex align-items-center justify-content-center p-2" style={{ minHeight: '260px' }}>
              {images.latest_detected ? (
                <img 
                  src={getApiUrl(images.latest_detected)} 
                  alt="Detected Objects" 
                  className="img-fluid rounded"
                  style={{ maxHeight: '350px', width: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span className="text-muted small">No detections run yet</span>
              )}
            </Card.Body>
            <Card.Footer className="bg-dark text-muted small py-2">
              YOLOv8 Nano inference (conf &ge; 0.25) running in-memory with bounding boxes drawn only on birds.
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* Visual Pipeline Legend / Explainer */}
      <Card className="border border-secondary bg-dark text-light">
        <Card.Header className="fw-bold bg-black">Pipeline Architecture Overview (FAER)</Card.Header>
        <Card.Body className="p-4">
          <Row className="g-4 text-center">
            <Col sm={3}>
              <div className="p-3 bg-black rounded border border-danger">
                <h6 className="text-danger fw-bold mb-1">1. Filter (ESP32)</h6>
                <p className="text-muted mb-0 small">Noisy frame captured and transmitted over Wi-Fi</p>
              </div>
            </Col>
            <Col sm={3}>
              <div className="p-3 bg-black rounded border border-warning">
                <h6 className="text-warning fw-bold mb-1">2. Augment (OpenCV)</h6>
                <p className="text-muted mb-0 small">Lanczos upscaling, Gaussian noise filtering, and CLAHE</p>
              </div>
            </Col>
            <Col sm={3}>
              <div className="p-3 bg-black rounded border border-success">
                <h6 className="text-success fw-bold mb-1">3. Evaluate (YOLO)</h6>
                <p className="text-muted mb-0 small">Lightweight YOLOv8 Nano inference for high-speed bird detection</p>
              </div>
            </Col>
            <Col sm={3}>
              <div className="p-3 bg-black rounded border border-primary">
                <h6 className="text-primary fw-bold mb-1">4. Response (ESP32)</h6>
                <p className="text-muted mb-0 small">Async buzzer signal fired if max confidence exceeds threshold</p>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default LiveImages;
