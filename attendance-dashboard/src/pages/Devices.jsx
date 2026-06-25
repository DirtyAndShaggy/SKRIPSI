import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Cpu,
  Clock,
  Trash2,
  Power,
  Fingerprint,
  AlertCircle,
  CheckCircle,
  Terminal,
  Loader2,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Server,
  Search,
  User,
  Database
} from 'lucide-react';
import attendanceAPI from '../api/attendance';

// Confirmation Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, confirmColor = 'bg-red-600', showInput = false, extraInfo = null }) => {
  const [inputValue, setInputValue] = useState('');
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (showInput && inputValue !== 'DELETE') {
      alert('Please type "DELETE" to confirm');
      return;
    }
    onConfirm();
    setInputValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={() => { setInputValue(''); onClose(); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-slate-600">{message}</p>
        </div>
        {extraInfo && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-700">
            {extraInfo}
          </div>
        )}
        {showInput && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => { setInputValue(''); onClose(); }}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 text-white py-2 rounded-lg hover:opacity-90 transition-colors ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandResult, setCommandResult] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedDevice, setExpandedDevice] = useState(null);
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [slotList, setSlotList] = useState([]);
  const [isSynced, setIsSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: 'bg-red-600',
    showInput: false,
    extraInfo: null,
    onConfirm: null
  });

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 30000);
    
    // ✅ Cleanup on unmount
    return () => {
      clearInterval(interval);
      // Cancel any pending sync operations
      setSyncing(false);
    };
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getDevices();
      console.log('Devices API response:', response.data); // Debug log
      
      if (response.data.status === 'success') {
        // Set devices from API
        setDevices(response.data.devices);
        
        // Check if device is online - ALWAYS from API response
        const device = response.data.devices.find(d => d.device_id === 'ESP32_01');
        if (device) {
          const isOnline = device.status === 'online';
          console.log(`Device ${device.device_id} status: ${device.status}, online: ${isOnline}`);
          console.log(`Last seen: ${device.last_seen}, seconds ago: ${device.seconds_ago}`);
          setDeviceOnline(isOnline);
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load devices', err);
      setDevices([
        { 
          device_id: 'ESP32_01', 
          device_name: 'Node Absensi Lab', 
          room_name: 'Lab Komputer', 
          status: 'offline', 
          last_seen: new Date().toISOString(),
          ip_address: '192.168.1.9',
          firmware: 'v1.0.0'
        },
      ]);
      setDeviceOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDevices();
  };

  const sendCommand = async (deviceId, commandType, commandValue = '') => {
    setCommandLoading(true);
    setCommandResult(null);
    
    try {
      const response = await attendanceAPI.sendDeviceCommand(deviceId, commandType, commandValue);
      
      if (response.data.status === 'success') {
        setCommandResult({
          success: true,
          message: `Command "${commandType}" sent to ${deviceId} successfully!`
        });
        // If it's a PING command, wait and check status
        if (commandType === 'PING') {
          setTimeout(() => {
            loadDevices();
          }, 3000);
        }
        // If it's LIST command, we need to get the response
        if (commandType === 'LIST') {
          setTimeout(() => {
            fetchSlotList(deviceId);
          }, 2000);
        }
      } else {
        setCommandResult({
          success: false,
          message: response.data.message || 'Command failed'
        });
      }
    } catch (err) {
      console.error('Failed to send command:', err);
      setCommandResult({
        success: false,
        message: err.response?.data?.message || 'Connection error. Please try again.'
      });
    } finally {
      setCommandLoading(false);
      setTimeout(() => setCommandResult(null), 5000);
    }
  };

  const handleCommand = (deviceId, commandType, commandValue = '') => {
    sendCommand(deviceId, commandType, commandValue);
  };

  // ─── SYNC: Get slot list from device ───
  const fetchSlotList = async (deviceId) => {
    // Prevent multiple syncs at once
    if (syncing) return;
    
    setSyncing(true);
    setCommandResult(null);
    
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds max
    let intervalId = null;
    
    try {
      // Send the LIST command
      const response = await attendanceAPI.sendDeviceCommand(deviceId, 'LIST', '');
      
      if (response.data.status !== 'success') {
        setCommandResult({
          success: false,
          message: response.data.message || 'Failed to send LIST command'
        });
        setSyncing(false);
        return;
      }
      
      setCommandResult({
        success: true,
        message: 'LIST command sent, waiting for device response...'
      });
      
      // Poll for result (with a timeout)
      const checkForResult = async () => {
        if (attempts >= maxAttempts) {
          // Timeout - stop polling
          setSyncing(false);
          setCommandResult({
            success: false,
            message: 'Timeout waiting for device response. Please try again.'
          });
          setTimeout(() => setCommandResult(null), 5000);
          return;
        }
        
        attempts++;
        
        try {
          // Check if the command completed
          const resultResponse = await attendanceAPI.getCommandResult(deviceId, 'LIST');
          
          if (resultResponse.data.status === 'completed') {
            // Success! Got the slot list
            const slotListStr = resultResponse.data.slot_list || '';
            const slots = slotListStr ? slotListStr.split(',').map(Number) : [];
            setSlotList(slots);
            setIsSynced(true);
            setSyncing(false);
            setCommandResult({
              success: true,
              message: `Synced! Found ${slots.length} slots in use.`
            });
            setTimeout(() => setCommandResult(null), 3000);
            return;
          } else if (resultResponse.data.status === 'pending') {
            // Still pending - check again after 1 second
            setTimeout(checkForResult, 1000);
          } else {
            // Error
            setSyncing(false);
            setCommandResult({
              success: false,
              message: 'Error getting device response.'
            });
            setTimeout(() => setCommandResult(null), 5000);
          }
        } catch (err) {
          console.error('Failed to check command result:', err);
          if (attempts < maxAttempts) {
            setTimeout(checkForResult, 1000);
          } else {
            setSyncing(false);
            setCommandResult({
              success: false,
              message: 'Error checking device response.'
            });
          }
        }
      };
      
      // Start polling after 1 second
      setTimeout(checkForResult, 1000);
      
    } catch (err) {
      console.error('Failed to sync slots:', err);
      setSyncing(false);
      setCommandResult({
        success: false,
        message: err.response?.data?.message || 'Connection error. Please try again.'
      });
      setTimeout(() => setCommandResult(null), 5000);
    }
  };

  const handleSync = (deviceId) => {
    if (!deviceOnline) {
      alert('Device is offline. Please ping first.');
      return;
    }
    fetchSlotList(deviceId);
  };

  const openConfirmModal = (title, message, confirmText, confirmColor, showInput, extraInfo, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      confirmColor,
      showInput,
      extraInfo,
      onConfirm
    });
  };

  const toggleExpand = (deviceId) => {
    if (expandedDevice === deviceId) {
      setExpandedDevice(null);
    } else {
      setExpandedDevice(deviceId);
      // Reset sync state when opening
      setIsSynced(false);
      setSlotList([]);
    }
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

  // Check if a slot is assigned to a student
  const getStudentForSlot = (slot) => {
    // This would come from the API
    // For demo, we'll return mock data
    const students = {
      1: { name: 'Student A', nim: '221011001' },
      2: { name: 'Student B', nim: '221011002' },
      3: { name: 'Student C', nim: '221011003' },
      4: { name: 'Student D', nim: '221011004' },
      5: { name: 'Student E', nim: '221011005' },
      6: { name: 'Student F', nim: '221011006' },
      7: { name: 'Student G', nim: '221011007' },
    };
    return students[slot] || null;
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
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
        showInput={confirmModal.showInput}
        extraInfo={confirmModal.extraInfo}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Device Management</h1>
          <p className="text-slate-500">Monitor and manage ESP32 attendance devices</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 30s
        </span>
        <span className="text-slate-300">|</span>
        <span>{devices.length} device(s)</span>
      </div>

      {/* Command Result Notification */}
      {commandResult && (
        <div className={`mb-4 p-4 rounded-lg border ${
          commandResult.success 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {commandResult.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {commandResult.message}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Devices</p>
              <p className="text-2xl font-bold text-slate-800">{devices.length}</p>
            </div>
            <Server className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4 border-green-200 shadow-sm">
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
        <div className="bg-white rounded-xl border p-4 border-red-200 shadow-sm">
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

      {/* Device List - Click to Expand */}
      <div className="space-y-3">
        {devices.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
            <Terminal className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No devices registered</p>
            <p className="text-sm">ESP32 devices will appear here when connected</p>
          </div>
        ) : (
          devices.map((device) => {
            const isExpanded = expandedDevice === device.device_id;
            const isOnline = device.status === 'online';
            
            return (
              <div key={device.device_id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Device Header - Click to expand/collapse */}
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(device.device_id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-3 h-3 rounded-full
                      ${isOnline ? 'bg-green-500' : 'bg-red-500'}
                    `} />
                    <div>
                      <span className="font-semibold text-slate-800">
                        {device.device_name || device.device_id}
                      </span>
                      <span className="text-sm text-slate-400 ml-2">{device.device_id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(device.last_seen)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isOnline 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {device.room_name || 'No room'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content - Commands */}
                {isExpanded && (
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                    {/* Device Details Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-slate-500">IP Address</span>
                        <p className="font-mono text-slate-700">{device.ip_address || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Room</span>
                        <p className="text-slate-700">{device.room_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Firmware</span>
                        <p className="text-slate-700">{device.firmware || 'v1.0.0'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Status</span>
                        <p className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                          {isOnline ? '🟢 Online' : '🔴 Offline'}
                        </p>
                      </div>
                    </div>

                    {/* ─── STEP 1: PING FIRST ─── */}
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3">
                        Step 1: Connect to Device
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            handleCommand(device.device_id, 'PING', '');
                          }}
                          disabled={commandLoading}
                          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          <Wifi className="w-4 h-4" />
                          Ping Device
                        </button>
                        <span className="text-sm text-slate-400 flex items-center">
                          {isOnline ? '✅ Device is online' : 'Click to check connection'}
                        </span>
                      </div>
                    </div>

                    {/* ─── STEP 2: Basic Commands (Only if online) ─── */}
                    {isOnline && (
                      <div className="border-t border-slate-200 pt-4 mt-3">
                        <p className="text-sm font-medium text-slate-700 mb-3">
                          Step 2: Device Commands
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              handleCommand(device.device_id, 'TEST', '');
                            }}
                            disabled={commandLoading}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Test Sensor
                          </button>
                          <button
                            onClick={() => {
                              openConfirmModal(
                                'Reboot Device',
                                `Are you sure you want to reboot ${device.device_id}? The device will restart and be offline for a few seconds.`,
                                'Reboot',
                                'bg-yellow-600',
                                false,
                                null,
                                () => handleCommand(device.device_id, 'REBOOT', '')
                              );
                            }}
                            disabled={commandLoading}
                            className="flex items-center justify-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                          >
                            <Power className="w-4 h-4" />
                            Reboot Device
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ─── STEP 3: Sync Slots (Only if online) ─── */}
                    {isOnline && (
                      <div className="border-t border-slate-200 pt-4 mt-3">
                        <p className="text-sm font-medium text-slate-700 mb-3">
                          Step 3: Manage Fingerprint Slots
                        </p>
                        <button
                          onClick={() => handleSync(device.device_id)}
                          disabled={commandLoading || syncing}
                          className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 mb-3 w-full"
                        >
                          {syncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          {syncing ? 'Syncing...' : 'Sync Slots'}
                        </button>

                        {/* ─── Slot List (After Sync) ─── */}
                        {isSynced && slotList.length > 0 && (
                          <div className="bg-white rounded-lg border p-3">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Used Slots ({slotList.length})
                            </p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {slotList.map((slot) => {
                                const student = getStudentForSlot(slot);
                                return (
                                  <div key={slot} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs">
                                    <span className="font-mono font-medium">#{slot}</span>
                                    {student ? (
                                      <span className="text-blue-600 flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {student.name}
                                      </span>
                                    ) : (
                                      <span className="text-green-600">Free</span>
                                    )}
                                    {student && (
                                      <button
                                        onClick={() => {
                                          openConfirmModal(
                                            'Delete Fingerprint Slot',
                                            `Are you sure you want to delete slot ${slot} from ${device.device_id}?`,
                                            'Delete Slot',
                                            'bg-orange-600',
                                            false,
                                            `⚠️ This slot is assigned to ${student.name} (${student.nim}). Deleting will remove their fingerprint from the device. They will need to re-enroll.`,
                                            () => {
                                              handleCommand(device.device_id, 'DELETE_SLOT', String(slot));
                                              // Remove from list after deletion
                                              setTimeout(() => {
                                                setSlotList(slotList.filter(s => s !== slot));
                                              }, 3000);
                                            }
                                          );
                                        }}
                                        className="text-red-500 hover:text-red-700 ml-1"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Delete All */}
                            <button
                              onClick={() => {
                                openConfirmModal(
                                  '⚠️ DANGER: Delete ALL Fingerprints',
                                  `This will delete ALL fingerprints from ${device.device_id}. This action CANNOT be undone.`,
                                  'Delete All',
                                  'bg-red-700',
                                  true,
                                  'All student fingerprint IDs will be cleared from the database.',
                                  () => {
                                    handleCommand(device.device_id, 'DELETE_ALL', '');
                                    setSlotList([]);
                                    setIsSynced(false);
                                  }
                                );
                              }}
                              disabled={commandLoading}
                              className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mt-2"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              Delete ALL Slots
                            </button>
                          </div>
                        )}

                        {isSynced && slotList.length === 0 && (
                          <div className="bg-white rounded-lg border p-4 text-center text-slate-400">
                            <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No slots in use on this device</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Device Management Workflow</p>
            <ol className="mt-1 list-decimal list-inside space-y-0.5 text-blue-600">
              <li><strong>Ping</strong> - Check if device is online</li>
              <li><strong>Test Sensor</strong> - Verify fingerprint sensor is working</li>
              <li><strong>Reboot</strong> - Restart the ESP32 device</li>
              <li><strong>Sync Slots</strong> - Get list of used fingerprint slots</li>
              <li><strong>Delete Slot</strong> - Remove specific fingerprint (auto-clears database)</li>
              <li><strong>Delete All</strong> - ⚠️ Remove ALL fingerprints (requires confirmation)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Command Loading Overlay */}
      {commandLoading && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-xl">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-slate-700">Sending command to device...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Devices;