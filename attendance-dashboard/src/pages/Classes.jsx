import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [formData, setFormData] = useState({
    class_code: '',
    class_name: '',
    lecturer_name: '',
    room_name: ''
  });

  // Load classes on component mount
  useEffect(() => {
    loadClasses();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadClasses(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadClasses = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const response = await attendanceAPI.getClasses();
      if (response.data.status === 'success') {
        setClasses(response.data.classes);
        setLastUpdated(new Date());
      } else {
        alert('Error loading classes: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to load classes', err);
      if (showLoading) {
        alert('Error loading classes. Check if API is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadClasses(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingClass) {
        // Update existing class
        await attendanceAPI.updateClass(editingClass.class_id, formData);
        alert('Class updated successfully!');
      } else {
        // Add new class
        await attendanceAPI.addClass(formData);
        alert('Class added successfully!');
      }
      
      setFormData({ class_code: '', class_name: '', lecturer_name: '', room_name: '' });
      setShowForm(false);
      setEditingClass(null);
      loadClasses();
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
      lecturer_name: cls.lecturer_name || '',
      room_name: cls.room_name || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (classId) => {
    if (!confirm('Are you sure you want to delete this class? This will also remove all associated schedules and enrollments.')) return;
    
    try {
      await attendanceAPI.deleteClass(classId);
      loadClasses();
      alert('Class deleted successfully!');
    } catch (err) {
      console.error('Failed to delete class', err);
      alert('Error deleting class. Please try again.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setFormData({ class_code: '', class_name: '', lecturer_name: '', room_name: '' });
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading classes...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Class Management</h2>
          <p className="text-sm text-slate-500">Manage classes and view student enrollment</p>
        </div>
        <div className="flex items-center gap-2">
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
              setFormData({ class_code: '', class_name: '', lecturer_name: '', room_name: '' });
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
      </div>

      {/* Add/Edit Class Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <h3 className="font-medium text-slate-700 mb-3">
            {editingClass ? 'Edit Class' : 'Add New Class'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <input
              type="text"
              placeholder="Lecturer Name"
              value={formData.lecturer_name}
              onChange={(e) => setFormData({...formData, lecturer_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Room Name"
              value={formData.room_name}
              onChange={(e) => setFormData({...formData, room_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingClass ? 'Update Class' : 'Add Class'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Class Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Class Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Lecturer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Room</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Students</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No classes found. Add your first class!
                  </td>
                </tr>
              ) : (
                classes.map((cls) => (
                  <tr key={cls.class_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {cls.class_code}
                    </td>
                    <td className="px-4 py-3 text-sm">{cls.class_name}</td>
                    <td className="px-4 py-3 text-sm">{cls.lecturer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{cls.room_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                        {cls.student_count || 0} enrolled
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(cls)}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                          title="Edit class"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls.class_id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete class"
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
    </div>
  );
}

export default Classes;