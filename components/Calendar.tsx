import React from 'react';
import { RequestStatus, RequestType, ShiftRequest, User } from '../types';

interface CalendarProps {
  currentDate: Date;
  requests: ShiftRequest[];
  viewMode: 'LIST' | 'CALENDAR' | 'DISPATCH';
  timeView: 'DAY' | 'MONTH';
  users: User[];
  workspaceLabel: string;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  onMonthChange: (increment: number) => void;
  onRequestOpen: (date: Date) => void;
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const TimelineView: React.FC<{
  currentDate: Date;
  users: User[];
  requests: ShiftRequest[];
  workspaceLabel: string;
  onDateClick: (date: Date) => void;
}> = ({ currentDate, users, requests, workspaceLabel, onDateClick }) => {
  const hours = Array.from({ length: 13 }, (_, index) => index + 8);
  const dateKey = formatDateKey(currentDate);
  const todaysRequests = requests.filter((request) => request.date === dateKey);

  return (
    <div className="flex h-full flex-col bg-white min-w-[960px]">
      <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white shadow-sm">
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Dispatch</p>
          <h3 className="mt-1 text-sm font-bold text-slate-950">{workspaceLabel}</h3>
          <p className="mt-1 text-xs text-slate-500">Approved coverage on {currentDate.toLocaleDateString()}</p>
        </div>
        <div className="flex flex-1">
          {hours.map((hour) => (
            <div key={hour} className="flex-1 border-r border-slate-100 py-4 text-center text-xs font-medium text-slate-400">
              {hour > 12 ? hour - 12 : hour}
              {hour >= 12 ? ' PM' : ' AM'}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.map((user) => {
          const userRequests = todaysRequests.filter(
            (request) => request.userId === user.id && request.status === RequestStatus.APPROVED
          );

          return (
            <div key={user.id} className="flex h-24 border-b border-slate-100 hover:bg-slate-50/70">
              <div className="flex w-72 flex-shrink-0 items-center gap-3 border-r border-slate-200 bg-white px-4">
                <img src={user.avatar} alt={user.name} className="h-11 w-11 rounded-2xl border border-slate-200 object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {user.title || user.role}
                  </p>
                </div>
              </div>

              <div className="relative flex flex-1">
                {hours.map((hour) => (
                  <div key={hour} className="flex-1 border-r border-slate-50"></div>
                ))}

                {userRequests.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-300">
                    Available for assignment
                  </div>
                )}

                {userRequests.map((request, index) => {
                  let startCol = 0;
                  let durationCols = 4;
                  let title = 'Clinical shift';
                  let subtitle = request.notes || user.title || 'Approved coverage';
                  let cardClass = 'border-sky-200 bg-sky-50 text-sky-900';
                  let borderClass = 'border-l-sky-500';

                  if (request.type === RequestType.PTO) {
                    durationCols = 12;
                    title = 'Time off';
                    subtitle = request.notes || 'Planned leave';
                    cardClass = 'border-amber-200 bg-amber-50 text-amber-900';
                    borderClass = 'border-l-amber-500';
                  }

                  if (request.type === RequestType.SICK) {
                    durationCols = 12;
                    title = 'Sick leave';
                    subtitle = request.notes || 'Unavailable';
                    cardClass = 'border-rose-200 bg-rose-50 text-rose-900';
                    borderClass = 'border-l-rose-500';
                  }

                  const widthPercent = (durationCols / 13) * 100;
                  const leftPercent = (startCol / 13) * 100;

                  return (
                    <button
                      key={request.id}
                      title={request.notes}
                      onClick={() => onDateClick(currentDate)}
                      className={`absolute bottom-3 top-3 overflow-hidden rounded-2xl border border-l-4 px-4 py-2 text-left shadow-sm transition hover:-translate-y-0.5 ${cardClass} ${borderClass}`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        marginTop: `${index * 4}px`,
                      }}
                    >
                      <p className="truncate text-xs font-bold uppercase tracking-wide">{title}</p>
                      <p className="mt-1 truncate text-sm font-semibold">{subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MonthGrid: React.FC<{
  year: number;
  month: number;
  requests: ShiftRequest[];
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
}> = ({ year, month, requests, selectedDate, onDateClick }) => {
  const date = new Date(year, month, 1);
  const monthName = date.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const requestsByDay = new Map<number, ShiftRequest[]>();
  requests.forEach((request) => {
    const [requestYear, requestMonth, requestDay] = request.date.split('-').map(Number);
    if (requestYear === year && requestMonth - 1 === month && request.status !== RequestStatus.REJECTED) {
      if (!requestsByDay.has(requestDay)) requestsByDay.set(requestDay, []);
      requestsByDay.get(requestDay)?.push(request);
    }
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-600">{monthName}</h3>
      </div>
      <div className="p-3">
        <div className="mb-2 grid grid-cols-7">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={`${day}-${index}`} className="text-center text-[10px] font-bold uppercase text-slate-300">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square rounded-2xl bg-slate-50"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayRequests = requestsByDay.get(day) || [];
            const selected =
              selectedDate &&
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() === month &&
              selectedDate.getDate() === day;

            let dayClass = 'border border-slate-100 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50';
            let badge = dayRequests.length ? `${dayRequests.length}` : '';

            if (dayRequests.some((request) => request.status === RequestStatus.PENDING)) {
              dayClass = 'border border-amber-100 bg-amber-50 text-amber-800';
            } else if (dayRequests.some((request) => request.type === RequestType.SICK)) {
              dayClass = 'border border-rose-100 bg-rose-50 text-rose-800';
            } else if (dayRequests.some((request) => request.type === RequestType.PTO)) {
              dayClass = 'border border-amber-100 bg-amber-50 text-amber-800';
            } else if (dayRequests.some((request) => request.type === RequestType.WORK)) {
              dayClass = 'border border-sky-100 bg-sky-50 text-sky-800';
            }

            return (
              <button
                key={day}
                onClick={() => onDateClick(new Date(year, month, day))}
                className={`aspect-square rounded-2xl p-2 text-left text-sm font-semibold transition ${dayClass} ${
                  selected ? 'ring-2 ring-slate-950' : ''
                }`}
              >
                <div className="flex h-full flex-col justify-between">
                  <span>{day}</span>
                  {badge && (
                    <span className="self-end rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold">
                      {badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  requests,
  viewMode,
  timeView,
  users,
  workspaceLabel,
  selectedDate,
  onDateClick,
  onMonthChange,
  onRequestOpen,
}) => {
  const currentYear = currentDate.getFullYear();

  if (viewMode === 'DISPATCH' || timeView === 'DAY') {
    return (
      <div className="h-full overflow-auto">
        <TimelineView
          currentDate={currentDate}
          users={users}
          requests={requests}
          workspaceLabel={workspaceLabel}
          onDateClick={onRequestOpen}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-50/70 p-5 md:p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Workspace Calendar</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950">{currentYear} scheduling overview</h2>
          <p className="mt-2 text-sm text-slate-500">
            Review staffing activity month by month and open any date to create or edit requests.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onMonthChange(-12)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Prev year
          </button>
          <button
            onClick={() => onMonthChange(12)}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Next year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <MonthGrid
            key={index}
            year={currentYear}
            month={index}
            requests={requests}
            selectedDate={selectedDate}
            onDateClick={(date) => {
              onDateClick(date);
              onRequestOpen(date);
            }}
          />
        ))}
      </div>
    </div>
  );
};
