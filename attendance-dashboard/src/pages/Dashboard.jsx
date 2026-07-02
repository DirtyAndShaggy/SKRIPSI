import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Layers, GraduationCap, Calendar,
  UserCheck, Clock, UserX, TrendingUp, TrendingDown,
  Activity, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import attendanceAPI from '../api/attendance';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [period, setPeriod] = useState('week');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadDashboardData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [period]);

  const loadDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await attendanceAPI.getDashboardStats(
        userData.user_id, 
        period, 
        userData.role
      );
      
      if (response.data.status === 'success') {
        setData(response.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(false);
  };

  const COLORS = ['#22C55E', '#EAB308', '#EF4444', '#3B82F6', '#8B5CF6'];

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

  if (!data) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <div className="text-slate-400">
          <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium">No Data Available</p>
          <p className="text-sm mt-2">Could not load dashboard data.</p>
          <button
            onClick={handleRefresh}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { summary, trend, class_comparison, recent_activity, role } = data;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {role === 'admin' ? 'Admin Dashboard' : 'Lecturer Dashboard'}
          </h1>
          <p className="text-slate-500">
            {role === 'admin' 
              ? 'Overview of all attendance data across the system'
              : 'Overview of your classes and student attendance'
            }
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Month
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 60s
        </span>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Students</p>
              <p className="text-2xl font-bold text-slate-800">{summary.total_students || 0}</p>
            </div>
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Classes</p>
              <p className="text-2xl font-bold text-slate-800">{summary.total_classes || 0}</p>
            </div>
            <BookOpen className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Groups</p>
              <p className="text-2xl font-bold text-slate-800">{summary.total_groups || 0}</p>
            </div>
            <Layers className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Cohorts</p>
              <p className="text-2xl font-bold text-slate-800">{summary.total_cohorts || 0}</p>
            </div>
            <GraduationCap className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Schedules</p>
              <p className="text-2xl font-bold text-slate-800">{summary.total_schedules || 0}</p>
            </div>
            <Calendar className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Today's Rate</p>
              <p className="text-2xl font-bold text-blue-600">{summary.today_rate || 0}%</p>
            </div>
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* ─── TODAY'S ATTENDANCE ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Present Today</p>
              <p className="text-3xl font-bold text-green-700">{summary.today_present || 0}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Late Today</p>
              <p className="text-3xl font-bold text-yellow-700">{summary.today_late || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Absent Today</p>
              <p className="text-3xl font-bold text-red-700">{summary.today_absent || 0}</p>
            </div>
            <UserX className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* ─── ATTENDANCE TREND CHART ─── */}
      <div className="bg-white rounded-xl border p-4 mb-6 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="present" stroke="#22C55E" name="Present" strokeWidth={2} />
            <Line type="monotone" dataKey="late" stroke="#EAB308" name="Late" strokeWidth={2} />
            <Line type="monotone" dataKey="absent" stroke="#EF4444" name="Absent" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ─── CLASS COMPARISON ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Class Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={class_comparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="class_code" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present_count" fill="#22C55E" name="Present" />
              <Bar dataKey="late_count" fill="#EAB308" name="Late" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Attendance Rate by Class</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={class_comparison} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="class_code" type="category" width={60} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar 
                dataKey="attendance_rate" 
                fill="#3B82F6" 
                name="Attendance Rate %"
                barSize={20}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── RECENT ACTIVITY ─── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Recent Activity</h3>
          <span className="text-xs text-slate-400">Live feed</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {recent_activity && recent_activity.length > 0 ? (
            recent_activity.map((activity, index) => (
              <div key={index} className="px-6 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'Present' ? 'bg-green-500' :
                    activity.status === 'Late' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {activity.student_name}
                      <span className="text-xs text-slate-400 font-normal ml-2">{activity.nim}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {activity.class_code} - {activity.class_name}
                      {activity.lecturer_name && ` (${activity.lecturer_name})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    activity.status === 'Present' ? 'bg-green-100 text-green-700' :
                    activity.status === 'Late' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {activity.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>🟢 <strong>Present:</strong> Student arrived on time</span>
        <span>🟡 <strong>Late:</strong> Student arrived after grace period</span>
        <span>🔴 <strong>Absent:</strong> Student did not attend</span>
        <span>📊 <strong>Attendance Rate:</strong> (Present + Late) / Total Students</span>
      </div>
    </div>
  );
}

export default Dashboard;