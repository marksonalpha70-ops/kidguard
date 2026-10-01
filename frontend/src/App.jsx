import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ChildDetail from './pages/ChildDetail'
import Rewards from './pages/Rewards'

// Auth guard
function PrivateRoute({ children }) {
  const token = localStorage.getItem('kidguard_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route path="/" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/child/:id" element={
          <PrivateRoute><ChildDetail /></PrivateRoute>
        } />
        <Route path="/child/:id/rewards" element={
          <PrivateRoute><Rewards /></PrivateRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
