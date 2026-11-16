import React from 'react';
import { Menu, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ onOpenSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-[#1B1C1E]/80 backdrop-blur-xl border-b border-[#C3C2BE]/10 sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden text-[#C3C2BE] hover:text-[#F1F0ED] p-2 rounded-xl hover:bg-[#292B2D] border border-transparent hover:border-[#AD8A62]/30 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[#AD8A62] shadow-[0_0_6px_#AD8A62] hidden sm:block" />
          <h1 className="text-xs font-semibold text-[#F1F0ED] tracking-wide uppercase hidden sm:block">
            TalkPilot AI <span className="text-[#8A8983] font-normal">/ Enterprise Workspace</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Calling Mode Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#242628]/90 border border-[#AD8A62]/30 text-[#C5A47E] text-xs font-medium shadow-sm">
          <Activity className="w-3.5 h-3.5 text-[#AD8A62] animate-pulse" />
          <span className="text-[11px] tracking-wide">
            Mode: <strong className="font-bold text-[#F1F0ED]">MOCK / BROWSER</strong>
          </span>
        </div>

        {/* DNC Compliance Protection Badge */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#202224]/80 border border-[#C3C2BE]/15 text-[#C3C2BE] text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#85C09B]" />
          <span className="text-[11px]">DNC Protected</span>
        </div>

        {/* User initials */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#383A3C] to-[#202224] border border-[#AD8A62]/40 flex items-center justify-center text-[#C5A47E] font-bold text-xs shadow-sm">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
