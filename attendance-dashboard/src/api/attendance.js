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

  // Lecturers
  getLecturers: () => api.get('/lecturers/list.php'),
  addLecturer: (data) => api.post('/lecturers/add.php', data),
  updateLecturer: (id, data) => api.post('/lecturers/update.php', { lecturer_id: id, ...data }),
  deleteLecturer: (id) => api.post('/lecturers/delete.php', { lecturer_id: id }),
  getCurrentLecturer: () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.user_id) {
    return api.get(`/lecturers/by_user.php?user_id=${user.user_id}`);
  }
  return Promise.reject('No user logged in');
  },
  
  // Classes
  getClasses: () => api.get('/classes/list.php'),
  addClass: (data) => api.post('/classes/add.php', data),
  updateClass: (id, data) => api.post('/classes/update.php', { class_id: id, ...data }),
  deleteClass: (id) => api.post('/classes/delete.php', { class_id: id }),
  updateClassStatus: (classId, status) => api.post('/classes/update_status.php', { class_id: classId, is_active: status }),

 // Groups
  getGroups: () => api.get('/groups/list.php'),
  getCohorts: () => api.get('/groups/cohorts.php?action=list'),
  addCohort: (data) => api.post('/groups/cohorts.php?action=add', data),
  deleteCohort: (cohortId) => api.post('/groups/cohorts.php?action=delete', { cohort_id: cohortId }),
  addGroup: (data) => api.post('/groups/add_group.php', data),
  deleteGroup: (groupId) => api.post('/groups/delete_group.php', { group_id: groupId }),

  // ─── COHORT CRUD ───
  getCohorts: () => api.get('/groups/cohorts.php?action=list'),
  addCohort: (data) => api.post('/groups/cohorts.php?action=add', data),
  updateCohort: (cohortId, data) => api.post('/groups/cohorts.php?action=update', { cohort_id: cohortId, ...data }),
  deleteCohort: (cohortId) => api.post('/groups/cohorts.php?action=delete', { cohort_id: cohortId }),
  updateCohortStatus: (cohortId, status) => api.post('/groups/cohorts.php?action=update_status', { cohort_id: cohortId, is_active: status }),

  // ─── GROUP-CLASS ASSIGNMENT ───
  getAvailableGroupsForClass: (classId) => 
    api.get(`/groups/get_available.php?class_id=${classId}`),
  assignGroupsToClass: (classId, groupIds, semester) => 
    api.post('/groups/assign_class.php', { 
      class_id: classId, 
      group_ids: groupIds,
      semester: semester 
    }),

  // ─── GROUP CRUD ───
  addGroup: (data) => api.post('/groups/add_group.php', data),
  updateGroup: (groupId, data) => api.post('/groups/update_group.php', { group_id: groupId, ...data }),
  deleteGroup: (groupId) => api.post('/groups/delete_group.php', { group_id: groupId }),
  updateGroupStatus: (groupId, status) => api.post('/groups/update_group_status.php', { group_id: groupId, is_active: status }),

  // Get Lecturer Groups
  getLecturerGroups: () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.user_id) {
    return api.get(`/groups/by_lecturer.php?user_id=${user.user_id}`);
  }
  return Promise.reject('No user logged in');
  },

  // Get Lecturer Classes
  getLecturerClasses: () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.user_id) {
    return api.get(`/lecturers/my_classes.php?user_id=${user.user_id}`);
  }
  return Promise.reject('No user logged in');
  },

  //Attendance
  getAttendanceBySchedule: (scheduleId, date) => 
  api.get(`/reports/attendance_by_schedule.php?schedule_id=${scheduleId}&date=${date}`),
  getAttendanceByDate: (date) => 
  api.get(`/reports/attendance_by_date.php?date=${date}`),

  // Schedules
  getAllSchedules: () => api.get('/schedules/list.php'),
  getSchedules: (classId) => api.get(`/schedules/list.php?class_id=${classId}`),
  addSchedule: (data) => api.post('/schedules/add.php', data),
  updateSchedule: (scheduleId, data) => api.post('/schedules/update.php', { schedule_id: scheduleId, ...data }),
  deleteSchedule: (scheduleId) => api.post('/schedules/delete.php', { schedule_id: scheduleId }),
  getTodaySchedule: (deviceId = 'ESP32_01') => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    return api.get(`/schedules/today.php?day=${dayName}&device_id=${deviceId}`);
  },

  // Schedule Students
  getScheduleStudents: (scheduleId) => api.get(`/schedules/get_students.php?schedule_id=${scheduleId}`),
  assignStudentsToSchedule: (scheduleId, studentIds) => api.post('/schedules/assign_students.php', { 
    schedule_id: scheduleId, 
    student_ids: studentIds 
  }), 
  
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
  
  //Attendance Logs
  getAttendanceLogs: (limit = 100) => api.get(`/attendance/logs.php?limit=${limit}`),

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

  // ─── DEVICES ───
  getDevices: () => api.get('/devices/list.php'),
  getCommandResult: (deviceId, commandType) => 
  api.get(`/admin/get_command_result.php?device_id=${deviceId}&command_type=${commandType}`),
  // Send command to device
  sendDeviceCommand: (deviceId, commandType, commandValue = '') => 
    api.post('/admin/fingerprint.php?action=queue', { 
      device_id: deviceId, 
      command_type: commandType,
      command_value: commandValue
    }),
  // Get device status (for ping)
  getDeviceStatus: (deviceId) => api.get(`/devices/status.php?device_id=${deviceId}`),
  // Get slot list from device (after sync)
  getDeviceSlots: (deviceId) => api.get(`/admin/fingerprint.php?action=get_slots&device_id=${deviceId}`),

};



export default attendanceAPI;