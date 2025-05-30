// WebSocket event constants for the channels gateway
export const SOCKET_EVENTS = {
  // Client connection events
  CHANNELS_INITIAL: 'channels:initial',
  
  // Channel update events
  CHANNELS_UPDATE: 'channels:update',
  CHANNEL_UPDATE: 'channel:update',
  
  // User statistics events
  CHANNELS_USER_COUNTS: 'channels:userCounts',
} as const;

// Type for socket event names
export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
