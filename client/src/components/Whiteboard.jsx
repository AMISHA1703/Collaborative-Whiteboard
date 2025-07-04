import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import UserCursors from './UserCursors';
import { getSocket } from '../socket.js';

const channel = new BroadcastChannel('whiteboard-sync');

const Whiteboard = () => {
  const { roomId } = useParams();
  const [userCount, setUserCount] = useState(1);
  const [color, setColor] = useState('black');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [tool, setTool] = useState('pencil');

  const socketRef = useRef(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    socketRef.current = getSocket();

    if (roomId && !hasJoinedRef.current) {
      socketRef.current.emit('join-room', roomId);
      hasJoinedRef.current = true;
    }

    const handleUserCount = (count) => setUserCount(count);
    socketRef.current.on('user-count', handleUserCount);

    return () => {
      socketRef.current.off('user-count', handleUserCount);
    };
  }, [roomId]);

  const handleClearCanvas = () => {
    socketRef.current.emit('clear-canvas', { roomId });
    channel.postMessage({ type: 'clear-canvas' });
  };

  useEffect(() => {
    channel.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'color-change') setColor(data.color);
      if (type === 'stroke-change') setStrokeWidth(data.strokeWidth);
      if (type === 'tool-change') setTool(data.tool);
      if (type === 'clear-canvas') {
        socketRef.current.emit('clear-canvas', { roomId });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-gray-100">
      <div className="w-full p-4 bg-gray-300 flex items-center justify-between shadow-md text-center">
        <h1 className="text-xl text-blue-950 font-semibold">
          RoomId: <span className="text-gray-500">{roomId}</span>
        </h1>
        <p className="text-sm text-gray-700">Active users: {userCount}</p>
      </div>

      <Toolbar
        color={color}
        setColor={(c) => {
          setColor(c);
          channel.postMessage({ type: 'color-change', data: { color: c } });
        }}
        strokeWidth={strokeWidth}
        setStrokeWidth={(w) => {
          setStrokeWidth(w);
          channel.postMessage({ type: 'stroke-change', data: { strokeWidth: w } });
        }}
        onClear={handleClearCanvas}
        tool={tool}
        setTool={(t) => {
          setTool(t);
          channel.postMessage({ type: 'tool-change', data: { tool: t } });
        }}
      />

      <div className="relative w-full h-full overflow-hidden">
        <DrawingCanvas
          socket={socketRef.current}
          roomId={roomId}
          color={color}
          strokeWidth={strokeWidth}
          tool={tool}
        />
        <UserCursors socket={socketRef.current} roomId={roomId} />
      </div>
    </div>
  );
};

export default Whiteboard;