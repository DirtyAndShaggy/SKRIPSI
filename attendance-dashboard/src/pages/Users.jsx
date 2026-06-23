import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Key, X, RefreshCw, Users as UsersIcon, Shield, User, GraduationCap } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Users() {
  const [users, setUsers] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'lecturer',
    lecturer_id: ''
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
      const usersResponse = await attendanceAPI.getUsers();
      if (usersResponse.data.status === 'success') {
        setUsers(usersResponse.data.users);
      }

      const lecturersResponse = await attendanceAPI.getLecturers();
      if (lecturersResponse.data.status === 'success') {
        setLecturers(lecturersResponse.data.lecturers);
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
    
    try {
      const data = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        lecturer_id: formData.role === 'lecturer' ? formData.lecturer_id : null
      };
      
      if (!editingUser) {
        data.password = formData.password;
      }
      
      if (editingUser) {
        await attendanceAPI.updateUser(editingUser.user_id, data);
        alert('User updated successfully!');
      } else {
        await attendanceAPI.addUser(data);
        alert('User created successfully!');
      }
      
      setFormData({ email: '', password: '', full_name: '', role: 'lecturer', lecturer_id: '' });
      setShowForm(false);
      setEditingUser(null);
      loadData();
    } catch (err) {
      console.error('Failed to save user', err);
      alert('Error saving user. Please try again.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      lecturer_id: user.lecturer_info?.lecturer_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await attendanceAPI.deleteUser(userId);
      loadData();
      alert('User deleted successfully!');
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Error deleting user. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId || !newPassword) {
      alert('Please enter a new password');
      return;
    }
    
    try {
      await attendanceAPI.resetPassword(selectedUserId, newPassword);
      setShowResetPassword(false);
      setSelectedUserId(null);
      setNewPassword('');
      alert('Password reset successfully!');
    } catch (err) {
      console.error('Failed to reset password', err);
      alert('Error resetting password. Please try again.');
    }
  };

  const openResetPassword = (userId) => {
    setSelectedUserId(userId);
    setShowResetPassword(true);
    setNewPassword('');
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ email: '', password: '', full_name: '', role: 'lecturer', lecturer_id: '' });
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>;
    }
    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"><User className="w-3 h-3" /> Lecturer</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-500">Manage system users and their roles</p>
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
              setEditingUser(null);
              setFormData({ email: '', password: '', full_name: '', role: 'lecturer', lecturer_id: '' });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add User'}
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
        <span>{users.length} users</span>
      </div>

      {/* Add/Edit User Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <h3 className="font-medium text-slate-700 mb-3">
            {editingUser ? 'Edit User' : 'Add New User'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {!editingUser && (
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!editingUser}
                minLength={6}
              />
            )}
            <input
              type="text"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={formData.role}
              onChange={(e) => {
                setFormData({...formData, role: e.target.value, lecturer_id: ''});
              }}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="lecturer">Lecturer</option>
              <option value="admin">Admin</option>
            </select>
            
            {formData.role === 'lecturer' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Link to Lecturer Profile</label>
                <select
                  value={formData.lecturer_id}
                  onChange={(e) => setFormData({...formData, lecturer_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Lecturer (optional)</option>
                  {lecturers
                    .filter(l => !l.user_id || l.user_id === (editingUser?.lecturer_info?.lecturer_id))
                    .map(lec => (
                      <option key={lec.lecturer_id} value={lec.lecturer_id}>
                        {lec.lecturer_code} - {lec.full_name} {lec.department ? `(${lec.department})` : ''}
                        {lec.user_id ? ' (Linked)' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Link this user account to an existing lecturer profile
                </p>
              </div>
            )}

            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                {editingUser ? 'Update User' : 'Create User'}
              </button>
              <button type="button" onClick={cancelForm} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setSelectedUserId(null);
                  setNewPassword('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Enter a new password for this user.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={6}
            />
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Reset Password
              </button>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setSelectedUserId(null);
                  setNewPassword('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Full Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Lecturer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.role === 'lector' && user.lecturer_info ? (
                        <span className="text-xs text-blue-600">
                          {user.lecturer_info.lecturer_code}
                        </span>
                      ) : user.role === 'lecturer' && !user.lecturer_info ? (
                        <span className="text-xs text-yellow-600">Not linked</span>
                      ) : (
                        <span className="text-xs text-green-600">Linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPassword(user.user_id)}
                          className="text-yellow-600 hover:text-yellow-800 p-1 hover:bg-yellow-50 rounded"
                          title="Reset password"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                          title="Delete user"
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
        <span>👑 <strong>Admin:</strong> Full system access</span>
        <span>👨‍🏫 <strong>Lecturer:</strong> Access to their classes only</span>
        <span>🔑 <strong>Reset Password:</strong> Generate new password</span>
        <span>🔗 <strong>Linked:</strong> Lecturer account is connected to user</span>
      </div>
    </div>
  );
}

export default Users;