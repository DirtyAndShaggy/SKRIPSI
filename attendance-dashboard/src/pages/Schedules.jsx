import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, RefreshCw, 
  Calendar, Clock, Building, Filter,
  ChevronLeft, ChevronRight, List,
  LayoutGrid, AlertCircle
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isSameWeek } from 'date-fns';
import attendanceAPI from '../api/attendance';

function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'list'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({
    class_id: '',
    day_of_week: '',
    room_id: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    class_id: '',
    room_id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '10:00',
    device_id: 'ESP32_01'
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const classesResponse = await attendanceAPI.getClasses();
      if (classesResponse.data.status === 'success') {
        setClasses(classesResponse.data.classes);
      }

      const roomsResponse = await attendanceAPI.getRooms();
      if (roomsResponse.data.status === 'success') {
        setRooms(roomsResponse.data.rooms);
      }

      const schedulesResponse = await attendanceAPI.getAllSchedules();
      if (schedulesResponse.data.status === 'success') {
        setSchedules(schedulesResponse.data.schedules);
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load data', err);
      if (showLoading) {
        alert('Error loading data. Check if API is running.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadData(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        class_id: parseInt(formData.class_id),
        room_id: formData.room_id ? parseInt(formData.room_id) : null,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        device_id: formData.device_id
      };
      
      if (editingSchedule) {
        await attendanceAPI.updateSchedule(editingSchedule.schedule_id, data);
        alert('Schedule updated successfully!');
      } else {
        await attendanceAPI.addSchedule(data);
        alert('Schedule added successfully!');
      }
      
      setFormData({
        class_id: '',
        room_id: '',
        day_of_week: 'Monday',
        start_time: '08:00',
        end_time: '10:00',
        device_id: 'ESP32_01'
      });
      setShowForm(false);
      setEditingSchedule(null);
      loadData();
    } catch (err) {
      console.error('Failed to save schedule', err);
      alert('Error saving schedule. Please try again.');
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      class_id: schedule.class_id.toString(),
      room_id: schedule.room_id?.toString() || '',
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
      await attendanceAPI.deleteSchedule(scheduleId);
      loadData();
      alert('Schedule deleted successfully!');
    } catch (err) {
      console.error('Failed to delete schedule', err);
      alert('Error deleting schedule. Please try again.');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
    setFormData({
      class_id: '',
      room_id: '',
      day_of_week: 'Monday',
      start_time: '08:00',
      end_time: '10:00',
      device_id: 'ESP32_01'
    });
  };

  const getFilteredSchedules = () => {
    return schedules.filter(schedule => {
      if (filters.class_id && schedule.class_id !== parseInt(filters.class_id)) return false;
      if (filters.day_of_week && schedule.day_of_week !== filters.day_of_week) return false;
      if (filters.room_id && schedule.room_id !== parseInt(filters.room_id)) return false;
      return true;
    });
  };

  // Get week days for calendar view
  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getSchedulesForDay = (date) => {
    const dayName = format(date, 'EEEE');
    return getFilteredSchedules().filter(s => s.day_of_week === dayName);
  };

  const getClassInfo = (classId) => {
    return classes.find(c => c.class_id === classId);
  };

  const getRoomInfo = (roomId) => {
    return rooms.find(r => r.room_id === roomId);
  };

  const getStatusBadge = (startTime, endTime, dayOfWeek) => {
    const now = new Date();
    const today = format(now, 'EEEE');
    const currentTime = format(now, 'HH:mm');
    
    if (dayOfWeek === today && currentTime >= startTime && currentTime <= endTime) {
      return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">● Active</span>;
    }
    return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-medium">Scheduled</span>;
  };

  // Navigate week
  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  const filteredSchedules = getFilteredSchedules();

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
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schedule Management</h1>
          <p className="text-slate-500">Manage class schedules with calendar view</p>
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
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'week' ? 'list' : 'week')}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2"
          >
            {viewMode === 'week' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {viewMode === 'week' ? 'List' : 'Calendar'}
          </button>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setFormData({
                class_id: '',
                room_id: '',
                day_of_week: 'Monday',
                start_time: '08:00',
                end_time: '10:00',
                device_id: 'ESP32_01'
              });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Schedule'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={filters.class_id}
                onChange={(e) => setFilters({...filters, class_id: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_code} - {cls.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
              <select
                value={filters.day_of_week}
                onChange={(e) => setFilters({...filters, day_of_week: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Days</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
              <select
                value={filters.room_id}
                onChange={(e) => setFilters({...filters, room_id: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Rooms</option>
                {rooms.map(room => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.room_code} - {room.room_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setFilters({ class_id: '', day_of_week: '', room_id: '' })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 30s
        </span>
        <span className="text-slate-300">|</span>
        <span>{filteredSchedules.length} schedules</span>
      </div>

      {/* Add/Edit Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
              </h2>
              <button onClick={cancelForm} className="text-slate-400 hover:text-slate-600">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Room (optional)</option>
                  {rooms.map(room => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.room_code} - {room.room_name} {room.building && `(${room.building})`}
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
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                </button>
                <button type="button" onClick={cancelForm} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'week' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          {/* Week Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-lg">
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - 
                {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}
              </span>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {getWeekDays().map((date, idx) => {
              const dayName = format(date, 'EEEE');
              const daySchedules = getSchedulesForDay(date);
              const isToday = isSameDay(date, new Date());

              return (
                <div key={idx} className="min-h-[200px]">
                  <div className={`px-3 py-2 text-center font-medium border-b border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className="text-sm text-gray-500">{format(date, 'EEE')}</div>
                    <div className={`text-lg ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {format(date, 'd')}
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {daySchedules.length === 0 ? (
                      <div className="text-xs text-gray-400 text-center py-4">No classes</div>
                    ) : (
                      daySchedules.map((schedule, sIdx) => {
                        const classInfo = getClassInfo(schedule.class_id);
                        const roomInfo = getRoomInfo(schedule.room_id);
                        return (
                          <div
                            key={sIdx}
                            className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow ${
                              getStatusBadge(schedule.start_time, schedule.end_time, schedule.day_of_week).props.children.includes('Active') 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-white border-gray-200'
                            }`}
                            onClick={() => handleEdit(schedule)}
                          >
                            <div className="font-medium text-gray-800">
                              {classInfo ? classInfo.class_name : 'Unknown'}
                            </div>
                            <div className="text-gray-500">
                              {schedule.start_time} - {schedule.end_time}
                            </div>
                            {roomInfo && (
                              <div className="text-gray-400 text-[10px] flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {roomInfo.room_code}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Day</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Room</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Device</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No schedules found
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((schedule, idx) => {
                    const classInfo = getClassInfo(schedule.class_id);
                    const roomInfo = getRoomInfo(schedule.room_id);
                    return (
                      <tr key={schedule.schedule_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{classInfo?.class_name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{classInfo?.class_code || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{schedule.day_of_week}</td>
                        <td className="px-4 py-3 text-sm">
                          {schedule.start_time} - {schedule.end_time}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {roomInfo ? `${roomInfo.room_code} - ${roomInfo.room_name}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(schedule.start_time, schedule.end_time, schedule.day_of_week)}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-xs">
                          {schedule.device_id || 'ESP32_01'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(schedule)}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(schedule.schedule_id)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                              title="Delete"
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
      )}

      {/* Stats Footer */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{schedules.length}</div>
          <div className="text-xs text-gray-500">Total Schedules</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {schedules.filter(s => {
              const now = new Date();
              const today = format(now, 'EEEE');
              const currentTime = format(now, 'HH:mm');
              return s.day_of_week === today && currentTime >= s.start_time && currentTime <= s.end_time;
            }).length}
          </div>
          <div className="text-xs text-gray-500">Active Now</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{classes.length}</div>
          <div className="text-xs text-gray-500">Classes</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">{rooms.length}</div>
          <div className="text-xs text-gray-500">Rooms</div>
        </div>
      </div>
    </div>
  );
}

export default Schedules;