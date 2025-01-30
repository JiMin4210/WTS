import React, { useState, useEffect } from 'react';
import { registerMessageHandler, unregisterMessageHandler, sendMessage } from '../api/websocket';

const Sidebar = ({ onSelectDevice }) => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newDeviceId, setNewDeviceId] = useState('');

  useEffect(() => {
    // 핸들러 함수 정의
    const handleMessage = (message) => {
      if (message.action === 'login') {
        setDevices(message.devices); // devices 배열 업데이트
      } else if (message.action === 'registration') {
        // 새로운 디바이스 추가
        setDevices((prevDevices) => [...prevDevices, message.device_id]);
      }
    };

    // WebSocket 메시지 핸들러 등록
    registerMessageHandler(handleMessage);

    return () => {
      unregisterMessageHandler(handleMessage); // ✅ 실행 후 핸들러 제거
    };
  }, []);

  // 디바이스 선택 핸들러
  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    onSelectDevice(device);
  };

  // 디바이스 추가 핸들러
  const handleAddDevice = () => {
    if (!newDeviceId.trim()) return;

    // WebSocket을 통해 새로운 디바이스 등록 요청
    sendMessage({
      action: 'registration',
      login_id: 'jimin',
      device_id: newDeviceId.trim(),
    });

    setNewDeviceId('');
  };

  return (
    <div className="w-64 h-screen bg-gray-800 text-white flex flex-col">
      <div className="text-2xl font-bold p-4 border-b border-gray-700">Dashboard</div>
      
      {/* 디바이스 목록 */}
      <nav className="p-4 flex-1 overflow-y-auto">
        {devices.length > 0 ? (
          devices.map((device) => (
            <button
              key={device}
              className={`block w-full text-left py-2 px-4 rounded transition ${
                selectedDevice === device ? 'bg-blue-500' : 'hover:bg-gray-700'
              }`}
              onClick={() => handleDeviceClick(device)}
            >
              {device}
            </button>
          ))
        ) : (
          <p className="text-gray-400">No devices found</p>
        )}
      </nav>

      {/* 디바이스 추가 입력창 */}
      <div className="p-4 border-t border-gray-700 flex">
        <input
          type="text"
          value={newDeviceId}
          onChange={(e) => setNewDeviceId(e.target.value)}
          placeholder="Enter new device ID"
          className="flex-1 p-1 bg-gray-700 text-white rounded outline-none"
        />
        <button
          onClick={handleAddDevice}
          className="ml-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
