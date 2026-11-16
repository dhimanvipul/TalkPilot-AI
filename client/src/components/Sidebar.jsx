import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Users,
  Megaphone,
  PhoneCall,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Agents', path: '/agents', icon: Bot },
    { name: 'Contacts', path: '/contacts', icon: Users },
    { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
    { name: 'Calls', path: '/calls', icon: PhoneCall },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-[#1B1C1E]/95 backdrop-blur-2xl border-r border-[#AD8A62]/18 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl shadow-black/60 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#AD8A62]/15 bg-[#171819]/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#383A3C] via-[#292B2D] to-[#202224] border border-[#AD8A62]/40 flex items-center justify-center shadow-md shadow-black/40 group">
              <Sparkles className="w-4 h-4 text-[#C5A47E] transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div>
              <span className="font-extrabold text-base text-[#F1F0ED] tracking-tight">
                TalkPilot <span className="text-[#C5A47E] font-bold">AI</span>
              </span>
              <span className="block text-[10px] text-[#A1A09B] font-medium tracking-wide uppercase">
                Enterprise AI Suite
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#C3C2BE] hover:text-[#F1F0ED] p-1.5 rounded-lg hover:bg-[#292B2D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#795C3E]">
            Core Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#AD8A62]/20 to-[#AD8A62]/5 text-[#F1F0ED] border border-[#AD8A62]/40 shadow-sm shadow-[#AD8A62]/10'
                      : 'text-[#C3C2BE] hover:text-[#F1F0ED] hover:bg-[#292B2D]/50 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#C5A47E]' : 'text-[#A1A09B]'}`} />
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#AD8A62] shadow-[0_0_8px_#AD8A62]" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-[#AD8A62]/15 bg-[#171819]/40 space-y-2.5">
          <div className="bg-[#242628]/80 p-3 rounded-xl border border-[#C3C2BE]/10 flex items-center space-x-3 shadow-inner">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#383A3C] to-[#202224] border border-[#AD8A62]/40 flex items-center justify-center text-[#C5A47E] font-bold text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#F1F0ED] truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-[#8A8983] truncate">{user?.email || 'admin@talkpilot.ai'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#C3C2BE] hover:text-[#E2847A] hover:bg-[#C05E54]/12 border border-[#C3C2BE]/10 hover:border-[#C05E54]/30 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
