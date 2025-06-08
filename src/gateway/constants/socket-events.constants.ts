// WebSocket event constants for the channels gateway
export const SOCKET_EVENTS = {
  // Global channel events
  CHANNELS_UPDATE: 'channels:update', 
  CHANNEL_UPDATE: 'channel:update',
  CHANNELS_USER_COUNTS: 'channels:userCounts',
  
  // Channel management events
  JOIN_CHANNEL: 'join-channel',
  LEAVE_CHANNEL: 'leave-channel',
  CHANNEL_JOINED: 'channel-joined',
  CHANNEL_JOIN_ERROR: 'channel-join-error',
  
  // User events in channels
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  
  // Message events
  CHANNEL_MESSAGE: 'channel-message',
  
  // LiveKit events
  REQUEST_LIVEKIT_TOKEN: 'request:livekit-token',
  LIVEKIT_TOKEN: 'livekit:token',
  
  // Channel data
  CHANNEL_DATA: 'channel:data',
  
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
} as const;

// Type for socket event names
export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
