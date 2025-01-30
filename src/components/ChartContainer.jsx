import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { registerMessageHandler, sendMessage, unregisterMessageHandler } from '../api/websocket';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend);

const ChartContainer = ({ device_id }) => {
  const [chartData, setChartData] = useState([]);

  // 📌 device_id가 변경될 때 백엔드에 "one_day_data" 요청 전송
  useEffect(() => {
    if (!device_id) return;
    sendMessage({ action: 'one_day_data', device_id });

    // 기존 데이터 초기화 (새로운 데이터 수신 대기)
    setChartData([]);

  }, [device_id]); // ✅ device_id가 변경될 때 실행

  // 📌 WebSocket 메시지 핸들러
  useEffect(() => {
    const handleMessage = (message) => {
      if (message.action === 'data' && message.device_id === device_id) {
        setChartData((prevData) => {
          const isDuplicate = prevData.some((data) => data.time === message.timestamp);

          if (isDuplicate) {
            console.warn('⚠️ Duplicate data detected:', message.timestamp);
            return prevData;
          }

          // 새로운 데이터 추가 및 최신 50개 유지
          return [...prevData, { time: message.timestamp, value: Number(message.cnt) }].slice(-50);
        });
      }
      
      // 📌 "one_day_data" 응답 처리
      if (message.action === "one_day_data" && message.device_id === device_id) {
        // 데이터가 리스트 형식으로 오기 때문에 개별 요소를 변환하여 정렬 후 저장
        const sortedData = message.data
          .map((item) => ({
            time: item.timestamp,
            value: Number(item.cnt) // ✅ Decimal 값 변환
          }))
          .sort((a, b) => new Date(a.time) - new Date(b.time)); // ✅ 시간 순 정렬

        setChartData(sortedData);
      }
    };

    // ✅ 핸들러 등록
    registerMessageHandler(handleMessage);
    
    // ✅ 컴포넌트 언마운트 시 핸들러 해제
    return () => {
      unregisterMessageHandler(handleMessage);
    };
  }, [device_id]);

  const data = {
    labels: chartData.map((d) => d.time),
    datasets: [
      {
        label: `Device: ${device_id}`,
        data: chartData.map((d) => d.value),
        borderColor: 'blue',
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="h-[400px] w-full">
      <Line data={data} options={options} />
    </div>
  );
};

export default ChartContainer;
