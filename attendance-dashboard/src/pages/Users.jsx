import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Key, X, UserCog, Shield, User, Users as UsersIcon } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'lecturer'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // You'll need to create users/list.php endpoint
      const response = await attendanceAPI.getUsers();
      if (response.data.status === 'success') {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error('Failed to load users', err);
      // Use mock data for now if endpoint doesn't exist
      setUsers([
        { user_id: 1, email: 'admin@test.com', full_name: 'System Admin', role: 'admin', is_active: 1 },
        { user_id: 2, email: 'lecturer@test.com', full_name: 'Demo Lecturer', role: 'lecturer', is_active: 1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        // Update user (without password)
        await attendanceAPI.updateUser(editingUser.user_id, {
          full_name: formData.full_name,
          role: formData.role,
          email: formData.email
        });
      } else {
        // Create new user
        await attendanceAPI.addUser(formData);
      }
      
      setShowForm(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', role: 'lecturer' });
      loadUsers();
      alert(editingUser ? 'User updated!' : 'User created!');
    } catch (err) {
      console.error('Failed to save user', err);
      alert('Error saving user');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await attendanceAPI.deleteUser(userId);
      loadUsers();
      alert('User deleted!');
    } catch (err) {
      console.error('Failed to delete user', err);
      alert('Error deleting user');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUserId) return;
    
    try {
      await attendanceAPI.resetPassword(selectedUserId, newPassword);
      setShowResetPassword(false);
      setSelectedUserId(null);
      setNewPassword('');
      alert('Password reset successfully!');
    } catch (err) {
      console.error('Failed to reset password', err);
      alert('Error resetting password');
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
    setFormData({ email: '', password: '', full_name: '', role: 'lecturer' });
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">Admin</span>;
    }
    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Lecturer</span>;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">Manage system users and their permissions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Add/Edit User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={cancelForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!editingUser}
                    minLength={6}
                  />
                  <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Reset Password</h2>
              <button
                onClick={() => setShowResetPassword(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              Enter a new password for this user. They will need to use this password to login.
            </p>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={6}
              required
            />

            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reset Password
              </button>
              <button
                onClick={() => setShowResetPassword(false)}
                className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              email: user.email,
                              full_name: user.full_name,
                              role: user.role,
                              password: ''
                            });
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openResetPassword(user.user_id)}
                          className="text-yellow-600 hover:text-yellow-800 p-1 hover:bg-yellow-50 rounded"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
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

export default Users;