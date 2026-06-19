import React, { useState, useEffect } from 'react';
import { 
  Power, 
  RefreshCw, 
  Trash2, 
  Wifi, 
  WifiOff,
  Cpu,
  Clock,
  AlertCircle,
  CheckCircle,
  Terminal
} from 'lucide-react';

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showCommands, setShowCommands] = useState(false);

  useEffect(() => {
    loadDevices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      // You'll need to create devices/list.php endpoint
      // For now, use mock data
      setDevices([
        { 
          device_id: 'ESP32_01', 
          device_name: 'Node Absensi Lab', 
          room_name: 'Lab Komputer', 
          status: 'online', 
          last_seen: new Date().toISOString(),
          ip_address: '192.168.1.100',
          firmware: 'v1.0.0'
        },
        { 
          device_id: 'ESP32_02', 
          device_name: 'Node Absensi Lab 2', 
          room_name: 'Lab Jaringan', 
          status: 'offline', 
          last_seen: new Date(Date.now() - 7200000).toISOString(),
          ip_address: '192.168.1.101',
          firmware: 'v1.0.0'
        },
      ]);
    } catch (err) {
      console.error('Failed to load devices', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = (deviceId, command) => {
    if (!confirm(`Send "${command}" to ${deviceId}?`)) return;
    
    console.log(`Sending command ${command} to ${deviceId}`);
    alert(`Command "${command}" sent to ${deviceId}`);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Device Management</h1>
          <p className="text-slate-500">Monitor and manage ESP32 attendance devices</p>
        </div>
        <button
          onClick={loadDevices}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Devices</p>
              <p className="text-2xl font-bold text-slate-800">{devices.length}</p>
            </div>
            <Cpu className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Online</p>
              <p className="text-2xl font-bold text-green-600">
                {devices.filter(d => d.status === 'online').length}
              </p>
            </div>
            <Wifi className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Offline</p>
              <p className="text-2xl font-bold text-red-600">
                {devices.filter(d => d.status === 'offline').length}
              </p>
            </div>
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {devices.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border p-8 text-center text-slate-400">
            <Terminal className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg">No devices registered</p>
            <p className="text-sm">ESP32 devices will appear here when connected</p>
          </div>
        ) : (
          devices.map((device) => (
            <div key={device.device_id} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-2.5 h-2.5 rounded-full
                    ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}
                  `} />
                  <span className="font-semibold">{device.device_name}</span>
                </div>
                <span className="text-xs text-slate-400">{device.device_id}</span>
              </div>
              
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Room</span>
                  <span className="text-slate-700">{device.room_name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IP Address</span>
                  <span className="text-slate-700 font-mono text-xs">{device.ip_address || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Firmware</span>
                  <span className="text-slate-700">{device.firmware || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Last Seen</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTime(device.last_seen)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handleCommand(device.device_id, 'PING')}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  Ping
                </button>
                <button
                  onClick={() => handleCommand(device.device_id, 'REBOOT')}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 transition-colors"
                >
                  <Power className="w-3.5 h-3.5" />
                  Reboot
                </button>
                <button
                  onClick={() => handleCommand(device.device_id, 'DELETE_ALL')}
                  className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">About Device Management</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-blue-600">
              <li><strong>Ping</strong> - Check if device is responsive</li>
              <li><strong>Reboot</strong> - Restart the ESP32 device</li>
              <li><strong>Clear All</strong> - Delete all fingerprint data from device</li>
            </ul>
            <p className="mt-1 text-xs text-blue-500">Commands are sent to ESP32 via the admin_command API endpoint</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Devices;