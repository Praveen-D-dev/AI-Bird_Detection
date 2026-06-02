import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';


function Settings() {
  const [config, setConfig] = useState({
    esp32_ip: '',
    trigger_confidence: 0.45,
    yolo_conf_threshold: 0.25,
    cleanup_age_days: 7
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: 'success', message: '' });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(getApiUrl('/settings'));
      setConfig(res.data);
      setAlert({ show: false, variant: 'success', message: '' });
    } catch (err) {
      console.error("Error fetching settings", err);
      setAlert({ 
        show: true, 
        variant: 'danger', 
        message: 'Failed to connect to backend server. Make sure Flask is running.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch current config on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAlert({ show: false, variant: 'success', message: '' });
    
    try {
      const res = await axios.post(getApiUrl('/settings'), config);
      if (res.data.status === 'success') {
        setConfig(res.data.config);
        setAlert({ 
          show: true, 
          variant: 'success', 
          message: 'System configuration updated successfully!' 
        });
      }
    } catch (err) {
      console.error("Error saving settings", err);
      setAlert({ 
        show: true, 
        variant: 'danger', 
        message: 'Failed to save configuration values.' 
      });
    } finally {
      setSaving(false);
    }
  };

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
        <Col className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="dashboard-title d-flex align-items-center">
              <SettingsIcon className="me-2" /> System Configuration
            </h2>
            <p className="text-muted mb-0">Configure the hardware and AI pipeline parameters.</p>
          </div>
          <Button variant="outline-light" size="sm" onClick={fetchSettings} className="d-flex align-items-center">
            <RefreshCw size={14} className="me-1" /> Reload
          </Button>
        </Col>
      </Row>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible className="mb-4 text-center">
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col lg={8} className="mx-auto">
          <Form onSubmit={handleSave}>
            {/* Hardware Configuration */}
            <Card className="mb-4 border-secondary">
              <Card.Header className="bg-black text-light py-3 fw-bold">Hardware Configuration</Card.Header>
              <Card.Body className="bg-dark text-light">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">ESP32-CAM IP Address</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={config.esp32_ip} 
                    onChange={(e) => handleInputChange('esp32_ip', e.target.value)}
                    className="bg-dark text-light border-secondary focus-dark"
                    placeholder="e.g. 192.168.1.100"
                    required
                  />
                  <Form.Text className="text-muted">
                    The IP address of the ESP32-CAM module to which the deterrent GET request is routed.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Disk Cleanup Interval (Days)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={config.cleanup_age_days} 
                    onChange={(e) => handleInputChange('cleanup_age_days', parseInt(e.target.value) || 1)}
                    className="bg-dark text-light border-secondary"
                    min="1"
                    max="30"
                    required
                  />
                  <Form.Text className="text-muted">
                    Old raw, processed, and detected images will be cleaned up automatically after this many days.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* AI Configuration */}
            <Card className="mb-4 border-secondary">
              <Card.Header className="bg-black text-light py-3 fw-bold">AI Pipeline Parameters</Card.Header>
              <Card.Body className="bg-dark text-light">
                {/* YOLOv8 Confidence Threshold */}
                <Form.Group className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="fw-semibold mb-0">YOLOv8 Detection Confidence</Form.Label>
                    <span className="badge bg-primary">{(config.yolo_conf_threshold * 100).toFixed(0)}%</span>
                  </div>
                  <Form.Range 
                    min={0.05} 
                    max={0.95} 
                    step={0.05}
                    value={config.yolo_conf_threshold}
                    onChange={(e) => handleInputChange('yolo_conf_threshold', parseFloat(e.target.value))}
                  />
                  <div className="d-flex justify-content-between text-muted small px-1">
                    <span>Low (More detections)</span>
                    <span>High (More precise)</span>
                  </div>
                  <Form.Text className="text-muted d-block mt-1">
                    The threshold required for YOLOv8n to identify a bird bounding box (defaults to 0.25).
                  </Form.Text>
                </Form.Group>

                {/* Deterrent Trigger Confidence */}
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="fw-semibold mb-0">ESP32 Deterrent Trigger Threshold</Form.Label>
                    <span className="badge bg-danger">{(config.trigger_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <Form.Range 
                    min={0.10} 
                    max={0.95} 
                    step={0.05}
                    value={config.trigger_confidence}
                    onChange={(e) => handleInputChange('trigger_confidence', parseFloat(e.target.value))}
                  />
                  <div className="d-flex justify-content-between text-muted small px-1">
                    <span>Sensitive</span>
                    <span>Strict</span>
                  </div>
                  <Form.Text className="text-muted d-block mt-1">
                    Only trigger the ESP32 async threat buzzer if the average detection confidence exceeds this level (defaults to 0.45).
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Save Buttons */}
            <div className="d-grid gap-2">
              <Button type="submit" variant="primary" disabled={saving} size="lg" className="fw-bold">
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Saving Configuration...
                  </>
                ) : (
                  <>
                    <Save size={18} className="me-2" /> Save System Settings
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default Settings;
