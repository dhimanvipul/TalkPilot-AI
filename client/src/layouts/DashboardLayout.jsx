import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import IncomingCallModal from '../components/IncomingCallModal';
import LiveCallModal from '../components/LiveCallModal';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();

  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallId, setActiveCallId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data) => {
      console.log('[DashboardLayout] Received call:incoming:', data);
      setIncomingCall(data);
    };

    const handleBroadcast = (data) => {
      const myEmail = (user?.email || '').toLowerCase().trim();
      const myId = (user?.id || user?._id || '').toString();
      if (
        (data.targetEmail && data.targetEmail === myEmail) ||
        (data.targetUserId && data.targetUserId === myId)
      ) {
        console.log('[DashboardLayout] Received matching call:incoming_broadcast:', data);
        setIncomingCall(data);
      }
    };

    const handleCallEnded = (data) => {
      if (incomingCall && data.callId === incomingCall.callId) {
        setIncomingCall(null);
      }
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:incoming_broadcast', handleBroadcast);
    socket.on('call:ended', handleCallEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:incoming_broadcast', handleBroadcast);
      socket.off('call:ended', handleCallEnded);
    };
  }, [socket, user, incomingCall]);

  const handleAcceptCall = async (callId) => {
    setIncomingCall(null);
    setActiveCallId(callId);

    if (socket && socket.connected) {
      socket.emit('call:accept', { callId });
    } else {
      try {
        await api.post(`/calls/${callId}/accept`);
      } catch (err) {
        console.error('Error accepting call via API:', err);
      }
    }
  };

  const handleDeclineCall = async (callId) => {
    setIncomingCall(null);

    if (socket && socket.connected) {
      socket.emit('call:decline', { callId, reason: 'Declined by recipient' });
    } else {
      try {
        await api.post(`/calls/${callId}/decline`, { reason: 'Declined by recipient' });
      } catch (err) {
        console.error('Error declining call via API:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#171819] ambient-bg flex flex-col lg:flex-row text-[#C3C2BE] relative selection:bg-[#AD8A62]/30 selection:text-[#F1F0ED]">
      {/* Subtle Metallic Bronze Ambient Glow Reflections */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#AD8A62]/[0.03] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-1/3 w-[600px] h-[600px] bg-[#292B2D]/40 rounded-full blur-[160px] pointer-events-none -z-10" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Incoming Call Ringing Screen */}
      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Global Active Call Session Screen for Recipient */}
      {activeCallId && (
        <LiveCallModal
          callId={activeCallId}
          onClose={() => setActiveCallId(null)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
