import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Exports from './pages/Exports';
import SearchLaboratory from './pages/SearchLaboratory';
import Home from './pages/Home';
import GlobalLayout from './components/GlobalLayout';

function App() {
  return (
    <Router>
      <GlobalLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/exports" element={<Exports />} />
          <Route path="/laboratory" element={<SearchLaboratory />} />
        </Routes>
      </GlobalLayout>
    </Router>
  );
}

export default App;
