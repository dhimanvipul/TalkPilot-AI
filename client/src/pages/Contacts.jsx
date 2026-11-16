import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Upload,
  Download,
  ShieldAlert,
  Edit3,
  Trash2,
  PhoneCall,
  X,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import LiveCallModal from '../components/LiveCallModal';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');

  const [agents, setAgents] = useState([]);
  const [selectedAgentForCall, setSelectedAgentForCall] = useState('');
  const [activeCallId, setActiveCallId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    consentStatus: true,
    optOutStatus: false
  });

  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get(`/contacts?search=${search}&page=${page}&limit=20`);
      if (res.data.success) {
        setContacts(res.data.contacts);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  }, [page, search]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await api.get('/agents');
      if (res.data.success && res.data.agents.length > 0) {
        setAgents(res.data.agents);
        setSelectedAgentForCall((prev) => prev || res.data.agents[0]._id);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchAgents();
  }, [fetchContacts, fetchAgents]);

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || '',
        notes: contact.notes || '',
        consentStatus: contact.consentStatus !== undefined ? contact.consentStatus : true,
        optOutStatus: contact.optOutStatus || false
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        notes: '',
        consentStatus: true,
        optOutStatus: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.put(`/contacts/${editingContact._id}`, formData);
      } else {
        await api.post('/contacts', formData);
      }
      setIsModalOpen(false);
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save contact');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      fetchContacts();
    } catch (err) {
      alert('Failed to delete contact');
    }
  };

  const handleToggleOptOut = async (id) => {
    try {
      await api.put(`/contacts/${id}/toggle-opt-out`);
      fetchContacts();
    } catch (err) {
      alert('Failed to update DNC status');
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    setImportResult(null);

    const lines = csvText.trim().split('\n');
    const parsed = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('name,')) continue;
      const parts = line.split(',');
      if (parts.length >= 2) {
        parsed.push({
          name: parts[0].trim().replace(/^"|"$/g, ''),
          phone: parts[1].trim().replace(/^"|"$/g, ''),
          email: parts[2] ? parts[2].trim().replace(/^"|"$/g, '') : ''
        });
      }
    }

    if (parsed.length === 0) {
      alert('No valid contact entries found in CSV text.');
      return;
    }

    try {
      const res = await api.post('/contacts/import', { contacts: parsed });
      setImportResult(res.data.message);
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed');
    }
  };

  const handleExportCSV = () => {
    window.open(`${api.defaults.baseURL}/contacts/export`, '_blank');
  };

  const handleQuickSingleCall = async (contactId) => {
    if (!selectedAgentForCall) {
      alert('Please create an AI Agent first');
      return;
    }
    try {
      const res = await api.post('/calls/initiate', {
        contactId,
        agentId: selectedAgentForCall
      });
      if (res.data.success) {
        setActiveCallId(res.data.call._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate call');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
            <span>Customer Registry</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">Contact Directory</h1>
          <p className="text-sm text-[#A1A09B] mt-0.5">
            Manage authenticated audience records, opt-out registries, and Do-Not-Call compliance.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn-bronze-outline px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
          >
            <Upload className="w-4 h-4 text-[#C5A47E]" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-bronze-outline px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4 text-[#C5A47E]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="btn-bronze px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-bronze-sm"
          >
            <Plus className="w-4 h-4 text-[#121314]" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Search & Agent Selector Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8A8983] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by contact name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-xs text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all"
          />
        </div>

        {agents.length > 0 && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#8A8983] font-medium">Quick Call Agent:</span>
            <select
              value={selectedAgentForCall}
              onChange={(e) => setSelectedAgentForCall(e.target.value)}
              className="bg-[#141516] border border-[#AD8A62]/30 rounded-xl px-3 py-1.5 text-xs text-[#C5A47E] font-semibold focus:outline-none focus:border-[#AD8A62]"
            >
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contacts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#C3C2BE]">
            <thead className="bg-[#171819]/90 text-[#8A8983] uppercase text-[10px] font-bold tracking-wider border-b border-[#C3C2BE]/10">
              <tr>
                <th className="py-3.5 px-6">Name</th>
                <th className="py-3.5 px-6">Phone Number</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Consent & DNC Status</th>
                <th className="py-3.5 px-6">Added On</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C3C2BE]/5">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#8A8983]">
                    No contacts found. Click "Add Contact" or "Import CSV" to populate contacts.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c._id} className="hover:bg-[#292B2D]/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-[#F1F0ED]">{c.name}</td>
                    <td className="py-4 px-6 font-mono text-[#C3C2BE]">{c.phone}</td>
                    <td className="py-4 px-6 text-[#8A8983]">{c.email || '—'}</td>
                    <td className="py-4 px-6">
                      {c.optOutStatus ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C05E54]/15 text-[#E2847A] border border-[#C05E54]/30">
                          <ShieldAlert className="w-3 h-3" />
                          <span>DO NOT CALL (OPT-OUT)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#689F7D]/15 text-[#85C09B] border border-[#689F7D]/30">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Consent Verified</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[#8A8983]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {!c.optOutStatus && (
                        <button
                          onClick={() => handleQuickSingleCall(c._id)}
                          className="btn-bronze px-2.5 py-1 text-[11px] font-bold rounded-lg inline-flex items-center space-x-1 shadow-bronze-sm"
                        >
                          <PhoneCall className="w-3 h-3 text-[#121314]" />
                          <span>Call Now</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleOptOut(c._id)}
                        className={`px-2.5 py-1 font-semibold rounded-lg text-[11px] transition-all ${
                          c.optOutStatus
                            ? 'bg-[#689F7D]/15 text-[#85C09B] hover:bg-[#689F7D]/25 border border-[#689F7D]/30'
                            : 'bg-[#C05E54]/15 text-[#E2847A] hover:bg-[#C05E54]/25 border border-[#C05E54]/30'
                        }`}
                        title="Toggle Do Not Call protection"
                      >
                        {c.optOutStatus ? 'Remove DNC' : 'Mark DNC'}
                      </button>

                      <button
                        onClick={() => handleOpenModal(c)}
                        className="p-1.5 text-[#8A8983] hover:text-[#C5A47E] hover:bg-[#292B2D] rounded-lg transition-all"
                        title="Edit Contact"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteContact(c._id)}
                        className="p-1.5 text-[#8A8983] hover:text-[#E2847A] hover:bg-[#C05E54]/15 rounded-lg transition-all"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#8A8983] px-1">
          <span>Showing page {page} of {pages} ({total} contacts)</span>
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-md rounded-3xl shadow-2xl shadow-black/80 overflow-hidden p-6 space-y-4 text-xs backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[#AD8A62]/15 pb-3">
              <h3 className="font-bold text-[#F1F0ED] text-base">
                {editingContact ? 'Edit Contact Record' : 'Add New Contact Record'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#C3C2BE] hover:text-[#F1F0ED] p-1.5 rounded-xl hover:bg-[#292B2D] border border-transparent hover:border-[#AD8A62]/30 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Phone Number (with Country Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] font-mono placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#C3C2BE] mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="optOutStatus"
                  checked={formData.optOutStatus}
                  onChange={(e) => setFormData({ ...formData, optOutStatus: e.target.checked })}
                  className="rounded border-[#C3C2BE]/20 bg-[#171819] text-[#AD8A62] focus:ring-0"
                />
                <label htmlFor="optOutStatus" className="font-semibold text-[#E2847A] text-xs cursor-pointer">
                  Mark as DO NOT CALL (Opt-Out Protection)
                </label>
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
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-lg rounded-3xl shadow-2xl shadow-black/80 overflow-hidden p-6 space-y-4 text-xs backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[#AD8A62]/15 pb-3">
              <h3 className="font-bold text-[#F1F0ED] text-base">Import Contacts via CSV</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#C3C2BE] hover:text-[#F1F0ED] p-1.5 rounded-xl hover:bg-[#292B2D] border border-transparent hover:border-[#AD8A62]/30 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[#8A8983]">
              Paste CSV text below using the standard format:
            </p>
            <div className="bg-[#141516] p-3 rounded-xl border border-[#C3C2BE]/10 font-mono text-[11px] text-[#C3C2BE]">
              name,phone,email<br />
              Rahul Sharma,+919876543210,rahul@example.com<br />
              Aman Kumar,+918765432109,aman@example.com
            </div>

            {importResult && (
              <div className="p-3 bg-[#AD8A62]/15 border border-[#AD8A62]/30 text-[#C5A47E] rounded-xl font-semibold">
                {importResult}
              </div>
            )}

            <form onSubmit={handleImportCSV} className="space-y-4">
              <textarea
                rows={6}
                required
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="name,phone,email..."
                className="w-full p-3 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] font-mono text-xs focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30"
              />

              <div className="pt-2 text-right space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 btn-graphite text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 btn-bronze text-xs font-bold rounded-xl shadow-bronze-sm"
                >
                  Import Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Call Screen Modal */}
      {activeCallId && (
        <LiveCallModal callId={activeCallId} onClose={() => setActiveCallId(null)} />
      )}
    </div>
  );
};

export default Contacts;
