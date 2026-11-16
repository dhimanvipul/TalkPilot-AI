import React, { useEffect, useState } from 'react';
import { Bot, Plus, Copy, Trash2, Edit3, X } from 'lucide-react';
import api from '../services/api';

const AIAgents = () => {
  const [agents, setAgents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemInstructions: '',
    greetingMessage: '',
    personality: 'Professional & Polite',
    language: 'en-US',
    voice: 'en-US-Neural2-F (Female)',
    callObjective: '',
    endingMessage: 'Thank you for your time. Have a great day!',
    maxDuration: 300
  });

  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents');
      if (res.data.success) {
        setAgents(res.data.agents);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleOpenModal = (agent = null) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        description: agent.description || '',
        systemInstructions: agent.systemInstructions,
        greetingMessage: agent.greetingMessage,
        personality: agent.personality || 'Professional & Polite',
        language: agent.language || 'en-US',
        voice: agent.voice || 'en-US-Neural2-F (Female)',
        callObjective: agent.callObjective,
        endingMessage: agent.endingMessage || 'Thank you for your time. Have a great day!',
        maxDuration: agent.maxDuration || 300
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        description: '',
        systemInstructions: 'You are a polite assistant. Answer basic questions and respect opt-out requests.',
        greetingMessage: 'Hello! This is TalkPilot AI calling on behalf of...',
        personality: 'Professional & Polite',
        language: 'en-US',
        voice: 'en-US-Neural2-F (Female)',
        callObjective: 'Confirm appointment and answer basic customer inquiries.',
        endingMessage: 'Thank you for your time. Have a great day!',
        maxDuration: 300
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingAgent) {
        await api.put(`/agents/${editingAgent._id}`, formData);
      } else {
        await api.post('/agents', formData);
      }
      setIsModalOpen(false);
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving agent');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/agents/${id}/duplicate`);
      fetchAgents();
    } catch (err) {
      alert('Failed to duplicate agent');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this AI Agent?')) return;
    try {
      await api.delete(`/agents/${id}`);
      fetchAgents();
    } catch (err) {
      alert('Failed to delete agent');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
            <span>Voice Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">AI Voice Agents</h1>
          <p className="text-sm text-[#A1A09B] mt-0.5">
            Configure, personalize and deploy custom conversational AI agents for outbound operations.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-bronze px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-bronze-sm"
        >
          <Plus className="w-4 h-4 text-[#121314]" />
          <span>Create AI Agent</span>
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div
            key={agent._id}
            className="glass-card p-6 rounded-2xl flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#383A3C] via-[#292B2D] to-[#202224] border border-[#AD8A62]/40 flex items-center justify-center text-[#C5A47E] shadow-sm">
                    <Bot className="w-5 h-5 text-[#AD8A62]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#F1F0ED] text-base">{agent.name}</h3>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#689F7D]/15 text-[#85C09B] border border-[#689F7D]/30 mt-0.5">
                      ● Active
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#A1A09B] line-clamp-2">
                {agent.description || 'Custom conversational AI agent configured for automated phone calls.'}
              </p>

              <div className="bg-[#171819]/80 p-3.5 rounded-xl border border-[#C3C2BE]/10 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#8A8983] font-medium">Objective:</span>
                  <span className="text-[#F1F0ED] font-semibold truncate max-w-[180px]">{agent.callObjective}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8A8983] font-medium">Voice Model:</span>
                  <span className="text-[#C5A47E] font-mono text-[11px] truncate max-w-[170px]">{agent.voice}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8A8983] font-medium">Max Length:</span>
                  <span className="text-[#C3C2BE] font-mono">{agent.maxDuration}s</span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#C3C2BE]/10 text-center">
                <div className="bg-[#171819]/50 p-2.5 rounded-xl border border-[#C3C2BE]/5">
                  <span className="text-[10px] text-[#8A8983] block">Total Calls</span>
                  <span className="text-sm font-extrabold text-[#F1F0ED] font-mono">{agent.totalCalls || 0}</span>
                </div>
                <div className="bg-[#171819]/50 p-2.5 rounded-xl border border-[#C3C2BE]/5">
                  <span className="text-[10px] text-[#8A8983] block">Success Rate</span>
                  <span className="text-sm font-extrabold text-[#C5A47E] font-mono">{agent.successRate || 0}%</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#C3C2BE]/10">
              <span className="text-[10px] text-[#8A8983]">
                Created: {new Date(agent.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleDuplicate(agent._id)}
                  className="p-1.5 text-[#8A8983] hover:text-[#C5A47E] hover:bg-[#292B2D] rounded-lg transition-all"
                  title="Duplicate Agent"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenModal(agent)}
                  className="p-1.5 text-[#8A8983] hover:text-[#C5A47E] hover:bg-[#292B2D] rounded-lg transition-all"
                  title="Edit Agent"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(agent._id)}
                  className="p-1.5 text-[#8A8983] hover:text-[#E2847A] hover:bg-[#C05E54]/15 rounded-lg transition-all"
                  title="Delete Agent"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Create/Edit Agent */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-2xl rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl">
            <div className="px-6 py-4 bg-[#171819]/90 border-b border-[#AD8A62]/15 flex items-center justify-between">
              <h3 className="font-bold text-[#F1F0ED] text-base">
                {editingAgent ? 'Edit AI Voice Agent' : 'Create New AI Voice Agent'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#C3C2BE] hover:text-[#F1F0ED] p-1.5 rounded-xl hover:bg-[#292B2D] border border-transparent hover:border-[#AD8A62]/30 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Admission Counseling Assistant"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Personality & Tone</label>
                  <input
                    type="text"
                    placeholder="Professional, Warm & Polite"
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="Short summary of this agent's specialty"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Call Objective</label>
                <input
                  type="text"
                  required
                  placeholder="Confirm interest and book counseling session"
                  value={formData.callObjective}
                  onChange={(e) => setFormData({ ...formData, callObjective: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Greeting Message (First Spoken Utterance)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Hello! This is TalkPilot AI calling regarding..."
                  value={formData.greetingMessage}
                  onChange={(e) => setFormData({ ...formData, greetingMessage: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">System Prompt / Instructions</label>
                <textarea
                  rows={4}
                  required
                  placeholder="You are a professional assistant. Guide the user through questions and handle requests courteously..."
                  value={formData.systemInstructions}
                  onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs"
                  >
                    <option value="en-US">English (en-US)</option>
                    <option value="en-IN">English India (en-IN)</option>
                    <option value="hi-IN">Hindi (hi-IN)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Human Voice Model</label>
                  <select
                    value={formData.voice}
                    onChange={(e) => setFormData({ ...formData, voice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs"
                  >
                    <optgroup label="ElevenLabs Human Voices (Free & Paid Tier)">
                      <option value="Xb7hH8MSUJpSbSDYk0k2">Alice (Conversational Female)</option>
                      <option value="JBFqnCBsd6RMkjVDRZzb">George (Warm & Professional Male)</option>
                      <option value="cgSgspJ2msm6clMCkdW9">Jessica (Friendly Female)</option>
                      <option value="pFZP5JQG7iQjIQuC4Bku">Lily (Calm & Gentle Female)</option>
                      <option value="FGY2WhTYpPnrIDTdsKH5">Laura (Cheerful Female)</option>
                      <option value="nPczCjzI2devNBz1zQrb">Brian (Deep & Resonant Male)</option>
                      <option value="onwK4e9ZLuTAKqWW03F9">Daniel (Authoritative Male)</option>
                      <option value="TX3LPaxmHKxFdv7VOQHJ">Liam (Youthful Male)</option>
                    </optgroup>
                    <optgroup label="Standard Telephony Voices">
                      <option value="en-US-Neural2-F (Female)">Neural2-F (Standard Female)</option>
                      <option value="en-US-Neural2-M (Male)">Neural2-M (Standard Male)</option>
                      <option value="en-US-Studio-O (Female)">Studio-O (Standard Female)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Max Duration (sec)</label>
                  <input
                    type="number"
                    value={formData.maxDuration}
                    onChange={(e) => setFormData({ ...formData, maxDuration: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#171819] border-t border-[#C3C2BE]/10 text-right space-x-2">
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
                  Save Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgents;
