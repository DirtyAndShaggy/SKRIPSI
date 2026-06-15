import React, { useState, useEffect } from 'react';
import attendanceAPI from '../api/attendance';

function TodayAttendance({ classId }) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // For now using schedule_id=1, you'll need to map class to schedule
      const response = await attendanceAPI.getAttendanceReport(1, today);
      
      if (response.data.status === 'success') {
        setAttendance(response.data);
      } else {
        setError(response.data.message || 'Failed to load attendance');
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  useEffect(() => {
    loadAttendance();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAttendance, 30000);
    return () => clearInterval(interval);
  }, [classId]);

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="text-gray-500">Loading attendance...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-lg">
        Error: {error}
      </div>
    );
  }

  const { summary, students, class_name, date } = attendance;

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">
            {summary?.total_students || 0}
          </div>
          <div className="text-gray-500">Total Students</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-green-600">
            {summary?.present || 0}
          </div>
          <div className="text-gray-500">Present</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-yellow-600">
            {summary?.late || 0}
          </div>
          <div className="text-gray-500">Late</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-red-600">
            {summary?.absent || 0}
          </div>
          <div className="text-gray-500">Absent</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between mb-2">
          <span>Attendance Rate</span>
          <span className="font-bold">{summary?.attendance_rate || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full transition-all"
            style={{ width: `${summary?.attendance_rate || 0}%` }}
          />
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">NIM</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students?.map((student, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{student.nim}</td>
                  <td className="px-4 py-3 text-sm">{student.name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${student.final_status === 'Present' ? 'bg-green-100 text-green-700' : ''}
                      ${student.final_status === 'Late' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${student.final_status === 'Absent' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {student.final_status === 'Present' && '✓ Present'}
                      {student.final_status === 'Late' && '⚠ Late'}
                      {student.final_status === 'Absent' && '✗ Absent'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {student.formatted_time || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last updated */}
      <div className="text-right text-xs text-gray-400 mt-4">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}

export default TodayAttendance;