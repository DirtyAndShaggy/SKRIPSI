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
  const [lecturerId, setLecturerId] = useState(null);
  
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
  const [viewMode, setViewMode] = useState('summary');
  
  const intervalRef = useRef(null);
  const isInitialMount = useRef(true);

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

  // ─── FILTER ATTENDANCE RECORDS ───
  const getFilteredAttendance = () => {
    let records = allAttendance;

    // If lecturer, filter by lecturer_id
    if (role === 'lecturer' && lecturerId) {
      records = records.filter(r => String(r.lecturer_id) === String(lecturerId));
    }

    // Filter by class
    if (selectedClass) {
      records = records.filter(r => String(r.class_id) === String(selectedClass.class_id));
    }

    // Filter by schedule
    if (selectedScheduleId) {
      records = records.filter(r => String(r.schedule_id) === String(selectedScheduleId));
    }

    // Filter by group
    if (selectedGroup) {
      records = records.filter(r => String(r.group_id) === String(selectedGroup.group_id));
    }

    // Filter by semester
    if (selectedSemester) {
      records = records.filter(r => String(r.schedule_semester) === String(selectedSemester));
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      records = records.filter(r => 
        (r.student_name || '').toLowerCase().includes(term) ||
        (r.nim || '').toLowerCase().includes(term) ||
        (r.class_name || '').toLowerCase().includes(term) ||
        (r.group_name || '').toLowerCase().includes(term)
      );
    }

    return records;
  };

  const filteredAttendance = getFilteredAttendance();
  const isTodaySelected = selectedDate === getLocalDateString();
  const hasActualTodayAttendance = allAttendance.some(record => record.timestamp);

  // ─── CHECK IF SELECTED DATE IS IN THE FUTURE ───
  const today = new Date();
  today.setHours(0, 0, 0, 0); // reset time to midnight for accurate comparison
  const selected = new Date(selectedDate + 'T00:00:00');
  const isFutureDate = selected > today;

  // ─── DISPLAY LOGIC ───
  // If future date: show empty (no data yet)
  // If today and no actual attendance: show empty (no data yet)
  // Otherwise: show filtered attendance
  const displayAttendance = (isFutureDate || (isTodaySelected && !hasActualTodayAttendance)) 
    ? [] 
    : filteredAttendance;

  const getSummary = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status !== 'Present' && r.status !== 'Late').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  };

  const summary = getSummary(displayAttendance);

  // ─── GET USER ───
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

  // ─── RELOAD DATA WHEN DATE CHANGES ───
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    setAllAttendance([]);
    setAttendanceData(null);
    setLastUpdated(new Date());
    
    loadAllAttendance(selectedDate);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      loadAllAttendance(selectedDate);
    }, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedDate]);

  // ─── LOAD DATA (INITIAL) ───
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
      isInitialMount.current = false;
    }
  };

  // ─── LOAD ADMIN DATA ───
  const loadAdminData = async () => {
    try {
      setSelectedClass(null);
      setSelectedScheduleId(null);
      setSelectedGroup(null);
      setSelectedSemester('');
      setSearchTerm('');
      setLecturerId(null);

      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }
      const groupsResponse = await attendanceAPI.getGroups();
      if (groupsResponse.data.status === 'success') {
        const allGroups = groupsResponse.data.cohorts.flatMap(c => c.groups || []);
        setGroups(allGroups);
        setCohorts(groupsResponse.data.cohorts || []);
      }

      const schedulesResponse = await attendanceAPI.getAllSchedules();
      if (schedulesResponse.data.status === 'success') {
        const availableSchedules = schedulesResponse.data.schedules;
        setSchedules(availableSchedules);
        setAllSchedules(availableSchedules);
      }

      await loadAllAttendance(selectedDate);

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
      console.log('📚 Lecturer classes response:', response.data);
      
      if (response.data.status === 'success') {
        const lecturerClasses = response.data.classes || [];
        setClasses(lecturerClasses);
        
        // Get lecturer_id from user
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.user_id) {
          // Fetch lecturer_id via a separate call or derive from classes response if available
          // Since classes response doesn't include lecturer_id, we need to fetch it.
          const lecturerRes = await attendanceAPI.getCurrentLecturer();
          if (lecturerRes.data.status === 'success') {
            setLecturerId(lecturerRes.data.lecturer?.lecturer_id);
          }
        }
        
        if (lecturerClasses.length > 0) {
          setSelectedClass(lecturerClasses[0]);
          // Load schedules for the first class
          await loadSchedulesForClass(lecturerClasses[0].class_id);
        } else {
          setError('You are not assigned to any classes. Please contact administrator.');
          setAttendanceData(null);
          setLoading(false);
        }
      } else {
        setError(response.data.message || 'Failed to load your classes');
      }
    } catch (err) {
      console.error('Failed to load lecturer data:', err);
      setError('Failed to load data. Please try again.');
    }
  };

  // ─── LOAD ALL ATTENDANCE (UNIFIED) ───
  const loadAllAttendance = async (date) => {
    const normalizedDate = date || getLocalDateString();
    
    if (!refreshing) setLoading(true);
    
    try {
      const response = await attendanceAPI.getAttendanceByDate(normalizedDate);
      console.log('📊 Attendance by date:', normalizedDate, response.data);
      
      if (response.data.status === 'success') {
        setAllAttendance(response.data.records || []);
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
      setRefreshing(false);
    }
  };

  // ─── LOAD SCHEDULES FOR CLASS ───
  const loadSchedulesForClass = async (classId) => {
    try {
      const response = await attendanceAPI.getSchedules(classId);
      console.log('Schedules response:', response.data);

      if (response.data.status === 'success') {
        const availableSchedules = response.data.schedules || [];
        setSchedules(availableSchedules);
        
        if (availableSchedules.length > 0) {
          const preferredSchedule = pickBestScheduleForDate(availableSchedules, selectedDate);
          const scheduleToLoad = preferredSchedule?.schedule_id || availableSchedules[0].schedule_id;
          setSelectedScheduleId(scheduleToLoad);
        } else {
          setSelectedScheduleId(null);
        }
      } else {
        setError(response.data.message || 'Failed to load schedules');
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError('Failed to load schedules for this class');
    }
  };

  // ─── HANDLE CLASS CHANGE ───
  const handleClassChange = async (classId) => {
    const normalizedClassId = classId == null ? null : String(classId);
    const cls = classes.find(c => String(c.class_id) === normalizedClassId) || null;
    setSelectedClass(cls);
    setError('');
    
    if (role === 'lecturer') {
      if (cls) {
        await loadSchedulesForClass(cls.class_id);
      } else {
        // "All Classes" selected: load all schedules for all lecturer's classes
        // For simplicity, we can set schedules to allSchedules (but we need allSchedules for lecturer)
        // Since we have allSchedules from earlier, but we need to filter by lecturer_id if possible.
        // For now, we'll just clear schedules and let the user pick a class.
        setSchedules([]);
        setSelectedScheduleId(null);
      }
    } else {
      // Admin: update schedules list based on selected class
      const filtered = normalizedClassId
        ? allSchedules.filter(s => String(s.class_id) === normalizedClassId)
        : allSchedules;
      setSchedules(filtered);
      setSelectedScheduleId(null);
    }
    // No need to reload attendance; filteredAttendance will update automatically
  };

  const handleScheduleChange = (scheduleId) => {
    setSelectedScheduleId(scheduleId || null);
  };

  const handleRefresh = () => {
    loadAllAttendance(selectedDate);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value || getLocalDateString();
    setSelectedDate(newDate);
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
    } else if (classes.length > 0) {
      // For lecturer, reset to first class
      setSelectedClass(classes[0]);
      await loadSchedulesForClass(classes[0].class_id);
    }
    // Reload data for today
    loadAllAttendance(today);
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

  if (loading && allAttendance.length === 0) {
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
          {role === 'admin' && (
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1.5 text-xs ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('logs')}
                className={`px-3 py-1.5 text-xs ${viewMode === 'logs' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Logs
              </button>
              <button
                onClick={() => setViewMode('debug')}
                className={`px-3 py-1.5 text-xs ${viewMode === 'debug' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Debug
              </button>
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
              <select
                value={selectedScheduleId || ''}
                onChange={(e) => handleScheduleChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass && role === 'lecturer'} // For lecturer, require class selection first
              >
                <option value="">All Schedules</option>
                {schedules.map(schedule => (
                  <option key={schedule.schedule_id} value={schedule.schedule_id}>
                    {schedule.day_of_week} {schedule.start_time} - {schedule.end_time}
                    {schedule.group_name && ` (${schedule.group_name})`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate || getLocalDateString()}
                onChange={handleDateChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

      {/* ─── ADMIN ATTENDANCE TABLE ─── */}
      {role === 'admin' && viewMode === 'summary' && (
        <>
          <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">Full attendance overview for {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-slate-500">{displayAttendance.length} records across all classes and schedules</p>
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
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-purple-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.rate}%</p>
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
                <span className="text-sm text-slate-500">{displayAttendance.length} records</span>
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
                  {displayAttendance.length === 0 ? (
                    <tr>
                          <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                            {isFutureDate ? 'No attendance data for future dates' :
                            isTodaySelected && !hasActualTodayAttendance
                              ? 'No attendance recorded for today yet'
                              : 'No attendance records found for this date'}
                          </td>
                    </tr>
                  ) : (
                    displayAttendance.map((record, index) => (
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

      {/* ─── LECTURER VIEW ─── */}
      {role !== 'admin' && (
        <>
          <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-500">
                  {selectedClass ? `${selectedClass.class_code} - ${selectedClass.class_name}` : 'All Classes'}
                  {selectedScheduleId && schedules.find(s => s.schedule_id === selectedScheduleId) && 
                    ` • ${schedules.find(s => s.schedule_id === selectedScheduleId)?.day_of_week} ${schedules.find(s => s.schedule_id === selectedScheduleId)?.start_time} - ${schedules.find(s => s.schedule_id === selectedScheduleId)?.end_time}`
                  }
                </p>
                <p className="text-sm text-slate-500">
                  {displayAttendance.length} records
                </p>
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
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-green-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-yellow-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Late</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                </div>
                <UserX className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 border-purple-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.rate}%</p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Attendance Rate</span>
              <span className="text-lg font-bold text-blue-600">{summary.rate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${summary.rate >= 70 ? 'bg-green-500' : summary.rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${summary.rate}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-slate-700">Student List</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{displayAttendance.length} students</span>
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayAttendance.length === 0 ? (
                    <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                            {isFutureDate ? 'No attendance data for future dates' :
                            isTodaySelected && !hasActualTodayAttendance
                              ? 'No attendance recorded for today yet'
                              : 'No attendance records found for this date'}
                          </td>
                    </tr>
                  ) : (
                    displayAttendance.map((record, index) => (
                      <tr key={`${record.schedule_id}-${record.student_id}-${index}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono">{record.nim}</td>
                        <td className="px-4 py-3 text-sm font-medium">{record.student_name}</td>
                        <td className="px-4 py-3 text-sm">{record.student_semester ? `Semester ${record.student_semester}` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{record.group_name || record.group_code || '-'}</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(record.status)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{record.timestamp ? format(new Date(record.timestamp), 'HH:mm:ss') : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Auto-refresh every 30 seconds
          </div>
        </>
      )}
    </div>
  );
}

export default TodayAttendance;