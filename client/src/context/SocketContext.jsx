import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const userId = (user?.id || user?._id || '').toString();
  const userEmail = (user?.email || '').toLowerCase().trim();

  useEffect(() => {
    if (userId) {
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      const newSocket = io(serverUrl, {
        transports: ['websocket', 'polling']
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
