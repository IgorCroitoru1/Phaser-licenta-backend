// Channel update events
export class ChannelUpdateEvent {
  constructor(public readonly channelId: string) {}
}

export class AllChannelsUpdateEvent {
  constructor() {}
}

// Event names as constants
export const CHANNEL_EVENTS = {
  CHANNEL_UPDATE: 'channel.update',
  ALL_CHANNELS_UPDATE: 'channels.update',
} as const;
