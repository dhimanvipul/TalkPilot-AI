import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Play,
  Pause,
  RotateCcw,
  Square,
  Bot,
  X,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const Campaigns = () => {
  const socket = useSocket();
  const [campaigns, setCampaigns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    selectedContactIds: [],
    concurrencyLimit: 3,
    callInterval: 3,
    retryAttempts: 2,
    campaignObjective: '',
    agentRole: '',
    systemInstructions: '',
    contextInfo: '',
    greetingMessage: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [campRes, agentRes, contactRes] = await Promise.all([
        api.get('/campaigns'),
        api.get('/agents'),
        api.get('/contacts?limit=200')
      ]);

      if (campRes.data.success) setCampaigns(campRes.data.campaigns);
      if (agentRes.data.success) {
        setAgents(agentRes.data.agents);
        if (agentRes.data.agents.length > 0 && !formData.agentId) {
          setFormData((prev) => ({ ...prev, agentId: agentRes.data.agents[0]._id }));
        }
      }
      if (contactRes.data.success) setContacts(contactRes.data.contacts);
    } catch (err) {
      console.error('Error loading campaigns data:', err);
    }
  }, [formData.agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;

    const handleCampaignUpdate = () => {
      fetchData();
    };

    socket.on('campaign:updated', handleCampaignUpdate);
    socket.on('call:status', handleCampaignUpdate);

    return () => {
      socket.off('campaign:updated', handleCampaignUpdate);
      socket.off('call:status', handleCampaignUpdate);
    };
  }, [socket, fetchData]);

  const handleSelectAllContacts = () => {
    if (formData.selectedContactIds.length === contacts.length) {
      setFormData({ ...formData, selectedContactIds: [] });
    } else {
      setFormData({ ...formData, selectedContactIds: contacts.map((c) => c._id) });
    }
  };

  const handleToggleContact = (id) => {
    const exists = formData.selectedContactIds.includes(id);
    if (exists) {
      setFormData({
        ...formData,
        selectedContactIds: formData.selectedContactIds.filter((item) => item !== id)
      });
    } else {
      setFormData({
        ...formData,
        selectedContactIds: [...formData.selectedContactIds, id]
      });
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.agentId || formData.selectedContactIds.length === 0) {
      alert('Campaign Name, Agent, and at least one Contact are required.');
      return;
    }

    try {
      await api.post('/campaigns', {
        name: formData.name,
        agentId: formData.agentId,
        contactIds: formData.selectedContactIds,
        concurrencyLimit: formData.concurrencyLimit,
        callInterval: formData.callInterval,
        retryAttempts: formData.retryAttempts,
        campaignObjective: formData.campaignObjective,
        agentRole: formData.agentRole,
        systemInstructions: formData.systemInstructions,
        contextInfo: formData.contextInfo,
        greetingMessage: formData.greetingMessage
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating campaign');
    }
  };

  const handleAction = async (campaignId, action) => {
    try {
      await api.post(`/campaigns/${campaignId}/${action}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} campaign`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
            <span>Outbound Queues</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">Campaign Orchestration</h1>
          <p className="text-sm text-[#A1A09B] mt-0.5">
            Dispatch autonomous AI calling queues with live execution telemetry and concurrency throttling.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-bronze px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-bronze-sm"
        >
          <Plus className="w-4 h-4 text-[#121314]" />
          <span>Launch Campaign</span>
        </button>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center text-[#8A8983] text-xs">
            No campaigns configured. Click "Launch Campaign" to configure your first outbound batch.
          </div>
        ) : (
          campaigns.map((camp) => (
            <div
              key={camp._id}
              className="glass-card p-6 rounded-2xl space-y-4 group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C3C2BE]/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-[#F1F0ED] text-lg tracking-tight">{camp.name}</h3>
                    <span
                      className={`px-3 py-0.5 rounded-full text-xs font-semibold ${
                        camp.status === 'Running'
                          ? 'bg-[#AD8A62]/20 text-[#C5A47E] border border-[#AD8A62]/40 animate-pulse'
                          : camp.status === 'Completed'
                          ? 'bg-[#689F7D]/15 text-[#85C09B] border border-[#689F7D]/30'
                          : camp.status === 'Paused'
                          ? 'bg-[#C5A47E]/15 text-[#F1F0ED] border border-[#C5A47E]/30'
                          : 'bg-[#292B2D] text-[#8A8983] border border-[#C3C2BE]/10'
                      }`}
                    >
                      ● {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A8983] flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-[#C5A47E]" />
                    <span>Agent: <strong className="text-[#F1F0ED]">{camp.agentId?.name || 'AI Agent'}</strong></span>
                    <span>• Concurrency: {camp.concurrencyLimit} lines</span>
                    {camp.campaignObjective && <span>• {camp.campaignObjective}</span>}
                  </p>
                </div>

                {/* Queue Controls */}
                <div className="flex items-center space-x-2">
                  {camp.status === 'Draft' || camp.status === 'Scheduled' ? (
                    <button
                      onClick={() => handleAction(camp._id, 'start')}
                      className="btn-bronze px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-bronze-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-[#121314]" />
                      <span>Start Campaign</span>
                    </button>
                  ) : null}

                  {camp.status === 'Running' ? (
                    <button
                      onClick={() => handleAction(camp._id, 'pause')}
                      className="btn-bronze-outline px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Queue</span>
                    </button>
                  ) : null}

                  {camp.status === 'Paused' ? (
                    <button
                      onClick={() => handleAction(camp._id, 'resume')}
                      className="btn-bronze px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-bronze-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resume Queue</span>
                    </button>
                  ) : null}

                  {camp.status === 'Running' || camp.status === 'Paused' ? (
                    <button
                      onClick={() => handleAction(camp._id, 'stop')}
                      className="px-3.5 py-2 bg-[#242628] hover:bg-[#C05E54]/15 text-[#C3C2BE] hover:text-[#E2847A] font-semibold rounded-xl text-xs flex items-center space-x-1.5 border border-[#C3C2BE]/10 hover:border-[#C05E54]/30 transition-all"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Progress & Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center text-xs">
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">Total Target</span>
                  <span className="text-sm font-extrabold text-[#F1F0ED] font-mono">{camp.stats?.totalContacts || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">Queued</span>
                  <span className="text-sm font-extrabold text-[#C3C2BE] font-mono">{camp.stats?.queued || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">In Progress</span>
                  <span className="text-sm font-extrabold text-[#C5A47E] font-mono">{camp.stats?.calling || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">Completed</span>
                  <span className="text-sm font-extrabold text-[#85C09B] font-mono">{camp.stats?.completed || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">Failed</span>
                  <span className="text-sm font-extrabold text-[#E2847A] font-mono">{camp.stats?.failed || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">No Answer</span>
                  <span className="text-sm font-extrabold text-[#8A8983] font-mono">{camp.stats?.noAnswer || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">Busy</span>
                  <span className="text-sm font-extrabold text-[#D2BA9F] font-mono">{camp.stats?.busy || 0}</span>
                </div>
                <div className="bg-[#171819]/80 p-3 rounded-xl border border-[#C3C2BE]/10">
                  <span className="text-[10px] text-[#8A8983] block">Opted Out</span>
                  <span className="text-sm font-extrabold text-[#E2847A] font-mono">{camp.stats?.optedOut || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-2xl rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
            <div className="px-6 py-4 bg-[#171819]/90 border-b border-[#AD8A62]/15 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#AD8A62]" />
                <h3 className="font-bold text-[#F1F0ED] text-base">Launch New Campaign Queue</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#C3C2BE] hover:text-[#F1F0ED] p-1.5 rounded-xl hover:bg-[#292B2D] border border-transparent hover:border-[#AD8A62]/30 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Party Invitation / PIET Admissions 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Campaign Objective <span className="text-[#8A8983] font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Invite guests to Diwali Party on Nov 15 at Raj Mahal, Delhi"
                  value={formData.campaignObjective}
                  onChange={(e) => setFormData({ ...formData, campaignObjective: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">AI Agent Role / Persona <span className="text-[#8A8983] font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Party Invitation Assistant"
                  value={formData.agentRole}
                  onChange={(e) => setFormData({ ...formData, agentRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">AI Instructions / Conversation Guide <span className="text-[#8A8983] font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="e.g. Warmly invite the person to the Diwali party. Share venue, time, food details. Ask if they can attend. Confirm RSVP. Never discuss unrelated topics."
                  value={formData.systemInstructions}
                  onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Context / Event Details <span className="text-[#8A8983] font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  placeholder="e.g. Event: Diwali Party | Date: Nov 15 | Time: 7PM | Venue: Raj Mahal, Delhi | Food: Buffet | Dress code: Traditional"
                  value={formData.contextInfo}
                  onChange={(e) => setFormData({ ...formData, contextInfo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Opening Greeting <span className="text-[#8A8983] font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Hi {name}! I'm calling to personally invite you to our grand Diwali Party..."
                  value={formData.greetingMessage}
                  onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
                <p className="text-[#8A8983] mt-1 text-[10px]">Use <code className="bg-[#242628] text-[#C5A47E] px-1.5 py-0.5 rounded font-mono border border-[#C3C2BE]/10">{'{name}'}</code> to automatically insert the contact's name.</p>
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Select AI Voice Agent *</label>
                <select
                  required
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs"
                >
                  {agents.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} — {a.callObjective}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Concurrency Limit</label>
                  <input
                    type="number"
                    value={formData.concurrencyLimit}
                    onChange={(e) => setFormData({ ...formData, concurrencyLimit: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Interval (s)</label>
                  <input
                    type="number"
                    value={formData.callInterval}
                    onChange={(e) => setFormData({ ...formData, callInterval: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Retry Limit</label>
                  <input
                    type="number"
                    value={formData.retryAttempts}
                    onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Contacts Selection Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#C3C2BE]">
                    Target Contacts ({formData.selectedContactIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllContacts}
                    className="text-[#C5A47E] hover:text-[#F1F0ED] font-semibold transition-colors"
                  >
                    {formData.selectedContactIds.length === contacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-[#C3C2BE]/10 rounded-xl bg-[#141516]/80 divide-y divide-[#C3C2BE]/10">
                  {contacts.length === 0 ? (
                    <p className="p-4 text-center text-[#8A8983]">No contacts available. Please add contacts first.</p>
                  ) : (
                    contacts.map((c) => (
                      <label
                        key={c._id}
                        className="flex items-center justify-between p-3 hover:bg-[#292B2D]/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.selectedContactIds.includes(c._id)}
                            onChange={() => handleToggleContact(c._id)}
                            className="rounded border-[#C3C2BE]/20 bg-[#171819] text-[#AD8A62] focus:ring-0"
                          />
                          <div>
                            <span className="font-semibold text-[#F1F0ED]">{c.name}</span>
                            <span className="text-[#8A8983] ml-2 font-mono">{c.phone}</span>
                          </div>
                        </div>

                        {c.optOutStatus && (
                          <span className="text-[10px] text-[#E2847A] font-bold bg-[#C05E54]/15 px-2 py-0.5 rounded border border-[#C05E54]/30">
                            Opted Out
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#C3C2BE]/10 text-right space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 btn-graphite text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-bronze text-xs font-bold rounded-xl shadow-bronze-sm"
                >
                  Create & Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
