import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PhoneCall,
  CheckCircle2,
  Activity,
  TrendingUp,
  Clock,
  Users,
  Eye,
  Sparkles,
  ArrowUpRight,
  PhoneMissed,
  UserCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import CallDetailsModal from '../components/CallDetailsModal';
import LiveCallModal from '../components/LiveCallModal';

// Sophisticated Graphite & Bronze Palette for Charts
const PIE_COLORS = ['#689F7D', '#C05E54', '#AD8A62', '#C5A47E', '#8A8983', '#5E462F', '#46484A', '#C3C2BE'];

const STATUS_COLOR = {
  Completed: '#689F7D',
  Failed: '#C05E54',
  Busy: '#C5A47E',
  'No Answer': '#94734F',
  'In Progress': '#AD8A62',
  Ringing: '#D2BA9F',
  Queued: '#6E6E6C',
  Cancelled: '#46484A',
  'Opted Out': '#795C3E',
  'Not Called': '#292B2D'
};

// Custom Pie label — only show % if slice is wide enough
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fill="#F1F0ED" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Custom Tooltip for BarChart with Graphite & Bronze Glassmorphism
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs">
      <p className="text-[#C5A47E] font-bold mb-2 pb-1 border-b border-[#C3C2BE]/10">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
            <span className="text-[#C3C2BE]">{p.name}:</span>
          </div>
          <span className="text-[#F1F0ED] font-bold font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// Custom Tooltip for PieChart
const PieTooltip = ({ active, payload, total }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 rounded-xl p-3 shadow-2xl backdrop-blur-xl text-xs">
      <p className="text-[#C5A47E] font-bold mb-1">{name}</p>
      <p className="text-[#F1F0ED]">
        {value} calls &nbsp;<span className="text-[#8A8983]">({pct}%)</span>
      </p>
    </div>
  );
};

const RANGES = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: 'All Time', value: 'all' }
];

// Generate placeholder days for a given range (all zeros — chart is always visible)
const makePlaceholderDays = (range) => {
  const n = range === 'all' ? 30 : parseInt(range, 10);
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      calls: 0,
      completed: 0,
      failed: 0
    });
  }
  return days;
};

