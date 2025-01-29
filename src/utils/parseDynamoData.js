export const parseDynamoData = (data) => {
    if (!data || typeof data !== 'object') return null;
  
    return {
      action: data.action || null,
      device_id: data.device_id?.S || null,
      on_time: data.on_time?.N ? Number(data.on_time.N) : null,
      cnt: data.cnt?.N ? Number(data.cnt.N) : null,
      timestamp: data.timestamp?.S || null,
    };
  };
  