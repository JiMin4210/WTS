// src/queries.ts

// ✅ 내 userId(sub) 확인용 (Phase 3에서 만들었던 me)
export const Q_ME = /* GraphQL */ `
  query Me {
    me
  }
`;

// ✅ 좌측 디바이스 목록 (닉네임만 UI에 표시)
export const Q_LIST_MY_DEVICES = /* GraphQL */ `
  query ListMyDevices {
    listMyDevices {
      deviceId
      nickname
    }
  }
`;

// ✅ 일/월/연 (다음 페이즈에서 UI와 연결)
export const Q_DAILY = /* GraphQL */ `
  query Daily($deviceId: String!, $date: String!) {
    getDailySeries(deviceId: $deviceId, date: $date) {
      x
      y
    }
  }
`;

export const Q_MONTHLY = /* GraphQL */ `
  query Monthly($deviceId: String!, $yearMonth: String!) {
    getMonthlySeries(deviceId: $deviceId, yearMonth: $yearMonth) {
      x
      y
    }
  }
`;

export const Q_YEARLY = /* GraphQL */ `
  query Yearly($deviceId: String!, $year: String!) {
    getYearlySeries(deviceId: $deviceId, year: $year) {
      x
      y
    }
  }
`;

export const Q_REGISTER_DEVICE = /* GraphQL */ `
  mutation RegisterDevice($deviceId: String!, $nickname: String!) {
    registerDevice(deviceId: $deviceId, nickname: $nickname) {
      deviceId
      nickname
    }
  }
`;

export const Q_REMOVE_DEVICE = /* GraphQL */ `
  mutation RemoveDevice($deviceId: String!) {
    removeDevice(deviceId: $deviceId)
  }
`;

// ✅ 선택된 디바이스의 마지막 수신 시간(온라인/오프라인 판단용)
// (B버전: 목록 전체가 아니라 "선택된 1대"만 조회)
export const Q_GET_DEVICE_LAST = /* GraphQL */ `
  query GetDeviceLast($deviceId: String!) {
    getDeviceLast(deviceId: $deviceId) {
      deviceId
      lastServerTs
      lastTotal
      lastReason
    }
  }
`;

export const Q_ADMIN_LIST_DEVICE_LAST = /* GraphQL */ `
  query AdminListDeviceLast($limit: Int) {
    adminListDeviceLast(limit: $limit) {
      deviceId
      lastTotal
      lastServerTs
      lastReason
      lastDelta
      boot
      seq
      swVersion
      plcHex
      espHex
    }
  }
`;
