import React from 'react';
import Sidebar from './Sidebar';

function Layout({ children, user }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <div className="flex-1 ml-64">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;