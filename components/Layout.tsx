import React from 'react';
import { User, Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  onSwitchRole: () => void;
  
  // Navigation State
  viewMode: 'LIST' | 'CALENDAR' | 'DISPATCH' | 'MAP';
  onViewModeChange: (mode: 'LIST' | 'CALENDAR' | 'DISPATCH' | 'MAP') => void;
  
  timeView: 'DAY' | 'WEEK' | 'MONTH' | 'INDIVIDUAL';
  onTimeViewChange: (view: 'DAY' | 'WEEK' | 'MONTH' | 'INDIVIDUAL') => void;

  scope: 'MY' | 'TEAM';
  onScopeChange: (scope: 'MY' | 'TEAM') => void;

  currentDate: Date;
  onDateChange: (date: Date) => void;

  onCreateClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentUser, 
  onSwitchRole,
  viewMode,
  onViewModeChange,
  timeView,
  onTimeViewChange,
  scope,
  onScopeChange,
  currentDate,
  onDateChange,
  onCreateClick
}) => {
  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      {/* 1. Main Header - Dark Blue */}
      <header className="bg-[#0f172a] text-white flex items-center justify-between px-4 h-14 flex-shrink-0 z-30">
        <div className="flex items-center gap-6">
          {/* Logo Area */}
          <div className="flex items-center gap-2 w-48">
             <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center text-sky-400 font-bold">
               <i className="fa-solid fa-heart-pulse"></i>
             </div>
             <span className="font-semibold text-lg tracking-tight">PulseShift</span>
          </div>

          <div className="h-6 w-px bg-slate-700 mx-2 hidden md:block"></div>

          {/* Title */}
          <h1 className="font-semibold text-lg hidden md:block">Schedule</h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
           <button 
             onClick={onCreateClick}
             className="bg-[#1e293b] hover:bg-[#334155] border border-slate-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
           >
             <i className="fa-solid fa-plus text-xs"></i>
             Create
           </button>
           
           <div className="flex items-center gap-4 text-slate-400 mx-2">
             <button className="hover:text-white"><i className="fa-solid fa-magnifying-glass"></i></button>
             <button className="hover:text-white"><i className="fa-regular fa-bell"></i></button>
             <button className="hover:text-white"><i className="fa-solid fa-rotate"></i></button>
             <button className="hover:text-white"><i className="fa-regular fa-file-lines"></i></button>
             <button className="hover:text-white"><i className="fa-regular fa-circle-question"></i></button>
           </div>

           <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

           {/* User Profile */}
           <div className="flex items-center gap-3 pl-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors" onClick={onSwitchRole} title="Switch Role (Demo)">
             <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
             <div className="hidden md:block leading-tight">
               <div className="text-sm font-medium text-white">{currentUser.name}</div>
               <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentUser.role}</div>
             </div>
             <i className="fa-solid fa-chevron-down text-xs text-slate-500"></i>
           </div>
        </div>
      </header>

      {/* 2. Secondary Navigation (List, Calendar, Dispatch...) */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-6 text-sm font-medium h-12 flex-shrink-0 shadow-sm z-20 overflow-x-auto">
        {[
          { id: 'LIST', icon: 'fa-list', label: 'List' },
          { id: 'CALENDAR', icon: 'fa-regular fa-calendar', label: 'Calendar' },
          { id: 'DISPATCH', icon: 'fa-solid fa-timeline', label: 'Dispatch' },
          { id: 'MAP', icon: 'fa-regular fa-map', label: 'Map' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onViewModeChange(item.id as any)}
            className={`flex items-center gap-2 h-full border-b-2 px-1 transition-colors whitespace-nowrap
              ${viewMode === item.id 
                ? 'border-sky-500 text-sky-600' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
          >
            <i className={item.icon}></i>
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. Tertiary Navigation (Day, Week, Month...) */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-1 text-sm h-10 flex-shrink-0 z-10 overflow-x-auto">
        {[
          { id: 'DAY', label: 'Day' },
          { id: 'WEEK', label: 'Week' },
          { id: 'MONTH', label: 'Month' },
          { id: 'INDIVIDUAL', label: 'Individual' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => onTimeViewChange(item.id as any)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap
              ${timeView === item.id 
                ? 'text-sky-600 bg-sky-50' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 4. Filter Bar */}
      <div className="bg-[#f1f5f9] border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-shrink-0">
        
        <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          {/* My/Team Toggle */}
          <div className="bg-slate-200 p-1 rounded-lg flex text-xs font-medium shadow-inner">
            <button 
              onClick={() => onScopeChange('MY')}
              className={`px-3 py-1.5 rounded-md transition-all ${scope === 'MY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              My
            </button>
            <button 
              onClick={() => onScopeChange('TEAM')}
              className={`px-3 py-1.5 rounded-md transition-all ${scope === 'TEAM' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Team
            </button>
          </div>

          <div className="h-6 w-px bg-slate-300 mx-1"></div>

          {/* Team Dropdown Mock */}
          <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-sm hover:bg-slate-50 whitespace-nowrap">
            <span>Install Team, Sales Team</span>
            <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
          </button>

          {/* Action Buttons */}
          <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-sm hover:bg-slate-50">
            <i className="fa-solid fa-briefcase"></i>
            Jobs
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
           {/* Date Controls */}
           <div className="flex items-center gap-2">
             <button 
               onClick={() => onDateChange(new Date())}
               className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-slate-50"
             >
               <i className="fa-regular fa-calendar mr-2"></i>
               Today
             </button>
             <div className="flex items-center bg-white border border-slate-300 rounded-md shadow-sm">
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 1);
                    onDateChange(d);
                  }}
                  className="px-2 py-1.5 hover:bg-slate-50 text-slate-500 border-r border-slate-200"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <div className="px-3 py-1.5 text-xs font-medium text-slate-700 min-w-[100px] text-center">
                   {currentDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 1);
                    onDateChange(d);
                  }}
                  className="px-2 py-1.5 hover:bg-slate-50 text-slate-500 border-l border-slate-200"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
             </div>
           </div>

           <div className="flex gap-2">
              <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-sm hover:bg-slate-50">
                <i className="fa-solid fa-filter text-slate-400"></i>
                Filters
              </button>
              <button className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium shadow-sm hover:bg-slate-50">
                <i className="fa-solid fa-ellipsis-vertical text-slate-400"></i>
              </button>
           </div>
           
           <button 
              onClick={onCreateClick}
              className="md:hidden bg-sky-500 text-white px-4 py-1.5 rounded-md text-xs font-medium shadow-sm"
            >
              Create
           </button>
        </div>

      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-100/50 p-0 relative">
        {children}
      </main>
    </div>
  );
};