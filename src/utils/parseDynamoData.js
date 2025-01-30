export const parseDynamoData = (data) => {
    if (!data || typeof data !== 'object') return null;
  
    return {
      action: data.action || null,
      device_id: data.device_id?.S || null,
      on_time: data.on_time?.S ? Number(data.on_time.S) : null,
      cnt: data.cnt?.S ? Number(data.cnt.S) : null,
      timestamp: data.timestamp?.S || null,
    };
  };
  