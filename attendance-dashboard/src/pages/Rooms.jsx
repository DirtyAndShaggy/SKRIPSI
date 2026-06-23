import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw, Building, Users } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [formData, setFormData] = useState({
    room_code: '',
    room_name: '',
    building: '',
    capacity: ''
  });

  // Load rooms on mount
  useEffect(() => {
    loadRooms();
    const interval = setInterval(() => loadRooms(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRooms = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const response = await attendanceAPI.getRooms();
      if (response.data.status === 'success') {
        setRooms(response.data.rooms);
        setLastUpdated(new Date());
      } else {
        alert('Error loading rooms: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to load rooms', err);
      if (showLoading) {
        alert('Error loading rooms. Check if API is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadRooms(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        room_code: formData.room_code.toUpperCase(),
        room_name: formData.room_name,
        building: formData.building,
        capacity: formData.capacity || null
      };
      
      if (editingRoom) {
        await attendanceAPI.updateRoom(editingRoom.room_id, data);
        alert('Room updated successfully!');
      } else {
        await attendanceAPI.addRoom(data);
        alert('Room added successfully!');
      }
      
      setFormData({ room_code: '', room_name: '', building: '', capacity: '' });
      setShowForm(false);
      setEditingRoom(null);
      loadRooms();
    } catch (err) {
      console.error('Failed to save room', err);
      alert('Error saving room. Please try again.');
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      room_code: room.room_code || '',
      room_name: room.room_name || '',
      building: room.building || '',
      capacity: room.capacity || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (roomId) => {
    if (!confirm('Are you sure you want to delete this room? This will also remove it from any class schedules.')) return;
    
    try {
      await attendanceAPI.deleteRoom(roomId);
      loadRooms();
      alert('Room deleted successfully!');
    } catch (err) {
      console.error('Failed to delete room', err);
      alert('Error deleting room. Please try again.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingRoom(null);
    setFormData({ room_code: '', room_name: '', building: '', capacity: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Room Management</h2>
          <p className="text-sm text-slate-500">Manage rooms and their details</p>
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
              setEditingRoom(null);
              setFormData({ room_code: '', room_name: '', building: '', capacity: '' });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Room'}
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
      </div>

      {/* Add/Edit Room Form */}
      {showForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
          <h3 className="font-medium text-slate-700 mb-3">
            {editingRoom ? 'Edit Room' : 'Add New Room'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Room Code (e.g., LAB101)"
              value={formData.room_code}
              onChange={(e) => setFormData({...formData, room_code: e.target.value.toUpperCase()})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Room Name (e.g., Lab Komputer 101)"
              value={formData.room_name}
              onChange={(e) => setFormData({...formData, room_name: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Building (e.g., Gedung A)"
              value={formData.building}
              onChange={(e) => setFormData({...formData, building: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Capacity (e.g., 30)"
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {editingRoom ? 'Update Room' : 'Add Room'}
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

      {/* Rooms Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Room Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Room Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Building</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Capacity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    <Building className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No rooms found. Add your first room!
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.room_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {room.room_code}
                    </td>
                    <td className="px-4 py-3 text-sm">{room.room_name}</td>
                    <td className="px-4 py-3 text-sm">{room.building || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {room.capacity ? (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          {room.capacity}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(room)}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                          title="Edit room"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(room.room_id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete room"
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
        <span>✏️ <strong>Edit:</strong> Update room information</span>
        <span>🗑️ <strong>Delete:</strong> Remove room from the system</span>
        <span>📊 <strong>Capacity:</strong> Maximum number of students the room can hold</span>
      </div>
    </div>
  );
}

export default Rooms;