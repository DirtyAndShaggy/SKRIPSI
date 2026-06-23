import axios from 'axios';

// Use localhost for testing (since XAMPP is on the same computer)
const API_BASE = 'http://localhost/attendance_api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Functions
export const attendanceAPI = {
  // Auth
  login: (email, password) => api.post('/auth/login.php', { email, password }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // Students
  getStudents: () => api.get('/students/list.php'),
  addStudent: (data) => api.post('/students/add.php', data),
  updateStudent: (id, data) => api.post('/students/update.php', { id, ...data }),
  deleteStudent: (id) => api.post('/students/delete.php', { id }),
  
  // Classes
  getClasses: () => api.get('/classes/list.php'),
  addClass: (data) => api.post('/classes/add.php', data),
  updateClass: (id, data) => api.post('/classes/update.php', { class_id: id, ...data }),
  deleteClass: (id) => api.post('/classes/delete.php', { class_id: id }),

  // Schedules
  getAllSchedules: () => api.get('/schedules/list.php'),
  getSchedules: (classId) => api.get(`/schedules/list.php?class_id=${classId}`),
  addSchedule: (data) => api.post('/schedules/add.php', data),
  deleteSchedule: (scheduleId) => api.post('/schedules/delete.php', { schedule_id: scheduleId }),
  updateSchedule: (scheduleId, data) => api.post('/schedules/update.php', { schedule_id: scheduleId, ...data }),
  
  // Rooms
  getRooms: () => api.get('/rooms/list.php'),
  addRoom: (data) => api.post('/rooms/add.php', data),
  updateRoom: (roomId, data) => api.post('/rooms/update.php', { room_id: roomId, ...data }),
  deleteRoom: (roomId) => api.post('/rooms/delete.php', { room_id: roomId }),

  // Get today's schedule for a device
  getTodaySchedule: async (deviceId = 'ESP32_01') => {
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  return api.get(`/schedules/today.php?day=${dayName}&device_id=${deviceId}`);
  },
  
  // Attendance Report
  getAttendanceReport: (scheduleId, date) => 
    api.get(`/reports/attendance_report.php?schedule_id=${scheduleId}&date=${date}`),
  
  // Today's attendance (current schedule)
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get(`/reports/attendance_report.php?schedule_id=1&date=${today}`);
  },
  
  // Enrollment
  requestEnrollment: (studentId) => 
  api.post('/enrollment/create.php', { 
    student_id: studentId, 
    device_id: 'ESP32_01'
  }),

  // Cancel fingerprint enrollment
  cancelEnrollment: (requestId) => 
  api.post('/enrollment/cancel.php', { 
    request_id: requestId 
  }),

  // Users
  getUsers: () => api.get('/users/list.php'),
  addUser: (data) => api.post('/users/add.php', data),
  updateUser: (userId, data) => api.post('/users/update.php', { user_id: userId, ...data }),
  deleteUser: (userId) => api.post('/users/delete.php', { user_id: userId }),
  resetPassword: (userId, newPassword) => api.post('/users/reset_password.php', { user_id: userId, new_password: newPassword }),
};

export default attendanceAPI;