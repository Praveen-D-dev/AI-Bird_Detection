
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import LiveImages from './pages/LiveImages';
import ManualTesting from './pages/ManualTesting';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="min-vh-100" style={{ backgroundColor: '#121212', color: '#fff' }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveImages />} />
          <Route path="/manual" element={<ManualTesting />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
