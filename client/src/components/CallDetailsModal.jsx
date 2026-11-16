import React, { useEffect, useState } from 'react';
import { X, Play, Pause, Sparkles, AlertCircle, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

const CallDetailsModal = ({ callId, onClose }) => {
  const [call, setCall] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/calls/${callId}`);
        if (res.data.success) {
          setCall(res.data.call);
          setTranscript(res.data.transcript || []);
        }
      } catch (err) {
        console.error('Error fetching call details:', err);
      } finally {
        setLoading(false);
      }
    };
    if (callId) fetchDetails();
  }, [callId]);

  if (!callId) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-3xl rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
        {/* Header */}
        <div className="px-6 py-4 bg-[#171819]/90 border-b border-[#AD8A62]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#383A3C] to-[#202224] border border-[#AD8A62]/40 flex items-center justify-center text-[#C5A47E] shadow-sm">
              <Sparkles className="w-4 h-4 text-[#AD8A62]" />
            </div>
            <div>
              <h3 className="font-bold text-[#F1F0ED] text-base tracking-tight">Call Summary & Technical Logs</h3>
              <p className="text-xs text-[#8A8983] font-mono">ID: {callId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#C3C2BE] hover:text-[#F1F0ED] p-1.5 rounded-xl hover:bg-[#292B2D] border border-transparent hover:border-[#AD8A62]/30 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#A1A09B] text-sm">
            <div className="w-6 h-6 border-2 border-[#AD8A62] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading call details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error Banner if Call Failed */}
            {call?.status === 'Failed' && (
              <div className="p-4 bg-[#C05E54]/15 border border-[#C05E54]/30 rounded-2xl text-[#E2847A] text-xs space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-[#E2847A]" />
                  <span>Call Dispatch Error</span>
                </div>
                <p className="font-mono text-[#F1F0ED]">{call?.lastError || 'Call failed to initiate or connect.'}</p>
              </div>
            )}

            {/* Top Stat Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#202224]/80 p-4 rounded-2xl border border-[#C3C2BE]/10 shadow-inner">
              <div>
                <span className="text-[11px] text-[#8A8983] uppercase tracking-wider block font-medium">Customer</span>
                <span className="text-sm font-semibold text-[#F1F0ED] block truncate mt-0.5">{call?.contactId?.name || 'Customer'}</span>
                <span className="text-xs text-[#8A8983] font-mono">{call?.phone}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8A8983] uppercase tracking-wider block font-medium">Agent</span>
                <span className="text-sm font-semibold text-[#F1F0ED] block truncate mt-0.5">{call?.agentId?.name || 'Agent'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8A8983] uppercase tracking-wider block font-medium">Duration</span>
                <span className="text-sm font-mono font-semibold text-[#F1F0ED] block mt-0.5">{call?.duration || 0}s</span>
              </div>
              <div>
                <span className="text-[11px] text-[#8A8983] uppercase tracking-wider block font-medium">Outcome</span>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  call?.status === 'Failed'
                    ? 'bg-[#C05E54]/20 text-[#E2847A] border border-[#C05E54]/40'
                    : 'bg-[#AD8A62]/20 text-[#C5A47E] border border-[#AD8A62]/40'
                }`}>
                  {call?.outcome || call?.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Technical Debugging Details Expandable Section */}
            <div className="bg-[#202224]/80 border border-[#C3C2BE]/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowTechDetails(!showTechDetails)}
                className="w-full p-3.5 bg-[#242628] hover:bg-[#2D3032] flex items-center justify-between text-xs font-semibold text-[#C3C2BE] border-b border-[#C3C2BE]/10 transition-colors"
              >
                <div className="flex items-center space-x-2 text-[#C5A47E]">
                  <Terminal className="w-4 h-4 text-[#AD8A62]" />
                  <span>Technical Debugging Details (Provider Logs & SID)</span>
                </div>
                {showTechDetails ? <ChevronUp className="w-4 h-4 text-[#AD8A62]" /> : <ChevronDown className="w-4 h-4 text-[#8A8983]" />}
              </button>

              {showTechDetails && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-[#171819]/90 text-[#C3C2BE]">
                  <div>
                    <span className="text-[#8A8983] block text-[10px] font-sans">Calling Mode:</span>
                    <span className="text-[#85C09B] font-bold uppercase">{call?.callingMode || 'mock'}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8983] block text-[10px] font-sans">Telephony Provider:</span>
                    <span className="text-[#C5A47E] font-bold">{call?.provider || 'mock'}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8983] block text-[10px] font-sans">Provider Call ID (CallSid):</span>
                    <span className="text-[#F1F0ED]">{call?.providerCallId || call?.telephonyCallSid || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8983] block text-[10px] font-sans">Last Webhook Status:</span>
                    <span className="text-[#F1F0ED]">{call?.lastWebhookStatus || call?.status || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[#8A8983] block text-[10px] font-sans">Last Webhook Timestamp:</span>
                    <span className="text-[#8A8983]">
                      {call?.lastWebhookReceivedAt ? new Date(call.lastWebhookReceivedAt).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8A8983] block text-[10px] font-sans">Last Error:</span>
                    <span className={call?.lastError ? 'text-[#E2847A] font-bold' : 'text-[#8A8983]'}>
                      {call?.lastError || 'None'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary & Intent Box */}
            <div className="bg-gradient-to-br from-[#292B2D]/80 via-[#202224]/90 to-[#171819] p-5 rounded-2xl border border-[#AD8A62]/30 space-y-3 shadow-lg">
              <div className="flex items-center space-x-2 text-[#C5A47E] font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#AD8A62]" />
                <span>AI Call Analysis & Intelligence</span>
              </div>
              <p className="text-sm text-[#C3C2BE] leading-relaxed bg-[#1B1C1E]/80 p-3.5 rounded-xl border border-[#C3C2BE]/10">
                {call?.summary || 'No AI summary generated for this call.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="bg-[#1B1C1E]/60 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[#8A8983] block font-medium">Detected Intent:</span>
                  <span className="text-[#C5A47E] font-semibold mt-0.5 block">{call?.intent || 'General Inquiry'}</span>
                </div>
                <div className="bg-[#1B1C1E]/60 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[#8A8983] block font-medium">Recommended Action:</span>
                  <span className="text-[#85C09B] font-semibold mt-0.5 block">{call?.actionRequired || 'None'}</span>
                </div>
              </div>
            </div>

            {/* Audio Recording Player Simulation */}
            <div className="bg-[#202224]/80 p-4 rounded-2xl border border-[#C3C2BE]/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full btn-bronze flex items-center justify-center shadow-bronze-sm transition-all"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-[#121314]" /> : <Play className="w-5 h-5 ml-0.5 text-[#121314]" />}
                </button>
                <div>
                  <span className="text-xs font-semibold text-[#F1F0ED] block">Call Audio Recording</span>
                  <span className="text-[11px] text-[#8A8983] block">
                    {isPlaying ? 'Playing call audio stream...' : `Duration: ${call?.duration || 0} seconds`}
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#C5A47E] font-mono bg-[#AD8A62]/15 px-2.5 py-1 rounded-lg border border-[#AD8A62]/30">
                {call?.recordingUrl ? 'Twilio Recording' : 'MP3 Audio Stream'}
              </span>
            </div>

            {/* Transcript */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A8983]">Full Call Transcript</h4>
              <div className="space-y-3 max-h-72 overflow-y-auto p-4 bg-[#141516]/60 rounded-2xl border border-[#C3C2BE]/10">
                {transcript.length === 0 ? (
                  <p className="text-xs text-[#6E6E6C] italic">No transcript recorded for this session.</p>
                ) : (
                  transcript.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.speaker === 'AI' ? 'items-start' : 'items-end'
                      }`}
                    >
                      <span className="text-[10px] text-[#8A8983] mb-0.5 font-medium">
                        {msg.speaker === 'AI' ? 'TalkPilot AI Agent' : 'Contact / Recipient'}
                      </span>
                      <div
                        className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                          msg.speaker === 'AI'
                            ? 'bg-[#242628]/95 text-[#F1F0ED] border border-[#AD8A62]/30 rounded-tl-none'
                            : 'bg-[#2B2724]/95 text-[#F1F0ED] border border-[#C5A47E]/30 rounded-tr-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#171819] border-t border-[#C3C2BE]/10 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 btn-bronze-outline text-xs font-semibold rounded-xl transition-all"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallDetailsModal;
