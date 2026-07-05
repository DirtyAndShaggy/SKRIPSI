import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Users, UserCheck, Clock, UserX, 
  Calendar, ChevronDown, Loader2, Download, 
  Filter, Search, AlertCircle, Info, 
  Eye, FileText, Activity, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import attendanceAPI from '../api/attendance';
import { getLocalDateString } from '../utils/date';

function TodayAttendance() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('lecturer');
  
  // ─── DATA STATES ───
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [allAttendance, setAllAttendance] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  
  // ─── FILTER STATES ───
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // ─── UI STATES ───
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [viewMode, setViewMode] = useState('summary'); // 'summary', 'logs', 'debug'
  
  const intervalRef = useRef(null);

  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const getScheduleDayName = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  };

  const pickBestScheduleForDate = (scheduleList, dateString) => {
    if (!Array.isArray(scheduleList) || scheduleList.length === 0) return null;
    const scheduleForDay = scheduleList.find(s => s.day_of_week === getScheduleDayName(dateString));
    return scheduleForDay || scheduleList[0];
  };

  const filterAdminAttendance = () => {
    return allAttendance.filter(record => {
      if (selectedClass && String(record.class_id) !== String(selectedClass.class_id)) return false;
      if (selectedScheduleId && String(record.schedule_id) !== String(selectedScheduleId)) return false;
      if (selectedGroup && String(record.group_id) !== String(selectedGroup.group_id)) return false;
      if (selectedSemester && String(record.schedule_semester) !== String(selectedSemester)) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return [record.student_name, record.nim, record.class_name, record.group_name, record.lecturer_name]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(term));
    });
  };

  const rawAdminAttendance = filterAdminAttendance();
  const isTodaySelected = selectedDate === getLocalDateString();
  const hasActualTodayAttendance = allAttendance.some(record => record.timestamp);
  const adminAttendance = isTodaySelected && !hasActualTodayAttendance ? [] : rawAdminAttendance;
  const noActualAttendanceToday = selectedDate === getLocalDateString() && attendanceData?.students?.length > 0 && attendanceData.students.every(s => !s.timestamp);

  const getAdminSummary = () => {
    const total = adminAttendance.length;
    const present = adminAttendance.filter(r => r.status === 'Present').length;
    const late = adminAttendance.filter(r => r.status === 'Late').length;
    const absent = adminAttendance.filter(r => r.status !== 'Present' && r.status !== 'Late').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  };

  const adminStats = getAdminSummary();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    let initialRole = 'lecturer';
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      initialRole = parsed.role || 'lecturer';
      setRole(initialRole);
    }
    loadData(initialRole);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (role === 'admin') {
        loadAllAttendance(selectedDate);
      } else if (selectedScheduleId) {
        loadAttendance(false, selectedScheduleId);
      }
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [role, selectedScheduleId, selectedDate]);

  const loadData = async (currentRole = role) => {
    setLoading(true);
    try {
      if (currentRole === 'admin') {
        await loadAdminData();
      } else {
        await loadLecturerData();
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── LOAD ADMIN DATA ───
  const loadAdminData = async () => {
    try {
      // Reset admin filters for a full system view
      setSelectedClass(null);
      setSelectedScheduleId(null);
      setSelectedGroup(null);
      setSelectedSemester('');
      setSearchTerm('');

      // Load all classes
      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }
      // Load all groups
      const groupsResponse = await attendanceAPI.getGroups();
      if (groupsResponse.data.status === 'success') {
        const allGroups = groupsResponse.data.cohorts.flatMap(c => c.groups || []);
        setGroups(allGroups);
        setCohorts(groupsResponse.data.cohorts || []);
      }

      // Load all schedules
      const schedulesResponse = await attendanceAPI.getAllSchedules();
      if (schedulesResponse.data.status === 'success') {
        const availableSchedules = schedulesResponse.data.schedules;
        setSchedules(availableSchedules);
        setAllSchedules(availableSchedules);
      }

      await loadAllAttendance(selectedDate);

      // Load all attendance logs (for admin)
      const logsResponse = await attendanceAPI.getAttendanceLogs();
      if (logsResponse.data.status === 'success') {
        setAttendanceLogs(logsResponse.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      throw err;
    }
  };

  // ─── LOAD LECTURER DATA ───
  const loadLecturerData = async () => {
    try {
      const response = await attendanceAPI.getLecturerClasses();
      if (response.data.status === 'success') {
        setClasses(response.data.classes);
        if (response.data.classes.length > 0) {
          setSelectedClass(response.data.classes[0]);
          await loadSchedulesForClass(response.data.classes[0].class_id);
        }
      }
    } catch (err) {
      console.error('Failed to load lecturer data:', err);
      throw err;
    }
  };

  const loadAllAttendance = async (date) => {
    const normalizedDate = date || getLocalDateString();
    setLoading(true);
    try {
      const response = await attendanceAPI.getAttendanceByDate(normalizedDate);
      if (response.data.status === 'success') {
        setAllAttendance(response.data.records || []);
        setAttendanceData(null);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError(response.data.message || 'Failed to load attendance');
      }
    } catch (err) {
      console.error('Failed to load all attendance:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulesForClass = async (classId) => {
    try {
      const response = await attendanceAPI.getSchedules(classId);
      if (response.data.status === 'success') {
        const availableSchedules = response.data.schedules;
        setSchedules(availableSchedules);
        if (availableSchedules.length > 0) {
          const preferredSchedule = pickBestScheduleForDate(availableSchedules, selectedDate);
          const scheduleToLoad = preferredSchedule?.schedule_id || availableSchedules[0].schedule_id;
          setSelectedScheduleId(scheduleToLoad);
          await loadAttendance(true, scheduleToLoad);
        } else {
          setError('No schedules found for this class');
          setAttendanceData(null);
        }
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError('Failed to load schedules for this class');
    }
  };

  const loadAttendance = async (showLoading = true, scheduleId = null) => {
    const targetScheduleId = scheduleId || selectedScheduleId;
    if (!targetScheduleId) return;
    
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await attendanceAPI.getAttendanceBySchedule(targetScheduleId, selectedDate || getLocalDateString());
      if (response.data.status === 'success') {
        setAttendanceData(response.data);
        setLastUpdated(new Date());
        setError('');
      } else {
        setError(response.data.message || 'Failed to load attendance');
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClassChange = async (classId) => {
    const normalizedClassId = classId == null ? null : String(classId);
    const cls = classes.find(c => String(c.class_id) === normalizedClassId) || null;
    setSelectedClass(cls);
    setError('');
    if (role === 'lecturer') {
      await loadSchedulesForClass(classId);
    } else {
      const filtered = normalizedClassId
        ? allSchedules.filter(s => String(s.class_id) === normalizedClassId)
        : allSchedules;
      setSchedules(filtered);
      setSelectedScheduleId(null);
    }
  };

  const handleScheduleChange = (scheduleId) => {
    setSelectedScheduleId(scheduleId || null);
    if (role !== 'admin') {
      loadAttendance(true, scheduleId);
    }
  };

  const handleRefresh = () => {
    if (role === 'admin') {
      loadAllAttendance(selectedDate);
    } else if (selectedScheduleId) {
      loadAttendance(false, selectedScheduleId);
    }
  };

  const handleClearFilters = async () => {
    const today = getLocalDateString();
    setSelectedDate(today);
    setSelectedClass(null);
    setSelectedScheduleId(null);
    setSelectedGroup(null);
    setSelectedSemester('');
    setSearchTerm('');
    setError('');

    if (role === 'admin') {
      setSchedules(allSchedules);
      await loadAllAttendance(today);
    } else if (schedules.length > 0) {
      const preferredSchedule = pickBestScheduleForDate(schedules, today);
      const scheduleToLoad = preferredSchedule?.schedule_id || schedules[0].schedule_id;
      setSelectedScheduleId(scheduleToLoad);
      await loadAttendance(true, scheduleToLoad);
    }
  };

  const handleDateChange = async (e) => {
    const newDate = e.target.value || getLocalDateString();
    setSelectedDate(newDate);
    if (role === 'admin') {
      await loadAllAttendance(newDate);
    } else if (selectedScheduleId) {
      await loadAttendance(true, selectedScheduleId);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Present') {
      return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Present</span>;
    } else if (status === 'Late') {
      return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>Late</span>;
    } else {
      return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Absent</span>;
    }
  };

  const getSummaryStats = () => {
    if (!attendanceData || noActualAttendanceToday) return null;
    const total = attendanceData.summary?.total_students || 0;
    const present = attendanceData.summary?.present || 0;
    const late = attendanceData.summary?.late || 0;
    const absent = attendanceData.summary?.absent || 0;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  };

  const stats = getSummaryStats();

  if (loading && !attendanceData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-500">Loading {role === 'admin' ? 'all attendance data' : 'your classes'}...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Today's Attendance</h1>
            {role === 'admin' && (
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin View
              </span>
            )}
          </div>
          <p className="text-slate-500">
            {role === 'admin' 
              ? 'Full system attendance overview with debug information' 
              : 'View and manage attendance for your classes'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle (Admin only) */}
          {role === 'admin' && (
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1.5 text-xs ${
                  viewMode === 'summary' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('logs')}
                className={`px-3 py-1.5 text-xs ${
                  viewMode === 'logs' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Logs
              </button>
              <button
                onClick={() => setViewMode('debug')}
                className={`px-3 py-1.5 text-xs ${
                  viewMode === 'debug' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Debug
              </button>
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleClearFilters}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            Clear Filters
          </button>
          <span className="text-xs text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={selectedClass?.class_id || ''}
                onChange={(e) => handleClassChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_code} - {cls.class_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Schedule Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
              <select
                value={selectedScheduleId || ''}
                onChange={(e) => handleScheduleChange(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Schedules</option>
                {schedules.map(schedule => (
                  <option key={schedule.schedule_id} value={schedule.schedule_id}>
                    {schedule.day_of_week} {schedule.start_time} - {schedule.end_time}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate || getLocalDateString()}
                onChange={handleDateChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Semester Filter (Admin only) */}
            {role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Semesters</option>
                  {semesterOptions.map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              onClick={handleClearFilters}
              className="w-full md:w-auto bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              Clear Filters
            </button>

            {role === 'admin' && (
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students by name, NIM, or group..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* ─── ADMIN VIEW ─── */}
      {role === 'admin' && viewMode === 'logs' && (
        <div className="bg-white rounded-xl border shadow-sm mb-4 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-700">Attendance Logs (Debug)</h3>
            </div>
            <span className="text-xs text-slate-400">{attendanceLogs.length} records</span>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Student</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Class</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Group</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                      No attendance logs found
                    </td>
                  </tr>
                ) : (
                  attendanceLogs.slice(0, 50).map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs font-mono">{format(new Date(log.created_at), 'HH:mm:ss')}</td>
                      <td className="px-4 py-2">{log.student_name || 'Unknown'}</td>
                      <td className="px-4 py-2">{log.class_name || '-'}</td>
                      <td className="px-4 py-2">{log.group_name || '-'}</td>
                      <td className="px-4 py-2">{getStatusBadge(log.event_type || log.status)}</td>
                      <td className="px-4 py-2 text-xs font-mono">{log.device_id || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── DEBUG MODE (Admin only) ─── */}
      {role === 'admin' && viewMode === 'debug' && attendanceData?.debug && (
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 mb-4 overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-mono text-gray-300">Debug Information</span>
          </div>
          <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
            {JSON.stringify(attendanceData.debug, null, 2)}
          </pre>
        </div>
      )}

      {/* ─── ADMIN ATTENDANCE DATA ─── */}
      {role === 'admin' && viewMode === 'summary' && (
        <>
          <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">Full attendance overview for {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-slate-500">{adminAttendance.length} records across all classes and schedules</p>
              </div>
              <div className="text-sm text-slate-500">
                Date: {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Records</p>
                  <p className="text-2xl font-bold text-slate-800">{adminStats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{adminStats.present}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{adminStats.late}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{adminStats.absent}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-purple-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{adminStats.rate}%</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700">All Attendance Records</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{adminAttendance.length} records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Group</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">NIM</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Lecturer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminAttendance.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                        {isTodaySelected && !hasActualTodayAttendance
                          ? 'No attendance recorded for today yet'
                          : 'No attendance records found for this date'}
                      </td>
                    </tr>
                  ) : (
                    adminAttendance.map((record, index) => (
                      <tr key={`${record.schedule_id}-${record.student_id}-${index}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{record.class_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{record.group_name || record.group_code || '-'}</td>
                        <td className="px-4 py-3 text-sm font-medium">{record.student_name}</td>
                        <td className="px-4 py-3 text-sm font-mono">{record.nim}</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(record.status)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{record.timestamp ? format(new Date(record.timestamp), 'HH:mm:ss') : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{record.lecturer_name || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── ATTENDANCE DATA ─── */}
      {role !== 'admin' && attendanceData && (
        <>
          {/* Schedule Info */}
          <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">
                  <span className="font-medium">{attendanceData.schedule?.class_code}</span> - {attendanceData.schedule?.class_name}
                  {role === 'admin' && attendanceData.schedule?.group_id && (
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                      Group ID: {attendanceData.schedule?.group_id}
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {attendanceData.schedule?.day_of_week} {attendanceData.schedule?.start_time} - {attendanceData.schedule?.end_time}
                  {attendanceData.schedule?.group_name && ` • Group: ${attendanceData.schedule?.group_code || attendanceData.schedule?.group_name}`}
                  {role === 'admin' && (
                    <span className="ml-2 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                      Schedule ID: {attendanceData.schedule?.schedule_id}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-sm text-slate-500">
                Date: {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {noActualAttendanceToday ? (
            <div className="bg-white rounded-xl border p-8 text-center text-slate-500 shadow-sm mb-6">
              <p className="text-lg font-semibold text-slate-800">No attendance recorded for today yet.</p>
              <p className="mt-2 text-sm text-slate-500">Refresh after students scan in, or select another date to view past attendance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Students</p>
                    <p className="text-2xl font-bold text-slate-800">{stats?.total || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            <div className="bg-white rounded-xl border p-4 border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.present || 0}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.late || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.absent || 0}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-purple-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{stats?.rate || 0}%</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
          )}

          {/* Attendance Rate Bar */}
          <div className="bg-white rounded-xl border p-4 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Attendance Rate</span>
              <span className="text-lg font-bold text-blue-600">{stats?.rate || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  (stats?.rate || 0) >= 70 ? 'bg-green-500' :
                  (stats?.rate || 0) >= 40 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${stats?.rate || 0}%` }}
              />
            </div>
          </div>

          {/* Student List */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700">Student List</h3>
                {role === 'admin' && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                    {attendanceData.students?.filter(s => s.status === 'Absent').length} absent
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{attendanceData.students?.length || 0} students</span>
                {role === 'admin' && (
                  <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">NIM</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Semester</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Group</th>
                    {role === 'admin' && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">FP ID</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceData.students?.length === 0 || (selectedDate === getLocalDateString() && attendanceData.students?.every(s => !s.timestamp)) ? (
                    <tr>
                      <td colSpan={role === 'admin' ? 8 : 7} className="px-4 py-8 text-center text-slate-400">
                        {selectedDate === getLocalDateString() && attendanceData.students?.length > 0
                          ? 'No attendance recorded for today yet'
                          : 'No attendance records found for this date'}
                      </td>
                    </tr>
                  ) : (
                    attendanceData.students?.map((student, index) => (
                      <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{student.nim}</td>
                        <td className="px-4 py-3 text-sm font-medium">{student.name}</td>
                        <td className="px-4 py-3 text-sm">{student.semester ? `Semester ${student.semester}` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {attendanceData.schedule?.group_code || attendanceData.schedule?.group_name || '-'}
                        </td>
                        {role === 'admin' && (
                          <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                            {student.fingerprint_id || '-'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm">{getStatusBadge(student.status)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {student.timestamp ? format(new Date(student.timestamp), 'HH:mm:ss') : '-'}
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
            Auto-refresh every 30 seconds
            {role === 'admin' && (
              <span className="ml-2 text-slate-300">|</span>
            )}
            {role === 'admin' && (
              <span className="text-slate-400">
                <Eye className="w-3 h-3 inline mr-1" />
                Admin: Showing all data
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TodayAttendance;