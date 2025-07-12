import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const newSocket = io('http://localhost:5000', {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        // Join library updates room
        newSocket.emit('join-library', user.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      // Listen for real-time book status changes
      newSocket.on('book-status-changed', (data) => {
        console.log('Book status changed:', data);
        
        if (data.status === 'borrowed') {
          toast.success(`Book "${data.bookTitle}" was borrowed`, {
            duration: 3000,
          });
        } else if (data.status === 'available') {
          toast.success(`Book "${data.bookTitle}" is now available`, {
            duration: 3000,
          });
        }
        
        // You can emit custom events to update UI components
        window.dispatchEvent(new CustomEvent('bookStatusChanged', {
          detail: data
        }));
      });

      // Listen for overdue notifications
      newSocket.on('overdue-notification', (data) => {
        toast.error(`Reminder: "${data.bookTitle}" is overdue!`, {
          duration: 5000,
        });
      });

      // Listen for new book additions
      newSocket.on('new-book-added', (data) => {
        toast.success(`New book added: "${data.title}"`, {
          duration: 4000,
        });
        
        window.dispatchEvent(new CustomEvent('newBookAdded', {
          detail: data
        }));
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  // Emit book borrow event
  const emitBookBorrowed = (bookId, bookTitle, userId) => {
    if (socket && connected) {
      socket.emit('book-borrowed', {
        bookId,
        bookTitle,
        userId,
        timestamp: new Date()
      });
    }
  };

  // Emit book return event
  const emitBookReturned = (bookId, bookTitle, userId) => {
    if (socket && connected) {
      socket.emit('book-returned', {
        bookId,
        bookTitle,
        userId,
        timestamp: new Date()
      });
    }
  };

  // Send notification to specific user
  const sendNotification = (userId, message, type = 'info') => {
    if (socket && connected) {
      socket.emit('send-notification', {
        userId,
        message,
        type,
        timestamp: new Date()
      });
    }
  };

  const value = {
    socket,
    connected,
    emitBookBorrowed,
    emitBookReturned,
    sendNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