const Dashboard = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [range, setRange] = useState('7');
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    activeCalls: 0,
    successRate: 0,
    avgDuration: '00:00',
    totalContacts: 0,
    calledContacts: 0,
    notCalledContacts: 0
  });

  const [callsByDay, setCallsByDay] = useState(() => makePlaceholderDays('7'));
  const [callStatusBreakdown, setCallStatusBreakdown] = useState([]);
  const [campaignPerformance, setCampaignPerformance] = useState([]);
  const [recentCalls, setRecentCalls] = useState([]);
  const [chartsReady, setChartsReady] = useState(false);

  const [selectedCallId, setSelectedCallId] = useState(null);
  const [activeLiveCallId, setActiveLiveCallId] = useState(null);

  const fetchDashboardData = useCallback(async (r) => {
    const activeRange = r || range;
    try {
      const [statsRes, callsRes] = await Promise.all([
        api.get(`/dashboard/stats?range=${activeRange}`),
        api.get('/dashboard/recent-calls')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats || {});
        const days = statsRes.data.callsByDay;
        setCallsByDay(days && days.length > 0 ? days : makePlaceholderDays(activeRange));
        setCallStatusBreakdown(statsRes.data.callStatusBreakdown || []);
        setCampaignPerformance(statsRes.data.campaignPerformance || []);
      }

      if (callsRes.data.success) {
        setRecentCalls(callsRes.data.calls || []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setChartsReady(true);
    }
  }, [range]);

  useEffect(() => {
    fetchDashboardData(range);
  }, [range, fetchDashboardData]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchDashboardData(range);
    socket.on('call:status', refresh);
    socket.on('call:queued', refresh);
    socket.on('call:ended', refresh);
    socket.on('campaign:updated', refresh);
    return () => {
      socket.off('call:status', refresh);
      socket.off('call:queued', refresh);
      socket.off('call:ended', refresh);
      socket.off('campaign:updated', refresh);
    };
  }, [socket, range, fetchDashboardData]);

  const totalStatusCalls = callStatusBreakdown.reduce((s, e) => s + e.value, 0);
  const hasCallData = callsByDay.some((d) => d.calls > 0);
  const hasPieData = callStatusBreakdown.length > 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
            <span>Executive Overview</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">
            {greeting}, <span className="text-[#C5A47E]">{user?.name || 'Director'}</span>
          </h1>
          <p className="text-sm text-[#A1A09B] mt-0.5">
            Monitor real-time AI outbound operations, conversation outcomes and queue health.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/campaigns"
            className="btn-bronze px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-bronze-sm"
          >
            <Sparkles className="w-4 h-4 text-[#121314]" />
            <span>Launch New Campaign</span>
          </Link>
        </div>
      </div>

      {/* 6 Key Stat Cards in Graphite Glass */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-medium">Total Calls</span>
            <PhoneCall className="w-4 h-4 text-[#AD8A62] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-2xl font-extrabold text-[#F1F0ED] font-mono">{stats.totalCalls ?? 0}</p>
          <span className="text-[10px] text-[#8A8983] block mt-1">All-time dispatches</span>
        </div>

        <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-medium">Successful Calls</span>
            <CheckCircle2 className="w-4 h-4 text-[#85C09B] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-2xl font-extrabold text-[#85C09B] font-mono">{stats.completedCalls ?? 0}</p>
          <span className="text-[10px] text-[#8A8983] block mt-1">Concluded calls</span>
        </div>

        <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-medium">Active Calls</span>
            <Activity className="w-4 h-4 text-[#C5A47E] animate-pulse" />
          </div>
          <p className="text-2xl font-extrabold text-[#C5A47E] font-mono">{stats.activeCalls ?? 0}</p>
          <span className="text-[10px] text-[#8A8983] block mt-1">Active right now</span>
        </div>

        <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-medium">Success Rate</span>
            <TrendingUp className="w-4 h-4 text-[#AD8A62] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-2xl font-extrabold text-[#F1F0ED] font-mono">{stats.successRate ?? 0}%</p>
          <span className="text-[10px] text-[#8A8983] block mt-1">Positive outcome ratio</span>
        </div>

        <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-medium">Avg Duration</span>
            <Clock className="w-4 h-4 text-[#C3C2BE] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-2xl font-extrabold text-[#F1F0ED] font-mono">{stats.avgDuration || '00:00'}</p>
          <span className="text-[10px] text-[#8A8983] block mt-1">Average call length</span>
        </div>

        <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-medium">Total Contacts</span>
            <Users className="w-4 h-4 text-[#C5A47E] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-2xl font-extrabold text-[#F1F0ED] font-mono">{stats.totalContacts ?? 0}</p>
          <span className="text-[10px] text-[#8A8983] block mt-1">Audience reach</span>
        </div>
      </div>

      {/* Called vs Not Called mini-cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#689F7D]/15 border border-[#689F7D]/30 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-[#85C09B]" />
          </div>
          <div>
            <p className="text-xs text-[#8A8983] font-medium">Contacts Reached</p>
            <p className="text-2xl font-extrabold text-[#85C09B] font-mono">{stats.calledContacts ?? 0}</p>
            <p className="text-[10px] text-[#8A8983]">Dispatched and engaged</p>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#292B2D] border border-[#C3C2BE]/15 flex items-center justify-center flex-shrink-0">
            <PhoneMissed className="w-5 h-5 text-[#C3C2BE]" />
          </div>
          <div>
            <p className="text-xs text-[#8A8983] font-medium">Awaiting First Call</p>
            <p className="text-2xl font-extrabold text-[#F1F0ED] font-mono">{stats.notCalledContacts ?? 0}</p>
            <p className="text-[10px] text-[#8A8983]">Pending campaign queues</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Calls Overview ── */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-[#F1F0ED] text-base">Outbound Calls Trajectory</h3>
              <p className="text-xs text-[#8A8983] mt-0.5">
                {hasCallData ? 'Daily call activity based on live database records' : 'Waiting for call dispatches — chart ready'}
              </p>
            </div>
            {/* Range filter */}
            <div className="flex items-center gap-1 bg-[#1A1C1D] border border-[#C3C2BE]/10 rounded-xl p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    range === r.value
                      ? 'btn-bronze text-[#121314] shadow-sm'
                      : 'text-[#8A8983] hover:text-[#F1F0ED]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 text-[11px] text-[#A1A09B] mb-4 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#AD8A62] inline-block shadow-sm" />Total Calls</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#689F7D] inline-block shadow-sm" />Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C05E54] inline-block shadow-sm" />Failed / Drop</span>
          </div>

          {/* Chart — ALWAYS rendered */}
          <div style={{ width: '100%', height: 220 }}>
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsByDay} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#292B2D" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#504F4B"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#8A8983' }}
                    interval={range === 'all' ? 4 : range === '30' ? 2 : 0}
                  />
                  <YAxis
                    stroke="#504F4B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: '#8A8983' }}
                    width={28}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(173, 138, 98, 0.05)' }} />
                  <Bar dataKey="calls" name="Total Calls" fill="#AD8A62" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="completed" name="Completed" fill="#689F7D" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="failed" name="Failed" fill="#C05E54" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#AD8A62] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {!hasCallData && chartsReady && (
            <p className="text-center text-[11px] text-[#6E6E6C] mt-2">
              No calls found for this period. Make a call or launch a campaign to populate this chart.
            </p>
          )}
        </div>

        {/* ── Call Status Donut ── */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h3 className="font-bold text-[#F1F0ED] text-base mb-0.5">Call Status Distribution</h3>
          <p className="text-xs text-[#8A8983] mb-4">Breakdown across all system dispatch states</p>

          <div style={{ width: '100%', height: 180 }} className="flex-shrink-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hasPieData ? callStatusBreakdown : [{ name: 'No Data', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={hasPieData ? 3 : 0}
                    dataKey="value"
                    labelLine={false}
                    label={hasPieData ? PieLabel : false}
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    {hasPieData
                      ? callStatusBreakdown.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={STATUS_COLOR[entry.name] || PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))
                      : <Cell fill="#292B2D" />
                    }
                  </Pie>
                  {hasPieData && (
                    <Tooltip content={<PieTooltip total={totalStatusCalls} />} />
                  )}
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#AD8A62] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Legend */}
          {hasPieData ? (
            <div className="mt-3 space-y-1.5 overflow-y-auto flex-1 pr-1" style={{ maxHeight: 130 }}>
              {callStatusBreakdown.map((entry, i) => {
                const color = STATUS_COLOR[entry.name] || PIE_COLORS[i % PIE_COLORS.length];
                const pct = totalStatusCalls > 0 ? Math.round((entry.value / totalStatusCalls) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[#C3C2BE] truncate">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="font-bold text-[#F1F0ED]">{entry.value}</span>
                      <span className="text-[#8A8983] w-9 text-right font-mono">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[11px] text-[#6E6E6C] mt-3">
              No call status data recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#F1F0ED] text-base">Campaign Execution Metrics</h3>
            <p className="text-xs text-[#8A8983] mt-0.5">Live queue performance per campaign — targeted vs completed vs failed</p>
          </div>
        </div>

        {campaignPerformance.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-[#8A8983] gap-2">
            <TrendingUp className="w-8 h-8 opacity-30 text-[#AD8A62]" />
            <span className="text-xs">No campaigns found. Create a campaign to track performance.</span>
          </div>
        ) : (
          <>
            {/* Bar Chart */}
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformance} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#292B2D" vertical={false} />
                  <XAxis dataKey="name" stroke="#504F4B" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#8A8983' }} />
                  <YAxis stroke="#504F4B" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: '#8A8983' }} width={28} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(173, 138, 98, 0.05)' }} />
                  <Bar dataKey="total" name="Total Contacts" fill="#383A3C" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="called" name="Called" fill="#AD8A62" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="completed" name="Completed" fill="#689F7D" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="failed" name="Failed" fill="#C05E54" radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-[11px] text-[#C3C2BE]">
                <thead className="text-[#8A8983] uppercase text-[10px] font-bold tracking-wider border-b border-[#C3C2BE]/10">
                  <tr>
                    <th className="pb-2.5 pr-4">Campaign</th>
                    <th className="pb-2.5 pr-4 text-right">Target</th>
                    <th className="pb-2.5 pr-4 text-right">Called</th>
                    <th className="pb-2.5 pr-4 text-right">Pending</th>
                    <th className="pb-2.5 pr-4 text-right text-[#85C09B]">Completed</th>
                    <th className="pb-2.5 pr-4 text-right text-[#E2847A]">Failed</th>
                    <th className="pb-2.5 text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C3C2BE]/5">
                  {campaignPerformance.map((c) => (
                    <tr key={c.name} className="hover:bg-[#292B2D]/40 transition-colors">
                      <td className="py-2.5 pr-4 font-semibold text-[#F1F0ED] max-w-[140px] truncate">{c.fullName || c.name}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{c.total}</td>
                      <td className="py-2.5 pr-4 text-right text-[#C5A47E] font-mono">{c.called}</td>
                      <td className="py-2.5 pr-4 text-right text-[#8A8983] font-mono">{c.notCalled}</td>
                      <td className="py-2.5 pr-4 text-right text-[#85C09B] font-semibold font-mono">{c.completed}</td>
                      <td className="py-2.5 pr-4 text-right text-[#E2847A] font-mono">{c.failed}</td>
                      <td className="py-2.5 text-right font-mono">
                        <span className={`font-bold ${c.successRate >= 50 ? 'text-[#85C09B]' : c.successRate > 0 ? 'text-[#C5A47E]' : 'text-[#8A8983]'}`}>
                          {c.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Recent Calls Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#C3C2BE]/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#F1F0ED] text-base">Recent Dispatches</h3>
            <p className="text-xs text-[#8A8983]">Latest live call sessions and AI voice logs</p>
          </div>
          <Link to="/calls" className="text-xs font-semibold text-[#C5A47E] hover:text-[#F1F0ED] flex items-center space-x-1 transition-colors">
            <span>View All Logs</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#C3C2BE]">
            <thead className="bg-[#171819]/80 text-[#8A8983] uppercase text-[10px] font-bold tracking-wider border-b border-[#C3C2BE]/10">
              <tr>
                <th className="py-3.5 px-6">Contact</th>
                <th className="py-3.5 px-6">Phone</th>
                <th className="py-3.5 px-6">Agent</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Outcome</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C3C2BE]/5">
              {recentCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[#8A8983]">
                    No calls recorded yet. Initiate a call or launch a campaign.
                  </td>
                </tr>
              ) : (
                recentCalls.map((call) => (
                  <tr key={call._id} className="hover:bg-[#292B2D]/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#F1F0ED]">
                      {call.contactId?.name || 'Contact'}
                    </td>
                    <td className="py-4 px-6 font-mono text-[#8A8983]">{call.phone}</td>
                    <td className="py-4 px-6 text-[#C5A47E] font-medium">
                      {call.agentId?.name || 'AI Agent'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          call.status === 'Completed'
                            ? 'bg-[#689F7D]/15 text-[#85C09B] border border-[#689F7D]/30'
                            : call.status === 'In Progress' || call.status === 'Connected'
                            ? 'bg-[#AD8A62]/20 text-[#C5A47E] border border-[#AD8A62]/40 animate-pulse'
                            : call.status === 'Opted Out'
                            ? 'bg-[#C05E54]/15 text-[#E2847A] border border-[#C05E54]/30'
                            : call.status === 'Failed' || call.status === 'No Answer' || call.status === 'Busy'
                            ? 'bg-[#C05E54]/15 text-[#E2847A] border border-[#C05E54]/30'
                            : 'bg-[#292B2D] text-[#C3C2BE] border border-[#C3C2BE]/10'
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono">{call.duration ? `${call.duration}s` : '—'}</td>
                    <td className="py-4 px-6 text-[#C3C2BE] font-medium">{call.outcome || 'Pending'}</td>
                    <td className="py-4 px-6 text-[#8A8983]">
                      {new Date(call.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {call.status === 'In Progress' || call.status === 'Connected' || call.status === 'Ringing' ? (
                        <button
                          onClick={() => setActiveLiveCallId(call._id)}
                          className="px-3 py-1 btn-bronze font-bold rounded-lg text-[11px] transition-all"
                        >
                          Live Screen
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedCallId(call._id)}
                          className="p-1.5 text-[#8A8983] hover:text-[#C5A47E] hover:bg-[#292B2D] rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedCallId && (
        <CallDetailsModal callId={selectedCallId} onClose={() => setSelectedCallId(null)} />
      )}
      {activeLiveCallId && (
        <LiveCallModal callId={activeLiveCallId} onClose={() => setActiveLiveCallId(null)} />
      )}
    </div>
  );
};

export default Dashboard;
