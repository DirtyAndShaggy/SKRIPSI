import React, { useState, useEffect, useRef } from 'react';
import { Fingerprint, Plus, Edit2, Trash2, X, Loader2, RefreshCw } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [enrollingStudentId, setEnrollingStudentId] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState({});
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [formData, setFormData] = useState({
    nim: '',
    name: '',
    email: '',
    fingerprint_id: ''
  });
  
  // Ref for auto-refresh interval
  const intervalRef = useRef(null);

  // Load students on mount and setup auto-refresh
  useEffect(() => {
    loadStudents();

    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(() => {
      loadStudents(false);
    }, 30000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadStudents = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const response = await attendanceAPI.getStudents();
      if (response.data.status === 'success') {
        setStudents(response.data.students);
        setLastUpdated(new Date());
        
        // Check enrollment status for each student
        response.data.students.forEach(student => {
          checkEnrollmentStatus(student.student_id);
        });
      }
    } catch (err) {
      console.error('Failed to load students', err);
      if (showLoading) {
        alert('Error loading students. Check if API is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkEnrollmentStatus = async (studentId) => {
    try {
      setEnrollmentStatus(prev => ({
        ...prev,
        [studentId]: { status: 'idle' }
      }));
    } catch (err) {
      console.error('Failed to check enrollment status', err);
    }
  };

  const handleRefresh = () => {
    loadStudents(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        nim: formData.nim,
        name: formData.name,
        email: formData.email,
        fingerprint_id: formData.fingerprint_id || null
      };
      
      if (editingStudent) {
        await attendanceAPI.updateStudent(editingStudent.student_id, data);
      } else {
        await attendanceAPI.addStudent(data);
      }
      
      setFormData({ nim: '', name: '', email: '', fingerprint_id: '' });
      setShowForm(false);
      setEditingStudent(null);
      loadStudents();
      
      alert(editingStudent ? 'Student updated!' : 'Student added!');
    } catch (err) {
      console.error('Failed to save student', err);
      alert('Error saving student');
    }
  };

  const handleDelete = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await attendanceAPI.deleteStudent(studentId);
      loadStudents();
      alert('Student deleted!');
    } catch (err) {
      console.error('Failed to delete student', err);
      alert('Error deleting student');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      nim: student.nim,
      name: student.name,
      email: student.email || '',
      fingerprint_id: student.fingerprint_id || ''
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
        
        // Refresh student list to show updated fingerprint_id
        setTimeout(() => loadStudents(), 3000);
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
    setFormData({ nim: '', name: '', email: '', fingerprint_id: '' });
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
      return <span className="text-blue-600 text-xs">
        ⏳ Waiting for scan
      </span>;
    }
    if (status?.status === 'error') {
      return <span className="text-red-600 text-xs">
        ❌ {status.message}
      </span>;
    }
    return null;
  };

  if (loading) {
    return <div className="text-center py-10">Loading students...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Student Management</h2>
          <p className="text-sm text-slate-500">Manage students and assign fingerprint IDs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Student'}
          </button>
        </div>
      </div>

      {/* Last Updated & Auto-refresh indicator */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
        </span>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <input
              type="number"
              placeholder="Fingerprint ID (optional)"
              value={formData.fingerprint_id}
              onChange={(e) => setFormData({...formData, fingerprint_id: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-4 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">NIM</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Fingerprint ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No students found. Add your first student!
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{student.nim}</td>
                    <td className="px-4 py-3 text-sm">{student.name}</td>
                    <td className="px-4 py-3 text-sm">{student.email || '-'}</td>
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
                      {getStatusDisplay(student)}
                      {!student.fingerprint_id && !enrollmentStatus[student.student_id] && (
                        <span className="text-gray-400 text-xs">Ready for enrollment</span>
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
    </div>
  );
}

export default Students;