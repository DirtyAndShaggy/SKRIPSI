import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import attendanceAPI from '../api/attendance';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await attendanceAPI.login(email, password);
      
      if (response.data.status === 'success') {
        // Store user info
        localStorage.setItem('token', 'dummy-token'); // Replace with real token
        localStorage.setItem('user', JSON.stringify({
          role: response.data.role,
          name: response.data.name,
        }));
        
        // Redirect based on role
        if (response.data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/lecturer');
        }
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6">
          Smart Attendance System
        </h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        {/* Demo credentials for testing */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          <p>Demo Admin: admin@test.com / admin123</p>
          <p>Demo Lecturer: lecturer@test.com / lecturer123</p>
        </div>
      </div>
    </div>
  );
}

export default Login;