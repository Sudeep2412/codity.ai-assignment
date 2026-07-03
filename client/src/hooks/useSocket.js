import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export const useSocket = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    
    // Use VITE_API_URL but strip the '/api' suffix if it exists to get the root URL for WebSockets
    const backendUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
      : '';

    const newSocket = io(backendUrl || undefined, {
      auth: { token },
      path: '/socket.io'
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    // General dashboard invalidation
    newSocket.on('dashboard:update', () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    });

    // Specific queue/job invalidations
    const invalidateJobData = () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    };

    newSocket.on('job:completed', invalidateJobData);
    newSocket.on('job:started', invalidateJobData);
    newSocket.on('job:retrying', invalidateJobData);

    newSocket.on('job:failed', () => {
      invalidateJobData();
      queryClient.invalidateQueries({ queryKey: ['dlq'] });
    });

    newSocket.on('worker:heartbeat', () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [user, queryClient]);

  return socket;
};
