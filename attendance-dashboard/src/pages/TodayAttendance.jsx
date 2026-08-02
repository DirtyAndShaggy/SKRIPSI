import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Users, UserCheck, Clock, UserX, 
  Calendar, ChevronDown, Loader2, Download, 
  Filter, Search, AlertCircle, Info, 
  Eye, FileText, Activity, Shield,
  ChevronRight, ChevronUp, Building, GraduationCap,
  User, Layers, Hash
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
  const [rooms, setRooms] = useState([]);
  const [allGroupsFlat, setAllGroupsFlat] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [allAttendance, setAllAttendance] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  
  // ─── FILTER STATES ───
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  
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

  // ─── GROUP ATTENDANCE BY SCHEDULE ───
  const groupAttendanceBySchedule = (records) => {
    const grouped = {};
    
    records.forEach(record => {
      const key = record.schedule_id;
      if (!grouped[key]) {
        grouped[key] = {
          schedule_id: record.schedule_id,
          schedule_day: record.day_of_week,
          schedule_start: record.start_time,
          schedule_end: record.end_time,
          class_id: record.class_id,
          class_name: record.class_name,
          class_code: record.class_code,
          group_name: record.group_name,
          group_code: record.group_code,
          group_id: record.group_id,
          cohort_id: record.cohort_id,
          cohort_name: record.cohort_name,
          cohort_code: record.cohort_code,
          semester: record.schedule_semester || record.student_semester,
          room_id: record.room_id,
          room_code: record.room_code,
          room_name: record.room_name,
          lecturer_name: record.lecturer_name,
          lecturer_id: record.lecturer_id,
          grace_period: record.grace_period,
          students: []
        };
      }
      grouped[key].students.push(record);
    });
    
    return Object.values(grouped);
  };

  // ─── FILTER ATTENDANCE RECORDS ───
  const getFilteredAttendance = () => {
    let records = allAttendance;

    // If lecturer, filter by lecturer_id
    if (role === 'lecturer' && lecturerId) {
      records = records.filter(r => String(r.lecturer_id) === String(lecturerId));
    }

    // Admin filters
    if (role === 'admin') {
      if (selectedClass) {
        records = records.filter(r => String(r.class_id) === String(selectedClass.class_id));
      }
      if (selectedScheduleId) {
        records = records.filter(r => String(r.schedule_id) === String(selectedScheduleId));
      }
      if (selectedGroup) {
        records = records.filter(r => String(r.group_id) === String(selectedGroup.group_id));
      }
      if (selectedCohort) {
        records = records.filter(r => String(r.cohort_id) === String(selectedCohort.cohort_id));
      }
      if (selectedRoom) {
        records = records.filter(r => String(r.room_id) === String(selectedRoom.room_id));
      }
      if (selectedSemester) {
        records = records.filter(r => String(r.schedule_semester) === String(selectedSemester));
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        records = records.filter(r => 
          (r.student_name || '').toLowerCase().includes(term) ||
          (r.nim || '').toLowerCase().includes(term) ||
          (r.class_name || '').toLowerCase().includes(term) ||
          (r.group_name || '').toLowerCase().includes(term) ||
          (r.cohort_name || '').toLowerCase().includes(term) ||
          (r.lecturer_name || '').toLowerCase().includes(term)
        );
      }
    }

    return records;
  };

  const filteredAttendance = getFilteredAttendance();
  const isTodaySelected = selectedDate === getLocalDateString();
  const hasActualTodayAttendance = allAttendance.some(record => record.timestamp);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(selectedDate + 'T00:00:00');
  const isFutureDate = selected > today;

  const displayAttendance = (isFutureDate || (isTodaySelected && !hasActualTodayAttendance)) 
    ? [] 
    : filteredAttendance;

  const groupedSchedules = groupAttendanceBySchedule(displayAttendance);

  const getScheduleSummary = (students) => {
    const total = students.length;
    const present = students.filter(s => s.status === 'Present').length;
    const late = students.filter(s => s.status === 'Late').length;
    const absent = students.filter(s => s.status !== 'Present' && s.status !== 'Late').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  };

  const getOverallSummary = () => {
    const total = displayAttendance.length;
    const present = displayAttendance.filter(r => r.status === 'Present').length;
    const late = displayAttendance.filter(r => r.status === 'Late').length;
    const absent = displayAttendance.filter(r => r.status !== 'Present' && r.status !== 'Late').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  };

  const overallSummary = getOverallSummary();

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

  // ─── LOAD DATA ───
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
      setSelectedCohort(null);
      setSelectedRoom(null);
      setSelectedSemester('');
      setSearchTerm('');
      setLecturerId(null);

      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }

      const groupsResponse = await attendanceAPI.getGroups();
      if (groupsResponse.data.status === 'success') {
        setCohorts(groupsResponse.data.cohorts || []);
        const flattened = groupsResponse.data.cohorts.flatMap(c =>
          (c.groups || []).map(g => ({ ...g, cohort_id: String(c.cohort_id) }))
        );
        setAllGroupsFlat(flattened);
        setGroups(flattened);
      }

      const roomsResponse = await attendanceAPI.getRooms();
      if (roomsResponse.data.status === 'success') {
        setRooms(roomsResponse.data.rooms);
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
        
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (userData.user_id) {
          const lecturerRes = await attendanceAPI.getCurrentLecturer();
          if (lecturerRes.data.status === 'success') {
            setLecturerId(lecturerRes.data.lecturer?.lecturer_id);
          }
        }
        
        if (lecturerClasses.length > 0) {
          const firstClass = lecturerClasses[0];
          setSelectedClass(firstClass);
          await loadSchedulesForClass(firstClass.class_id);
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

  // ─── LOAD ALL ATTENDANCE ───
  const loadAllAttendance = async (date) => {
    const normalizedDate = date || getLocalDateString();
    
    if (!refreshing) setLoading(true);
    
    try {
      const response = await attendanceAPI.getAttendanceByDate(normalizedDate);
      console.log('📊 Attendance by date:', normalizedDate, response.data);
      
      if (response.data.status === 'success') {
        const normalizedRecords = (response.data.records || []).map(record => ({
          ...record,
          class_id: record.class_id != null ? String(record.class_id) : '',
          group_id: record.group_id != null ? String(record.group_id) : '',
          cohort_id: record.cohort_id != null ? String(record.cohort_id) : '',
          room_id: record.room_id != null ? String(record.room_id) : '',
          schedule_id: record.schedule_id != null ? String(record.schedule_id) : '',
          lecturer_id: record.lecturer_id != null ? String(record.lecturer_id) : '',
          schedule_semester: record.schedule_semester != null ? String(record.schedule_semester) : '',
        }));
        setAllAttendance(normalizedRecords);
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
    setSelectedCohort(null);
    setSelectedRoom(null);
    setSelectedSemester('');
    setSearchTerm('');
    setError('');

    if (role === 'admin') {
      setSchedules(allSchedules);
    } else if (classes.length > 0) {
      setSelectedClass(classes[0]);
      await loadSchedulesForClass(classes[0].class_id);
    }
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

  const toggleExpand = (scheduleId) => {
    setExpandedSchedule(expandedSchedule === scheduleId ? null : scheduleId);
  };

  // ─── RENDER OVERALL STATS CARDS ───
  const renderOverallStats = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-white rounded-xl border p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-800">{overallSummary.total}</p>
            </div>
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Present</p>
              <p className="text-xl font-bold text-green-600">{overallSummary.present}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 border-yellow-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yellow-600 font-medium">Late</p>
              <p className="text-xl font-bold text-yellow-600">{overallSummary.late}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 border-red-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium">Absent</p>
              <p className="text-xl font-bold text-red-600">{overallSummary.absent}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <UserX className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3 border-purple-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 font-medium">Attendance Rate</p>
              <p className="text-xl font-bold text-purple-600">{overallSummary.rate}%</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${overallSummary.rate >= 70 ? 'bg-green-500' : overallSummary.rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(overallSummary.rate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER SCHEDULE STATS CARD ───
  const renderScheduleStats = (scheduleGroup) => {
    const summary = getScheduleSummary(scheduleGroup.students);
    const isExpanded = expandedSchedule === scheduleGroup.schedule_id;
    const isAdmin = role === 'admin';

    return (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-3">
        {/* ─── SCHEDULE HEADER ─── */}
        <div 
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
          onClick={() => toggleExpand(scheduleGroup.schedule_id)}
        >
          <div className="flex-1">
            {/* Main info row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Group Name */}
              <span className="font-semibold text-slate-800 text-sm">
                {scheduleGroup.group_name || scheduleGroup.group_code || 'No Group'}
              </span>
              
              {/* Cohort & Semester */}
              {scheduleGroup.cohort_name && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {scheduleGroup.cohort_name}
                  {scheduleGroup.semester && ` • Sem ${scheduleGroup.semester}`}
                </span>
              )}
              
              {/* Room */}
              {scheduleGroup.room_code && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {scheduleGroup.room_code}
                </span>
              )}
              
              {/* Time */}
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {scheduleGroup.schedule_start} - {scheduleGroup.schedule_end}
              </span>
              
              {/* Day */}
              <span className="text-xs text-slate-400">
                {scheduleGroup.schedule_day}
              </span>
            </div>
            
            {/* Secondary info row */}
            <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-slate-400">
              {/* Lecturer */}
              {scheduleGroup.lecturer_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {scheduleGroup.lecturer_name}
                </span>
              )}
              
              {/* Schedule ID */}
              {isAdmin && (
                <span className="flex items-center gap-1 text-slate-400">
                  <Hash className="w-3 h-3" />
                  ID: {scheduleGroup.schedule_id}
                </span>
              )}
              
              {/* Class info */}
              {scheduleGroup.class_code && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {scheduleGroup.class_code}
                </span>
              )}
              
              {/* Grace Period */}
              {scheduleGroup.grace_period && (
                <span className="flex items-center gap-1 text-yellow-600">
                  ⏰ Grace: {scheduleGroup.grace_period}m
                </span>
              )}
              
              {/* Student count */}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {summary.total} students
              </span>
            </div>
          </div>
          
          {/* Right side: Stats & Expand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600">✓ {summary.present}</span>
              <span className="text-yellow-600">⏰ {summary.late}</span>
              <span className="text-red-600">✗ {summary.absent}</span>
              <span className={`font-medium px-1.5 py-0.5 rounded ${summary.rate >= 70 ? 'bg-green-100 text-green-700' : summary.rate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {summary.rate}%
              </span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ─── SCHEDULE STATS GRID ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total Students</p>
            <p className="text-lg font-bold text-slate-800">{summary.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-green-600 font-medium">Present</p>
            <p className="text-lg font-bold text-green-600">{summary.present}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-yellow-600 font-medium">Late</p>
            <p className="text-lg font-bold text-yellow-600">{summary.late}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-red-600 font-medium">Absent</p>
            <p className="text-lg font-bold text-red-600">{summary.absent}</p>
          </div>
        </div>

        {/* ─── STUDENT LIST ─── */}
        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">NIM</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Semester</th>
                  {isAdmin && (
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Group</th>
                  )}
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduleGroup.students.map((student, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 text-xs text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 text-xs font-mono">{student.nim}</td>
                    <td className="px-3 py-2 text-xs font-medium">{student.student_name}</td>
                    <td className="px-3 py-2 text-xs">{student.student_semester ? `Sem ${student.student_semester}` : '-'}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 text-xs">{student.group_name || student.group_code || '-'}</td>
                    )}
                    <td className="px-3 py-2 text-xs">{getStatusBadge(student.status)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {student.timestamp ? format(new Date(student.timestamp), 'HH:mm:ss') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER FILTERS ───
  const renderFilters = () => {
    if (role === 'admin') {
      return (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={selectedClass?.class_id || ''}
                onChange={(e) => {
                  const classId = e.target.value ? Number(e.target.value) : null;
                  const cls = classes.find(c => String(c.class_id) === String(classId)) || null;
                  setSelectedClass(cls);
                  if (cls) {
                    loadSchedulesForClass(cls.class_id);
                  } else {
                    setSchedules(allSchedules);
                    setSelectedScheduleId(null);
                  }
                }}
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
                onChange={(e) => setSelectedScheduleId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass}
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cohort</label>
              <select
                value={selectedCohort?.cohort_id || ''}
                onChange={(e) => {
                  const cohort = cohorts.find(c => String(c.cohort_id) === String(e.target.value));
                  setSelectedCohort(cohort || null);
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cohorts</option>
                {cohorts.map(c => (
                  <option key={c.cohort_id} value={c.cohort_id}>
                    {c.cohort_name} {c.cohort_code ? `(${c.cohort_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
              <select
                value={selectedGroup?.group_id || ''}
                onChange={(e) => {
                  const group = allGroupsFlat.find(g => String(g.group_id) === String(e.target.value));
                  setSelectedGroup(group || null);
                }}
                disabled={!selectedCohort}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Groups</option>
                {allGroupsFlat
                  .filter(g => !selectedCohort || String(g.cohort_id) === String(selectedCohort.cohort_id))
                  .map(g => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name} {g.group_code ? `(${g.group_code})` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
              <select
                value={selectedRoom?.room_id || ''}
                onChange={(e) => {
                  const room = rooms.find(r => String(r.room_id) === String(e.target.value));
                  setSelectedRoom(room || null);
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Rooms</option>
                {rooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.room_code} - {r.room_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <button
              onClick={handleClearFilters}
              className="w-full md:w-auto bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
            >
              Clear Filters
            </button>
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, NIM, group, or cohort..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                value={selectedDate || getLocalDateString()}
                onChange={handleDateChange}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            </span>
            {selectedClass && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {selectedClass.class_code} - {selectedClass.class_name}
              </span>
            )}
            {groupedSchedules.length > 0 && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                {groupedSchedules.length} schedule(s)
              </span>
            )}
          </div>
        </div>
      );
    }
  };

  const renderNoData = () => {
    let message = '';
    if (isFutureDate) {
      message = 'No attendance data for future dates';
    } else if (isTodaySelected && !hasActualTodayAttendance) {
      message = 'No attendance recorded for today yet';
    } else {
      message = 'No attendance records found for this date';
    }
    
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-slate-400 shadow-sm">
        <p className="text-lg font-semibold text-slate-800">{message}</p>
        <p className="mt-2 text-sm text-slate-500">Try selecting a different date</p>
      </div>
    );
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
              : 'View attendance for your classes'}
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
      {showFilters && renderFilters()}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* ─── ADMIN VIEW: LOGS ─── */}
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

      {/* ─── MAIN CONTENT ─── */}
      {displayAttendance.length === 0 ? (
        renderNoData()
      ) : (
        <>
          {/* Overall Stats */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-slate-700">Overall Attendance</h3>
              <span className="text-xs text-slate-400">
                {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            {renderOverallStats()}
          </div>

          {/* Schedule Group Stats */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-slate-700">By Schedule / Group</h3>
              <span className="text-xs text-slate-400">{groupedSchedules.length} schedule(s)</span>
            </div>
            {groupedSchedules.map((scheduleGroup) => renderScheduleStats(scheduleGroup))}
          </div>

          {/* Auto-refresh indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Auto-refresh every 30 seconds
            <span className="text-slate-300">|</span>
            <span>{displayAttendance.length} total students</span>
          </div>
        </>
      )}
    </div>
  );
}

export default TodayAttendance;