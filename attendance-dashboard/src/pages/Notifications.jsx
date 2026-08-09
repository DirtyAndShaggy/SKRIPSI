import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  Eye,
  Mail,
  Calendar,
  User,
  BookOpen,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import attendanceAPI from '../api/attendance';
import { useUser } from '../context/UserContext';

function Notifications() {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [absentStudents, setAbsentStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [threshold, setThreshold] = useState(3);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classes, setClasses] = useState([]);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [testMode, setTestMode] = useState(false);

  // ─── LOAD CLASSES FOR FILTER ───
  useEffect(() => {
    const loadClasses = async () => {
      try {
        let classList = [];
        if (isAdmin) {
          const res = await attendanceAPI.getClasses();
          if (res.data.status === 'success') {
            classList = res.data.classes || [];
          }
        } else {
          const res = await attendanceAPI.getLecturerClasses();
          if (res.data.status === 'success') {
            classList = res.data.classes || [];
          }
        }
        setClasses(classList);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    loadClasses();
  }, [isAdmin]);

  // ─── LOAD DATA ───
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 60000);
    return () => clearInterval(interval);
  }, [threshold, classFilter]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    
    try {
      // Load absent students
      const response = await attendanceAPI.getAbsentStudents(threshold, classFilter || null);
      if (response.data.status === 'success') {
        setAbsentStudents(response.data.students || []);
        setSelectedStudents([]);
        setSelectAll(false);
        setLastUpdated(new Date());
      }
      
      // Load history
      const historyRes = await attendanceAPI.getNotificationHistory(50);
      if (historyRes.data.status === 'success') {
        setHistory(historyRes.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = () => loadData(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(absentStudents.map(s => s.student_id));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
    setSelectAll(false);
  };

  const handleSendNotifications = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }
    
    const mode = testMode ? 'TEST (no emails)' : 'LIVE (sending emails)';
    if (!confirm(`Send ${mode} notifications to ${selectedStudents.length} student(s)?`)) return;
    
    setSending(true);
    setError('');
    setSuccessMessage('');
    
    try {
      let response;
      
      if (testMode) {
        // ─── TEST MODE: Just preview what would be sent ───
        const previewStudents = absentStudents.filter(s => 
          selectedStudents.includes(s.student_id)
        );
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setSuccessMessage(
          `🧪 TEST MODE: Would send ${previewStudents.length} notifications. ` +
          `No emails were actually sent.`
        );
        
        // Log for debugging
        console.log('📧 TEST MODE - Students that would be notified:', previewStudents);
        
        response = { data: { status: 'success', sent: previewStudents.length, failed: 0 } };
      } else {
        // ─── LIVE MODE: Actually send emails ───
        response = await attendanceAPI.sendNotifications({
          student_ids: selectedStudents,
          threshold: threshold
        });
        
        if (response.data.status === 'success') {
          setSuccessMessage(`✅ Sent ${response.data.sent} notifications. ${response.data.failed} failed.`);
          // Refresh data to update notification status
          await loadData(false);
          setSelectedStudents([]);
          setSelectAll(false);
        } else {
          setError(response.data.message || 'Failed to send notifications');
        }
      }
      
    } catch (err) {
      console.error('Failed to send notifications:', err);
      setError('Failed to send notifications. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleExpand = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
  };

  const getStatusBadge = (status) => {
    if (status === 'sent') {
      return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Sent
      </span>;
    } else if (status === 'failed') {
      return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
        <XCircle className="w-3 h-3" /> Failed
      </span>;
    } else {
      return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pending
      </span>;
    }
  };

  // ─── FILTER STUDENTS BY SEARCH ───
  const filteredStudents = absentStudents.filter(student => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      student.student_name?.toLowerCase().includes(term) ||
      student.nim?.toLowerCase().includes(term) ||
      student.class_code?.toLowerCase().includes(term) ||
      student.class_name?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-500">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Attendance Notifications
          </h1>
          <p className="text-slate-500">
            Send email notifications to students with repetitive absences
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showHistory ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            {showHistory ? 'Show Students' : 'View History'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 60s
        </span>
        <span className="text-slate-300">|</span>
        <span>{absentStudents.length} students with absences</span>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* ─── HISTORY VIEW ─── */}
      {showHistory ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-700">Notification History</h3>
            </div>
            <span className="text-xs text-slate-400">{history.length} records</span>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No notifications sent yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Student</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Class</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Absences</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Rate</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{item.student_name}</div>
                        <div className="text-xs text-slate-400">{item.nim}</div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm">{item.class_code}</div>
                        <div className="text-xs text-slate-400">{item.class_name}</div>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-red-600">{item.absence_count}</td>
                      <td className="px-4 py-2 text-sm">{item.attendance_percentage}%</td>
                      <td className="px-4 py-2 text-sm text-slate-500">
                        {format(new Date(item.created_at), 'MMM d, HH:mm')}
                      </td>
                      <td className="px-4 py-2">{getStatusBadge(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        // ─── STUDENT LIST ───
        <>
          {/* Controls */}
          <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-slate-700">Absence Threshold:</label>
              <select
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2, 3, 4, 5, 6, 7].map(t => (
                  <option key={t} value={t}>{t} absences</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* ─── TEST MODE TOGGLE ─── */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                />
                <span className="text-sm text-slate-700">🧪 Test Mode</span>
                <span className="text-xs text-slate-400">
                  {testMode ? '(Preview only, no emails)' : '(Send real emails)'}
                </span>
              </label>
              
              {/* Class Filter */}
              {classes.length > 0 && (
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_code} - {c.class_name}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <span className="text-sm text-slate-500">
                {selectedStudents.length} selected
              </span>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-700">
                  Students with Repetitive Absences
                  {filteredStudents.length !== absentStudents.length && (
                    <span className="ml-2 text-xs text-slate-400 font-normal">
                      (Showing {filteredStudents.length} of {absentStudents.length})
                    </span>
                  )}
                </h3>
                {testMode && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    🧪 Test Mode - No emails will be sent
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {testMode && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
                    🧪 Test Mode
                  </span>
                )}
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleSendNotifications}
                  disabled={sending || selectedStudents.length === 0}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 ${
                    testMode 
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {testMode ? 'Preview' : 'Send'} ({selectedStudents.length})
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p>No students with repetitive absences found</p>
                  <p className="text-sm mt-1">Try lowering the threshold or adjusting filters</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-500 w-10">
                        <input
                          type="checkbox"
                          checked={selectAll && filteredStudents.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Student</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Class</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Absences</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Attendance</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Last Notified</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => {
                      const isSelected = selectedStudents.includes(student.student_id);
                      const rate = student.attendance_percentage || 0;
                      const rateColor = rate < 50 ? 'text-red-600' : rate < 70 ? 'text-yellow-600' : 'text-green-600';
                      const isExpanded = expandedStudent === student.student_id;
                      
                      return (
                        <React.Fragment key={idx}>
                          <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleExpand(student.student_id)}>
                            <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(student.student_id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="font-medium text-slate-800">{student.student_name}</div>
                              <div className="text-xs text-slate-400">{student.nim}</div>
                            </td>
                            <td className="px-4 py-2">
                              <div className="text-sm">{student.class_code}</div>
                              <div className="text-xs text-slate-400">{student.class_name}</div>
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-red-600">{student.absent_count}</td>
                            <td className="px-4 py-2">
                              <span className={`text-sm font-medium ${rateColor}`}>{rate}%</span>
                              <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1">
                                <div
                                  className={`h-1.5 rounded-full ${rate < 50 ? 'bg-red-500' : rate < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(rate, 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-500">
                              {student.last_notified ? format(new Date(student.last_notified), 'MMM d, yyyy') : 'Never'}
                            </td>
                            <td className="px-4 py-2">
                              {student.last_notified ? (
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Notified
                                </span>
                              ) : (
                                <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </td>
                          </tr>
                          {/* Expanded Details */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="7" className="px-4 py-3 bg-slate-50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <span className="text-slate-500">Email:</span>
                                    <span className="ml-1 font-medium">{student.email || student.nim + '@student.unsap.ac.id'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Semester:</span>
                                    <span className="ml-1 font-medium">{student.student_semester || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Lecturer:</span>
                                    <span className="ml-1 font-medium">{student.lecturer_name || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Total Schedules:</span>
                                    <span className="ml-1 font-medium">{student.total_schedules || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Present:</span>
                                    <span className="ml-1 font-medium text-green-600">{student.present_count || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Late:</span>
                                    <span className="ml-1 font-medium text-yellow-600">{student.late_count || 0}</span>
                                  </div>
                                  {student.absence_dates && (
                                    <div className="col-span-2">
                                      <span className="text-slate-500">Absence Dates:</span>
                                      <span className="ml-1 font-medium text-red-600">{student.absence_dates}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-400 flex justify-between">
              <span>{filteredStudents.length} students with absences</span>
              <span>Threshold: {threshold} absences</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Notifications;