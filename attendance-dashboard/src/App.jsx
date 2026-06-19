import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import TodayAttendance from './pages/TodayAttendance';
import Reports from './pages/Reports';
import Schedules from './pages/Schedules';

// Placeholder pages (we'll build these later)

const Users = () => <div className="p-6 bg-white rounded-xl shadow"><h2 className="text-xl font-bold">User Management</h2><p className="text-slate-500 mt-2">User management coming soon...</p></div>;
const Devices = () => <div className="p-6 bg-white rounded-xl shadow"><h2 className="text-xl font-bold">Device Management</h2><p className="text-slate-500 mt-2">Device management coming soon...</p></div>;

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRole }) => {
  const user = localStorage.getItem('user');
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  const userData = JSON.parse(user);
  
  if (allowedRole && userData.role !== allowedRole && userData.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes with Layout */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout user={user}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/students" element={
          <ProtectedRoute>
            <Layout user={user}>
              <Students />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/classes" element={
          <ProtectedRoute>
            <Layout user={user}>
              <Classes />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/schedules" element={
          <ProtectedRoute allowedRole="admin">
            <Layout user={user}>
              <Schedules />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/attendance" element={
          <ProtectedRoute>
            <Layout user={user}>
              <TodayAttendance />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <Layout user={user}>
              <Reports />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute allowedRole="admin">
            <Layout user={user}>
              <Users />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/devices" element={
          <ProtectedRoute allowedRole="admin">
            <Layout user={user}>
              <Devices />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Redirect to dashboard if logged in */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;