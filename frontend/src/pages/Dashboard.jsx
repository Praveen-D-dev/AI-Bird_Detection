import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Spinner } from 'react-bootstrap';
import { ShieldCheck, ShieldAlert, Bird, Activity, Clock } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';


function Dashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Poll backend every 2 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(getApiUrl('/status'));
        setStatus(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching status", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  const isDanger = status.event === 'bird';

  return (
    <Container className="pb-5">
      <Row className="mb-4 text-center">
        <Col>
          <h1 className="dashboard-title mb-2">System Dashboard</h1>
          <p className="text-muted">Real-time YOLOv8n + OpenCV Monitoring</p>
        </Col>
      </Row>

      <Row className="mb-4 g-4">
        {/* System Status Card */}
        <Col md={6} lg={3}>
          <Card className="h-100 text-center p-3">
            <Card.Body>
              <div className="mb-3">
                {isDanger ? (
                  <ShieldAlert size={48} color="#dc3545" />
                ) : (
                  <ShieldCheck size={48} color="#28a745" />
                )}
              </div>
              <Card.Title className="text-uppercase text-muted" style={{ fontSize: '0.9rem' }}>System Status</Card.Title>
              <h3 className="mb-0 mt-2 d-flex align-items-center justify-content-center fw-bold">
                <span className={`status-indicator ${isDanger ? 'status-danger' : 'status-safe'}`}></span>
                {status.status}
              </h3>
            </Card.Body>
          </Card>
        </Col>

        {/* Inference Latency Card */}
        <Col md={6} lg={3}>
          <Card className="h-100 text-center p-3">
            <Card.Body>
              <div className="mb-3">
                <Clock size={48} color="#00d2ff" />
              </div>
              <Card.Title className="text-uppercase text-muted" style={{ fontSize: '0.9rem' }}>Inference Latency</Card.Title>
              <h3 className="mb-0 mt-2 fw-bold" style={{ color: '#00d2ff' }}>
                {status.inference_time_ms !== undefined ? `${status.inference_time_ms/1000} s` : '0 s'}
              </h3>
            </Card.Body>
          </Card>
        </Col>

        {/* Bird Count Card */}
        <Col md={6} lg={3}>
          <Card className="h-100 text-center p-3">
            <Card.Body>
              <div className="mb-3">
                <Bird size={48} color={isDanger ? "#dc3545" : "#6c757d"} />
              </div>
              <Card.Title className="text-uppercase text-muted" style={{ fontSize: '0.9rem' }}>Birds Today</Card.Title>
              <h3 className="mb-0 mt-2 display-6 fw-bold">
                {status.bird_count}
              </h3>
            </Card.Body>
          </Card>
        </Col>

        {/* Average Confidence Card */}
        <Col md={6} lg={3}>
          <Card className="h-100 text-center p-3">
            <Card.Body>
              <div className="mb-3">
                <Activity size={48} color="#f6c23e" />
              </div>
              <Card.Title className="text-uppercase text-muted" style={{ fontSize: '0.9rem' }}>Avg Confidence Today</Card.Title>
              <h3 className="mb-0 mt-2 display-6 fw-bold">
                {status.confidence > 0 ? `${(status.confidence * 100).toFixed(0)}%` : '0%'}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex align-items-center py-3">
              <Clock size={20} className="me-2" /> Detection History
            </Card.Header>
            <Card.Body className="p-0">
              <Table variant="dark" responsive hover className="mb-0" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="py-3">Bird Count</th>
                    <th className="py-3">Confidence</th>
                    <th className="py-3">Event Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.history && status.history.length > 0 ? (
                    status.history.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-muted">{item.time}</td>
                        <td className="py-3">{item.bird_count}</td>
                        <td className="py-3">{(item.confidence * 100).toFixed(0)}%</td>
                        <td className="py-3"><Badge bg="danger">Detected</Badge></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-5 text-muted">
                        No recent detections. The system is monitoring the field...
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
