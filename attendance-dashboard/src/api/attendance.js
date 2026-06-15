import axios from 'axios';

// Change this to your PHP backend IP
const API_BASE = 'http://192.168.1.6/attendance_api';

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
  
  // Schedules
  getSchedules: (classId) => api.get(`/schedules/list.php?class_id=${classId}`),
  
  // Attendance Report
  getAttendanceReport: (scheduleId, date) => 
    api.get(`/reports/attendance_report.php?schedule_id=${scheduleId}&date=${date}`),
  
  // Today's attendance (current schedule)
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    // You'll need to get the current schedule ID - for now, use 1
    return api.get(`/reports/attendance_report.php?schedule_id=1&date=${today}`);
  },
  
  // Enrollment
  requestEnrollment: (studentId, fingerprintSlot) => 
    api.post('/enrollment/request.php', { student_id: studentId, fingerprint_slot: fingerprintSlot }),
};

export default attendanceAPI;