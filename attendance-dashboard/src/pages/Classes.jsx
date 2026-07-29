import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, RefreshCw, 
  Users, Search, ChevronDown, 
  ChevronUp, BookOpen, Layers,
  Power, PowerOff, Filter,
  Calendar, Clock, User, Building,
  UserPlus, Save, Edit3
} from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Classes() {
  const [classes, setClasses] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // ─── FILTERS ───
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('');
  const [expandedClass, setExpandedClass] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedScheduleForStudents, setSelectedScheduleForStudents] = useState(null);
  
  // ─── GRACE PERIOD EDIT ───
  const [editingGraceSchedule, setEditingGraceSchedule] = useState(null);
  const [gracePeriodValue, setGracePeriodValue] = useState('');
  const [updatingGrace, setUpdatingGrace] = useState(false);
  
  const [formData, setFormData] = useState({
    class_code: '',
    class_name: '',
    class_type: 'Lecture',
    semester_offered: '',
    cohort_id: '',
    is_active: 1,
    room_ids: [],
    group_ids: []
  });

  const classTypes = ['Lecture', 'Lab', 'Tutorial', 'Seminar'];
  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

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

      const schedulesResponse = await attendanceAPI.getAllSchedules();
      if (schedulesResponse.data.status === 'success') {
        setAllSchedules(schedulesResponse.data.schedules);
      }

      const roomsResponse = await attendanceAPI.getRooms();
      if (roomsResponse.data.status === 'success') {
        setRooms(roomsResponse.data.rooms);
      }

      const studentsResponse = await attendanceAPI.getStudents();
      if (studentsResponse.data.status === 'success') {
        setStudents(studentsResponse.data.students);
      }

      const groupsResponse = await attendanceAPI.getGroups();
      if (groupsResponse.data.status === 'success') {
        const cohortsData = groupsResponse.data.cohorts || [];
        setCohorts(cohortsData);
        const flattened = cohortsData.flatMap(c =>
          (c.groups || []).map(g => ({ ...g, cohort_id: String(c.cohort_id) }))
        );
        setAllGroups(flattened);
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

  const clearFilters = () => {
    setSearchTerm('');
    setSemesterFilter('');
    setStatusFilter('all');
    setGroupFilter('');
  };

  const activeFilterCount = [searchTerm, semesterFilter, statusFilter !== 'all', groupFilter].filter(Boolean).length;

  // ─── GRACE PERIOD UPDATE ───
  const handleUpdateGracePeriod = async (scheduleId, newGracePeriod) => {
    if (newGracePeriod < 0 || newGracePeriod > 120) {
      alert('Grace period must be between 0 and 120 minutes');
      return;
    }

    setUpdatingGrace(true);
    try {
      // Get the schedule to update
      const schedule = allSchedules.find(s => String(s.schedule_id) === String(scheduleId));
      if (!schedule) {
        alert('Schedule not found');
        return;
      }

      // Update schedule with new grace period
      const data = {
        class_id: schedule.class_id,
        group_id: schedule.group_id,
        room_id: schedule.room_id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        device_id: schedule.device_id || 'ESP32_01',
        semester: schedule.semester || null,
        grace_period: parseInt(newGracePeriod)
      };

      await attendanceAPI.updateSchedule(scheduleId, data);
      alert('Grace period updated successfully!');
      
      // Refresh data
      setEditingGraceSchedule(null);
      setGracePeriodValue('');
      loadData(false);
    } catch (err) {
      console.error('Failed to update grace period', err);
      alert('Error updating grace period. Please try again.');
    } finally {
      setUpdatingGrace(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        class_code: formData.class_code.toUpperCase(),
        class_name: formData.class_name,
        class_type: formData.class_type,
        semester_offered: formData.semester_offered || null,
        is_active: formData.is_active,
        room_ids: formData.room_ids || [],
        group_ids: formData.group_ids || []
      };
      
      if (editingClass) {
        await attendanceAPI.updateClass(editingClass.class_id, data);
        alert('Class updated successfully!');
      } else {
        await attendanceAPI.addClass(data);
        alert('Class added successfully!');
      }
      
      setFormData({
        class_code: '',
        class_name: '',
        class_type: 'Lecture',
        semester_offered: '',
        cohort_id: '',
        is_active: 1,
        room_ids: [],
        group_ids: []
      });
      setShowForm(false);
      setEditingClass(null);
      loadData();
    } catch (err) {
      console.error('Failed to save class', err);
      alert('Error saving class. Please try again.');
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    const assignedGroupIds = cls.assigned_groups?.map(g => String(g.group_id)) || [];
    let assignedCohortId = cls.assigned_groups?.[0]?.cohort_id ? String(cls.assigned_groups[0].cohort_id) : '';

    if (!assignedCohortId && assignedGroupIds.length > 0) {
      const matchedGroup = allGroups.find(g => assignedGroupIds.includes(String(g.group_id)));
      if (matchedGroup?.cohort_id) {
        assignedCohortId = String(matchedGroup.cohort_id);
      }
    }

    setFormData({
      class_code: cls.class_code,
      class_name: cls.class_name,
      class_type: cls.class_type || 'Lecture',
      semester_offered: cls.semester_offered || '',
      cohort_id: assignedCohortId,
      is_active: cls.is_active != null ? Number(cls.is_active) : 1,
      room_ids: cls.rooms?.map(r => String(r.room_id)) || [],
      group_ids: assignedGroupIds
    });
    setShowForm(true);
  };

  const handleDelete = async (classId) => {
    if (!confirm('Are you sure you want to delete this class? This will also remove all associated schedules and enrollments.')) return;
    
    try {
      await attendanceAPI.deleteClass(classId);
      loadData();
      alert('Class deleted successfully!');
    } catch (err) {
      console.error('Failed to delete class', err);
      alert('Error deleting class. Please try again.');
    }
  };

  const handleToggleStatus = async (classId, currentStatus) => {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'activate' : 'deactivate';
    
    if (!confirm(`Are you sure you want to ${action} this class?`)) return;
    
    try {
      await attendanceAPI.updateClassStatus(classId, newStatus);
      await loadData(false);
      alert(`Class ${action}d successfully!`);
    } catch (err) {
      console.error('Failed to update class status', err);
      alert('Error updating class status. Please try again.');
    }
  };

  const handleManageStudents = (schedule) => {
    setSelectedScheduleForStudents(schedule);
    setShowStudentModal(true);
  };

  const handleRoomToggle = (roomId) => {
    const id = String(roomId);
    setFormData(prev => {
      const currentRooms = prev.room_ids || [];
      if (currentRooms.includes(id)) {
        return { ...prev, room_ids: currentRooms.filter(rid => rid !== id) };
      } else {
        return { ...prev, room_ids: [...currentRooms, id] };
      }
    });
  };

  const handleGroupToggle = (groupId) => {
    const id = String(groupId);
    setFormData(prev => {
      const currentGroups = prev.group_ids || [];
      if (currentGroups.includes(id)) {
        return { ...prev, group_ids: currentGroups.filter(gid => gid !== id) };
      } else {
        return { ...prev, group_ids: [...currentGroups, id] };
      }
    });
  };

  const toggleExpand = (classId) => {
    setExpandedClass(expandedClass === classId ? null : classId);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setFormData({
      class_code: '',
      class_name: '',
      class_type: 'Lecture',
      semester_offered: '',
      cohort_id: '',
      is_active: 1,
      room_ids: [],
      group_ids: []
    });
  };

  const filteredClasses = classes.filter(cls => {
    const searchMatch = 
      cls.class_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const semesterMatch = !semesterFilter ||
      String(cls.semester_offered) === String(semesterFilter);

    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'active' && Number(cls.is_active) === 1) ||
      (statusFilter === 'inactive' && Number(cls.is_active) === 0);

    let groupMatch = true;
    if (groupFilter) {
      groupMatch = cls.assigned_groups?.some(g => String(g.group_id) === String(groupFilter)) || false;
    }
    
    return searchMatch && semesterMatch && statusMatch && groupMatch;
  });

  const getClassSchedules = (classId) => {
    return allSchedules.filter(s => String(s.class_id) === String(classId));
  };

  const filterGroups = allGroups.filter(g => g.is_active);

  const availableGroupsForForm = filterGroups.filter(g =>
    !formData.cohort_id || String(g.cohort_id) === String(formData.cohort_id)
  );

  // ─── STUDENT ASSIGNMENT MODAL ───
  const StudentAssignmentModal = () => {
    if (!showStudentModal || !selectedScheduleForStudents) return null;

    const [availableStudents, setAvailableStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [semesterFilter, setSemesterFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    useEffect(() => {
      if (selectedScheduleForStudents && selectedScheduleForStudents.schedule_id) {
        loadStudentsForSchedule();
      } else {
        setError('Invalid schedule selected.');
        setLoadingStudents(false);
      }
    }, [selectedScheduleForStudents]);

    const loadStudentsForSchedule = async () => {
      setLoadingStudents(true);
      setError('');
      try {
        const scheduleId = selectedScheduleForStudents.schedule_id;
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

    useEffect(() => {
      let filtered = availableStudents;
      
      if (semesterFilter) {
        filtered = filtered.filter(s => String(s.semester) === String(semesterFilter));
      }
      
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
        setSelectedStudentIds(prev => prev.filter(id => !currentPageIds.includes(id)));
      } else {
        setSelectedStudentIds(prev => [...new Set([...prev, ...currentPageIds])]);
      }
    };

    const getCurrentPageStudents = () => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return filteredStudents.slice(startIndex, endIndex);
    };

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const currentPageStudents = getCurrentPageStudents();
    const allSelectedOnPage = currentPageStudents.every(s => selectedStudentIds.includes(s.student_id));

    const handleSaveAssignments = async () => {
      try {
        await attendanceAPI.assignStudentsToSchedule(selectedScheduleForStudents.schedule_id, selectedStudentIds);
        setShowStudentModal(false);
        setSelectedScheduleForStudents(null);
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
                  setSelectedScheduleForStudents(null);
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {selectedScheduleForStudents?.class_code} - {selectedScheduleForStudents?.class_name}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedScheduleForStudents?.day_of_week} {selectedScheduleForStudents?.start_time} - {selectedScheduleForStudents?.end_time}
              </p>
            </div>
            <button
              onClick={() => {
                setShowStudentModal(false);
                setSelectedScheduleForStudents(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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

          <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
            <div className="text-sm text-slate-500">
              {selectedStudentIds.length} students selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedScheduleForStudents(null);
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
          <p className="mt-4 text-slate-500">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Class Management</h2>
          <p className="text-sm text-slate-500">Manage academic classes (subjects) and view schedules</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
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
            onClick={() => {
              setEditingClass(null);
              setFormData({
                class_code: '',
                class_name: '',
                class_type: 'Lecture',
                semester_offered: '',
                cohort_id: '',
                is_active: 1,
                room_ids: [],
                group_ids: []
              });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Class'}
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 30s
        </span>
        <span className="text-slate-300">|</span>
        <span>{filteredClasses.length} classes</span>
      </div>

      {/* ─── FILTERS SECTION ─── */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
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
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Groups</option>
                {filterGroups.map(group => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.group_code || group.group_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>
          
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Active filters:</span>
              {searchTerm && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {semesterFilter && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Semester: {semesterFilter}
                  <button onClick={() => setSemesterFilter('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {groupFilter && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Group: {filterGroups.find(g => g.group_id == groupFilter)?.group_code || groupFilter}
                  <button onClick={() => setGroupFilter('')} className="hover:text-blue-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Class Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200 max-h-[80vh] overflow-y-auto">
          <h3 className="font-medium text-slate-700 mb-3">
            {editingClass ? 'Edit Class' : 'Add New Class'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Class Code (e.g., IF301)"
              value={formData.class_code}
              onChange={(e) => setFormData({...formData, class_code: e.target.value.toUpperCase()})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Class Name (e.g., Database Systems)"
              value={formData.class_name}
              onChange={(e) => setFormData({...formData, class_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={formData.class_type}
              onChange={(e) => setFormData({...formData, class_type: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={formData.semester_offered}
              onChange={(e) => setFormData({...formData, semester_offered: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Typically Offered (Optional)</option>
              {semesterOptions.map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
            <select
              value={formData.cohort_id}
              onChange={(e) => setFormData({...formData, cohort_id: e.target.value, group_ids: []})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Cohort Year</option>
              {cohorts.map(cohort => (
                <option key={cohort.cohort_id} value={cohort.cohort_id}>
                  {cohort.cohort_name} ({cohort.cohort_code})
                </option>
              ))}
            </select>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm text-slate-700">Inactive</span>
                <div
                  onClick={() => setFormData({...formData, is_active: Number(formData.is_active) === 1 ? 0 : 1})}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    Number(formData.is_active) === 1 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      Number(formData.is_active) === 1 ? 'translate-x-6' : ''
                    }`}
                  />
                </div>
                <span className="text-sm text-slate-700">Active</span>
              </label>
              <span className={`text-xs font-medium ${formData.is_active === 1 ? 'text-green-600' : 'text-red-600'}`}>
                {formData.is_active === 1 ? '🟢 Active' : '🔴 Inactive'}
              </span>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rooms (select all that apply)
              </label>
              {rooms.length === 0 ? (
                <p className="text-sm text-slate-400">No rooms available. Please add rooms first in Room Management.</p>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {rooms.map((room) => (
                      <label key={room.room_id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={(formData.room_ids || []).includes(room.room_id)}
                          onChange={() => handleRoomToggle(room.room_id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-slate-700">
                          {room.room_code} - {room.room_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Layers className="w-4 h-4 inline mr-1" />
                Groups (select groups that take this class)
              </label>
              {!formData.cohort_id ? (
                <p className="text-sm text-slate-500">Select a cohort year first to load group options.</p>
              ) : availableGroupsForForm.length === 0 ? (
                <p className="text-sm text-slate-400">No groups available for the selected cohort.</p>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableGroupsForForm.map((group) => (
                      <label key={group.group_id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={(formData.group_ids || []).includes(String(group.group_id))}
                          onChange={() => handleGroupToggle(group.group_id)}
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-slate-700">
                          {group.group_code || group.group_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                {editingClass ? 'Update Class' : 'Add Class'}
              </button>
              <button type="button" onClick={cancelForm} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes List */}
      <div className="space-y-3">
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">No classes found</p>
            <p className="text-sm">Try adjusting your filters or add a new class</p>
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const classSchedules = getClassSchedules(cls.class_id);
            const isExpanded = expandedClass === cls.class_id;

            return (
              <div key={cls.class_id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => toggleExpand(cls.class_id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-blue-600">{cls.class_code}</span>
                      <span className="text-lg font-semibold text-slate-800">{cls.class_name}</span>
                      {cls.is_active == 1 ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Inactive
                        </span>
                      )}
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {cls.class_type || 'Lecture'}
                      </span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                        {classSchedules.length} schedules
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
                      <span>🏠 {cls.rooms?.length > 0 ? cls.rooms.map(r => r.room_code).join(', ') : 'No rooms'}</span>
                      {cls.semester_offered && <span>🎓 Semester {cls.semester_offered}</span>}
                      
                      {cls.assigned_groups && cls.assigned_groups.length > 0 ? (
                        <span className="flex items-center gap-1">
                          <span className="text-xs font-medium text-purple-600">📋 Groups:</span>
                          {cls.assigned_groups.map((group, idx) => (
                            <span key={idx} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                              {group.group_code || group.group_name}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No groups assigned</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(cls);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                      title="Edit class"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(cls.class_id, cls.is_active);
                      }}
                      className={`p-1 rounded transition-colors ${
                        cls.is_active == 1 
                          ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                          : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                      }`}
                      title={cls.is_active == 1 ? 'Deactivate class' : 'Activate class'}
                    >
                      {cls.is_active == 1 ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(cls.class_id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                      title="Delete class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Content - Schedules List with Grace Period Edit */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    {classSchedules.length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">No schedules created for this class yet.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700">Schedules</h4>
                          <span className="text-xs text-slate-400">{classSchedules.length} schedules</span>
                        </div>
                        {classSchedules.map((schedule) => {
                          const group = allGroups.find(g => String(g.group_id) === String(schedule.group_id));
                          const room = rooms.find(r => String(r.room_id) === String(schedule.room_id));
                          const isEditingGrace = editingGraceSchedule === schedule.schedule_id;

                          return (
                            <div key={schedule.schedule_id} className="bg-gray-50 rounded-lg border p-3 hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium text-slate-800 text-sm">
                                      {schedule.day_of_week}
                                    </span>
                                    <span className="text-sm text-slate-600">
                                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                                      {schedule.start_time} - {schedule.end_time}
                                    </span>
                                    {/* ─── GRACE PERIOD DISPLAY / EDIT ─── */}
                                    {isEditingGrace ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="120"
                                          value={gracePeriodValue}
                                          onChange={(e) => setGracePeriodValue(e.target.value)}
                                          className="w-16 border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          autoFocus
                                        />
                                        <span className="text-xs text-slate-500">min</span>
                                        <button
                                          onClick={() => {
                                            if (gracePeriodValue) {
                                              handleUpdateGracePeriod(schedule.schedule_id, gracePeriodValue);
                                            }
                                          }}
                                          disabled={updatingGrace}
                                          className="text-green-600 hover:text-green-800 p-0.5"
                                          title="Save grace period"
                                        >
                                          <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingGraceSchedule(null);
                                            setGracePeriodValue('');
                                          }}
                                          className="text-red-500 hover:text-red-700 p-0.5"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                                        ⏰ Grace: {schedule.grace_period || 15}m
                                        <button
                                          onClick={() => {
                                            setEditingGraceSchedule(schedule.schedule_id);
                                            setGracePeriodValue(String(schedule.grace_period || 15));
                                          }}
                                          className="text-yellow-600 hover:text-yellow-800"
                                          title="Edit grace period"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      </span>
                                    )}
                                    {group && (
                                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                        {group.group_code || group.group_name}
                                      </span>
                                    )}
                                    {room && (
                                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                        <Building className="w-3 h-3 inline mr-1" />
                                        {room.room_code}
                                      </span>
                                    )}
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                      <Users className="w-3 h-3 inline mr-1" />
                                      {schedule.student_count || 0} students
                                    </span>
                                    {schedule.lecturer_name && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                        <User className="w-3 h-3 inline mr-1" />
                                        {schedule.lecturer_name}
                                      </span>
                                    )}
                                  </div>
                                  {schedule.device_id && (
                                    <div className="text-xs text-slate-400 mt-1">
                                      Device: {schedule.device_id}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleManageStudents(schedule)}
                                    className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                                    title="Manage students"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Student Assignment Modal */}
      <StudentAssignmentModal />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>📚 <strong>Class:</strong> Academic subject entity</span>
        <span>🏠 <strong>Rooms:</strong> Possible rooms for this class</span>
        <span>📋 <strong>Groups:</strong> Which student groups take this class</span>
        <span>📅 <strong>Schedule:</strong> Expand to see all schedules for this class</span>
        <span>👥 <strong>Students:</strong> Manage students per schedule</span>
        <span>⏰ <strong>Grace Period:</strong> Click the edit icon to change late tolerance</span>
        <span>🟢 <strong>Active:</strong> Class is available for scheduling</span>
        <span>🔴 <strong>Inactive:</strong> Class is archived</span>
      </div>
    </div>
  );
}

export default Classes;