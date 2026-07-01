import React, { useState } from 'react';
import { FileDown, Printer, Calendar as CalendarIcon } from 'lucide-react';
import attendanceAPI from '../api/attendance';
import { getLocalDateString } from '../utils/date';

function Reports() {
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getAttendanceReport(1, selectedDate);
      if (response.data.status === 'success') {
        setReportData(response.data);
      }
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Attendance Reports</h1>
        <p className="text-slate-500">Generate and export attendance reports</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>IF301 - Database Systems</option>
              <option>IF302 - Networking</option>
            </select>
          </div>
          <button
            onClick={generateReport}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <FileDown className="w-4 h-4 inline mr-1" />
            Excel
          </button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            <FileDown className="w-4 h-4 inline mr-1" />
            PDF
          </button>
          <button className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700">
            <Printer className="w-4 h-4 inline mr-1" />
            Print
          </button>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold">{reportData.class_name}</h3>
            <p className="text-sm text-slate-500">Date: {reportData.date}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{reportData.summary?.present || 0}</div>
              <div className="text-sm text-slate-500">Present</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{reportData.summary?.late || 0}</div>
              <div className="text-sm text-slate-500">Late</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{reportData.summary?.absent || 0}</div>
              <div className="text-sm text-slate-500">Absent</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">NIM</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportData.students?.map((student, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{student.nim}</td>
                    <td className="px-4 py-3 text-sm">{student.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${student.final_status === 'Present' ? 'bg-green-100 text-green-700' : ''}
                        ${student.final_status === 'Late' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${student.final_status === 'Absent' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {student.final_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {student.formatted_time || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;