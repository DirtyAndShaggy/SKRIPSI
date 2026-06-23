import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw, User, Search, Users } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Lecturers() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    lecturer_code: '',
    full_name: '',
    email: '',
    phone: '',
    department: '',
    specialization: '',
    is_active: 1
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await attendanceAPI.getLecturers();
      if (response.data.status === 'success') {
        setLecturers(response.data.lecturers);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load lecturers', err);
      if (showLoading) alert('Error loading lecturers. Check if API is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => loadData(false);

  const handleToggleStatus = async (lecturerId, currentStatus) => {
    // Make sure we're using the correct status value (0 or 1)
    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'activate' : 'deactivate';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        lecturer_code: formData.lecturer_code.toUpperCase(),
        full_name: formData.full_name,
        email: formData.email || null,
        phone: formData.phone || null,
        department: formData.department || null,
        specialization: formData.specialization || null,
        is_active: formData.is_active
      };
      
      if (editingLecturer) {
        await attendanceAPI.updateLecturer(editingLecturer.lecturer_id, data);
        alert('Lecturer updated successfully!');
      } else {
        await attendanceAPI.addLecturer(data);
        alert('Lecturer added successfully!');
      }
      
      setFormData({
        lecturer_code: '',
        full_name: '',
        email: '',
        phone: '',
        department: '',
        specialization: '',
        is_active: 1
      });
      setShowForm(false);
      setEditingLecturer(null);
      loadData();
    } catch (err) {
      console.error('Failed to save lecturer', err);
      alert('Error saving lecturer. Please try again.');
    }
  };

  const handleEdit = (lecturer) => {
    setEditingLecturer(lecturer);
    setFormData({
      lecturer_code: lecturer.lecturer_code,
      full_name: lecturer.full_name,
      email: lecturer.email || '',
      phone: lecturer.phone || '',
      department: lecturer.department || '',
      specialization: lecturer.specialization || '',
      is_active: lecturer.is_active !== undefined ? lecturer.is_active : 1
    });
    setShowForm(true);
  };

  const handleDelete = async (lecturerId) => {
    if (!confirm('Are you sure you want to delete this lecturer? This will remove them from any classes they are assigned to.')) return;
    
    try {
      await attendanceAPI.deleteLecturer(lecturerId);
      loadData();
      alert('Lecturer deleted successfully!');
    } catch (err) {
      console.error('Failed to delete lecturer', err);
      alert('Error deleting lecturer. Please try again.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingLecturer(null);
    setFormData({
      lecturer_code: '',
      full_name: '',
      email: '',
      phone: '',
      department: '',
      specialization: '',
      is_active: 1
    });
  };

  const filteredLecturers = lecturers.filter(lec => {
    const searchMatch = 
      lec.lecturer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lec.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lec.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lec.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading lecturers...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lecturer Management</h2>
          <p className="text-sm text-slate-500">Manage lecturer profiles before linking to user accounts</p>
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
              setEditingLecturer(null);
              setFormData({
                lecturer_code: '',
                full_name: '',
                email: '',
                phone: '',
                department: '',
                specialization: '',
                is_active: 1
              });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Lecturer'}
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
        <span>{filteredLecturers.length} lecturers</span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, name, department, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Add/Edit Lecturer Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <h3 className="font-medium text-slate-700 mb-3">
            {editingLecturer ? 'Edit Lecturer' : 'Add New Lecturer'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Lecturer Code (e.g., DRS001)"
              value={formData.lecturer_code}
              onChange={(e) => setFormData({...formData, lecturer_code: e.target.value.toUpperCase()})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
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
              type="text"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Department (e.g., Computer Science)"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Specialization (e.g., Database Systems)"
              value={formData.specialization}
              onChange={(e) => setFormData({...formData, specialization: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Status Radio Buttons */}
            <div className="md:col-span-2 border-t border-gray-200 pt-3 mt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Lecturer Status</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.is_active === 1}
                    onChange={() => setFormData({...formData, is_active: 1})}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.is_active === 0}
                    onChange={() => setFormData({...formData, is_active: 0})}
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Inactive
                  </span>
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Inactive lecturers will not appear in dropdown selections when assigning classes or users
              </p>
            </div>

            <div className="md:col-span-2 flex gap-2 pt-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                {editingLecturer ? 'Update Lecturer' : 'Add Lecturer'}
              </button>
              <button type="button" onClick={cancelForm} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lecturers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Full Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Department</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Specialization</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Linked User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLecturers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No lecturers found
                  </td>
                </tr>
              ) : (
                filteredLecturers.map((lecturer) => {
                  // Determine if active (1 = active, 0 = inactive)
                  const isActive = lecturer.is_active === 1;
                  
                  return (
                    <tr key={lecturer.lecturer_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">
                        {lecturer.lecturer_code}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{lecturer.full_name}</td>
                      <td className="px-4 py-3 text-sm">{lecturer.department || '-'}</td>
                      <td className="px-4 py-3 text-sm">{lecturer.specialization || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleToggleStatus(lecturer.lecturer_id, lecturer.is_active)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isActive 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {isActive ? '🟢 Active' : '🔴 Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lecturer.user_id ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            User ID: {lecturer.user_id}
                          </span>
                        ) : (
                          <span className="text-yellow-600 text-xs">Not linked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(lecturer)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                            title="Edit lecturer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lecturer.lecturer_id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                            title="Delete lecturer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / Workflow */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Lecturer Management Workflow</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-700">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="font-medium">Step 1:</span> Create Lecturer Profile
            <p className="text-blue-500 mt-1">Add lecturer details (code, name, department)</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="font-medium">Step 2:</span> Create User Account
            <p className="text-blue-500 mt-1">Go to <strong>User Management</strong> and link this lecturer</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <span className="font-medium">Step 3:</span> Lecturer Login
            <p className="text-blue-500 mt-1">Lecturer sees only their assigned classes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lecturers;