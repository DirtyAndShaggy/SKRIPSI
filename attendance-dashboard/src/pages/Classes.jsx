import React, { useState, useEffect } from 'react';
import attendanceAPI from '../api/attendance';

function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    class_code: '',
    class_name: '',
    lecturer_name: '',
    room_name: ''
  });

  // Load classes on component mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getClasses();
      if (response.data.status === 'success') {
        setClasses(response.data.classes);
      } else {
        alert('Error loading classes: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to load classes', err);
      alert('Error loading classes. Check if API is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await attendanceAPI.addClass(formData);
      setFormData({ class_code: '', class_name: '', lecturer_name: '', room_name: '' });
      setShowForm(false);
      loadClasses(); // Refresh the list
      alert('Class added successfully!');
    } catch (err) {
      console.error('Failed to add class', err);
      alert('Error adding class. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading classes...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Class Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Class'}
        </button>
      </div>

      {/* Add Class Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
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
              placeholder="Lecturer Name (optional)"
              value={formData.lecturer_name}
              onChange={(e) => setFormData({...formData, lecturer_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Room Name (optional)"
              value={formData.room_name}
              onChange={(e) => setFormData({...formData, room_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Class
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Refresh button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={loadClasses}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}

export default Classes;