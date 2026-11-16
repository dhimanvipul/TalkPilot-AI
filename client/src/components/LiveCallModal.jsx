import React, { useEffect, useState, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  Clock,
  AlertCircle,
  Send,
  Sparkles,
  Building2,
  Radio,
  CheckCircle2,
  Headphones
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

/**
 * Detects if the captured user speech is an acoustic echo from the computer's speakers
 * playing the AI's recent utterance.
 */
const isAcousticEchoOfAi = (speechText, recentAiText) => {
  if (!speechText || !recentAiText) return false;
  const s = speechText.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const a = recentAiText.trim().toLowerCase().replace(/[^\w\s]/g, '');
  if (!s || !a) return false;

  // Exact or near-identical match
  if (s === a) return true;

  // Substring match: mic captured part of the AI's spoken sentence
  if (s.length >= 8 && (a.includes(s) || s.includes(a))) return true;

  // Significant word overlap match (>55% of spoken words were in AI's last sentence)
  const sWords = s.split(/\s+/).filter((w) => w.length > 2);
  const aWords = new Set(a.split(/\s+/).filter((w) => w.length > 2));
  if (sWords.length >= 3) {
    const matchingWords = sWords.filter((w) => aWords.has(w));
    if (matchingWords.length / sWords.length >= 0.55) {
      return true;
    }
  }

  return false;
};

const LiveCallModal = ({ callId, onClose }) => {
  const socket = useSocket();
  const [callData, setCallData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('Initiating');
  const [statusMsg, setStatusMsg] = useState('Connecting live call session...');
  const [errorMessage, setErrorMessage] = useState('');
  const [duration, setDuration] = useState(0);

  // Audio & Speech State
  const [isAiVoiceMuted, setIsAiVoiceMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState('elevenlabs');

  // User input state
  const [inputText, setInputText] = useState('');
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [micSupported, setMicSupported] = useState(true);

  const transcriptEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Audio elements & anti-echo refs
  const activeAudioRef = useRef(null);
  const isAiSpeakingRef = useRef(false);
  const aiSpeakingUntilRef = useRef(0);
  const lastAiTextRef = useRef('');
  const lastPlayedRef = useRef({ text: '', timestamp: 0 });
  const isAiVoiceMutedRef = useRef(isAiVoiceMuted);

  useEffect(() => {
    isAiVoiceMutedRef.current = isAiVoiceMuted;
    if (isAiVoiceMuted) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
    }
  }, [isAiVoiceMuted]);

  const campaignName = callData?.campaignId?.name || callData?.campaignName || '';
  const agentDisplayName =
    callData?.campaignId?.agentRole ||
    callData?.agentId?.name ||
    (campaignName ? `${campaignName} Assistant` : 'AI Assistant');
  const campaignBadgeName = campaignName || callData?.agentId?.name || 'Live AI Call';

  // Dynamic suggestion chips based on campaign context
  const getSuggestionChips = () => {
    const text = (campaignName + ' ' + (callData?.campaignId?.campaignObjective || '')).toLowerCase();
    if (text.includes('diwali') || text.includes('party') || text.includes('celebrat') || text.includes('invit') || text.includes('event')) {
      return [
        'Yes, speaking!',
        'Tell me more about the party details',
        'Where is the venue and at what time?',
        'Yes, count me in! I will attend',
        'Can I bring a guest or family with me?',
        'What will be the food and activities?',
        'Sorry, I might not be able to make it'
      ];
    }
    if (text.includes('admiss') || text.includes('piet') || text.includes('college') || text.includes('course') || text.includes('b.tech')) {
      return [
        'Yes, speaking!',
        'Tell me about B.Tech CSE & AI-ML',
        'What are the placement packages & companies?',
        'What are the fee and scholarship slabs?',
        'Tell me about campus & AC hostels',
        'Why should I join PIET over other colleges?',
        'Please book an admission counseling session'
      ];
    }
    return [
      'Yes, speaking!',
      'Can you tell me more about this?',
      'Yes, I am interested',
      'What are the main details?',
      'Could you share more information?',
      'Please follow up with me later',
      'No thanks, not interested right now'
    ];
  };

  const suggestionChips = getSuggestionChips();

  // Fetch initial call info
  useEffect(() => {
    let isSubscribed = true;
    const fetchCall = async () => {
      try {
        const res = await api.get(`/calls/${callId}`);
        if (!isSubscribed) return;
        if (res.data.success) {
          setCallData(res.data.call);
          setStatus(res.data.call.status);
          if (res.data.call.duration) setDuration(res.data.call.duration);
          if (res.data.call.lastError) setErrorMessage(res.data.call.lastError);
          setMessages((prev) => {
            const apiMessages = res.data.transcript || [];
            if (prev.length === 0) return apiMessages;
            const existingIds = new Set(
              prev.map((m) => (m._id || m.id || `${m.speaker}:${m.text}`).toString())
            );
            const toAdd = apiMessages.filter(
              (m) => !existingIds.has((m._id || m.id || `${m.speaker}:${m.text}`).toString())
            );
            return [...prev, ...toAdd];
          });
        }
      } catch (err) {
        console.error('Error fetching live call info:', err);
      }
    };
    if (callId) fetchCall();
    return () => {
      isSubscribed = false;
    };
  }, [callId]);

  // Duration Timer
  useEffect(() => {
    let timer;
    if (status === 'Connected' || status === 'In Progress') {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  /**
   * Concludes AI speech, updates state, and maintains a safety echo cooldown.
   */
  const finishAiSpeech = () => {
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;
    activeAudioRef.current = null;
    // Keep mic suppressed for 800ms after speech ends so room reverberation isn't captured
    aiSpeakingUntilRef.current = Date.now() + 800;
  };

  /**
   * Fallback Web Speech Synthesis if ElevenLabs audio buffer is unavailable
   */
  const fallbackToWebSpeech = (text) => {
    if (isAiVoiceMutedRef.current || !window.speechSynthesis) {
      finishAiSpeech();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny'))) ||
          v.lang.startsWith('en')
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        setIsAiSpeaking(true);
        isAiSpeakingRef.current = true;
      };
      utterance.onend = () => finishAiSpeech();
      utterance.onerror = () => finishAiSpeech();

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[LiveCallModal] Web speech synthesis fallback error:', e);
      finishAiSpeech();
    }
  };

  /**
   * Play AI Voice: Prefers ultra-realistic ElevenLabs audio, with echo cancellation
   */
  const playAiVoice = (data) => {
    if (isAiVoiceMutedRef.current || !data?.text) return;

    const text = data.text.trim();
    const now = Date.now();

    // 1. Deduplicate identical voice playback within 4 seconds
    if (
      lastPlayedRef.current.text.toLowerCase() === text.toLowerCase() &&
      now - lastPlayedRef.current.timestamp < 4000
    ) {
      console.log('[LiveCallModal] Suppressed duplicate speech playback:', text);
      return;
    }
    lastPlayedRef.current = { text, timestamp: now };
    lastAiTextRef.current = text;

    // 2. Stop any currently playing audio immediately so utterances never overlap
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 3. Mark AI as speaking and set provisional echo-suppression window
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;
    aiSpeakingUntilRef.current = now + 20000; // Safeguard until onended updates it

    // 4. If ElevenLabs audio is provided (base64 or URL)
    if (data.audioBase64 || data.audioUrl) {
      setVoiceProvider('elevenlabs');
      try {
        const audioSrc = data.audioBase64
          ? `data:audio/mp3;base64,${data.audioBase64}`
          : data.audioUrl.startsWith('http')
          ? data.audioUrl
          : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${data.audioUrl}`;

        const audio = new Audio(audioSrc);
        activeAudioRef.current = audio;

        audio.onended = () => {
          finishAiSpeech();
        };

        audio.onerror = (e) => {
          console.warn('[LiveCallModal] ElevenLabs audio playback error, falling back:', e);
          fallbackToWebSpeech(text);
        };

        audio.play().catch((err) => {
          console.warn('[LiveCallModal] Audio auto-play blocked or failed, using fallback:', err);
          fallbackToWebSpeech(text);
        });
        return;
      } catch (err) {
        console.warn('[LiveCallModal] Failed to construct Audio, using fallback:', err);
      }
    }

    // 5. Fallback to Web Speech if ElevenLabs key is not yet set
    setVoiceProvider('browser');
    fallbackToWebSpeech(text);
  };

  const playAiVoiceRef = useRef(playAiVoice);
  playAiVoiceRef.current = playAiVoice;

  // Web Speech Recognition (Microphone Speech-to-Text with Acoustic Echo Cancellation)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListeningMic(true);
    };

    recognition.onresult = (event) => {
      // 1. CRITICAL ANTI-LOOP FILTER:
      // If AI is currently speaking or in post-speech echo cooldown, DROP input completely!
      if (isAiSpeakingRef.current || Date.now() < aiSpeakingUntilRef.current) {
        console.log('[LiveCallModal] Muted mic input because AI is speaking (acoustic feedback prevented)');
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        const cleanFinal = finalTranscript.trim();

        // 2. ACOUSTIC ECHO FILTER:
        // If mic captured what the AI just spoke, drop it!
        if (isAcousticEchoOfAi(cleanFinal, lastAiTextRef.current)) {
          console.log('[LiveCallModal] Dropped acoustic echo matching recent AI speech:', cleanFinal);
          return;
        }

        if (cleanFinal) {
          setInputText('');
          if (window.__talkpilotSocket && window.__talkpilotCallId) {
            window.__talkpilotSocket.emit('call:message', {
              callId: window.__talkpilotCallId,
              text: cleanFinal
            });
          }
        }
      } else if (interimTranscript) {
        if (!isAiSpeakingRef.current && Date.now() >= aiSpeakingUntilRef.current) {
          setInputText(interimTranscript);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
      }
      setIsListeningMic(false);
    };

    recognition.onend = () => {
      setIsListeningMic(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const toggleMicListening = () => {
    if (!recognitionRef.current) return;
    if (isListeningMic) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListeningMic(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningMic(true);
      } catch (e) {
        console.warn('Error starting speech recognition:', e);
      }
    }
  };

  // Socket listener for live transcript, status, AI speak & thinking events
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!socket || !callId) return;

    window.__talkpilotSocket = socket;
    window.__talkpilotCallId = callId;

    socket.emit('join:call', callId);

    const handleStatus = (data) => {
      if (data.callId === callId) {
        setStatus(data.status);
        if (data.message) setStatusMsg(data.message);
        if (data.error) setErrorMessage(data.error);
      }
    };

    const handleTranscript = (data) => {
      if (data.callId === callId && data.message) {
        setMessages((prev) => {
          const newMsg = data.message;
          const newId = newMsg._id || newMsg.id;

          // Deduplicate by message ID
          if (newId && prev.some((m) => (m._id || m.id) === newId)) {
            return prev;
          }

          // Deduplicate by speaker + content within 3 seconds
          const isDuplicate = prev.some((m) => {
            if (m.speaker !== newMsg.speaker) return false;
            if ((m.text || '').trim() !== (newMsg.text || '').trim()) return false;
            const t1 = new Date(m.timestamp || 0).getTime();
            const t2 = new Date(newMsg.timestamp || 0).getTime();
            if (t1 && t2 && Math.abs(t1 - t2) < 3000) return true;
            return false;
          });

          if (isDuplicate) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const handleAiSpeak = (data) => {
      if (data.callId === callId && data.text && playAiVoiceRef.current) {
        playAiVoiceRef.current(data);
      }
    };

    const handleAiThinking = (data) => {
      if (data.callId === callId) {
        setIsAiThinking(!!data.isThinking);
      }
    };

    const handleCallEnded = (data) => {
      if (data.callId === callId) {
        setStatus(data.status || 'Completed');
        setStatusMsg('Call session concluded');
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        setIsAiThinking(false);
      }
    };

    const handleCallError = (data) => {
      if (data.callId === callId) {
        setStatus('Failed');
        setErrorMessage(data.message || 'Call failed');
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
      }
    };

    socket.on('call:status', handleStatus);
    socket.on('call:transcript', handleTranscript);
    socket.on('call:ai_speak', handleAiSpeak);
    socket.on('call:ai_thinking', handleAiThinking);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:error', handleCallError);

    return () => {
      socket.emit('leave:call', callId);
      socket.off('call:status', handleStatus);
      socket.off('call:transcript', handleTranscript);
      socket.off('call:ai_speak', handleAiSpeak);
      socket.off('call:ai_thinking', handleAiThinking);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:error', handleCallError);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      window.__talkpilotSocket = null;
      window.__talkpilotCallId = null;
    };
  }, [socket, callId]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  const lastSentTextRef = useRef({ text: '', timestamp: 0 });

  // Send message from user to AI
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // Prevent duplicate sending of identical text within 2 seconds
    const now = Date.now();
    if (
      lastSentTextRef.current.text.toLowerCase() === text.toLowerCase() &&
      now - lastSentTextRef.current.timestamp < 2000
    ) {
      return;
    }
    lastSentTextRef.current = { text, timestamp: now };

    setInputText('');

    if (socket && socket.connected) {
      socket.emit('call:message', { callId, text });
    } else {
      try {
        await api.post(`/calls/${callId}/message`, { text });
      } catch (err) {
        console.error('Error sending call message:', err);
      }
    }
  };

  const handleEndCall = async () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;

    if (socket && socket.connected) {
      socket.emit('call:end', { callId });
    } else {
      try {
        await api.post(`/calls/${callId}/end`);
      } catch (err) {
        console.error('Error ending call:', err);
      }
    }
    setStatus('Completed');
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callId) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-2xl rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-2xl">
        {/* Header Bar */}
        <div className="bg-[#171819]/90 px-5 sm:px-6 py-3.5 border-b border-[#AD8A62]/15 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'Failed'
                  ? 'bg-[#E2847A]'
                  : status === 'Completed'
                  ? 'bg-[#85C09B]'
                  : 'bg-[#AD8A62] animate-ping'
              }`}
            />
            <div>
              <h3 className="font-bold text-[#F1F0ED] text-sm sm:text-base flex items-center gap-2">
                TalkPilot Live Call
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#AD8A62]/15 text-[#C5A47E] border border-[#AD8A62]/30">
                  {campaignBadgeName}
                </span>
                {voiceProvider === 'elevenlabs' && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#292B2D] text-[#C3C2BE] border border-[#C3C2BE]/20">
                    <Headphones className="w-2.5 h-2.5 text-[#AD8A62]" /> ElevenLabs Voice
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAiVoiceMuted(!isAiVoiceMuted)}
              className="p-1.5 rounded-lg bg-[#242628] text-[#C3C2BE] hover:text-[#F1F0ED] transition-all text-xs flex items-center gap-1.5 border border-[#C3C2BE]/10"
              title={isAiVoiceMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            >
              {isAiVoiceMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#E2847A]" />
                  <span className="text-[11px] hidden sm:inline">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#C5A47E]" />
                  <span className="text-[11px] hidden sm:inline">Voice On</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-1.5 bg-[#242628]/90 px-3 py-1 rounded-full text-xs text-[#C5A47E] border border-[#AD8A62]/30">
              <Clock className="w-3.5 h-3.5 text-[#AD8A62]" />
              <span className="font-mono font-bold">{formatSeconds(duration)}</span>
            </div>
          </div>
        </div>

        {/* Call Info Bar */}
        <div className="px-5 sm:px-6 py-3 bg-[#202224]/80 border-b border-[#C3C2BE]/10 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] text-[#8A8983] font-medium uppercase tracking-wider block">AI Agent</span>
            <span className="text-xs sm:text-sm font-semibold text-[#F1F0ED] flex items-center gap-1.5 mt-0.5 truncate">
              <Bot className="w-3.5 h-3.5 text-[#C5A47E] flex-shrink-0" />
              {agentDisplayName}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#8A8983] font-medium uppercase tracking-wider block">Contact / Recipient</span>
            <span className="text-xs sm:text-sm font-semibold text-[#F1F0ED] flex items-center gap-1.5 mt-0.5 truncate">
              <User className="w-3.5 h-3.5 text-[#C3C2BE] flex-shrink-0" />
              {callData?.contactId?.name || 'Contact'}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-[#8A8983] font-medium uppercase tracking-wider block">Target Phone / Email</span>
            <span className="text-xs font-mono font-medium text-[#C3C2BE] mt-0.5 truncate block">
              {callData?.contactId?.email || callData?.phone || '+91 XXXXX XXXXX'}
            </span>
          </div>
        </div>

        {/* Status Indicator & Live Audio Waveform */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#171819]/80 flex items-center justify-between border-b border-[#C3C2BE]/10">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                status === 'Failed'
                  ? 'bg-[#C05E54]/20 text-[#E2847A] border border-[#C05E54]/40'
                  : status === 'Completed'
                  ? 'bg-[#689F7D]/20 text-[#85C09B] border border-[#689F7D]/40'
                  : status === 'Ringing' || status === 'Initiating'
                  ? 'bg-[#AD8A62]/20 text-[#C5A47E] border border-[#AD8A62]/40 animate-pulse'
                  : 'bg-[#AD8A62]/20 text-[#C5A47E] border border-[#AD8A62]/40'
              }`}
            >
              ● {status}
            </span>
            <span className="text-xs text-[#A1A09B] truncate max-w-xs">{statusMsg}</span>
          </div>

          {/* Dynamic Audio Waves when Speaking */}
          {(status === 'Connected' || status === 'In Progress') && (
            <div className="flex items-center space-x-1.5">
              {isAiSpeaking ? (
                <div className="flex items-center space-x-1 h-5 px-2.5 py-0.5 rounded-md bg-[#242628] border border-[#AD8A62]/40 shadow-sm shadow-[#AD8A62]/10">
                  <span className="text-[10px] text-[#C5A47E] font-semibold mr-1 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#AD8A62] animate-pulse" /> AI Voice Speaking
                  </span>
                  <span className="w-1 bg-[#C5A47E] rounded-full animate-wave h-full" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1 bg-[#AD8A62] rounded-full animate-wave h-full" style={{ animationDelay: '0.3s' }}></span>
                  <span className="w-1 bg-[#C3C2BE] rounded-full animate-wave h-full" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1 bg-[#AD8A62] rounded-full animate-wave h-full" style={{ animationDelay: '0.4s' }}></span>
                </div>
              ) : isListeningMic ? (
                <div className="flex items-center space-x-1 h-5 px-2 py-0.5 rounded-md bg-[#242628] border border-[#C3C2BE]/30">
                  <span className="text-[10px] text-[#C3C2BE] font-medium mr-1 flex items-center gap-1">
                    <Mic className="w-3 h-3 text-[#C5A47E] animate-bounce" /> Listening
                  </span>
                  <span className="w-1 bg-[#AD8A62] rounded-full animate-wave h-full" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1 bg-[#C3C2BE] rounded-full animate-wave h-full" style={{ animationDelay: '0.3s' }}></span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Error Details Box if Call Failed */}
        {status === 'Failed' && (
          <div className="p-4 bg-[#C05E54]/15 border-b border-[#C05E54]/30 text-[#E2847A] text-xs flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-[#E2847A] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm">Call Failed</span>
              <p className="font-mono mt-0.5">{errorMessage || callData?.lastError || 'Call connection failed.'}</p>
            </div>
          </div>
        )}

        {/* Live Streaming Transcript */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 min-h-[260px] bg-[#141516]/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#8A8983] space-y-3 py-10">
              <Building2 className="w-10 h-10 text-[#AD8A62] animate-pulse" />
              <p className="text-xs sm:text-sm text-center max-w-sm text-[#A1A09B]">
                {status === 'Ringing'
                  ? 'Connecting with recipient dashboard... AI is waiting for recipient to answer.'
                  : status === 'Failed'
                  ? 'Call did not connect.'
                  : 'Call session active. Waiting for audio exchange...'}
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={msg._id || msg.id || `${msg.speaker}-${idx}-${msg.timestamp}`}
                className={`flex flex-col ${
                  msg.speaker === 'AI' ? 'items-start' : 'items-end'
                } animate-in fade-in duration-200`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="text-[11px] font-bold text-[#A1A09B] flex items-center gap-1">
                    {msg.speaker === 'AI' ? (
                      <>
                        <Bot className="w-3 h-3 text-[#C5A47E]" /> {agentDisplayName}
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3 text-[#C3C2BE]" /> You / Contact
                      </>
                    )}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.speaker === 'AI'
                      ? 'bg-[#242628]/95 border border-[#AD8A62]/30 text-[#F1F0ED] rounded-tl-none'
                      : 'bg-[#2B2724]/95 border border-[#C5A47E]/40 text-[#F1F0ED] rounded-tr-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}

          {/* AI Thinking Animation */}
          {isAiThinking && (
            <div className="flex items-center space-x-2 text-[#C5A47E] text-xs py-1">
              <Bot className="w-3.5 h-3.5 animate-spin text-[#AD8A62]" />
              <span className="animate-pulse">{agentDisplayName} is formulating custom AI response...</span>
            </div>
          )}

          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Suggestion Chips (when call is active) */}
        {(status === 'Connected' || status === 'In Progress') && (
          <div className="px-4 py-2 bg-[#171819]/90 border-t border-[#C3C2BE]/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-[#A1A09B] uppercase font-bold flex-shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#C5A47E]" /> Quick Reply:
            </span>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#242628] hover:bg-[#AD8A62]/20 hover:text-[#F1F0ED] text-[#C3C2BE] border border-[#C3C2BE]/10 hover:border-[#AD8A62]/40 transition-all flex-shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Interactive Input Bar (Microphone & Chat Box) */}
        {(status === 'Connected' || status === 'In Progress') && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#1C1E20] border-t border-[#C3C2BE]/10 flex items-center gap-2"
          >
            {/* Microphone Button for Voice Input */}
            <button
              type="button"
              onClick={toggleMicListening}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${
                isListeningMic
                  ? 'bg-[#AD8A62] text-[#121314] border-[#C5A47E] shadow-bronze-md animate-pulse'
                  : 'bg-[#242628] text-[#C3C2BE] hover:text-[#F1F0ED] hover:bg-[#2D3032] border-[#C3C2BE]/10'
              }`}
              title={
                !micSupported
                  ? 'Speech recognition not supported in this browser. Use text input instead.'
                  : isListeningMic
                  ? 'Click to stop listening'
                  : 'Speak into microphone'
              }
            >
              {isListeningMic ? <Mic className="w-4 h-4 font-bold" /> : <MicOff className="w-4 h-4" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={isListeningMic ? 'Listening to your voice...' : `Type your custom reply to ${agentDisplayName}... (or tap mic)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2 bg-[#141516] border border-[#C3C2BE]/15 rounded-xl text-xs sm:text-sm text-[#F1F0ED] placeholder-[#6E6E6C] focus:outline-none focus:border-[#AD8A62] focus:ring-1 focus:ring-[#AD8A62]/30"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl btn-bronze disabled:opacity-40 text-[#121314] transition-all flex items-center justify-center shadow-bronze-sm"
              title="Send reply"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Footer Controls */}
        <div className="p-4 bg-[#171819] border-t border-[#C3C2BE]/10 flex items-center justify-between">
          <div className="text-[11px] text-[#A1A09B]">
            {status === 'Connected' || status === 'In Progress' ? (
              <span className="flex items-center gap-1.5 text-[#C5A47E]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#85C09B]" /> Two-way live voice & custom AI conversation active
              </span>
            ) : status === 'Completed' ? (
              <span className="text-[#85C09B]">Call session concluded successfully.</span>
            ) : (
              <span className="text-[#A1A09B]">Call status: {status}</span>
            )}
          </div>

          {status === 'Completed' ||
          status === 'Failed' ||
          status === 'Opted Out' ||
          status === 'No Answer' ||
          status === 'Busy' ||
          status === 'Cancelled' ? (
            <button
              onClick={onClose}
              className="px-6 py-2 btn-bronze text-xs font-semibold rounded-xl transition-all shadow-bronze-sm"
            >
              Close Window
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="flex items-center space-x-2 px-5 py-2 bg-[#C05E54]/20 hover:bg-[#C05E54]/30 text-[#E2847A] text-xs font-bold rounded-xl border border-[#C05E54]/40 shadow-md transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCallModal;
