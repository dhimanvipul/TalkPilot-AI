import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const getServerUrl = () => {
  if (process.env.REACT_APP_SERVER_URL) return process.env.REACT_APP_SERVER_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const userId = (user?.id || user?._id || '').toString();
  const userEmail = (user?.email || '').toLowerCase().trim();

  useEffect(() => {
    if (userId) {
      const serverUrl = getServerUrl();
      const newSocket = io(serverUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        console.log('[SocketContext] Connected to Socket.IO server:', newSocket.id);
        newSocket.emit('join:user', {
          userId,
          email: userEmail
        });
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        socketRef.current = null;
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
    }
  }, [userId, userEmail]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
