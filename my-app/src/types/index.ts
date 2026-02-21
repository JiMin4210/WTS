export type DeviceSummary = { deviceId: string; nickname: string };
export type DeviceLast = {
  deviceId: string;
  lastServerTs: number | null;
  lastTotal?: number | null;
  lastReason?: string | null;
};
export type Point = { x: string; y: number };
export type Tab = "day" | "month" | "year";

export type DeviceEvent = {
  deviceId: string;
  eventKey: string;
  eventType: string;
  ts?: number | null;
  detail?: any;
};
