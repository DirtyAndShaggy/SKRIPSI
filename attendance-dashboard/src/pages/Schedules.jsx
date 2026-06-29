import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameWeek } from 'date-fns';
import attendanceAPI from '../api/attendance';
import { 
  Plus, Edit2, Trash2, X, RefreshCw, 
  Calendar as CalendarIcon, Clock, Building, Filter,
  ChevronLeft, ChevronRight, List,
  LayoutGrid, Users, UserPlus, UserMinus,
  Search, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeError, setTimeError] = useState('');
  const [isOvernight, setIsOvernight] = useState(false);
  const [filters, setFilters] = useState({
    class_id: '',
    cohort_id: '',
    group_id: '',
    day_of_week: '',
    room_id: '',
    semester: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    cohort_id: '',
    group_id: '',
    room_id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00',
    device_id: 'ESP32_01',
    semester: '',
    grace_period: 15
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Helper functions - place these before the StudentAssignmentModal component
const calculateDuration = (start, end) => {
  if (!start || !end) return '';
  
  const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
  const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
  
  // For same-day schedules only
  if (endMinutes <= startMinutes) {
    return 'Invalid (end time must be after start time)';
  }
  
  const diffMinutes = endMinutes - startMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return `${hours}h ${minutes}m`;
};

const validateTimes = (start, end) => {
  if (!start || !end) {
    setTimeError('');
    setIsOvernight(false);
    return;
  }
  
  const startMinutes = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
  const endMinutes = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
  
  // Validation rules
  if (startMinutes === endMinutes) {
    setTimeError('Start and end time cannot be the same');
    setIsOvernight(false);
    return;
  }
  
  if (endMinutes < startMinutes) {
    setTimeError('❌ Class cannot end after midnight (overnight schedules are not allowed)');
    setIsOvernight(false);
    return;
  }
  
  if (endMinutes - startMinutes > 12 * 60) {
    setTimeError('Class duration cannot exceed 12 hours');
    setIsOvernight(false);
    return;
  }
  
  if (endMinutes - startMinutes < 30) {
    setTimeError('Class duration must be at least 30 minutes');
    setIsOvernight(false);
    return;
  }
  
  // All valid
  setTimeError('');
  setIsOvernight(false);
};

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }

      const roomsResponse = await attendanceAPI.getRooms();
      if (roomsResponse.data.status === 'success') {
        setRooms(roomsResponse.data.rooms);
      }

      const lecturersResponse = await attendanceAPI.getLecturers();
      if (lecturersResponse.data.status === 'success') {
        setLecturers(lecturersResponse.data.lecturers);
      }

      const studentsResponse = await attendanceAPI.getStudents();
      if (studentsResponse.data.status === 'success') {
        setStudents(studentsResponse.data.students);
      }

      const cohortsResponse = await attendanceAPI.getGroups();
      if (cohortsResponse.data.status === 'success') {
        setCohorts(cohortsResponse.data.cohorts || []);
        setAllGroups(cohortsResponse.data.cohorts.flatMap(cohort => cohort.groups || []).map(group => ({
          ...group,
          cohort_id: String(group.cohort_id),
          group_id: String(group.group_id)
        })));
      }

      const schedulesResponse = await attendanceAPI.getAllSchedules();
      if (schedulesResponse.data.status === 'success') {
        setSchedules(schedulesResponse.data.schedules);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load data', err);
      if (showLoading) alert('Error loading data. Check if API is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => loadData(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.group_id) {
      alert('Please select a group for the schedule.');
      return;
    }

    try {
      const selectedClassCohortId = selectedClassGroups?.[0]?.cohort_id ? String(selectedClassGroups[0].cohort_id) : '';
      const data = {
        class_id: parseInt(formData.class_id),
        cohort_id: selectedClassCohortId ? parseInt(selectedClassCohortId) : null,
        group_id: formData.group_id ? parseInt(formData.group_id) : null,
        room_id: formData.room_id ? parseInt(formData.room_id) : null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        device_id: formData.device_id,
        semester: formData.semester || null,
        grace_period: formData.grace_period || 15
      };
      
      if (editingSchedule) {
        await attendanceAPI.updateSchedule(editingSchedule.schedule_id, data);
        alert('Schedule updated successfully!');
      } else {
        await attendanceAPI.addSchedule(data);
        alert('Schedule added successfully!');
      }
      
      setFormData({
        class_id: '',
        cohort_id: '',
        group_id: '',
        room_id: '',
        day_of_week: 'Monday',
        start_time: '08:00',
        end_time: '10:00',
        device_id: 'ESP32_01',
        semester: '',
        grace_period: 15
      });
      setShowForm(false);
      setEditingSchedule(null);
      loadData();
    } catch (err) {
      console.error('Failed to save schedule', err);
      alert('Error saving schedule. Please try again.');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      class_id: schedule.class_id.toString(),
      cohort_id: schedule.cohort_id ? String(schedule.cohort_id) : '',
      group_id: schedule.group_id ? String(schedule.group_id) : '',
      room_id: schedule.room_id?.toString() || '',
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      device_id: schedule.device_id || 'ESP32_01',
      semester: schedule.semester || '',
      grace_period: schedule.grace_period || 15
    });
    setShowForm(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await attendanceAPI.deleteSchedule(scheduleId);
      loadData();
      alert('Schedule deleted successfully!');
    } catch (err) {
      console.error('Failed to delete schedule', err);
      alert('Error deleting schedule. Please try again.');
    }
  };

  const handleManageStudents = (schedule) => {
  console.log('=== handleManageStudents called ===');
  console.log('Schedule object:', schedule);
  console.log('Schedule ID:', schedule?.schedule_id);
  
  if (!schedule || !schedule.schedule_id) {
    console.error('Invalid schedule or missing schedule_id');
    alert('Error: Schedule ID is missing. Please refresh and try again.');
    return;
  }
  
  setSelectedSchedule(schedule);
  setShowStudentModal(true);
};

  const handleAssignStudents = async (scheduleId, selectedStudentIds) => {
    try {
      await attendanceAPI.assignStudentsToSchedule(scheduleId, selectedStudentIds);
      loadData();
      alert('Students assigned successfully!');
    } catch (err) {
      console.error('Failed to assign students', err);
      alert('Error assigning students. Please try again.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
    setFormData({
      class_id: '',
      cohort_id: '',
      group_id: '',
      room_id: '',
      day_of_week: 'Monday',
      start_time: '08:00',
      end_time: '10:00',
      device_id: 'ESP32_01',
      semester: '',
      grace_period: 15
    });
  };

  const getFilteredSchedules = () => {
    let filtered = schedules;
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.class_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lecturer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filters.class_id) {
      filtered = filtered.filter(s => s.class_id === parseInt(filters.class_id));
    }
    if (filters.cohort_id) {
      filtered = filtered.filter(s => String(s.cohort_id) === String(filters.cohort_id));
    }
    if (filters.group_id) {
      filtered = filtered.filter(s => String(s.group_id) === String(filters.group_id));
    }
    if (filters.day_of_week) {
      filtered = filtered.filter(s => s.day_of_week === filters.day_of_week);
    }
    if (filters.room_id) {
      filtered = filtered.filter(s => s.room_id === parseInt(filters.room_id));
    }
    if (filters.semester) {
      filtered = filtered.filter(s => s.semester === filters.semester);
    }
    
    return filtered;
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getSchedulesForDay = (date) => {
    const dayName = format(date, 'EEEE');
    return getFilteredSchedules().filter(s => s.day_of_week === dayName);
  };

  const selectedClass = classes.find(cls => String(cls.class_id) === String(formData.class_id));
  const selectedClassGroups = selectedClass?.assigned_groups || [];
  const selectedClassCohort = selectedClassGroups?.[0];

  const getStatusBadge = (startTime, endTime, dayOfWeek) => {
    const now = new Date();
    const today = format(now, 'EEEE');
    const currentTime = format(now, 'HH:mm');
    
    if (dayOfWeek === today && currentTime >= startTime && currentTime <= endTime) {
      return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Active</span>;
    }
    return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-medium">Scheduled</span>;
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  const filteredSchedules = getFilteredSchedules();

  // Student Assignment Component
  const StudentAssignmentModal = () => {
    if (!showStudentModal || !selectedSchedule) return null;

    const [availableStudents, setAvailableStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [semesterFilter, setSemesterFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
      if (selectedSchedule && selectedSchedule.schedule_id) {
        loadStudentsForSchedule();
      } else {
        setError('Invalid schedule selected. Please try again.');
        setLoadingStudents(false);
      }
    }, [selectedSchedule]);

    const loadStudentsForSchedule = async () => {
      setLoadingStudents(true);
      setError('');
      try {
        const scheduleId = selectedSchedule.schedule_id;
        const response = await attendanceAPI.getScheduleStudents(scheduleId);
        
        if (response.data.status === 'success') {
          setAvailableStudents(response.data.students || []);
          const assigned = (response.data.students || [])
            .filter(s => s.is_assigned)
            .map(s => s.student_id);
          setSelectedStudentIds(assigned);
        } else {
          setError(response.data.message || 'Failed to load students');
        }
      } catch (err) {
        console.error('Failed to load students:', err);
        setError('Connection error. Please try again.');
      } finally {
        setLoadingStudents(false);
      }
    };

    // Filter and search students
    useEffect(() => {
      let filtered = availableStudents;
      
      // Semester filter
      if (semesterFilter) {
        filtered = filtered.filter(s => s.semester == semesterFilter);
      }
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(s => 
          s.name?.toLowerCase().includes(term) ||
          s.nim?.toLowerCase().includes(term)
        );
      }
      
      setFilteredStudents(filtered);
      setCurrentPage(1);
    }, [availableStudents, semesterFilter, searchTerm]);

    const handleToggleStudent = (studentId) => {
      setSelectedStudentIds(prev =>
        prev.includes(studentId) 
          ? prev.filter(id => id !== studentId)
          : [...prev, studentId]
      );
    };

    const handleSelectAll = () => {
      const currentPageIds = getCurrentPageStudents().map(s => s.student_id);
      const allSelected = currentPageIds.every(id => selectedStudentIds.includes(id));
      
      if (allSelected) {
        // Deselect all on current page
        setSelectedStudentIds(prev => prev.filter(id => !currentPageIds.includes(id)));
      } else {
        // Select all on current page
        setSelectedStudentIds(prev => [...new Set([...prev, ...currentPageIds])]);
      }
    };

    // Get students for current page
    const getCurrentPageStudents = () => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredStudents.slice(startIndex, endIndex);
    };

    // Calculate pagination info
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const currentPageStudents = getCurrentPageStudents();
    const allSelectedOnPage = currentPageStudents.every(s => selectedStudentIds.includes(s.student_id));

    const handleSaveAssignments = async () => {
      try {
        await attendanceAPI.assignStudentsToSchedule(selectedSchedule.schedule_id, selectedStudentIds);
        setShowStudentModal(false);
        setSelectedSchedule(null);
        loadData();
        alert(`Students assigned successfully! ${selectedStudentIds.length} students assigned.`);
      } catch (err) {
        console.error('Failed to assign students:', err);
        alert('Error assigning students. Please try again.');
      }
    };

    const getAssignedCount = () => {
      return availableStudents.filter(s => selectedStudentIds.includes(s.student_id)).length;
    };

    const getUnassignedCount = () => {
      return availableStudents.filter(s => !selectedStudentIds.includes(s.student_id)).length;
    };

    if (loadingStudents) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">Loading students...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6">
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-slate-700">{error}</p>
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedSchedule(null);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {selectedSchedule?.class_code} - {selectedSchedule?.class_name}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedSchedule?.day_of_week} {selectedSchedule?.start_time} - {selectedSchedule?.end_time}
              </p>
            </div>
            <button
              onClick={() => {
                setShowStudentModal(false);
                setSelectedSchedule(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{availableStudents.length}</div>
              <div className="text-xs text-blue-500">Total Students</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{getAssignedCount()}</div>
              <div className="text-xs text-green-500">Assigned</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{getUnassignedCount()}</div>
              <div className="text-xs text-red-500">Unassigned</div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or NIM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="w-40">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Semesters</option>
                {semesterOptions.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-12">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage && currentPageStudents.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      disabled={currentPageStudents.length === 0}
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NIM</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Semester</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fingerprint</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentPageStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                      {availableStudents.length === 0 
                        ? 'No students found in system' 
                        : 'No students match the filters'}
                    </td>
                  </tr>
                ) : (
                  currentPageStudents.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.student_id)}
                          onChange={() => handleToggleStudent(student.student_id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm font-mono">{student.nim}</td>
                      <td className="px-4 py-2 text-sm">{student.name}</td>
                      <td className="px-4 py-2 text-sm">{student.semester ? `Semester ${student.semester}` : '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {student.fingerprint_id ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Slot {student.fingerprint_id}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not enrolled</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {selectedStudentIds.includes(student.student_id) ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Assigned</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
            <div className="text-sm text-slate-500">
              {selectedStudentIds.length} students selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedSchedule(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Save Assignments ({selectedStudentIds.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule Management</h1>
          <p className="text-slate-500">Manage class schedules and student assignments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
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
            onClick={() => setViewMode(viewMode === 'week' ? 'list' : 'week')}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            {viewMode === 'week' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {viewMode === 'week' ? 'List' : 'Calendar'}
          </button>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setFormData({
                class_id: '',
                cohort_id: '',
                group_id: '',
                room_id: '',
                day_of_week: 'Monday',
                start_time: '08:00',
                end_time: '10:00',
                device_id: 'ESP32_01',
                semester: '',
                grace_period: 15
              });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Schedule'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search schedules by class code, name, or lecturer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={filters.class_id}
                onChange={(e) => setFilters({...filters, class_id: e.target.value})}
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Cohort</label>
              <select
                value={filters.cohort_id}
                onChange={(e) => setFilters({...filters, cohort_id: e.target.value, group_id: ''})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cohorts</option>
                {cohorts.map(cohort => (
                  <option key={cohort.cohort_id} value={cohort.cohort_id}>
                    {cohort.cohort_name} {cohort.cohort_code ? `(${cohort.cohort_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
              <select
                value={filters.group_id}
                onChange={(e) => setFilters({...filters, group_id: e.target.value})}
                disabled={!filters.cohort_id}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">All Groups</option>
                {allGroups.filter(group => !filters.cohort_id || String(group.cohort_id) === String(filters.cohort_id)).map(group => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.group_name} {group.group_code ? `(${group.group_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
              <select
                value={filters.day_of_week}
                onChange={(e) => setFilters({...filters, day_of_week: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Days</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
              <select
                value={filters.room_id}
                onChange={(e) => setFilters({...filters, room_id: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Rooms</option>
                {rooms.map(room => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.room_code} - {room.room_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select
                value={filters.semester}
                onChange={(e) => setFilters({...filters, semester: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Semesters</option>
                {semesterOptions.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ class_id: '', cohort_id: '', group_id: '', day_of_week: '', room_id: '', semester: '' })}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 30s
        </span>
        <span className="text-slate-300">|</span>
        <span>{filteredSchedules.length} schedules</span>
      </div>

      {/* Add/Edit Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
              </h2>
              <button onClick={cancelForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => {
                    const selected = classes.find(cls => String(cls.class_id) === e.target.value);
                    const cohortId = selected?.assigned_groups?.[0]?.cohort_id ? String(selected.assigned_groups[0].cohort_id) : '';
                    setFormData({...formData, class_id: e.target.value, cohort_id: cohortId, group_id: ''});
                  }}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_code} - {cls.class_name} {cls.lecturer_name ? `(${cls.lecturer_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cohort Info */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cohort</label>
                {selectedClassCohort ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {selectedClassCohort.cohort_name}
                    {selectedClassCohort.cohort_code ? ` (${selectedClassCohort.cohort_code})` : ''}
                  </div>
                ) : (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                    Select a class with assigned groups to load cohort and groups.
                  </div>
                )}
              </div>

              {/* Group Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedClassGroups.length}
                  required
                >
                  <option value="">
                    {selectedClassGroups.length ? 'Select Group' : 'Choose class with groups first'}
                  </option>
                  {selectedClassGroups.map(group => (
                    <option key={group.group_id} value={group.group_id}>
                      {group.group_name} {group.group_code ? `(${group.group_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Room (optional)</option>
                  {rooms.map(room => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.room_code} - {room.room_name} {room.building && `(${room.building})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Day of Week</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {daysOfWeek.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Time with Validation - No Overnight */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => {
                        setFormData({...formData, start_time: e.target.value});
                        validateTimes(e.target.value, formData.end_time);
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => {
                        setFormData({...formData, end_time: e.target.value});
                        validateTimes(formData.start_time, e.target.value);
                      }}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        timeError ? 'border-red-500 bg-red-50' : ''
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Time Validation Messages */}
                {timeError && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {timeError}
                  </div>
                )}

                {!timeError && formData.start_time && formData.end_time && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Duration: {calculateDuration(formData.start_time, formData.end_time)}
                  </div>
                )}

                <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
                  ⏰ <strong>Rules:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Class must start and end on the same day</li>
                    <li>Minimum duration: 30 minutes</li>
                    <li>Maximum duration: 12 hours</li>
                    <li>End time must be after start time</li>
                  </ul>
                </div>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Semesters</option>
                  {semesterOptions.map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>

              {/*grace period */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grace Period (minutes)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.grace_period}
                    onChange={(e) => setFormData({...formData, grace_period: parseInt(e.target.value) || 0})}
                    className="w-24 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-500">minutes</span>
                  <span className="text-xs text-slate-400">
                    (Students arriving after this time will be marked as Late)
                  </span>
                </div>
              </div>

              {/* Device ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device ID</label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ESP32_01"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!!timeError}
                  className={`flex-1 py-2 rounded-lg transition-colors ${
                    timeError 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>

              {timeError && (
                <div className="text-xs text-red-500 text-center">
                  Please fix the time error before saving
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Student Assignment Modal */}
      <StudentAssignmentModal />

      {/* CALENDAR VIEW */}
      {viewMode === 'week' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          {/* Week Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - 
                {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </span>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {getWeekDays().map((date, idx) => {
              const daySchedules = getSchedulesForDay(date);
              const isToday = isSameDay(date, new Date());

              return (
                <div key={idx} className="min-h-[200px]">
                  <div className={`px-3 py-2 text-center font-medium border-b border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className="text-sm text-gray-500">{format(date, 'EEE')}</div>
                    <div className={`text-lg ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {format(date, 'd')}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                    {daySchedules.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-4">No classes</div>
                    ) : (
                      daySchedules.map((schedule, sIdx) => (
                        <div
                          key={sIdx}
                          className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow ${
                            getStatusBadge(schedule.start_time, schedule.end_time, schedule.day_of_week).props.children.includes('Active') 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-800">{schedule.class_code}</div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 text-[10px]">{schedule.student_count || 0} students</span>
                            </div>
                          </div>
                          <div className="text-gray-500 text-[10px] mb-1">
                            {schedule.group_name ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                                Group: <strong>{schedule.group_code || schedule.group_name}</strong>
                                {schedule.cohort_name ? `• ${schedule.cohort_name}` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">No group assigned</span>
                            )}
                          </div>
                          <div className="text-gray-500 text-[10px] flex items-center gap-1">
                            {schedule.start_time} - {schedule.end_time}
                            <span className="text-yellow-500 text-[8px] bg-yellow-50 px-1 rounded">
                              {schedule.grace_period || 15}m
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-400 text-[10px]">{schedule.room_code || 'No room'}</span>
                            <div className="flex gap-1">
                              {/* Edit button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(schedule);
                                }}
                                className="text-blue-500 hover:text-blue-700 p-0.5 rounded"
                                title="Edit schedule"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              {/* Manage Students button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManageStudents(schedule);
                                }}
                                className="text-green-500 hover:text-green-700 p-0.5 rounded"
                                title="Manage students"
                              >
                                <Users className="w-3 h-3" />
                              </button>
                              {/* Delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(schedule.schedule_id);
                                }}
                                className="text-red-400 hover:text-red-600 p-0.5 rounded"
                                title="Delete schedule"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Day</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Grace</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Room</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Lecturer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Students</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Group</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No schedules found
                    </td>
                  </tr>
                  
                ) : (
                  filteredSchedules.map((schedule) => (
                    <tr key={schedule.schedule_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{schedule.class_code}</div>
                        <div className="text-xs text-gray-500">{schedule.class_name}</div>
                        {schedule.group_name && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            <span className="font-medium">Group:</span> {schedule.group_code || schedule.group_name}
                            {schedule.cohort_name ? ` • ${schedule.cohort_name}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{schedule.day_of_week}</td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {schedule.start_time} - {schedule.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                          ⏰ {schedule.grace_period || 15} min
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{schedule.room_code || '-'}</td>
                      <td className="px-4 py-3 text-sm">{schedule.lecturer_name || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleManageStudents(schedule)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          {schedule.student_count || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {schedule.group_name ? (
                          <span className="text-slate-700">
                            {schedule.group_code || schedule.group_name}
                          </span>
                        ) : (
                          <span className="text-gray-400">No group</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(schedule.start_time, schedule.end_time, schedule.day_of_week)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleManageStudents(schedule)}
                            className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                            title="Manage Students"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.schedule_id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{schedules.length}</div>
          <div className="text-xs text-gray-500">Total Schedules</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {schedules.filter(s => {
              const now = new Date();
              const today = format(now, 'EEEE');
              const currentTime = format(now, 'HH:mm');
              return s.day_of_week === today && currentTime >= s.start_time && currentTime <= s.end_time;
            }).length}
          </div>
          <div className="text-xs text-gray-500">Active Now</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{classes.length}</div>
          <div className="text-xs text-gray-500">Classes</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">{rooms.length}</div>
          <div className="text-xs text-gray-500">Rooms</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-teal-600">
            {schedules.reduce((acc, s) => acc + Number(s.student_count || 0), 0)}
          </div>
          <div className="text-xs text-gray-500">Total Assigned Students</div>
        </div>
      </div>
    </div>
  );
}

export default Schedules;