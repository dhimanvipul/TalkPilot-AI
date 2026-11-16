import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import api from '../services/api';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    successRate: 0,
    avgDuration: '00:00'
  });
  const [callsByDay, setCallsByDay] = useState([]);
  const [callStatusBreakdown, setCallStatusBreakdown] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.stats);
          setCallsByDay(res.data.callsByDay || []);
          setCallStatusBreakdown(res.data.callStatusBreakdown || []);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
      }
    };
    fetchAnalytics();
  }, []);

  const COLORS = ['#AD8A62', '#689F7D', '#C5A47E', '#8A8983', '#C05E54', '#795C3E', '#46484A', '#C3C2BE'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
          <span>Telemetry & Business Intelligence</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">Performance Analytics</h1>
        <p className="text-sm text-[#A1A09B] mt-0.5">
          Deep-dive conversion telemetry, conversation lengths, velocity trends, and outcome breakdown.
        </p>
      </div>

      {/* Top Stat Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-semibold">Total Dispatched Calls</span>
            <PhoneCall className="w-4 h-4 text-[#AD8A62] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-3xl font-extrabold text-[#F1F0ED] font-mono">{stats.totalCalls}</p>
          <span className="text-[11px] text-[#8A8983] block mt-1">Platform aggregate</span>
        </div>

        <div className="glass-card p-5 rounded-2xl group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-semibold">Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-[#85C09B] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-3xl font-extrabold text-[#85C09B] font-mono">
            {stats.totalCalls > 0 ? Math.round((stats.completedCalls / stats.totalCalls) * 100) : 0}%
          </p>
          <span className="text-[11px] text-[#8A8983] block mt-1">Successfully concluded</span>
        </div>

        <div className="glass-card p-5 rounded-2xl group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-semibold">Success Rate</span>
            <TrendingUp className="w-4 h-4 text-[#C5A47E] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-3xl font-extrabold text-[#F1F0ED] font-mono">{stats.successRate}%</p>
          <span className="text-[11px] text-[#8A8983] block mt-1">Positive customer response</span>
        </div>

        <div className="glass-card p-5 rounded-2xl group">
          <div className="flex items-center justify-between text-[#8A8983] mb-2">
            <span className="text-xs font-semibold">Average Call Duration</span>
            <Clock className="w-4 h-4 text-[#C3C2BE] transition-transform group-hover:scale-110" />
          </div>
          <p className="text-3xl font-extrabold text-[#F1F0ED] font-mono">{stats.avgDuration}</p>
          <span className="text-[11px] text-[#8A8983] block mt-1">Time on call</span>
        </div>
      </div>

      {/* Analytics Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls Trend (Line Chart) */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-[#F1F0ED] text-base">Calls Velocity Trend</h3>
            <div className="flex items-center gap-3 text-xs text-[#8A8983]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#AD8A62] inline-block" /> Dispatched</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#85C09B] inline-block border-t border-dashed" /> Completed</span>
            </div>
          </div>
          <p className="text-xs text-[#8A8983] mb-6">Daily call volume tracking over time</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#292B2D" vertical={false} />
                <XAxis dataKey="date" stroke="#504F4B" fontSize={11} tickLine={false} tick={{ fill: '#8A8983' }} />
                <YAxis stroke="#504F4B" fontSize={11} tickLine={false} tick={{ fill: '#8A8983' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(28, 30, 32, 0.95)',
                    borderColor: 'rgba(173, 138, 98, 0.35)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F1F0ED',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                  }}
                />
                <Line type="monotone" dataKey="calls" stroke="#AD8A62" strokeWidth={3} dot={{ r: 4, fill: '#C5A47E', stroke: '#1C1E20' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="completed" stroke="#85C09B" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#85C09B' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcomes Breakdown (Pie Chart) */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="font-bold text-[#F1F0ED] text-base mb-1">Status & Outcome Distribution</h3>
          <p className="text-xs text-[#8A8983] mb-6">Proportion of outcomes across all executed dispatches</p>
          <div className="h-64 w-full flex items-center justify-center">
            {callStatusBreakdown.length === 0 ? (
              <span className="text-xs text-[#8A8983]">No status breakdown data recorded.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={callStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {callStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(28, 30, 32, 0.95)',
                      borderColor: 'rgba(173, 138, 98, 0.35)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#F1F0ED',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
