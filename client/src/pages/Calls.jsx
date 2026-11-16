import React, { useEffect, useState, useCallback } from 'react';
import { Search, Eye } from 'lucide-react';
import api from '../services/api';
import CallDetailsModal from '../components/CallDetailsModal';
import LiveCallModal from '../components/LiveCallModal';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  const [selectedCallId, setSelectedCallId] = useState(null);
  const [activeLiveCallId, setActiveLiveCallId] = useState(null);

  const fetchCalls = useCallback(async () => {
    try {
      let url = `/calls?search=${search}&page=${page}&limit=20`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (outcomeFilter) url += `&outcome=${outcomeFilter}`;

      const res = await api.get(url);
      if (res.data.success) {
        setCalls(res.data.calls);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      console.error('Error fetching calls history:', err);
    }
  }, [page, search, statusFilter, outcomeFilter]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
            <span>Telephony Audit</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">Call Records & Logs</h1>
          <p className="text-sm text-[#A1A09B] mt-0.5">
            Audit comprehensive outbound call records, recording streams, provider metadata, and transcripts.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8A8983] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-xs text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-xs text-[#C3C2BE] focus:outline-none focus:border-[#AD8A62]"
          >
            <option value="">All Call Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress / Active</option>
            <option value="Connected">Connected</option>
            <option value="Ringing">Ringing</option>
            <option value="Failed">Failed</option>
            <option value="Opted Out">Opted Out</option>
          </select>
        </div>

        <div>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-xs text-[#C3C2BE] focus:outline-none focus:border-[#AD8A62]"
          >
            <option value="">All Outcomes</option>
            <option value="Appointment Confirmed">Appointment Confirmed</option>
            <option value="Interested">Interested</option>
            <option value="Callback Requested">Callback Requested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Opted Out">Opted Out</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#C3C2BE]">
            <thead className="bg-[#171819]/90 text-[#8A8983] uppercase text-[10px] font-bold tracking-wider border-b border-[#C3C2BE]/10">
              <tr>
                <th className="py-3.5 px-6">Contact</th>
                <th className="py-3.5 px-6">Phone</th>
                <th className="py-3.5 px-6">Agent</th>
                <th className="py-3.5 px-6">Campaign</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Outcome</th>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C3C2BE]/5">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#8A8983]">
                    No calls match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call._id} className="hover:bg-[#292B2D]/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#F1F0ED]">
                      {call.contactId?.name || 'Contact'}
                    </td>
                    <td className="py-4 px-6 font-mono text-[#8A8983]">{call.phone}</td>
                    <td className="py-4 px-6 text-[#C5A47E] font-medium">{call.agentId?.name || 'Agent'}</td>
                    <td className="py-4 px-6 text-[#8A8983]">{call.campaignId?.name || 'Single Call'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          call.status === 'Completed'
                            ? 'bg-[#689F7D]/15 text-[#85C09B] border border-[#689F7D]/30'
                            : call.status === 'In Progress' || call.status === 'Connected'
                            ? 'bg-[#AD8A62]/20 text-[#C5A47E] border border-[#AD8A62]/40 animate-pulse'
                            : call.status === 'Opted Out'
                            ? 'bg-[#C05E54]/15 text-[#E2847A] border border-[#C05E54]/30'
                            : 'bg-[#292B2D] text-[#8A8983] border border-[#C3C2BE]/10'
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-[#F1F0ED]">{call.duration || 0}s</td>
                    <td className="py-4 px-6 font-medium text-[#C3C2BE]">{call.outcome || 'Pending'}</td>
                    <td className="py-4 px-6 text-[#8A8983]">
                      {new Date(call.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {call.status === 'In Progress' || call.status === 'Connected' || call.status === 'Ringing' ? (
                        <button
                          onClick={() => setActiveLiveCallId(call._id)}
                          className="px-3 py-1 btn-bronze font-bold rounded-lg text-[11px] transition-all shadow-bronze-sm"
                        >
                          Live Screen
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedCallId(call._id)}
                          className="px-3 py-1.5 btn-bronze-outline rounded-lg text-[11px] font-semibold transition-all inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#8A8983] px-1">
          <span>Page {page} of {pages} ({total} total call records)</span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 btn-graphite rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page === pages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 btn-graphite rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

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

export default Calls;
