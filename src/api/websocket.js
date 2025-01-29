import { parseDynamoData } from '../utils/parseDynamoData';

const WEBSOCKET_URL = 'wss://jtqf97fp7j.execute-api.ap-northeast-2.amazonaws.com/production/';

let socket;
let messageHandlers = [];
let messageQueue = [];

// WebSocket 연결 함수
export const connectWebSocket = (login_id) => {
  socket = new WebSocket(WEBSOCKET_URL);

  socket.onopen = () => {
    console.log('WebSocket connected');
    socket.send(JSON.stringify({ action: 'login', login_id }));
  };

  socket.onmessage = (event) => {
    let rawMessage;
    try {
      rawMessage = JSON.parse(event.data); // JSON 파싱
    } catch (error) {
      console.error('Invalid JSON received:', event.data);
      return;
    }
    console.log('Message recv:', rawMessage);
    // 메시지의 action 값에 따라 처리
    switch (rawMessage.action) {
      case 'login':
        // 로그인 응답 처리
        messageHandlers.forEach((handler) => handler(rawMessage));
        break;
      case 'data':
        // 데이터 업데이트 처리 (DynamoDB 형식 파싱)
        const parsedMessage = parseDynamoData(rawMessage);
        if (parsedMessage) {
          messageHandlers.forEach((handler) => handler(parsedMessage));
        }
        break;
      default:
        console.warn('Unknown action:', rawMessage.action);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket disconnected');
  };
};

// WebSocket 메시지 핸들러 등록
export const registerMessageHandler = (handler) => {
  if (!messageHandlers.some((h) => h.toString() === handler.toString())) {
    messageHandlers.push(handler);
    console.log('Registering handler:', handler.toString());
  } else {
    console.warn('Duplicate handler detected, skipping registration.');
  }
};

// ✅ 특정 핸들러를 제거하는 함수 추가
export const unregisterMessageHandler = (handler) => {
  console.log('Unregistering handler:', handler.toString());
  messageHandlers = messageHandlers.filter(h => h !== handler);
};