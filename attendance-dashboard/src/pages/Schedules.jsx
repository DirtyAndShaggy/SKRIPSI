import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, X } from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    class_id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00',
    device_id: 'ESP32_01'
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load classes for dropdown
      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }

      // Load schedules
      await loadSchedules();
    } catch (err) {
      console.error('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      // Since we don't have a dedicated schedules endpoint yet,
      // we'll get schedules by class - for now, show all
      // For a real implementation, you'd want a dedicated /schedules/list.php
      
      // For now, we'll show a message if no schedules
      // You can add a dedicated endpoint later
      const response = await attendanceAPI.getSchedules(1); // Example with class_id=1
      if (response.data.status === 'success') {
        setSchedules(response.data.schedules || []);
      }
    } catch (err) {
      console.error('Failed to load schedules', err);
      setSchedules([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // This would connect to a schedules/add.php endpoint
      // For now, show a success message
      console.log('Adding schedule:', formData);
      
      // Simulate success
      const newSchedule = {
        schedule_id: Date.now(),
        ...formData,
        class_name: classes.find(c => c.class_id === parseInt(formData.class_id))?.class_name || 'Unknown'
      };
      
      setSchedules([...schedules, newSchedule]);
      setShowForm(false);
      setFormData({
        class_id: '',
        day_of_week: 'Monday',
        start_time: '08:00',
        end_time: '10:00',
        device_id: 'ESP32_01'
      });
      
      alert('Schedule added successfully!');
    } catch (err) {
      console.error('Failed to add schedule', err);
      alert('Error adding schedule. Please try again.');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      class_id: schedule.class_id.toString(),
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      device_id: schedule.device_id || 'ESP32_01'
    });
    setShowForm(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      setSchedules(schedules.filter(s => s.schedule_id !== scheduleId));
      alert('Schedule deleted successfully!');
    } catch (err) {
      console.error('Failed to delete schedule', err);
      alert('Error deleting schedule');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
    setFormData({
      class_id: '',
      day_of_week: 'Monday',
      start_time: '08:00',
      end_time: '10:00',
      device_id: 'ESP32_01'
    });
  };

  const getStatusColor = (startTime, endTime) => {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);
    
    // This is simplified - you'd need the day_of_week from the schedule
    if (currentTime >= startTime && currentTime <= endTime) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule Management</h1>
          <p className="text-slate-500">Manage class schedules for attendance tracking</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_code} - {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Day of Week</label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {daysOfWeek.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device ID</label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ESP32_01"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
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

      {/* Schedule List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {schedules.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg">No schedules found</p>
            <p className="text-sm">Click "Add Schedule" to create one</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schedules.map((schedule) => (
              <div key={schedule.schedule_id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">
                        {schedule.class_name || `Class ID: ${schedule.class_id}`}
                      </h3>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full border
                        ${getStatusColor(schedule.start_time, schedule.end_time)}
                      `}>
                        {schedule.day_of_week}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {schedule.device_id || 'ESP32_01'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.schedule_id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend / Info */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <p className="font-medium">💡 How Schedules Work:</p>
        <p className="mt-1">
          Schedules define when attendance can be recorded. Students can only check in during 
          the scheduled time window for their class.
        </p>
      </div>
    </div>
  );
}

export default Schedules;