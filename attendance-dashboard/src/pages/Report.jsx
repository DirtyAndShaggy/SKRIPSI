import React, { useState } from 'react';
import attendanceAPI from '../api/attendance';

function Report({ classId }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getAttendanceReport(1, date);
      if (response.data.status === 'success') {
        setReport(response.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Attendance Report</h2>
      
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Select Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {report && (
        <div>
          <div className="mb-4">
            <h3 className="font-bold">{report.class_name}</h3>
            <p className="text-gray-500">Date: {report.date}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">{report.summary.present}</div>
              <div className="text-sm text-gray-500">Present</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">{report.summary.late}</div>
              <div className="text-sm text-gray-500">Late</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">{report.summary.absent}</div>
              <div className="text-sm text-gray-500">Absent</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Report;