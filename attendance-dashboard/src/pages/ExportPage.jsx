import React, { useState, useEffect } from 'react';
import {
  FileDown,
  Calendar,
  Users,
  BookOpen,
  Layers,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Info,
  Download,
  Filter,
  X,
  Clock
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import attendanceAPI from '../api/attendance';
import { getLocalDateString } from '../utils/date';
import { useUser } from '../context/UserContext';

function ExportPage() {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';

  // ─── STATE ───
  const [exportType, setExportType] = useState('schedule');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ─── FILTER STATES (all IDs stored as strings) ───
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [dateRange, setDateRange] = useState('week');
  const [dateFrom, setDateFrom] = useState(subDays(new Date(), 7).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(getLocalDateString());

  // ─── DATE RANGE OPTIONS ───
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'semester', label: 'This Semester' },
    { value: 'custom', label: 'Custom' }
  ];

  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // ─── LOAD INITIAL DATA ───
  useEffect(() => {
    loadFilterData();
  }, []);

  // ─── RESET FILTERS ON EXPORT TYPE CHANGE ───
  useEffect(() => {
    setSelectedClass(null);
    setSelectedSchedule(null);
    setSelectedCohort(null);
    setSelectedGroup(null);
    setSelectedGroups([]);
    setSelectedSemester('');
    setPreviewData(null);
    setError('');
  }, [exportType]);

  // ─── LOAD PREVIEW ON FILTER CHANGE ───
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPreview();
    }, 500);

    return () => clearTimeout(timer);
  }, [exportType, selectedSchedule, selectedClass, selectedSemester, selectedCohort, selectedGroup, selectedGroups, dateFrom, dateTo]);

  // ─── LOAD FILTER DATA ───
  const loadFilterData = async () => {
    setLoading(true);
    try {
      // Load classes
      const classesRes = await attendanceAPI.getClasses();
      if (classesRes.data.status === 'success') {
        let classList = (classesRes.data.classes || []).map(c => ({
          ...c,
          class_id: String(c.class_id)
        }));
        
        if (!isAdmin) {
          const lecturerClassesRes = await attendanceAPI.getLecturerClasses();
          if (lecturerClassesRes.data.status === 'success') {
            const lecturerClassIds = new Set(
              (lecturerClassesRes.data.classes || []).map(c => String(c.class_id))
            );
            classList = classList.filter(c => lecturerClassIds.has(c.class_id));
          }
        }
        setClasses(classList);
        
        if (classList.length > 0) {
          setSelectedClass(classList[0]);
          loadSchedulesForClass(classList[0].class_id);
        }
      }

      // Load cohorts
      if (isAdmin) {
        const cohortsRes = await attendanceAPI.getCohorts();
        if (cohortsRes.data.status === 'success') {
          const cohortList = (cohortsRes.data.cohorts || []).map(c => ({
            ...c,
            cohort_id: String(c.cohort_id)
          }));
          setCohorts(cohortList);
          if (cohortList.length > 0) {
            setSelectedCohort(cohortList[0]);
            // Filter groups for this cohort
            const initialGroups = allGroups.filter(g => String(g.cohort_id) === String(cohortList[0].cohort_id));
            setFilteredGroups(initialGroups);
            if (initialGroups.length > 0) {
              setSelectedGroup(initialGroups[0]);
            }
          }
        }
      }

      // Load all groups
      const groupsRes = await attendanceAPI.getGroups();
      if (groupsRes.data.status === 'success') {
        const flattened = (groupsRes.data.cohorts || []).flatMap(c => 
          (c.groups || []).map(g => ({ 
            ...g, 
            group_id: String(g.group_id),
            cohort_id: String(c.cohort_id),
            cohort_name: c.cohort_name 
          }))
        );
        setAllGroups(flattened);
        // If already have selectedCohort, update filteredGroups
        if (selectedCohort) {
          const initialGroups = flattened.filter(g => String(g.cohort_id) === String(selectedCohort.cohort_id));
          setFilteredGroups(initialGroups);
          if (initialGroups.length > 0) {
            setSelectedGroup(initialGroups[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load filter data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // ─── LOAD SCHEDULES FOR SELECTED CLASS ───
  const loadSchedulesForClass = async (classId) => {
    try {
      const res = await attendanceAPI.getSchedules(classId);
      if (res.data.status === 'success') {
        const scheduleList = (res.data.schedules || []).map(s => ({
          ...s,
          schedule_id: String(s.schedule_id)
        }));
        setSchedules(scheduleList);
        if (scheduleList.length > 0) {
          setSelectedSchedule(scheduleList[0]);
        } else {
          setSelectedSchedule(null);
        }
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    }
  };

  // ─── HANDLE CLASS CHANGE ───
  const handleClassChange = (classId) => {
    const cls = classes.find(c => String(c.class_id) === String(classId));
    setSelectedClass(cls || null);
    if (cls) {
      loadSchedulesForClass(cls.class_id);
    }
  };

  // ─── HANDLE COHORT CHANGE ───
  const handleCohortChange = (cohortId) => {
    const cohort = cohorts.find(c => String(c.cohort_id) === String(cohortId));
    setSelectedCohort(cohort || null);
    
    // Filter groups for this cohort
    const groups = allGroups.filter(g => String(g.cohort_id) === String(cohortId));
    setFilteredGroups(groups);
    
    if (groups.length > 0) {
      setSelectedGroup(groups[0]);
    } else {
      setSelectedGroup(null);
    }
  };

  // ─── HANDLE DATE RANGE CHANGE ───
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    let from, to;

    switch (range) {
      case 'today':
        from = today;
        to = today;
        break;
      case 'week':
        from = subDays(today, 7);
        to = today;
        break;
      case 'month':
        from = subMonths(today, 1);
        to = today;
        break;
      case 'semester':
        from = subMonths(today, 4);
        to = today;
        break;
      case 'custom':
        return;
      default:
        from = subDays(today, 7);
        to = today;
    }

    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  // ─── CALCULATE SUMMARY ───
  const calculateSummary = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status !== 'Present' && r.status !== 'Late').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  };

  // ─── LOAD PREVIEW DATA ───
  const loadPreview = async () => {
    // ─── VALIDATE FILTERS BASED ON EXPORT TYPE ───
    if (exportType === 'schedule' && !selectedSchedule) {
      setPreviewData(null);
      return;
    }
    if (exportType === 'groups' && !selectedGroup && selectedGroups.length === 0) {
      setPreviewData(null);
      return;
    }
    if (exportType === 'semester' && (!selectedGroup || !selectedSemester)) {
      setPreviewData(null);
      return;
    }
    if (exportType === 'cohort' && !selectedCohort) {
      setPreviewData(null);
      return;
    }

    setPreviewLoading(true);
    setError('');

    try {
      const params = {
        user_id: user?.user_id || 0,
        role: user?.role || 'lecturer',
        export_type: exportType,
        date_from: dateFrom,
        date_to: dateTo,
        preview: 'true'
      };

      // ─── BUILD PARAMS BASED ON EXPORT TYPE ───
      if (exportType === 'schedule' && selectedSchedule) {
        params.schedule_id = selectedSchedule.schedule_id;
      } else if (exportType === 'groups') {
        if (selectedGroups.length > 0) {
          params.group_ids = selectedGroups.join(',');
        } else if (selectedGroup) {
          params.group_id = selectedGroup.group_id;
        }
      } else if (exportType === 'semester' && selectedGroup && selectedSemester) {
        params.group_id = selectedGroup.group_id;
        params.semester = selectedSemester;
      } else if (exportType === 'cohort' && selectedCohort) {
        params.cohort_id = selectedCohort.cohort_id;
      }

      // ─── CALL EXPORT API WITH PREVIEW ───
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const url = `http://localhost/attendance_api/reports/export_attendance.php?${queryParams.toString()}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          const records = data.data.students || [];
          const summary = calculateSummary(records);
          
          setPreviewData({
            summary: summary,
            students: records.slice(0, 50),
            totalRecords: records.length,
            exportType: exportType,
            schedule: data.data.schedule || null,
            class: data.data.class || null,
            cohort: data.data.cohort || null,
            group: data.data.group || null,
            dateFrom: dateFrom,
            dateTo: dateTo,
            semester: selectedSemester
          });
          setLastUpdated(new Date());
        } else {
          setError(data.message || 'No data found');
          setPreviewData(null);
        }
      } else {
        setError('Failed to load preview');
        setPreviewData(null);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('Connection error. Please try again.');
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── HANDLE EXPORT ───
  const handleExport = async () => {
    setExporting(true);
    setError('');

    try {
      const params = {
        user_id: user?.user_id || 0,
        role: user?.role || 'lecturer',
        export_type: exportType,
        date_from: dateFrom,
        date_to: dateTo
      };

      if (exportType === 'schedule' && selectedSchedule) {
        params.schedule_id = selectedSchedule.schedule_id;
      } else if (exportType === 'groups') {
        if (selectedGroups.length > 0) {
          params.group_ids = selectedGroups.join(',');
        } else if (selectedGroup) {
          params.group_id = selectedGroup.group_id;
        }
      } else if (exportType === 'semester' && selectedGroup && selectedSemester) {
        params.group_id = selectedGroup.group_id;
        params.semester = selectedSemester;
      } else if (exportType === 'cohort' && selectedCohort) {
        params.cohort_id = selectedCohort.cohort_id;
      }

      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });

      const exportUrl = `http://localhost/attendance_api/reports/export_attendance.php?${queryParams.toString()}`;
      window.open(exportUrl, '_blank');

    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── RENDER FILTERS ───
  const renderFilters = () => {
    switch (exportType) {
      case 'schedule':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={selectedClass?.class_id || ''}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
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
                value={selectedSchedule?.schedule_id || ''}
                onChange={(e) => {
                  const schedule = schedules.find(s => String(s.schedule_id) === String(e.target.value));
                  setSelectedSchedule(schedule || null);
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedClass}
              >
                <option value="">Select Schedule</option>
                {schedules.map(s => {
                  const groupName = s.group_name ? ` (${s.group_name})` : '';
                  return (
                    <option key={s.schedule_id} value={s.schedule_id}>
                      {s.day_of_week} {s.start_time} - {s.end_time}{groupName}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'groups':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cohort</label>
              <select
                value={selectedCohort?.cohort_id || ''}
                onChange={(e) => handleCohortChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Cohort</option>
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
                  const group = filteredGroups.find(g => String(g.group_id) === String(e.target.value));
                  setSelectedGroup(group || null);
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCohort}
              >
                <option value="">Select Group</option>
                {filteredGroups.map(g => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.group_name} {g.group_code ? `(${g.group_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'semester':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cohort</label>
              <select
                value={selectedCohort?.cohort_id || ''}
                onChange={(e) => {
                  const cohort = cohorts.find(c => String(c.cohort_id) === String(e.target.value));
                  setSelectedCohort(cohort || null);
                  const groups = allGroups.filter(g => String(g.cohort_id) === String(e.target.value));
                  setFilteredGroups(groups);
                  if (groups.length > 0) {
                    setSelectedGroup(groups[0]);
                  } else {
                    setSelectedGroup(null);
                  }
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Cohort</option>
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
                  const group = filteredGroups.find(g => String(g.group_id) === String(e.target.value));
                  setSelectedGroup(group || null);
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCohort}
              >
                <option value="">Select Group</option>
                {filteredGroups.map(g => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.group_name} {g.group_code ? `(${g.group_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Semester</option>
                {semesterOptions.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'cohort':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cohort</label>
              <select
                value={selectedCohort?.cohort_id || ''}
                onChange={(e) => handleCohortChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Cohort</option>
                {cohorts.map(c => (
                  <option key={c.cohort_id} value={c.cohort_id}>
                    {c.cohort_name} {c.cohort_code ? `(${c.cohort_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── RENDER PREVIEW ───
  const renderPreview = () => {
    if (previewLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-slate-500">Loading preview...</span>
        </div>
      );
    }

    if (!previewData) {
      return (
        <div className="text-center py-12 text-slate-400">
          <Info className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Select filters to see attendance data preview</p>
        </div>
      );
    }

    const { summary, students, totalRecords, schedule, class: classInfo, cohort, group, dateFrom: from, dateTo: to, semester } = previewData;

    // ─── Get display name ───
    let displayName = '';
    if (exportType === 'schedule' && schedule) {
      displayName = `${schedule.class_code || ''} - ${schedule.class_name || ''} (${schedule.day_of_week || ''} ${schedule.start_time || ''}-${schedule.end_time || ''})`;
    } else if (exportType === 'groups' && (group || selectedGroups.length > 0)) {
      if (selectedGroups.length > 0) {
        displayName = `${selectedGroups.length} groups selected`;
      } else if (group) {
        displayName = `${group.group_name} (${group.group_code})`;
      }
    } else if (exportType === 'semester' && group && cohort) {
      displayName = `${cohort.cohort_name} - ${group.group_name} (Semester ${semester || ''})`;
    } else if (exportType === 'cohort' && cohort) {
      displayName = `${cohort.cohort_name || ''} ${cohort.cohort_code ? `(${cohort.cohort_code})` : ''}`;
    }

    return (
      <div>
        {/* Info Bar */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 mb-4 text-sm text-blue-700">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium">{displayName || 'Attendance Data'}</span>
            <span className="text-blue-500">|</span>
            <span>📅 {from} to {to}</span>
            <span className="text-blue-500">|</span>
            <span>📊 {totalRecords} records</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{summary.total || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{summary.present || 0}</p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.late || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{summary.absent || 0}</p>
              </div>
              <X className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border p-4 border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-purple-600">{summary.rate || 0}%</p>
              </div>
              <FileDown className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-700">
                Preview {totalRecords > 50 ? `(Showing ${students.length} of ${totalRecords})` : ''}
              </h3>
            </div>
            <span className="text-sm text-slate-500">{students.length} records</span>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">NIM</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Group</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                      No attendance records found for the selected filters
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-mono">{student.nim || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{student.student_name || student.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{student.group_name || student.group_code || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`
                          px-2 py-1 rounded-full text-xs font-medium
                          ${student.status === 'Present' ? 'bg-green-100 text-green-700' : ''}
                          ${student.status === 'Late' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${student.status === 'Absent' ? 'bg-red-100 text-red-700' : ''}
                        `}>
                          {student.status || 'Absent'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {student.attendance_date || student.timestamp?.split('T')[0] || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {student.attendance_time || student.timestamp?.split('T')[1]?.slice(0, 5) || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER EXPORT TYPE SELECTOR ───
  const exportTypeOptions = [
    { value: 'schedule', label: 'Schedule', icon: Calendar },
    { value: 'groups', label: 'Groups', icon: Layers },
    { value: 'semester', label: 'Semester', icon: BookOpen },
    { value: 'cohort', label: 'Cohort', icon: Users }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Export Attendance Data</h1>
        <p className="text-slate-500">Export attendance reports in Excel format</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Export Type Selector */}
      <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Export Type</label>
        <div className="flex flex-wrap gap-2">
          {exportTypeOptions.map(opt => {
            const Icon = opt.icon;
            const isActive = exportType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setExportType(opt.value);
                  setPreviewData(null);
                }}
                className={`
                  px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </h3>
          <button
            onClick={loadPreview}
            disabled={previewLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {previewLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Preview
          </button>
        </div>
        {renderFilters()}
      </div>

      {/* Export Button */}
      <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Exporting: <strong className="text-slate-700">
              {exportTypeOptions.find(o => o.value === exportType)?.label}
            </strong>
          </span>
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Last preview: {format(lastUpdated, 'HH:mm:ss')}
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || previewLoading}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Excel
        </button>
      </div>

      {/* Preview Section */}
      <div className="mt-6">
        {renderPreview()}
      </div>
    </div>
  );
}

export default ExportPage;