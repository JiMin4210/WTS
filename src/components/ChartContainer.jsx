import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { registerMessageHandler } from '../api/websocket';
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
  
    useEffect(() => {
      // WebSocket 메시지 핸들러 등록
      registerMessageHandler((message) => {
        if (message.action === 'data' && message.device_id === device_id) {
          setChartData((prevData) => {
            // 중복 검사: 동일한 time 값이 있는지 확인
            const isDuplicate = prevData.some((data) => data.time === message.timestamp);
  
            if (isDuplicate) {
              console.warn('Duplicate data detected:', message.timestamp);
              return prevData; // 중복이면 기존 데이터 반환
            }
  
            // 새로운 데이터 추가 및 최대 50개 유지
            const newData = [
              ...prevData,
              { time: message.timestamp, value: Number(message.cnt) },
            ];
  
            // 최신 50개 데이터만 유지
            return newData.slice(-50);
          });
        }
      });
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
