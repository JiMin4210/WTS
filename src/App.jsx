import React, { useState, useEffect } from 'react';
import { connectWebSocket } from './api/websocket';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

const App = () => {
  const [selectedDevice, setSelectedDevice] = useState(null); // 선택된 디바이스

  useEffect(() => {
    const login_id = 'jimin'; // 사용자 로그인 ID
    connectWebSocket(login_id); // WebSocket 연결
  }, []);

  return (
    <div className="flex">
      {/* 항상 고정된 사이드바 */}
      <Sidebar onSelectDevice={(device) => setSelectedDevice(device)} />
      
      {/* 선택된 디바이스를 기반으로 대시보드 업데이트 */}
      <Dashboard selectedDevice={selectedDevice} />
    </div>
  );
};

export default App;
