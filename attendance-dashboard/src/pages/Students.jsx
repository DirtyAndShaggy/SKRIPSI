import React, { useState, useEffect } from 'react';
import attendanceAPI from '../api/attendance';

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    nim: '',
    name: '',
    email: '',
    fingerprint_id: ''
  });

  // Load students on mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getStudents();
      if (response.data.status === 'success') {
        setStudents(response.data.students);
      }
    } catch (err) {
      console.error('Failed to load students', err);
      alert('Error loading students. Check if API is running.');
    } finally {
      setLoading(false);
    }
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
      
      // Reset form and reload
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

  const cancelForm = () => {
    setShowForm(false);
    setEditingStudent(null);
    setFormData({ nim: '', name: '', email: '', fingerprint_id: '' });
  };

  if (loading) {
    return <div className="text-center py-10">Loading students...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Student Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="NIM"
              value={formData.nim}
              onChange={(e) => setFormData({...formData, nim: e.target.value})}
              className="border rounded-lg px-3 py-2"
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="border rounded-lg px-3 py-2"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="number"
              placeholder="Fingerprint ID (optional)"
              value={formData.fingerprint_id}
              onChange={(e) => setFormData({...formData, fingerprint_id: e.target.value})}
              className="border rounded-lg px-3 py-2"
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
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
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                          ID: {student.fingerprint_id}
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student.student_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
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