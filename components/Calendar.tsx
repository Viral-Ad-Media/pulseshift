import React from 'react';
import { ShiftRequest, RequestStatus, RequestType, User } from '../types';

interface CalendarProps {
  currentDate: Date;
  requests: ShiftRequest[];
  viewMode: 'LIST' | 'CALENDAR' | 'DISPATCH' | 'MAP';
  timeView: 'DAY' | 'WEEK' | 'MONTH' | 'INDIVIDUAL';
  users: User[]; // All users to display rows for
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  onMonthChange: (increment: number) => void;
  onRequestOpen: (date: Date) => void;
}

// --- SUB-COMPONENTS ---

// 1. TIMELINE VIEW (Matches the "Dispatch" screenshot)
const TimelineView: React.FC<{
  currentDate: Date;
  users: User[];
  requests: ShiftRequest[];
  onDateClick: (date: Date) => void;
}> = ({ currentDate, users, requests, onDateClick }) => {
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

  // Filter requests for the current date
  const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const todaysRequests = requests.filter(r => r.date === dateKey);

  return (
    <div className="flex flex-col h-full bg-white min-w-[1000px]">
      {/* Header Row: Hours */}
      <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10 shadow-sm">
        <div className="w-64 flex-shrink-0 p-3 bg-slate-50 border-r border-slate-200 flex items-center text-xs font-semibold text-slate-500">
          <i className="fa-solid fa-caret-down mr-2"></i>
          Install Team
        </div>
        <div className="flex-1 flex">
          {hours.map(hour => (
            <div key={hour} className="flex-1 border-r border-slate-100 text-center py-3 text-xs text-slate-400 font-medium">
              {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {users.map(user => {
          // Find requests for this user on this day
          const userRequests = todaysRequests.filter(r => r.userId === user.id && r.status === RequestStatus.APPROVED);

          return (
            <div key={user.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors h-20">
              {/* User Column */}
              <div className="w-64 flex-shrink-0 p-3 border-r border-slate-200 flex items-center gap-3 bg-white">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase truncate">{user.role}</p>
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="flex-1 flex relative">
                {/* Grid Lines */}
                {hours.map(hour => (
                  <div key={hour} className="flex-1 border-r border-slate-50 h-full"></div>
                ))}

                {/* Shifts / Blocks */}
                {userRequests.map((req, idx) => {
                  // Mocking start times based on RequestType for visual demo
                  // In a real app, ShiftRequest would have startTime/endTime
                  let startCol = 1; // 9 AM
                  let durationCols = 8; // 8 hours

                  if (req.type === RequestType.WORK) { startCol = 0; durationCols = 4; } // 8am - 12pm
                  if (req.type === RequestType.PTO) { startCol = 0; durationCols = 12; } // All day
                  if (req.type === RequestType.SICK) { startCol = 0; durationCols = 12; }

                  // Visual Variation
                  const widthPercent = (durationCols / 13) * 100;
                  const leftPercent = (startCol / 13) * 100;
                  
                  let bgClass = "bg-[#dbeafe] border-[#bfdbfe]"; // Blue (Site visit style)
                  let borderLeftClass = "border-l-4 border-l-[#3b82f6]";
                  let title = "Site Visit";
                  let subtitle = "Installation";

                  if (req.type === RequestType.PTO) {
                     bgClass = "bg-purple-100 border-purple-200";
                     borderLeftClass = "border-l-4 border-l-purple-500";
                     title = "Time Off";
                     subtitle = "Approved PTO";
                  }
                  if (req.type === RequestType.SICK) {
                     bgClass = "bg-rose-100 border-rose-200";
                     borderLeftClass = "border-l-4 border-l-rose-500";
                     title = "Sick Leave";
                     subtitle = "Unavailable";
                  }

                  // Hack to stack if multiple (simplified)
                  const topOffset = idx * 5;

                  return (
                    <div 
                      key={req.id}
                      className={`absolute top-2 bottom-2 rounded px-3 py-1 text-xs shadow-sm flex flex-col justify-center overflow-hidden border ${bgClass} ${borderLeftClass}`}
                      style={{ 
                        left: `${leftPercent}%`, 
                        width: `${widthPercent}%`,
                        marginTop: `${topOffset}px`
                      }}
                      title={req.notes}
                      onClick={() => onDateClick(currentDate)}
                    >
                      <span className="font-bold text-slate-800 truncate">{title}</span>
                      <span className="text-slate-600 truncate">{subtitle}</span>
                      {req.notes && <span className="text-[10px] text-slate-500 truncate mt-0.5 opacity-75">{req.notes}</span>}
                    </div>
                  )
                })}

                {/* Add "Add" button ghost on hover? */}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 flex items-center justify-center pointer-events-none">
                  {/* <button className="bg-sky-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transform scale-90">+</button> */}
                </div>
              </div>
            </div>
          );
        })}
        {/* Empty State filler */}
        {users.length < 5 && Array.from({length: 5 - users.length}).map((_, i) => (
           <div key={i} className="flex border-b border-slate-100 h-20 bg-slate-50/30">
             <div className="w-64 border-r border-slate-200 bg-white/50"></div>
             <div className="flex-1 flex">
               {hours.map(h => <div key={h} className="flex-1 border-r border-slate-50"></div>)}
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};


// 2. YEAR/MONTH GRID VIEW (From previous iteration, modernized)
const MonthGrid: React.FC<{
  year: number;
  month: number;
  requests: ShiftRequest[];
  onDateClick: (date: Date) => void;
}> = ({ year, month, requests, onDateClick }) => {
  const date = new Date(year, month, 1);
  const monthName = date.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
  
  const requestsByDay = new Map<number, ShiftRequest[]>();
  requests.forEach(req => {
    const [rYear, rMonth, rDay] = req.date.split('-').map(Number);
    if (rYear === year && rMonth - 1 === month && req.status !== RequestStatus.REJECTED) {
      if (!requestsByDay.has(rDay)) requestsByDay.set(rDay, []);
      requestsByDay.get(rDay)?.push(req);
    }
  });

  return (
    <div className="bg-white border border-slate-200 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="bg-slate-50/50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">{monthName}</h3>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d,i) => (
            <div key={i} className="text-center text-[8px] font-bold text-slate-300">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const reqs = requestsByDay.get(day) || [];
            let bgClass = "bg-white hover:bg-sky-50 cursor-pointer text-slate-600";
            
            if (reqs.length > 0) {
              const r = reqs[0];
              if (r.type === RequestType.WORK) bgClass = "bg-sky-500 text-white";
              else if (r.type === RequestType.PTO) bgClass = "bg-purple-500 text-white";
              else if (r.type === RequestType.SICK) bgClass = "bg-rose-500 text-white";
              else if (r.status === RequestStatus.PENDING) bgClass = "bg-amber-100 text-amber-700";
            }

            return (
              <div
                key={day}
                onClick={() => onDateClick(new Date(year, month, day))}
                className={`aspect-square flex items-center justify-center text-[10px] font-medium transition-colors ${bgClass}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


// --- MAIN CALENDAR COMPONENT ---

export const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  requests, 
  viewMode,
  timeView,
  users,
  onDateClick, 
  onMonthChange,
  onRequestOpen
}) => {
  const currentYear = currentDate.getFullYear();
  
  // Decide which view to render
  const renderView = () => {
    // 1. Dispatch View (Timeline) - Default for 'Dispatch' tab
    if (viewMode === 'DISPATCH' || (viewMode === 'CALENDAR' && timeView === 'DAY')) {
      return (
        <TimelineView 
          currentDate={currentDate} 
          users={users} 
          requests={requests} 
          onDateClick={onRequestOpen} 
        />
      );
    }
    
    // 2. Year/Month Grid View
    if (viewMode === 'CALENDAR' || timeView === 'MONTH') {
      return (
        <div className="p-6">
           {/* Year Navigation for Grid View */}
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{currentYear} Overview</h2>
              <div className="flex gap-2">
                <button onClick={() => onMonthChange(-12)} className="px-3 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50">Prev Year</button>
                <button onClick={() => onMonthChange(12)} className="px-3 py-1 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50">Next Year</button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MonthGrid
                key={i}
                year={currentYear}
                month={i}
                requests={requests}
                onDateClick={(d) => onRequestOpen(d)}
              />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <i className="fa-solid fa-person-digging text-4xl mb-3"></i>
          <p>This view is under construction.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-100 overflow-hidden flex flex-col">
       {/* If we are in Dispatch mode, we might want a minimal sub-header or just the content */}
       <div className="flex-1 overflow-auto">
         {renderView()}
       </div>
    </div>
  );
};