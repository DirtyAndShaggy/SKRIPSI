import React, { useState, useEffect } from 'react';
import TodayAttendance from './TodayAttendance';
import Report from './Report';
import attendanceAPI from '../api/attendance';

function LecturerDashboard() {
  const [activeTab, setActiveTab] = useState('today');
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Load classes for this lecturer
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await attendanceAPI.getClasses();
      if (response.data.status === 'success') {
        setClasses(response.data.classes);
        if (response.data.classes.length > 0) {
          setSelectedClass(response.data.classes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">
            Attendance System
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.name}</span>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Class Selector */}
      <div className="container mx-auto mt-4 px-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">Select Class:</label>
          <select
            value={selectedClass?.class_id || ''}
            onChange={(e) => {
              const selected = classes.find(c => c.class_id === parseInt(e.target.value));
              setSelectedClass(selected);
            }}
            className="border rounded-lg px-3 py-2 w-full md:w-64"
          >
            {classes.map(cls => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name} ({cls.class_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto mt-4 px-4">
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'today'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            Today's Attendance
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'report'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            Attendance Report
          </button>
        </div>

        <div className="mt-4">
          {activeTab === 'today' && selectedClass && (
            <TodayAttendance classId={selectedClass.class_id} />
          )}
          {activeTab === 'report' && selectedClass && (
            <Report classId={selectedClass.class_id} />
          )}
        </div>
      </div>
    </div>
  );
}

export default LecturerDashboard;