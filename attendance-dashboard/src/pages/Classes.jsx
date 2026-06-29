import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, RefreshCw, 
  Users, Search, ChevronDown, 
  ChevronUp, BookOpen
} from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Classes() {
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedClass, setExpandedClass] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedClassForGroup, setSelectedClassForGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    group_name: '',
    group_code: '',
    lecturer_id: '',
    capacity: '',
    semester: '',
    academic_year: ''
  });
  
  const [formData, setFormData] = useState({
    class_code: '',
    class_name: '',
    lecturer_id: '',
    class_type: 'Lecture',
    semester_offered: '',
    is_active: 1,
    room_ids: []
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
      // Load classes
      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }

      // Load rooms
      const roomsResponse = await attendanceAPI.getRooms();
      if (roomsResponse.data.status === 'success') {
        setRooms(roomsResponse.data.rooms);
      }

      // Load lecturers
      const lecturersResponse = await attendanceAPI.getLecturers();
      if (lecturersResponse.data.status === 'success') {
        setLecturers(lecturersResponse.data.lecturers);
      }

      // Load students
      const studentsResponse = await attendanceAPI.getStudents();
      if (studentsResponse.data.status === 'success') {
        setStudents(studentsResponse.data.students);
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

  const handleAddGroup = async (e) => {
    e.preventDefault();
    try {
      const data = {
        class_id: selectedClassForGroup.class_id,
        ...groupFormData
      };
      await attendanceAPI.addGroup(data);
      alert('Group added successfully!');
      setShowGroupModal(false);
      setGroupFormData({
        group_name: '',
        group_code: '',
        lecturer_id: '',
        capacity: '',
        semester: '',
        academic_year: ''
      });
      loadData();
    } catch (err) {
      console.error('Failed to add group', err);
      alert('Error adding group');
    }
  };

  const handleRefresh = () => loadData(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        class_code: formData.class_code.toUpperCase(),
        class_name: formData.class_name,
        lecturer_id: formData.lecturer_id || null,
        class_type: formData.class_type,
        semester_offered: formData.semester_offered || null,
        is_active: formData.is_active,
        room_ids: formData.room_ids || []
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
        lecturer_id: '',
        class_type: 'Lecture',
        semester_offered: '',
        is_active: 1,
        room_ids: []
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
    setFormData({
      class_code: cls.class_code,
      class_name: cls.class_name,
      lecturer_id: cls.lecturer_id || '',
      class_type: cls.class_type || 'Lecture',
      semester_offered: cls.semester_offered || '',
      is_active: cls.is_active !== undefined ? cls.is_active : 1,
      room_ids: cls.rooms?.map(r => r.room_id) || []
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

  const handleViewStudents = (cls) => {
    setSelectedClassForStudents(cls);
    setShowStudentModal(true);
  };

  const handleRoomToggle = (roomId) => {
    setFormData(prev => {
      const currentRooms = prev.room_ids || [];
      if (currentRooms.includes(roomId)) {
        return { ...prev, room_ids: currentRooms.filter(id => id !== roomId) };
      } else {
        return { ...prev, room_ids: [...currentRooms, roomId] };
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
      lecturer_id: '',
      class_type: 'Lecture',
      semester_offered: '',
      is_active: 1,
      room_ids: []
    });
  };

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    const searchMatch = 
      cls.class_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.lecturer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const semesterMatch = !semesterFilter || cls.students?.some(s => s.semester == semesterFilter);
    
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'active' && cls.is_active == 1) ||
      (statusFilter === 'inactive' && cls.is_active == 0);
    
    return searchMatch && semesterMatch && statusMatch;
  });

  const getStudentsForClass = (classId) => {
    const cls = classes.find(c => c.class_id === classId);
    return cls?.students || [];
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
          <p className="text-sm text-slate-500">Manage academic classes (subjects) before scheduling</p>
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
            onClick={() => {
              setEditingClass(null);
              setFormData({
                class_code: '',
                class_name: '',
                lecturer_id: '',
                class_type: 'Lecture',
                semester_offered: '',
                is_active: 1,
                room_ids: []
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, name, lecturer..."
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
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setSemesterFilter('');
                setStatusFilter('all');
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Class Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
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
              value={formData.lecturer_id}
              onChange={(e) => setFormData({...formData, lecturer_id: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Lecturer</option>
              {lecturers.map(lec => (
                <option key={lec.lecturer_id} value={lec.lecturer_id}>
                  {lec.lecturer_code} - {lec.full_name} {lec.department ? `(${lec.department})` : ''}
                </option>
              ))}
            </select>
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
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </div>
            
            {/* Room Selection */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rooms (select all that apply)
              </label>
              {rooms.length === 0 ? (
                <p className="text-sm text-slate-400">No rooms available. Please add rooms first in Room Management.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-3 rounded-lg border border-gray-200">
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
          filteredClasses.map((cls) => (
            <div key={cls.class_id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              {/* Class Header */}
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
                  </div>
                  
                  {/* ─── CLASS INFO + GROUPS ─── */}
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
                    <span>👨‍🏫 {cls.lecturer_name || 'No lecturer assigned'}</span>
                    <span>🏠 {cls.rooms?.length > 0 ? cls.rooms.map(r => r.room_code).join(', ') : 'No rooms'}</span>
                    <span>👥 {cls.student_count || 0} students</span>
                    {cls.semester_offered && <span>🎓 Semester {cls.semester_offered}</span>}
                    
                    {/* ─── GROUPS DISPLAY ─── */}
                    {cls.groups && cls.groups.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="text-xs font-medium text-purple-600">📋 Groups:</span>
                        {cls.groups.map((group, idx) => (
                          <span key={idx} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                            {group.group_code || group.group_name}
                          </span>
                        ))}
                      </span>
                    )}
                    
                    {/* ─── ADD GROUP BUTTON ─── */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClassForGroup(cls);
                        setGroupFormData({
                          group_name: '',
                          group_code: '',
                          lecturer_id: cls.lecturer_id || '',
                          capacity: '',
                          semester: '',
                          academic_year: ''
                        });
                        setShowGroupModal(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      + Add Group
                    </button>
                  </div>
                </div>
                
                {/* ─── ACTION BUTTONS ─── */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStudents(cls);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                    title="View students"
                  >
                    <Users className="w-4 h-4" />
                  </button>
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
                    {cls.is_active == 1 ? (
                      <span className="text-sm">🟢</span>
                    ) : (
                      <span className="text-sm">🔴</span>
                    )}
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
                    {expandedClass === cls.class_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Content - Student List */}
              {expandedClass === cls.class_id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">Students enrolled</h4>
                    <span className="text-xs text-slate-400">{getStudentsForClass(cls.class_id).length} students</span>
                  </div>
                  {getStudentsForClass(cls.class_id).length === 0 ? (
                    <p className="text-sm text-slate-400">No students enrolled yet. Assign students in Schedule Management.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {getStudentsForClass(cls.class_id).map((student, idx) => (
                        <div key={idx} className="text-sm text-slate-600 bg-gray-50 px-3 py-1 rounded flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{student.nim}</span>
                          <span>{student.name}</span>
                          {student.semester && (
                            <span className="text-xs text-gray-400">Sem {student.semester}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Grop Modal */}
      {showGroupModal && selectedClassForGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                Add Group to {selectedClassForGroup.class_code} - {selectedClassForGroup.class_name}
              </h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setSelectedClassForGroup(null);
                  setGroupFormData({
                    group_name: '',
                    group_code: '',
                    lecturer_id: '',
                    capacity: '',
                    semester: '',
                    academic_year: ''
                  });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g., Class A"
                  value={groupFormData.group_name}
                  onChange={(e) => setGroupFormData({...groupFormData, group_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Code</label>
                <input
                  type="text"
                  placeholder="e.g., IF301-A"
                  value={groupFormData.group_code}
                  onChange={(e) => setGroupFormData({...groupFormData, group_code: e.target.value.toUpperCase()})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lecturer</label>
                <select
                  value={groupFormData.lecturer_id}
                  onChange={(e) => setGroupFormData({...groupFormData, lecturer_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Lecturer</option>
                  {lecturers.map(lec => (
                    <option key={lec.lecturer_id} value={lec.lecturer_id}>
                      {lec.lecturer_code} - {lec.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                <input
                  type="number"
                  placeholder="Max students"
                  value={groupFormData.capacity}
                  onChange={(e) => setGroupFormData({...groupFormData, capacity: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                  <select
                    value={groupFormData.semester}
                    onChange={(e) => setGroupFormData({...groupFormData, semester: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {semesterOptions.map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    placeholder="e.g., 2025/2026"
                    value={groupFormData.academic_year}
                    onChange={(e) => setGroupFormData({...groupFormData, academic_year: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Group
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setSelectedClassForGroup(null);
                    setGroupFormData({
                      group_name: '',
                      group_code: '',
                      lecturer_id: '',
                      capacity: '',
                      semester: '',
                      academic_year: ''
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {showStudentModal && selectedClassForStudents && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedClassForStudents.class_code}</h3>
                <p className="text-sm text-slate-500">{selectedClassForStudents.class_name}</p>
              </div>
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedClassForStudents(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
              <Users className="w-4 h-4" />
              <span>{getStudentsForClass(selectedClassForStudents.class_id).length} students</span>
              <span className="text-slate-300">|</span>
              <span>👨‍🏫 {selectedClassForStudents.lecturer_name || 'No lecturer'}</span>
              <span className="text-slate-300">|</span>
              <span>🏠 {selectedClassForStudents.rooms?.map(r => r.room_name).join(', ') || 'No rooms'}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">NIM</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Semester</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fingerprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getStudentsForClass(selectedClassForStudents.class_id).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                        No students enrolled
                      </td>
                    </tr>
                  ) : (
                    getStudentsForClass(selectedClassForStudents.class_id).map((student, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-mono">{student.nim}</td>
                        <td className="px-4 py-2 text-sm">{student.name}</td>
                        <td className="px-4 py-2 text-sm">
                          {student.semester ? `Semester ${student.semester}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {student.fingerprint_id ? (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                              ✓ Slot {student.fingerprint_id}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Not enrolled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 pt-3 mt-3 flex justify-end">
              <button
                onClick={() => {
                  setShowStudentModal(false);
                  setSelectedClassForStudents(null);
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>📚 <strong>Class:</strong> Academic subject entity</span>
        <span>👨‍🏫 <strong>Lecturer:</strong> Assigned instructor</span>
        <span>🏠 <strong>Rooms:</strong> Possible rooms for this class</span>
        <span>👥 <strong>Students:</strong> Enrolled students (view only)</span>
        <span>🟢 <strong>Active:</strong> Class is available for scheduling</span>
        <span>🔴 <strong>Inactive:</strong> Class is archived</span>
      </div>
    </div>
  );
}

export default Classes;