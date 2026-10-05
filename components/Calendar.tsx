import React from "react";
import { RequestStatus, RequestType, ShiftRequest, User } from "../types";

interface CalendarProps {
  currentDate: Date;
  requests: ShiftRequest[];
  viewMode: "LIST" | "CALENDAR" | "DISPATCH";
  timeView: "DAY" | "MONTH";
  users: User[];
  workspaceLabel: string;
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  onMonthChange: (increment: number) => void;
  onRequestOpen: (date: Date, request?: ShiftRequest) => void;
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const TimelineView: React.FC<{
  currentDate: Date;
  users: User[];
  requests: ShiftRequest[];
  workspaceLabel: string;
  onDateClick: (date: Date, request?: ShiftRequest) => void;
}> = ({ currentDate, users, requests, workspaceLabel, onDateClick }) => {
  const dateKey = formatDateKey(currentDate);
  return (
    <section className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-bold">
          {workspaceLabel} — daily availability
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {dateKey}. Requests record a date only; shift start and end times are
          not recorded.
        </p>
      </div>
      {users.map((user) => {
        const entries = requests.filter(
          (r) =>
            r.userId === user.id &&
            r.date === dateKey &&
            r.status === RequestStatus.APPROVED,
        );
        return (
          <article
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <img src={user.avatar} alt="" className="h-11 w-11 rounded-xl" />
              <div>
                <h3 className="font-bold">{user.name}</h3>
                <p className="text-sm text-slate-500">
                  {user.title || user.role}
                </p>
              </div>
            </div>
            {entries.length ? (
              entries.map((request) => (
                <button
                  key={request.id}
                  onClick={() => onDateClick(currentDate, request)}
                  className={`rounded-xl border px-4 py-3 text-left ${request.type === RequestType.WORK ? "bg-sky-50" : "bg-amber-50"}`}
                >
                  <span className="font-semibold">
                    {request.type === RequestType.WORK
                      ? "Work approved — date only"
                      : `${request.type} — unavailable`}
                  </span>
                  {request.notes && (
                    <span className="mt-1 block text-sm">{request.notes}</span>
                  )}
                </button>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No approved availability recorded
              </span>
            )}
          </article>
        );
      })}
    </section>
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
  const monthName = date.toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const requestsByDay = new Map<number, ShiftRequest[]>();
  requests.forEach((request) => {
    const [requestYear, requestMonth, requestDay] = request.date
      .split("-")
      .map(Number);
    if (
      requestYear === year &&
      requestMonth - 1 === month &&
      request.status !== RequestStatus.REJECTED
    ) {
      if (!requestsByDay.has(requestDay)) requestsByDay.set(requestDay, []);
      requestsByDay.get(requestDay)?.push(request);
    }
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-600">
          {monthName}
        </h3>
      </div>
      <div className="p-3">
        <div className="mb-2 grid grid-cols-7">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div
              key={`${day}-${index}`}
              className="text-center text-[10px] font-bold uppercase text-slate-300"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className="aspect-square rounded-2xl bg-slate-50"
            ></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayRequests = requestsByDay.get(day) || [];
            const selected =
              selectedDate &&
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() === month &&
              selectedDate.getDate() === day;

            let dayClass =
              "border border-slate-100 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50";
            let badge = dayRequests.length ? `${dayRequests.length}` : "";

            if (
              dayRequests.some(
                (request) => request.status === RequestStatus.PENDING,
              )
            ) {
              dayClass = "border border-amber-100 bg-amber-50 text-amber-800";
            } else if (
              dayRequests.some((request) => request.type === RequestType.SICK)
            ) {
              dayClass = "border border-rose-100 bg-rose-50 text-rose-800";
            } else if (
              dayRequests.some((request) => request.type === RequestType.PTO)
            ) {
              dayClass = "border border-amber-100 bg-amber-50 text-amber-800";
            } else if (
              dayRequests.some((request) => request.type === RequestType.WORK)
            ) {
              dayClass = "border border-sky-100 bg-sky-50 text-sky-800";
            }

            return (
              <button
                key={day}
                onClick={() => onDateClick(new Date(year, month, day))}
                className={`aspect-square rounded-2xl p-2 text-left text-sm font-semibold transition ${dayClass} ${
                  selected ? "ring-2 ring-slate-950" : ""
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

  if (viewMode === "DISPATCH" || timeView === "DAY") {
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
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Workspace Calendar
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950">
            {currentYear} scheduling overview
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Review staffing activity month by month and open any date to create
            or edit requests.
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
