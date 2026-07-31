import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import TodayAttendance from './pages/TodayAttendance';
import ExportPage from './pages/ExportPage';  // ✅ Already imported
import Schedules from './pages/Schedules';
import Users from './pages/Users';
import Devices from './pages/Devices';
import Rooms from './pages/Rooms';
import Lecturers from './pages/Lecturers';
import Groups from './pages/Groups';
import Notifications from './pages/Notifications'; 

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (allowedRole && user.role !== allowedRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/students" element={
          <ProtectedRoute>
            <Layout>
              <Students />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/classes" element={
          <ProtectedRoute>
            <Layout>
              <Classes />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rooms" element={
          <ProtectedRoute allowedRole="admin">
            <Layout>
              <Rooms />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/schedules" element={
          <ProtectedRoute allowedRole="admin">
            <Layout>
              <Schedules />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/attendance" element={
          <ProtectedRoute>
            <Layout>
              <TodayAttendance />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/export" element={
          <ProtectedRoute>
            <Layout>
              <ExportPage />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Keep reports route if you want, or redirect to export */}
        <Route path="/reports" element={
          <ProtectedRoute>
            <Layout>
              <ExportPage /> {/* Redirect to new export page */}
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/users" element={
          <ProtectedRoute allowedRole="admin">
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/devices" element={
          <ProtectedRoute allowedRole="admin">
            <Layout>
              <Devices />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/lecturers" element={
          <ProtectedRoute allowedRole="admin">
            <Layout>
              <Lecturers />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/groups" element={
          <ProtectedRoute allowedRole="admin">
            <Layout>
              <Groups />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;