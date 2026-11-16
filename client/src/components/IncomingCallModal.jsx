import React, { useEffect, useRef, useState } from 'react';
import { PhoneCall, PhoneOff, Volume2, VolumeX, Bot, User, Sparkles, Building2 } from 'lucide-react';

const IncomingCallModal = ({ incomingCall, onAccept, onDecline }) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const ringIntervalRef = useRef(null);

  // Play realistic browser-synthesized telephone ring tone using Web Audio API
  useEffect(() => {
    if (!incomingCall) return;

    let isSubscribed = true;

    const playRingBurst = () => {
      if (isMuted || !isSubscribed) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Standard North American telephone ring frequencies (440 Hz + 480 Hz)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gainNode.gain.setValueAtTime(0, now);
        // Fade in
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
        // Sustain for 1.8 seconds
        gainNode.gain.setValueAtTime(0.08, now + 1.8);
        // Fade out
        gainNode.gain.linearRampToValueAtTime(0.08, now + 1.95);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.0);
        osc2.stop(now + 2.0);
      } catch (err) {
        console.warn('Web Audio ring generation failed:', err);
      }
    };

    // Play immediately and repeat every 4 seconds
    playRingBurst();
    ringIntervalRef.current = setInterval(playRingBurst, 3800);

    return () => {
      isSubscribed = false;
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [incomingCall, isMuted]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    onAccept(incomingCall.callId);
  };

  const handleDecline = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    onDecline(incomingCall.callId);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#1C1E20]/95 border border-[#AD8A62]/35 w-full max-w-md rounded-3xl shadow-2xl shadow-black/80 overflow-hidden relative backdrop-blur-2xl">
        {/* Subtle Metallic Bronze Ambient Glow */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#AD8A62]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#292B2D]/40 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#171819]/90 border-b border-[#AD8A62]/15 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#AD8A62] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#AD8A62]"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A47E]">
              Incoming AI Phone Call
            </span>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg bg-[#242628] text-[#C3C2BE] hover:text-[#F1F0ED] hover:bg-[#2D3032] border border-[#C3C2BE]/10 transition-all text-xs flex items-center gap-1.5"
            title={isMuted ? 'Unmute Ringtone' : 'Mute Ringtone'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#E2847A]" /> : <Volume2 className="w-3.5 h-3.5 text-[#C5A47E]" />}
            <span className="text-[10px] font-medium">{isMuted ? 'Muted' : 'Sound'}</span>
          </button>
        </div>

        {/* Caller Center Avatar & Info */}
        <div className="p-8 text-center flex flex-col items-center">
          {/* Pulsing Metallic Avatar */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#383A3C] via-[#292B2D] to-[#1C1E20] border-2 border-[#AD8A62] flex items-center justify-center shadow-lg shadow-[#AD8A62]/20">
              <Building2 className="w-9 h-9 text-[#C5A47E]" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-[#AD8A62] animate-ping opacity-30 pointer-events-none"></div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#AD8A62]/10 border border-[#AD8A62]/30 text-[#C5A47E] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#AD8A62]" />
            {incomingCall.campaignName || incomingCall.topic || incomingCall.campaign?.name || 'Live AI Call'}
          </div>

          <h2 className="text-xl font-bold text-[#F1F0ED] tracking-tight">
            {incomingCall.caller?.name || (incomingCall.campaignName ? `${incomingCall.campaignName} Assistant` : 'TalkPilot AI')}
          </h2>
          <p className="text-xs text-[#8A8983] mt-1">
            {incomingCall.caller?.email ? `From: ${incomingCall.caller.email}` : 'Via TalkPilot Outbound Calling'}
          </p>

          {/* Info Card */}
          <div className="w-full mt-6 bg-[#202224]/80 border border-[#C3C2BE]/10 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-start justify-between text-xs">
              <span className="text-[#8A8983] font-medium flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#C5A47E]" /> AI Agent:
              </span>
              <span className="font-semibold text-[#F1F0ED]">
                {incomingCall.agent?.name || incomingCall.campaignName || 'AI Assistant'}
              </span>
            </div>

            <div className="flex items-start justify-between text-xs">
              <span className="text-[#8A8983] font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#C3C2BE]" /> Calling You As:
              </span>
              <span className="font-semibold text-[#F1F0ED]">
                {incomingCall.contact?.name || 'Recipient'}
              </span>
            </div>

            <div className="pt-2 border-t border-[#C3C2BE]/10 text-[11px] text-[#A1A09B] leading-relaxed text-center">
              {incomingCall.agent?.callObjective || (incomingCall.campaignName ? `Topic: ${incomingCall.campaignName}` : 'TalkPilot Interactive Voice Assistant')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-[#171819]/90 border-t border-[#AD8A62]/15 grid grid-cols-2 gap-4">
          <button
            onClick={handleDecline}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#242628] hover:bg-[#C05E54]/15 text-[#C3C2BE] hover:text-[#E2847A] border border-[#C3C2BE]/12 hover:border-[#C05E54]/40 font-semibold text-xs transition-all duration-200"
          >
            <PhoneOff className="w-4 h-4 text-[#E2847A]" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAccept}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl btn-bronze font-bold text-xs shadow-bronze-md transition-all duration-200"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
