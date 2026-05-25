import React, { useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { UploadCloud, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

// Dynamic API base URL resolver based on browser URL (for loopback vs local LAN network debugging)
const getApiUrl = (path) => {
  const hostname = window.location.hostname;
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}${path}`;
  }
  const base = (hostname === 'localhost' || hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : `http://${hostname}:5000`;
  return `${base}${path}`;
};

function ManualTesting() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imageTrigger, setImageTrigger] = useState(0);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreview(URL.createObjectURL(e.target.files[0]));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const res = await axios.post(getApiUrl('/detect'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(res.data);
      setImageTrigger(Date.now());
    } catch (err) {
      console.error("Upload error", err);
      setResult({ error: "Failed to connect to backend server" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="pb-5">
      <Row className="mb-4">
        <Col>
          <h2 className="dashboard-title d-flex align-items-center">
            <UploadCloud className="me-2" /> Manual Testing
          </h2>
          <p className="text-muted">Upload an image to manually test the YOLOv8n + OpenCV pipeline.</p>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Upload Form Card */}
        <Col lg={5} md={12}>
          <Card className="mb-4 h-100">
            <Card.Header>Upload Test Image</Card.Header>
            <Card.Body className="d-flex flex-column justify-content-between">
              <Form.Group className="mb-3">
                <Form.Control 
                  type="file" 
                  accept="image/jpeg, image/png"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="bg-dark text-light border-secondary"
                />
              </Form.Group>

              {preview ? (
                <div className="text-center mb-3">
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="img-fluid rounded border border-secondary" 
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div className="text-center py-5 border border-dashed border-secondary rounded mb-3 text-muted">
                  <UploadCloud size={40} className="mb-2" />
                  <div>Select a JPEG/PNG file to begin</div>
                </div>
              )}

              <div className="d-grid mt-3">
                <Button 
                  variant="primary" 
                  onClick={handleUpload} 
                  disabled={!selectedFile || loading}
                  className="fw-bold"
                >
                  {loading ? <Spinner size="sm" className="me-2"/> : null}
                  Run Inference Pipeline
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Results Card */}
        <Col lg={7} md={12}>
          <Card className="h-100">
            <Card.Header>Inference Result</Card.Header>
            <Card.Body className="d-flex flex-column align-items-center justify-content-center p-3">
              {!result && !loading && (
                <p className="text-muted py-5">Upload an image to run the pipeline analysis.</p>
              )}
              
              {loading && (
                <div className="text-center text-primary py-5">
                  <Spinner animation="border" className="mb-3"/>
                  <p>Running OpenCV Enhancement and YOLOv8n...</p>
                </div>
              )}

              {result && !result.error && (
                <div className="w-100">
                  {result.event === 'bird' ? (
                    <Alert variant="danger" className="d-flex flex-column align-items-center py-3">
                      <XCircle size={40} className="mb-2" />
                      <h5 className="fw-bold mb-1">BIRD DETECTED</h5>
                      <p className="mb-0 small">Deterrent triggered (Confidence: {(result.confidence * 100).toFixed(0)}%)</p>
                    </Alert>
                  ) : (
                    <Alert variant="success" className="d-flex flex-column align-items-center py-3">
                      <CheckCircle size={40} className="mb-2" />
                      <h5 className="fw-bold mb-1">SAFE</h5>
                      <p className="mb-0 small">No birds detected above threshold</p>
                    </Alert>
                  )}

                  {/* 3-Stage Previews */}
                  <h6 className="mt-3 mb-2 text-start text-muted text-uppercase small">Pipeline Visual Output</h6>
                  <Row className="g-2 mb-3">
                    <Col xs={4}>
                      <Card className="bg-black border border-secondary text-center p-0">
                        <div className="bg-dark text-muted py-1" style={{ fontSize: '0.7rem' }}>1. Raw</div>
                        <Card.Body className="p-1 d-flex align-items-center justify-content-center" style={{ height: '90px' }}>
                          <img 
                            src={getApiUrl(`/uploads/latest_raw.jpg?t=${imageTrigger}`)} 
                            alt="Raw Upload" 
                            className="img-fluid rounded"
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={4}>
                      <Card className="bg-black border border-secondary text-center p-0">
                        <div className="bg-dark text-muted py-1" style={{ fontSize: '0.7rem' }}>2. Processed</div>
                        <Card.Body className="p-1 d-flex align-items-center justify-content-center" style={{ height: '90px' }}>
                          <img 
                            src={getApiUrl(`/uploads/latest_processed.jpg?t=${imageTrigger}`)} 
                            alt="Processed Upload" 
                            className="img-fluid rounded"
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={4}>
                      <Card className="bg-black border border-secondary text-center p-0">
                        <div className="bg-dark text-muted py-1" style={{ fontSize: '0.7rem' }}>3. Detected</div>
                        <Card.Body className="p-1 d-flex align-items-center justify-content-center" style={{ height: '90px' }}>
                          <img 
                            src={getApiUrl(`/uploads/latest_detected.jpg?t=${imageTrigger}`)} 
                            alt="Detected Upload" 
                            className="img-fluid rounded"
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>

                  <Card className="bg-dark text-start border-secondary">
                    <Card.Header className="py-2 bg-black text-muted small">Inference JSON Response</Card.Header>
                    <Card.Body className="p-2">
                      <pre className="text-light mb-0 small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {result && result.error && (
                <Alert variant="warning" className="w-100 text-center">
                  {result.error}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ManualTesting;
