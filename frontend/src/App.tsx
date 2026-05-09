import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard }      from './pages/Dashboard';
import { IncidentDetail } from './pages/IncidentDetail';
import { RCAForm }        from './pages/RCAForm';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Dashboard />} />
        <Route path="/incidents/:id"     element={<IncidentDetail />} />
        <Route path="/incidents/:id/rca" element={<RCAForm />} />
        <Route path="*"                  element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}