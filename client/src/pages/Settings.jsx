import React, { useState, useEffect } from 'react';
import {
  Bot,
  PhoneCall,
  ShieldCheck,
  Save,
  CheckCircle2,
  Headphones,
  Volume2,
  Sparkles,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const Settings = () => {
  const [saved, setSaved] = useState(false);
  const [testingVoice, setTestingVoice] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState('');
  const [testAudioError, setTestAudioError] = useState('');

  const [formData, setFormData] = useState({
    defaultLanguage: 'en-US',
    defaultVoice: '21m00Tcm4TlvDq8ikWAM',
    elevenLabsApiKey: '',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
    aiProvider: 'free',
    geminiApiKey: '',
    groqApiKey: '',
    openAiApiKey: '',
    maxConcurrentCalls: 5,
    retryAttempts: 2,
    retryDelaySeconds: 300,
    maxCallDuration: 300,
    consentRequired: true,
    optOutHandling: true,
    dncProtection: true,
    callingHoursStart: '09:00',
    callingHoursEnd: '18:00'
  });

  const [voices, setVoices] = useState([
    { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Clear, confident, conversational female' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm, professional, resonant male' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Friendly, warm, engaging female' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Velvety, calm, gentle female' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Enthusiastic, bright female' },
    { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep, rich, trustworthy male' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Authoritative, clear British male' },
    { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Youthful, dynamic, clear male' }
  ]);

  const [elevenLabsConfigured, setElevenLabsConfigured] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.success) {
          const s = res.data.settings;
          setFormData((prev) => ({
            ...prev,
            ...s,
            elevenLabsApiKey: s.elevenLabsKeyMasked || '',
            elevenLabsVoiceId: s.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'
          }));
          setElevenLabsConfigured(Boolean(s.elevenLabsConfigured));
          if (res.data.availableVoices && res.data.availableVoices.length > 0) {
            setVoices(res.data.availableVoices);
          }
        }
      } catch (err) {
        console.warn('Could not load settings from server, using defaults:', err.message);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/settings', formData);
      if (res.data.success) {
        setSaved(true);
        if (res.data.settings.elevenLabsConfigured !== undefined) {
          setElevenLabsConfigured(res.data.settings.elevenLabsConfigured);
        }
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving settings');
    }
  };

  // Test ElevenLabs speech synthesis
  const handleTestVoice = async () => {
    setTestingVoice(true);
    setTestAudioError('');
    try {
      const res = await api.post('/settings/test-tts', {
        text: 'Hello! This is TalkPilot AI speaking with an executive human voice powered by ElevenLabs.',
        voiceId: formData.elevenLabsVoiceId,
        apiKey: formData.elevenLabsApiKey
      });

      if (res.data.success) {
        const audioSrc = res.data.audioBase64
          ? `data:audio/mp3;base64,${res.data.audioBase64}`
          : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${res.data.audioUrl}`;
        const audio = new Audio(audioSrc);
        audio.play().catch(() => {
          setTestAudioError('Audio playback was blocked by browser. Please tap test again.');
        });
      } else {
        setTestAudioError(res.data.message || 'ElevenLabs synthesis failed.');
      }
    } catch (err) {
      setTestAudioError(err.response?.data?.message || 'ElevenLabs API call failed.');
    } finally {
      setTestingVoice(false);
    }
  };

  // Test AI dynamic conversational response
  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult('');
    try {
      const res = await api.post('/settings/test-ai', {
        message: 'Can you introduce yourself and tell me what you can do for me?',
        systemPrompt: 'You are TalkPilot AI executive assistant. Respond conversationally in 1-2 spoken sentences.'
      });

      if (res.data.success) {
        setAiTestResult(res.data.reply);
      } else {
        setAiTestResult(res.data.message || 'Could not generate AI reply.');
      }
    } catch (err) {
      setAiTestResult('AI test failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#C5A47E] uppercase tracking-wider mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#AD8A62]" />
          <span>Platform Infrastructure</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#F1F0ED] tracking-tight">System Settings</h1>
        <p className="text-sm text-[#A1A09B] mt-0.5">
          Configure ElevenLabs human-like voice synthesis, conversational AI providers, and telephony safeguards.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-[#689F7D]/15 border border-[#689F7D]/30 text-[#85C09B] text-xs rounded-2xl flex items-center space-x-2 animate-in fade-in shadow-md">
          <CheckCircle2 className="w-4 h-4 text-[#85C09B]" />
          <span>Settings saved successfully. Configuration updated across the calling engine.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Card 1: ElevenLabs Text-to-Speech (Human-Like Voice) */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#C3C2BE]/10 pb-3">
            <div className="flex items-center space-x-2 text-[#C5A47E] font-bold text-sm">
              <Headphones className="w-4 h-4 text-[#AD8A62]" />
              <span className="text-[#F1F0ED]">ElevenLabs Ultra-Realistic Voice Engine</span>
            </div>
            {elevenLabsConfigured ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#689F7D]/15 text-[#85C09B] border border-[#689F7D]/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ElevenLabs Active
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#AD8A62]/15 text-[#C5A47E] border border-[#AD8A62]/30">
                Key Optional (Fallback Active)
              </span>
            )}
          </div>

          <p className="text-[#8A8983] text-xs">
            ElevenLabs provides studio-grade, human-cadence conversational voices with dynamic breathing and pitch variation for outbound voice agents.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5 flex items-center justify-between">
                <span>ElevenLabs API Key</span>
                <a
                  href="https://elevenlabs.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#C5A47E] hover:text-[#F1F0ED] inline-flex items-center gap-1 text-[10px] transition-colors"
                >
                  Get key from elevenlabs.io <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </label>
              <input
                type="password"
                placeholder="sk_... or xi-api-key"
                value={formData.elevenLabsApiKey}
                onChange={(e) => setFormData({ ...formData, elevenLabsApiKey: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5">Human Voice Selection</label>
              <select
                value={formData.elevenLabsVoiceId}
                onChange={(e) => setFormData({ ...formData, elevenLabsVoiceId: e.target.value, defaultVoice: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.description || v.gender || 'Human Voice'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {testAudioError && (
            <div className="p-3 bg-[#C05E54]/15 border border-[#C05E54]/30 text-[#E2847A] text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{testAudioError}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={testingVoice}
              className="btn-bronze-outline px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#C5A47E]" />
              <span>{testingVoice ? 'Synthesizing...' : 'Test ElevenLabs Voice'}</span>
            </button>
            <span className="text-[11px] text-[#8A8983]">Plays a live audio sample directly in your browser speaker</span>
          </div>
        </div>

        {/* Card 2: Conversational AI Engine & LLM API */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#C3C2BE]/10 pb-3">
            <div className="flex items-center space-x-2 text-[#C5A47E] font-bold text-sm">
              <Bot className="w-4 h-4 text-[#AD8A62]" />
              <span className="text-[#F1F0ED]">Conversational AI Model (Dynamic Responses)</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#AD8A62]/15 text-[#C5A47E] border border-[#AD8A62]/30">
              Provider: {formData.aiProvider.toUpperCase()}
            </span>
          </div>

          <p className="text-[#8A8983] text-xs">
            Orchestrates an intelligent LLM that genuinely formulates custom spoken replies to whatever the recipient speaks during live calls.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5">AI Engine Provider</label>
              <select
                value={formData.aiProvider}
                onChange={(e) => setFormData({ ...formData, aiProvider: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] focus:outline-none focus:border-[#AD8A62] text-xs"
              >
                <option value="gemini">Google Gemini 1.5/2.0 Flash (Recommended - Fast & Free Tier)</option>
                <option value="groq">Groq Cloud Llama 3.3 70B (Recommended - Ultra-Low Latency Free)</option>
                <option value="openai">OpenAI GPT-4o-mini / GPT-4o</option>
                <option value="free">Free Built-in Multi-Model Engine (Zero setup)</option>
              </select>
            </div>

            <div>
              {formData.aiProvider === 'gemini' && (
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5 flex items-center justify-between">
                    <span>Google Gemini API Key</span>
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#C5A47E] hover:text-[#F1F0ED] inline-flex items-center gap-1 text-[10px] transition-colors"
                    >
                      Get free key from Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={formData.geminiApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all font-mono text-xs"
                  />
                </div>
              )}

              {formData.aiProvider === 'groq' && (
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5 flex items-center justify-between">
                    <span>Groq Cloud API Key</span>
                    <a
                      href="https://console.groq.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#C5A47E] hover:text-[#F1F0ED] inline-flex items-center gap-1 text-[10px] transition-colors"
                    >
                      Get free key from console.groq.com <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={formData.groqApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, groqApiKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all font-mono text-xs"
                  />
                </div>
              )}

              {formData.aiProvider === 'openai' && (
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5 flex items-center justify-between">
                    <span>OpenAI API Key</span>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#C5A47E] hover:text-[#F1F0ED] inline-flex items-center gap-1 text-[10px] transition-colors"
                    >
                      Get key from platform.openai.com <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <input
                    type="password"
                    placeholder="sk-proj-..."
                    value={formData.openAiApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, openAiApiKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30 transition-all font-mono text-xs"
                  />
                </div>
              )}

              {formData.aiProvider === 'free' && (
                <div>
                  <label className="block font-semibold text-[#C3C2BE] mb-1.5">Engine Status</label>
                  <div className="px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#85C09B] font-semibold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#85C09B]" /> Operational (Zero setup needed)
                  </div>
                </div>
              )}
            </div>
          </div>

          {aiTestResult && (
            <div className="p-3.5 bg-[#141516] border border-[#AD8A62]/30 rounded-xl text-[#F1F0ED] text-xs">
              <span className="font-bold text-[#C5A47E] block mb-1">AI Test Response:</span>
              <p className="italic text-[#C3C2BE]">"{aiTestResult}"</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestAi}
              disabled={testingAi}
              className="btn-bronze px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-bronze-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#121314]" />
              <span>{testingAi ? 'Synthesizing Response...' : 'Test Conversational AI'}</span>
            </button>
            <span className="text-[11px] text-[#8A8983]">Validates that AI model answers dynamically</span>
          </div>
        </div>

        {/* Card 3: Telephony & Rate Limits */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-[#C5A47E] font-bold text-sm border-b border-[#C3C2BE]/10 pb-3">
            <PhoneCall className="w-4 h-4 text-[#AD8A62]" />
            <span className="text-[#F1F0ED]">Calling Queue & Rate Safeguards</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5">Max Concurrent Calls</label>
              <input
                type="number"
                value={formData.maxConcurrentCalls}
                onChange={(e) => setFormData({ ...formData, maxConcurrentCalls: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] font-mono focus:outline-none focus:border-[#AD8A62]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5">Retry Attempts</label>
              <input
                type="number"
                value={formData.retryAttempts}
                onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] font-mono focus:outline-none focus:border-[#AD8A62]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5">Retry Delay (Sec)</label>
              <input
                type="number"
                value={formData.retryDelaySeconds}
                onChange={(e) => setFormData({ ...formData, retryDelaySeconds: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] font-mono focus:outline-none focus:border-[#AD8A62]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#C3C2BE] mb-1.5">Max Call Length (Sec)</label>
              <input
                type="number"
                value={formData.maxCallDuration}
                onChange={(e) => setFormData({ ...formData, maxCallDuration: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2.5 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-[#F1F0ED] font-mono focus:outline-none focus:border-[#AD8A62]"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Compliance & Opt-Out Safeguards */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-[#C5A47E] font-bold text-sm border-b border-[#C3C2BE]/10 pb-3">
            <ShieldCheck className="w-4 h-4 text-[#85C09B]" />
            <span className="text-[#F1F0ED]">Compliance & Opt-Out Guardrails</span>
          </div>

          <div className="space-y-3.5">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.consentRequired}
                onChange={(e) => setFormData({ ...formData, consentRequired: e.target.checked })}
                className="rounded border-[#C3C2BE]/20 bg-[#171819] text-[#AD8A62] focus:ring-0"
              />
              <div>
                <span className="font-semibold text-[#F1F0ED] block">Enforce Prior Consent Verification</span>
                <span className="text-[#8A8983] text-[11px]">Only allows outbound calls to contacts with explicit consent on record.</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.optOutHandling}
                onChange={(e) => setFormData({ ...formData, optOutHandling: e.target.checked })}
                className="rounded border-[#C3C2BE]/20 bg-[#171819] text-[#AD8A62] focus:ring-0"
              />
              <div>
                <span className="font-semibold text-[#F1F0ED] block">Automatic Opt-Out Speech Detection</span>
                <span className="text-[#8A8983] text-[11px]">Real-time detection of phrases like "stop calling" or "remove me" during live calls.</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.dncProtection}
                onChange={(e) => setFormData({ ...formData, dncProtection: e.target.checked })}
                className="rounded border-[#C3C2BE]/20 bg-[#171819] text-[#AD8A62] focus:ring-0"
              />
              <div>
                <span className="font-semibold text-[#F1F0ED] block">Strict Do-Not-Call (DNC) Registry Guard</span>
                <span className="text-[#8A8983] text-[11px]">Prevents dispatches to contacts flagged in the Do-Not-Call database.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            className="btn-bronze px-6 py-2.5 rounded-xl text-xs font-bold shadow-bronze-md transition-all inline-flex items-center space-x-2"
          >
            <Save className="w-4 h-4 text-[#121314]" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
