import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Exports from './pages/Exports';
import SearchLaboratory from './pages/SearchLaboratory';
import QualityAnalysis from './pages/QualityAnalysis';
import Home from './pages/Home';
import Keywords from './pages/Keywords';
import Admin from './pages/Admin';
import SearchHistory from './pages/SearchHistory';
import GlobalLayout from './components/GlobalLayout';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <GlobalLayout>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/login"            element={<Login />} />
          <Route path="/register"         element={<Register />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/reset-password"   element={<ResetPassword />} />

          <Route path="/laboratory" element={<PrivateRoute><SearchLaboratory /></PrivateRoute>} />
          <Route path="/keywords"   element={<PrivateRoute><Keywords /></PrivateRoute>} />
          <Route path="/history"    element={<PrivateRoute><SearchHistory /></PrivateRoute>} />
          <Route path="/exports"    element={<PrivateRoute><Exports /></PrivateRoute>} />
          <Route path="/quality"    element={<PrivateRoute><QualityAnalysis /></PrivateRoute>} />
          <Route path="/settings"   element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/admin"      element={<PrivateRoute><Admin /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </GlobalLayout>
    </Router>
  );
}

export default App;
