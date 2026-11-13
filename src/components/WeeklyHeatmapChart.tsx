import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
  Cell
} from 'recharts';
import { AttendanceLog, Deliverable, User } from '../types.ts';
import { getTodayDateString } from '../utils/storage.ts';

interface WeeklyHeatmapChartProps {
  users: User[];
  attendanceLogs: AttendanceLog[];
  deliverables: Deliverable[];
  onInspectUser?: (user: User) => void;
}

type ViewMode = 'heatmap' | 'trend' | 'distribution';

const MEMBER_COLORS = [
  '#f43f5e', // rose-500
  '#0284c7', // sky-600
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
];

export const WeeklyHeatmapChart: React.FC<WeeklyHeatmapChartProps> = ({
  users,
  attendanceLogs,
  deliverables,
  onInspectUser
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [hoveredCell, setHoveredCell] = useState<{
    staffName: string;
    dayLabel: string;
    hours: number;
    minutes: number;
    checkIn: string;
    checkOut: string;
    status: string;
    tasksCount: number;
  } | null>(null);

  const staffList = users.filter((u) => !u.isBoss);
  const now = new Date();
  const todayStr = getTodayDateString(now);

  // Generate last 7 days window (6 days ago through today)
  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const daysAgo = 6 - idx;
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    const dateStr = getTodayDateString(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
    const isToday = daysAgo === 0;

    return {
      daysAgo,
      dateStr,
      dayName,
      dayNum,
      monthShort,
      shortLabel: isToday ? 'Today' : `${dayName}`,
      fullLabel: isToday ? `Today (${monthShort} ${dayNum})` : `${dayName}, ${monthShort} ${dayNum}`,
      isToday,
      dateObj: d
    };
  });

  // Calculate staff matrix data & daily aggregates
  const dailyChartData = last7Days.map((day) => {
    let dayTotalMinutes = 0;
    let presentCount = 0;
    const memberHours: Record<string, number> = {};

    staffList.forEach((staff) => {
      const log = attendanceLogs.find((a) => a.empId === staff.id && a.date === day.dateStr);
      let mins = 0;

      if (log) {
        if (day.isToday && log.isCheckedIn) {
          const startMs = log.checkInTimestamp || now.getTime();
          mins = Math.max(0, Math.round((now.getTime() - startMs) / 60000));
        } else {
          mins = log.totalMinutes || 0;
        }
      }

      if (mins > 0 || log?.isCheckedIn) {
        presentCount++;
      }

      dayTotalMinutes += mins;
      const hrs = Number((mins / 60).toFixed(1));
      memberHours[staff.name] = hrs;
      memberHours[`${staff.name}_mins`] = mins;
    });

    const dayCompletedTasks = deliverables.filter(
      (d) => d.date === day.dateStr && d.progress >= 100
    ).length;

    const totalHours = Number((dayTotalMinutes / 60).toFixed(1));
    const attendanceRate = staffList.length > 0 ? Math.round((presentCount / staffList.length) * 100) : 0;

    return {
      day: day.shortLabel,
      fullDay: day.fullLabel,
      dateStr: day.dateStr,
      totalHours,
      totalMinutes: dayTotalMinutes,
      presentCount,
      totalStaff: staffList.length,
      attendanceRate,
      tasksCompleted: dayCompletedTasks,
      isToday: day.isToday,
      ...memberHours
    };
  });

  // 7-Day High Level KPIs
  const total7DayHours = Number(
    dailyChartData.reduce((acc, d) => acc + d.totalHours, 0).toFixed(1)
  );
  const avgDailyAttendance = Math.round(
    dailyChartData.reduce((acc, d) => acc + d.attendanceRate, 0) / dailyChartData.length
  );

  // Peak activity day
  const peakDay = [...dailyChartData].sort((a, b) => b.totalHours - a.totalHours)[0];

  // Helper for Heatmap Cell intensity styling
  const getCellIntensityClass = (minutes: number, isCheckedIn: boolean) => {
    if (isCheckedIn) {
      return 'bg-emerald-500 text-white font-bold ring-2 ring-emerald-300 shadow-sm animate-pulse';
    }
    if (minutes <= 0) {
      return 'bg-slate-100/80 text-slate-400 border border-slate-200/60 hover:bg-slate-200/70';
    }
    if (minutes <= 120) {
      // 1m - 2h
      return 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200';
    }
    if (minutes <= 360) {
      // 2h - 6h
      return 'bg-rose-200 text-rose-800 border border-rose-300 font-medium hover:bg-rose-300';
    }
    if (minutes <= 540) {
      // 6h - 9h (Standard shift)
      return 'bg-rose-500 text-white border border-rose-600 font-bold shadow-xs hover:bg-rose-600';
    }
    // > 9h (Overtime)
    return 'bg-rose-700 text-white border border-rose-800 font-extrabold shadow-sm hover:bg-rose-800';
  };

  const formatHoursShort = (minutes: number, isCheckedIn: boolean) => {
    if (isCheckedIn) return 'Active';
    if (minutes <= 0) return 'Off';
    const hrs = (minutes / 60).toFixed(1);
    if (minutes < 60) return `${minutes}m`;
    return `${hrs.replace('.0', '')}h`;
  };

  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-7 overflow-hidden flex flex-col gap-5">
      {/* Top Header & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 text-white flex items-center justify-center text-sm shadow-md">
              <i className="fa-solid fa-chart-column"></i>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Weekly Attendance &amp; Activity Heatmap
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            7-day duty patterns, creative shift hours &amp; presence consistency across the studio
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-100/90 border border-slate-200 shadow-inner self-start md:self-auto">
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'heatmap'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-border-all text-[11px] text-rose-500"></i>
            <span>Heatmap Grid</span>
          </button>
          <button
            onClick={() => setViewMode('trend')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'trend'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-chart-area text-[11px] text-rose-500"></i>
            <span>Team Hours</span>
          </button>
          <button
            onClick={() => setViewMode('distribution')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'distribution'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <i className="fa-solid fa-layer-group text-[11px] text-rose-500"></i>
            <span>Member Distribution</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Mini-Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
            <i className="fa-regular fa-clock"></i>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">7-Day Total Team Hours</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono">
              {total7DayHours} hrs
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
            <i className="fa-solid fa-users-viewfinder"></i>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Avg Daily Presence</div>
            <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono">
              {avgDailyAttendance}%
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
            <i className="fa-solid fa-fire text-amber-500"></i>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Peak Duty Day</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {peakDay ? peakDay.day : '—'} <span className="text-xs font-mono text-slate-500 font-normal">({peakDay ? peakDay.totalHours : 0}h)</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
            <i className="fa-solid fa-bolt"></i>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Roster</div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {staffList.length} Creatives
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: Visual Heatmap Grid */}
      {viewMode === 'heatmap' && (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[160px]">Creative</th>
                  {last7Days.map((d) => (
                    <th
                      key={d.dateStr}
                      className={`py-3 px-2 text-center min-w-[70px] ${
                        d.isToday ? 'bg-rose-50/80 text-rose-700 font-extrabold' : ''
                      }`}
                    >
                      <div className="text-[11px]">{d.dayName}</div>
                      <div className="text-[9px] font-mono font-normal text-slate-400">
                        {d.monthShort} {d.dayNum}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center min-w-[90px]">7D Total</th>
                  <th className="py-3 px-3 text-center min-w-[80px]">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {staffList.map((staff) => {
                  let staff7DayMinutes = 0;
                  let presentDays = 0;

                  const cells = last7Days.map((day) => {
                    const log = attendanceLogs.find(
                      (a) => a.empId === staff.id && a.date === day.dateStr
                    );
                    const isToday = day.isToday;
                    const isCheckedIn = Boolean(isToday && log?.isCheckedIn);
                    let minutes = 0;

                    if (log) {
                      if (isCheckedIn) {
                        const startMs = log.checkInTimestamp || now.getTime();
                        minutes = Math.max(0, Math.round((now.getTime() - startMs) / 60000));
                      } else {
                        minutes = log.totalMinutes || 0;
                      }
                    }

                    if (minutes > 0 || isCheckedIn) {
                      presentDays++;
                    }
                    staff7DayMinutes += minutes;

                    const dayTasks = deliverables.filter(
                      (d) => d.empId === staff.id && d.date === day.dateStr
                    ).length;

                    return {
                      day,
                      log,
                      minutes,
                      isCheckedIn,
                      dayTasks
                    };
                  });

                  const totalHrs = Number((staff7DayMinutes / 60).toFixed(1));
                  const consistencyPct = Math.round((presentDays / 7) * 100);

                  return (
                    <tr key={staff.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onInspectUser && onInspectUser(staff)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs group-hover:bg-rose-600 transition-colors">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors text-xs flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              <span className="text-[9px] font-mono font-semibold text-slate-400">
                                {staff.id}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[130px]">
                              {staff.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {cells.map(({ day, log, minutes, isCheckedIn, dayTasks }) => {
                        const cellClass = getCellIntensityClass(minutes, isCheckedIn);
                        const label = formatHoursShort(minutes, isCheckedIn);

                        return (
                          <td
                            key={day.dateStr}
                            className={`p-1.5 text-center ${day.isToday ? 'bg-rose-50/40' : ''}`}
                          >
                            <div
                              onMouseEnter={() =>
                                setHoveredCell({
                                  staffName: staff.name,
                                  dayLabel: day.fullLabel,
                                  hours: Number((minutes / 60).toFixed(1)),
                                  minutes,
                                  checkIn: log?.checkInTime || '--:--',
                                  checkOut: log?.checkOutTime || (isCheckedIn ? 'Active Now' : '--:--'),
                                  status: isCheckedIn
                                    ? 'On Active Duty'
                                    : minutes > 0
                                    ? 'Completed Shift'
                                    : 'Absent / Off',
                                  tasksCount: dayTasks
                                })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`h-9 w-full rounded-xl flex items-center justify-center text-[11px] font-mono transition-transform hover:scale-105 cursor-pointer ${cellClass}`}
                            >
                              {label}
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900">
                        {totalHrs}h
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            consistencyPct >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : consistencyPct >= 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}
                        >
                          {presentDays}/7 ({consistencyPct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Hover Details Popover Bar */}
          {hoveredCell ? (
            <div className="p-3 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-rose-400">{hoveredCell.staffName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300 font-medium">{hoveredCell.dayLabel}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono font-bold text-white">
                  {hoveredCell.hours} hrs ({hoveredCell.minutes} mins)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                <span>In: {hoveredCell.checkIn}</span>
                <span>Out: {hoveredCell.checkOut}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    hoveredCell.status === 'On Active Duty'
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : hoveredCell.status === 'Completed Shift'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {hoveredCell.status}
                </span>
              </div>
            </div>
          ) : (
            /* Heatmap Scale Legend */
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 px-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Duty Intensity Scale:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200"></span>
                  <span>Absent / Off (0h)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-rose-100 border border-rose-200"></span>
                  <span>Light (1-2h)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-rose-200 border border-rose-300"></span>
                  <span>Part-Time (2-6h)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-rose-500 border border-rose-600"></span>
                  <span>Full Shift (6-9h)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-rose-700 border border-rose-800"></span>
                  <span>Overtime (9h+)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span>
                  <span>Active Live</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Recharts Daily Team Hours Trend */}
      {viewMode === 'trend' && (
        <div className="flex flex-col gap-3">
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs flex flex-col gap-1.5 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <span className="font-extrabold text-rose-400">{data.fullDay}</span>
                            {data.isToday && (
                              <span className="text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Total Team Hours:</span>
                            <span className="font-mono font-bold text-white text-sm">
                              {data.totalHours} hrs
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Staff Attendance:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {data.presentCount} / {data.totalStaff} ({data.attendanceRate}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Tasks Completed:</span>
                            <span className="font-mono font-bold text-amber-400">
                              {data.tasksCompleted} Tasks
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalHours"
                  stroke="#e11d48"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#roseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 font-medium text-center">
            Daily combined duty volume in hours over the rolling 7-day studio schedule.
          </p>
        </div>
      )}

      {/* VIEW 3: Recharts Creative Member Stacked Distribution */}
      {viewMode === 'distribution' && (
        <div className="flex flex-col gap-3">
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs flex flex-col gap-2 min-w-[210px]">
                          <div className="font-extrabold text-rose-400 border-b border-slate-800 pb-1">
                            {data.fullDay}
                          </div>
                          <div className="space-y-1">
                            {staffList.map((staff, idx) => {
                              const hrs = data[staff.name] || 0;
                              return (
                                <div
                                  key={staff.id}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }}
                                    ></span>
                                    <span className="text-slate-300">{staff.name}:</span>
                                  </div>
                                  <span className="font-mono font-bold text-white">{hrs} hrs</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="border-t border-slate-800 pt-1 flex justify-between font-bold">
                            <span className="text-slate-400">Total:</span>
                            <span className="font-mono text-rose-400">{data.totalHours} hrs</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="circle"
                />
                {staffList.map((staff, idx) => (
                  <Bar
                    key={staff.id}
                    dataKey={staff.name}
                    stackId="a"
                    fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
                    radius={idx === staffList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-500 font-medium text-center">
            Individual creative contribution breakdown to studio operations by day.
          </p>
        </div>
      )}
    </section>
  );
};
