import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX,
  Calendar,
  TrendingUp,
  Activity
} from 'lucide-react';
import attendanceAPI from '../api/attendance';
import { getLocalDateString } from '../utils/date';

function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    setTodayDate(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get today's attendance
      const today = getLocalDateString();
      const response = await attendanceAPI.getAttendanceReport(1, today);
      
      if (response.data.status === 'success') {
        const data = response.data;
        setStats({
          totalStudents: data.summary?.total_students || 0,
          presentToday: data.summary?.present || 0,
          lateToday: data.summary?.late || 0,
          absentToday: data.summary?.absent || 0,
          attendanceRate: data.summary?.attendance_rate || 0
        });

        // Get recent activity (last 5 students)
        const recent = data.students?.slice(0, 5) || [];
        setRecentActivity(recent);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Students', 
      value: stats.totalStudents, 
      icon: Users, 
      color: 'blue',
      subtitle: 'Enrolled this semester'
    },
    { 
      title: 'Present Today', 
      value: stats.presentToday, 
      icon: UserCheck, 
      color: 'green',
      subtitle: 'Scanned in today'
    },
    { 
      title: 'Late Today', 
      value: stats.lateToday, 
      icon: Clock, 
      color: 'yellow',
      subtitle: 'Arrived after grace period'
    },
    { 
      title: 'Absent Today', 
      value: stats.absentToday, 
      icon: UserX, 
      color: 'red',
      subtitle: 'Did not attend'
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">{todayDate}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className={`rounded-xl border p-6 ${colorClasses[stat.color]}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-70">{stat.title}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs mt-1 opacity-60">{stat.subtitle}</p>
              </div>
              <stat.icon className="w-8 h-8 opacity-70" />
            </div>
          </div>
        ))}
      </div>

      {/* Attendance Rate Bar */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Today's Attendance Rate</span>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            {stats.attendanceRate}%
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats.attendanceRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-600" />
            <span className="font-semibold">Recent Activity</span>
          </div>
          <span className="text-xs text-slate-400">Live</span>
        </div>
        <div className="divide-y divide-slate-100">
          {recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">
              No recent activity
            </div>
          ) : (
            recentActivity.map((student, index) => (
              <div key={index} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-2 h-2 rounded-full
                    ${student.final_status === 'Present' ? 'bg-green-500' : ''}
                    ${student.final_status === 'Late' ? 'bg-yellow-500' : ''}
                    ${student.final_status === 'Absent' ? 'bg-red-500' : ''}
                  `} />
                  <span className="font-medium">{student.name}</span>
                  <span className="text-sm text-slate-500">{student.nim}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`
                    text-sm font-medium px-2 py-1 rounded-full
                    ${student.final_status === 'Present' ? 'bg-green-100 text-green-700' : ''}
                    ${student.final_status === 'Late' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${student.final_status === 'Absent' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {student.final_status}
                  </span>
                  <span className="text-sm text-slate-400">
                    {student.formatted_time || '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4 flex-wrap">
        <button 
          onClick={() => window.location.href = '/attendance'}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          📋 View Full Attendance
        </button>
        <button 
          onClick={() => window.location.href = '/students'}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          👨‍🎓 Add Student
        </button>
        <button 
          onClick={loadDashboardData}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

export default Dashboard;