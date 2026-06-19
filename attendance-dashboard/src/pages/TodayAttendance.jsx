import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Users, UserCheck, Clock, UserX, Calendar, Info } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function TodayAttendance() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef(null);

  // Load attendance data
  const loadAttendance = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);

    try {
      // 1. Get today's schedule
      const scheduleResponse = await attendanceAPI.getTodaySchedule();
      
      if (scheduleResponse.data.status === 'error') {
        setError(scheduleResponse.data.message || 'No class scheduled today');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const schedule = scheduleResponse.data.schedule;
      setScheduleInfo(schedule);

      // 2. Get attendance for this schedule
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await attendanceAPI.getAttendanceReport(
        schedule.schedule_id,
        today
      );

      if (attendanceResponse.data.status === 'success') {
        setAttendance(attendanceResponse.data);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError(attendanceResponse.data.message || 'Failed to load attendance');
      }
    } catch (err) {
      console.error('Failed to load attendance', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadAttendance();

    intervalRef.current = setInterval(() => {
      loadAttendance(false);
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleRefresh = () => {
    loadAttendance(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="text-red-500 text-4xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-slate-800">No Active Class</h3>
        <p className="text-slate-500 mt-2">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Check Again
        </button>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="text-yellow-500 text-4xl mb-4">⏰</div>
        <h3 className="text-lg font-semibold text-slate-800">No Attendance Data</h3>
        <p className="text-slate-500 mt-2">No attendance records for today's class.</p>
        <button
          onClick={handleRefresh}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { summary, students, class_name, date, start_time, end_time } = attendance;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Today's Attendance</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-slate-500">{date}</p>
            {scheduleInfo && (
              <>
                <span className="text-slate-300">|</span>
                <p className="text-slate-500 text-sm">
                  {scheduleInfo.class_code} - {scheduleInfo.class_name}
                </p>
                <span className="text-slate-300">|</span>
                <p className="text-slate-500 text-sm">
                  ⏰ {start_time} - {end_time}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Students</p>
              <p className="text-2xl font-bold text-slate-800">{summary?.total_students || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Present</p>
              <p className="text-2xl font-bold text-green-600">{summary?.present || 0}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">Late</p>
              <p className="text-2xl font-bold text-yellow-600">{summary?.late || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">{summary?.absent || 0}</p>
            </div>
            <UserX className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-600">{summary?.attendance_rate || 0}%</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-blue-500 flex items-center justify-center text-sm font-bold text-blue-600">
              {summary?.attendance_rate || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">Attendance Progress</span>
          <span className="font-medium">{summary?.attendance_rate || 0}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              (summary?.attendance_rate || 0) >= 70 ? 'bg-green-500' :
              (summary?.attendance_rate || 0) >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${summary?.attendance_rate || 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <span className="font-semibold">Student List</span>
          <span className="text-sm text-slate-500">
            {students?.length || 0} students
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">NIM</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                    No students enrolled in this class
                  </td>
                </tr>
              ) : (
                students?.map((student, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm">{student.nim}</td>
                    <td className="px-4 py-3 text-sm font-medium">{student.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                        ${student.final_status === 'Present' ? 'bg-green-100 text-green-700' : ''}
                        ${student.final_status === 'Late' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${student.final_status === 'Absent' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {student.final_status === 'Present' && '✅'}
                        {student.final_status === 'Late' && '⚠️'}
                        {student.final_status === 'Absent' && '❌'}
                        {student.final_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {student.formatted_time || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        Live updates every 30 seconds
      </div>
    </div>
  );
}

export default TodayAttendance;