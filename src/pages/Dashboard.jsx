import React from 'react';
import ChartContainer from '../components/ChartContainer';

const Dashboard = ({ selectedDevice }) => {
  return (
    <div className="flex-1 p-4">
      {selectedDevice ? (
        <>
          <h1 className="text-lg font-bold mb-4">Device: {selectedDevice}</h1>
          <ChartContainer device_id={selectedDevice} />
        </>
      ) : (
        <p className="text-gray-400">Please select a device from the sidebar</p>
      )}
    </div>
  );
};

export default Dashboard;
