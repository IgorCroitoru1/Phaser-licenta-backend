// import {
//   Injectable,
//   Logger,
//   OnModuleInit,
//   OnModuleDestroy,
// } from '@nestjs/common';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import { GameService, ChannelLiveData } from './game.service';
// import {
//   CHANNEL_EVENTS,
//   AllChannelsUpdateEvent,
//   ChannelUpdateEvent,
// } from './events/channel.events';

// @Injectable()
// export class GameBroadcastService implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(GameBroadcastService.name);
//   private broadcastInterval: NodeJS.Timeout;
//   private lastChannelsData: ChannelLiveData[] = [];
//   private hasInitialBroadcast = false; // Track if we've done the initial broadcast
//   private readonly BROADCAST_INTERVAL = 2000; // Check every 2 seconds
//   constructor(
//     private readonly gameService: GameService,
//     private readonly eventEmitter: EventEmitter2,
//   ) {}

//   onModuleInit() {
//     this.logger.log('Starting channel broadcast service...');
//     this.startBroadcastLoop();
//   }

//   onModuleDestroy() {
//     this.logger.log('Stopping channel broadcast service...');
//     this.stopBroadcastLoop();
//   }

//   private startBroadcastLoop() {
//     this.broadcastInterval = setInterval(async () => {
//       try {
//         await this.checkAndBroadcastChanges();
//       } catch (error) {
//         this.logger.error('Error in broadcast loop:', error);
//       }
//     }, this.BROADCAST_INTERVAL);
//   }

//   private stopBroadcastLoop() {
//     if (this.broadcastInterval) {
//       clearInterval(this.broadcastInterval);
//     }
//   }
//   private async checkAndBroadcastChanges() {
//     try {
//       const currentChannelsData = await this.gameService.getChannelsLiveData();

//       // Check if there are any changes
//       if (this.hasChannelsChanged(currentChannelsData)) {
//         this.logger.debug(
//           `Channel data changed: ${this.lastChannelsData.length} -> ${currentChannelsData.length} channels`,
//         );
//         this.eventEmitter.emit(
//           CHANNEL_EVENTS.ALL_CHANNELS_UPDATE,
//           new AllChannelsUpdateEvent(),
//         );
//         this.lastChannelsData = [...currentChannelsData];
//       }
//     } catch (error) {
//       this.logger.error('Failed to check/broadcast channel changes:', error);
//     }
//   }
//   private hasChannelsChanged(newData: ChannelLiveData[]): boolean {
//     // First run - only broadcast if we have actual data OR if we've never broadcasted before
//     if (!this.hasInitialBroadcast) {
//       this.hasInitialBroadcast = true;
//       // Only broadcast on first run if we have data to share
//       return newData.length > 0;
//     }

//     // If we previously had data but now have none, broadcast the change
//     if (this.lastChannelsData.length > 0 && newData.length === 0) {
//       return true;
//     }

//     // If we had no data but now have some, broadcast the change
//     if (this.lastChannelsData.length === 0 && newData.length > 0) {
//       return true;
//     }

//     // Different number of channels (both non-zero)
//     if (newData.length !== this.lastChannelsData.length) {
//       return true;
//     }

//     // Check each channel for changes (only if we have data)
//     if (newData.length > 0) {
//       for (const newChannel of newData) {
//         const oldChannel = this.lastChannelsData.find(
//           (old) => old.channelId === newChannel.channelId,
//         );

//         if (!oldChannel) {
//           return true; // New channel
//         }

//         // Check if any values changed
//         if (
//           oldChannel.clientsCount !== newChannel.clientsCount ||
//           oldChannel.roomsCount !== newChannel.roomsCount ||
//           oldChannel.isActive !== newChannel.isActive
//         ) {
//           return true;
//         }
//       }
//     }

//     return false;
//   }
//   /**
//    * Manually trigger a broadcast for a specific channel
//    */
//   async triggerChannelBroadcast(channelId: string): Promise<void> {
//     try {
//       this.eventEmitter.emit(
//         CHANNEL_EVENTS.CHANNEL_UPDATE,
//         new ChannelUpdateEvent(channelId),
//       );
//       this.logger.debug(
//         `Manually triggered broadcast for channel: ${channelId}`,
//       );
//     } catch (error) {
//       this.logger.error(
//         `Failed to trigger broadcast for channel ${channelId}:`,
//         error,
//       );
//     }
//   }
//   /**
//    * Manually trigger a broadcast for all channels
//    */
//   async triggerAllChannelsBroadcast(): Promise<void> {
//     try {
//       this.eventEmitter.emit(
//         CHANNEL_EVENTS.ALL_CHANNELS_UPDATE,
//         new AllChannelsUpdateEvent(),
//       );
//       this.logger.debug('Manually triggered broadcast for all channels');
//     } catch (error) {
//       this.logger.error('Failed to trigger broadcast for all channels:', error);
//     }
//   }

//   /**
//    * Reset the broadcast state - useful for testing or when you want to force next check to broadcast
//    */
//   resetBroadcastState(): void {
//     this.hasInitialBroadcast = false;
//     this.lastChannelsData = [];
//     this.logger.debug('Broadcast state has been reset');
//   }

//   /**
//    * Get current broadcast statistics
//    */
//   getBroadcastStats(): {
//     hasInitialBroadcast: boolean;
//     lastChannelsCount: number;
//   } {
//     return {
//       hasInitialBroadcast: this.hasInitialBroadcast,
//       lastChannelsCount: this.lastChannelsData.length,
//     };
//   }
// }
