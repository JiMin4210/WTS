import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-lg font-bold">Shelf Rack #01</h1>
      <div>
        {['CH1', 'CH2', 'CH3', 'CH4'].map((channel, index) => (
          <button
            key={index}
            className="mx-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            {channel}
          </button>
        ))}
      </div>
    </header>
  );
};

export default Header;
