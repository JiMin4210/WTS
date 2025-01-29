import React, { useState, useEffect } from 'react';
import { registerMessageHandler } from '../api/websocket';
import { unregisterMessageHandler } from '../api/websocket';

const Sidebar = ({ onSelectDevice }) => {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // 핸들러 함수 정의
    const handleMessage = (message) => {
      if (message.action === 'login') {
        setDevices(message.devices); // devices 배열 업데이트
        unregisterMessageHandler(handleMessage); // ✅ 실행 후 핸들러 제거
      }
    };
  
    // WebSocket 메시지 핸들러 등록
    registerMessageHandler(handleMessage);
  }, []);

  return (
    <div className="w-64 h-screen bg-gray-800 text-white">
      <div className="text-2xl font-bold p-4 border-b border-gray-700">Dashboard</div>
      <nav className="p-4">
        {devices.length > 0 ? (
          devices.map((device) => (
            <button
              key={device}
              className="block w-full text-left py-2 px-4 hover:bg-gray-700 rounded"
              onClick={() => onSelectDevice(device)} // 선택된 device_id 전달
            >
              {device}
            </button>
          ))
        ) : (
          <p className="text-gray-400">No devices found</p>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
