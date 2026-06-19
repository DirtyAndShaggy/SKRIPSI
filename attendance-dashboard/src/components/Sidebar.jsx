import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  FileText,
  Settings,
  Users2,
  LogOut,
  Fingerprint
} from 'lucide-react';

function Sidebar({ user }) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { path: '/students', icon: Users, label: 'Students', show: true },
    { path: '/classes', icon: BookOpen, label: 'Classes', show: true },
    { path: '/schedules', icon: Calendar, label: 'Schedules', show: isAdmin },
    { path: '/attendance', icon: CheckSquare, label: 'Today\'s Attendance', show: true },
    { path: '/reports', icon: FileText, label: 'Reports', show: true },
    { path: '/users', icon: Users2, label: 'Users', show: isAdmin },
    { path: '/devices', icon: Fingerprint, label: 'Devices', show: isAdmin },
  ];

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-lg font-bold">Attendance</h1>
            <p className="text-xs text-slate-400">Smart System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.show) return null;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role || 'Role'}</p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/';
          }}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white w-full px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;