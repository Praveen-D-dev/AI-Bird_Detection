
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { Bird } from 'lucide-react';

function Navigation() {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-secondary mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bold dashboard-title">
          <Bird className="me-2" />
          BirdAI
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/" active={location.pathname === '/'}>Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/live" active={location.pathname === '/live'}>Live Images</Nav.Link>
            <Nav.Link as={Link} to="/manual" active={location.pathname === '/manual'}>Manual Testing</Nav.Link>
            <Nav.Link as={Link} to="/settings" active={location.pathname === '/settings'}>Settings</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Navigation;
