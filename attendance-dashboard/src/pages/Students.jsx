import React, { useState, useEffect, useRef } from 'react';
import { 
  Fingerprint, Plus, Edit2, Trash2, X, Loader2, RefreshCw, 
  GraduationCap, Layers, Users, Search, Filter
} from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Students() {
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [enrollingStudentId, setEnrollingStudentId] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState({});
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // ─── FILTERS ───
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cohortFilter, setCohortFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredGroups, setFilteredGroups] = useState([]);
  
  const [formData, setFormData] = useState({
    nim: '',
    name: '',
    email: '',
    semester: '',
    academic_year: '',
    fingerprint_id: '',
    cohort_id: '',
    group_id: ''
  });
  
  const intervalRef = useRef(null);

  const semesterOptions = [1, 2, 3, 4, 5, 6, 7, 8];
  const academicYearOptions = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(false), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const studentsResponse = await attendanceAPI.getStudents();
      if (studentsResponse.data.status === 'success') {
        setStudents(studentsResponse.data.students);
      }

      const groupsResponse = await attendanceAPI.getGroups();
      if (groupsResponse.data.status === 'success') {
        setCohorts(groupsResponse.data.cohorts);
        const flattened = groupsResponse.data.cohorts.flatMap(c =>
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

  // Filter groups when cohort changes in form
  useEffect(() => {
    if (formData.cohort_id) {
      const filtered = allGroups.filter(g => String(g.cohort_id) === String(formData.cohort_id));
      setFilteredGroups(filtered);
    } else {
      setFilteredGroups([]);
    }
  }, [formData.cohort_id, allGroups]);

  const handleRefresh = () => loadData(false);

  const clearFilters = () => {
    setSearchTerm('');
    setCohortFilter('');
    setGroupFilter('');
    setSemesterFilter('');
    setStatusFilter('all');
  };

  const activeFilterCount = [searchTerm, cohortFilter, groupFilter, semesterFilter, statusFilter !== 'all'].filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        nim: formData.nim,
        name: formData.name,
        email: formData.email || null,
        semester: formData.semester || null,
        academic_year: formData.academic_year || null,
        fingerprint_id: formData.fingerprint_id || null,
        cohort_id: formData.cohort_id || null,
        group_id: formData.group_id || null
      };
      
      if (editingStudent) {
        await attendanceAPI.updateStudent(editingStudent.student_id, data);
        alert('Student updated successfully!');
      } else {
        await attendanceAPI.addStudent(data);
        alert('Student added successfully!');
      }
      
      setFormData({ nim: '', name: '', email: '', semester: '', academic_year: '', fingerprint_id: '', cohort_id: '', group_id: '' });
      setShowForm(false);
      setEditingStudent(null);
      loadData();
    } catch (err) {
      console.error('Failed to save student', err);
      alert('Error saving student. Please try again.');
    }
  };

  const handleDelete = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await attendanceAPI.deleteStudent(studentId);
      loadData();
      alert('Student deleted successfully!');
    } catch (err) {
      console.error('Failed to delete student', err);
      alert('Error deleting student. Please try again.');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      nim: student.nim,
      name: student.name,
      email: student.email || '',
      semester: student.semester || '',
      academic_year: student.academic_year || '',
      fingerprint_id: student.fingerprint_id || '',
      cohort_id: student.cohort_id || '',
      group_id: student.group_id || ''
    });
    setShowForm(true);
  };

  const handleEnroll = async (studentId) => {
    if (!confirm('This will request fingerprint enrollment for this student. Make sure they are ready to scan on the ESP32 device.')) return;
    
    setEnrollingStudentId(studentId);
    setEnrollmentStatus(prev => ({
      ...prev,
      [studentId]: { status: 'pending', message: 'Requesting enrollment...' }
    }));

    try {
      const response = await attendanceAPI.requestEnrollment(studentId);
      
      if (response.data.status === 'success') {
        setEnrollmentStatus(prev => ({
          ...prev,
          [studentId]: { 
            status: 'requested', 
            message: `Assigned slot ${response.data.fingerprint_slot}. Please scan fingerprint on ESP32.`,
            slot: response.data.fingerprint_slot
          }
        }));
        alert(`Enrollment request created! Student will be assigned to slot ${response.data.fingerprint_slot}. Please scan fingerprint on ESP32.`);
        setTimeout(() => loadData(), 3000);
      } else {
        setEnrollmentStatus(prev => ({
          ...prev,
          [studentId]: { 
            status: 'error', 
            message: response.data.message || 'Enrollment request failed'
          }
        }));
        alert(`Enrollment request failed: ${response.data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to request enrollment', err);
      const errorMsg = err.response?.data?.message || 'Connection error. Please try again.';
      setEnrollmentStatus(prev => ({
        ...prev,
        [studentId]: { 
          status: 'error', 
          message: errorMsg
        }
      }));
      alert(`Error: ${errorMsg}`);
    } finally {
      setEnrollingStudentId(null);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({ nim: '', name: '', email: '', semester: '', academic_year: '', fingerprint_id: '', cohort_id: '', group_id: '' });
  };

  const getStatusDisplay = (student) => {
    const status = enrollmentStatus[student.student_id];
    
    if (status?.status === 'pending') {
      return <span className="text-yellow-600 text-xs flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Requesting...
      </span>;
    }
    if (status?.status === 'requested') {
      return <span className="text-blue-600 text-xs">⏳ Waiting for scan</span>;
    }
    if (status?.status === 'error') {
      return <span className="text-red-600 text-xs">❌ {status.message}</span>;
    }
    return null;
  };

  // ─── FILTER STUDENTS ───
  const filteredStudents = students.filter(student => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches = 
        student.nim?.toLowerCase().includes(term) ||
        student.name?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term);
      if (!matches) return false;
    }
    
    // Cohort filter
    if (cohortFilter && student.cohort_id != cohortFilter) return false;
    
    // Group filter
    if (groupFilter && student.group_id != groupFilter) return false;
    
    // Semester filter
    if (semesterFilter && student.semester != semesterFilter) return false;
    
    // Status filter
    if (statusFilter === 'active') return Boolean(student.fingerprint_id);
    if (statusFilter === 'inactive') return !student.fingerprint_id;
    if (statusFilter === 'all') return true;
    
    return true;
  });

  // Get cohorts for filter dropdown
  const filterCohorts = cohorts.map(c => ({ ...c, cohort_id: String(c.cohort_id) }));

  // Get groups for filter dropdown
  const filterGroups = allGroups.filter(g => {
    if (!cohortFilter) return true;
    return String(g.cohort_id) === String(cohortFilter);
  });

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading students...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Student Management</h2>
          <p className="text-sm text-slate-500">Manage students, assign cohorts, groups, and fingerprint IDs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ─── FILTER TOGGLE BUTTON ─── */}
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
              setEditingStudent(null);
              setFormData({ nim: '', name: '', email: '', semester: '', academic_year: '', fingerprint_id: '', cohort_id: '', group_id: '' });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Student'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 30s
        </span>
        <span className="text-slate-300">|</span>
        <span>{filteredStudents.length} students</span>
      </div>

      {/* ─── FILTERS SECTION ─── (Togglable) */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by NIM, name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Cohort Filter */}
            <div>
              <select
                value={cohortFilter}
                onChange={(e) => {
                  setCohortFilter(e.target.value);
                  setGroupFilter(''); // Reset group when cohort changes
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Cohorts</option>
                {filterCohorts.map(cohort => (
                  <option key={cohort.cohort_id} value={cohort.cohort_id}>
                    {cohort.cohort_name} ({cohort.cohort_code})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Group Filter */}
            <div>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!cohortFilter}
              >
                <option value="">All Groups</option>
                {filterGroups.map(group => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.group_name} ({group.group_code})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Semester Filter */}
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

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Has Fingerprint</option>
                <option value="inactive">No Fingerprint</option>
              </select>
            </div>
          </div>
          
          {/* Clear Filters */}
          <div className="flex justify-end mt-3">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All Filters
            </button>
          </div>

          {/* Active filters display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Active filters:</span>
              {searchTerm && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {cohortFilter && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Cohort: {cohorts.find(c => String(c.cohort_id) === cohortFilter)?.cohort_name || cohortFilter}
                  <button onClick={() => { setCohortFilter(''); setGroupFilter(''); }} className="hover:text-blue-900">×</button>
                </span>
              )}
              {groupFilter && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Group: {allGroups.find(g => String(g.group_id) === groupFilter)?.group_name || groupFilter}
                  <button onClick={() => setGroupFilter('')} className="hover:text-blue-900">×</button>
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
                  Status: {statusFilter === 'active' ? 'Has Fingerprint' : 'No Fingerprint'}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-blue-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Student Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <h3 className="font-medium text-slate-700 mb-3">
            {editingStudent ? 'Edit Student' : 'Add New Student'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="NIM"
              value={formData.nim}
              onChange={(e) => setFormData({...formData, nim: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.semester}
              onChange={(e) => setFormData({...formData, semester: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Semester</option>
              {semesterOptions.map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
            <select
              value={formData.academic_year}
              onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Academic Year</option>
              {academicYearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Fingerprint ID (optional)"
              value={formData.fingerprint_id}
              onChange={(e) => setFormData({...formData, fingerprint_id: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.cohort_id}
              onChange={(e) => {
                setFormData({...formData, cohort_id: e.target.value, group_id: ''});
              }}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Cohort</option>
              {cohorts.map(cohort => (
                <option key={cohort.cohort_id} value={cohort.cohort_id}>
                  {cohort.cohort_name} ({cohort.cohort_code})
                </option>
              ))}
            </select>
            <select
              value={formData.group_id}
              onChange={(e) => setFormData({...formData, group_id: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!formData.cohort_id}
            >
              <option value="">Select Group</option>
              {filteredGroups.map(group => (
                <option key={group.group_id} value={group.group_id}>
                  {group.group_name} ({group.group_code})
                </option>
              ))}
            </select>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>
              <button type="button" onClick={cancelForm} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">NIM</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cohort</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Group</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Semester</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fingerprint</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    No students found. Add your first student!
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{student.nim}</td>
                    <td className="px-4 py-3 text-sm">{student.name}</td>
                    <td className="px-4 py-3 text-sm">{student.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {student.cohort_name ? (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                          {student.cohort_code || student.cohort_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.group_name ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                          {student.group_code || student.group_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.semester ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          Sem {student.semester}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.fingerprint_id ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                          Slot: {student.fingerprint_id}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {!student.fingerprint_id ? (
                          <button
                            onClick={() => handleEnroll(student.student_id)}
                            disabled={enrollingStudentId === student.student_id}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 text-xs disabled:opacity-50"
                          >
                            {enrollingStudentId === student.student_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Fingerprint className="w-3.5 h-3.5" />
                            )}
                            Enroll
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnroll(student.student_id)}
                            disabled={enrollingStudentId === student.student_id}
                            className="text-yellow-600 hover:text-yellow-800 px-2 py-1 hover:bg-yellow-50 rounded transition-colors flex items-center gap-1 text-xs disabled:opacity-50"
                          >
                            <Fingerprint className="w-3.5 h-3.5" />
                            Re-enroll
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.student_id)}
                          className="text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                        >
                          Delete
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

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>💡 <strong>Enroll:</strong> Request fingerprint enrollment on ESP32</span>
        <span>🔄 <strong>Re-enroll:</strong> Replace existing fingerprint</span>
        <span>🎓 <strong>Cohort:</strong> Student's academic year group (e.g., 2020/2021)</span>
        <span>📚 <strong>Group:</strong> Student's section within their cohort (e.g., A, B, C)</span>
        <span>📅 <strong>Semester:</strong> Current semester the student is in</span>
        <span>🔽 <strong>Filters:</strong> Click the Filters button to show/hide filter options</span>
      </div>
    </div>
  );
}

export default Students;