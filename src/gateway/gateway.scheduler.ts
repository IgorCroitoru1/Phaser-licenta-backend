// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { ChannelsGateway } from './channels.gateway';

// @Injectable()
// export class GatewayScheduler {
//   private readonly logger = new Logger(GatewayScheduler.name);

//   constructor(private readonly channelsGateway: ChannelsGateway) {}

//   /**
//    * Clean up inactive rooms every hour
//    */
//   @Cron(CronExpression.EVERY_HOUR)
//   async cleanupInactiveRooms() {
//     try {
//       const cleanedCount = this.channelsGateway.cleanupInactiveRooms(60); // 60 minutes
//       if (cleanedCount > 0) {
//         this.logger.log(`Scheduled cleanup completed: ${cleanedCount} inactive rooms removed`);
//       }
//     } catch (error) {
//       this.logger.error('Error during scheduled room cleanup:', error);
//     }
//   }

//   /**
//    * Broadcast user counts every 30 seconds (optional - for real-time updates)
//    */
//   @Cron('*/30 * * * * *') // Every 30 seconds
//   async broadcastUserCounts() {
//     try {
//       await this.channelsGateway.broadcastUserCounts();
//     } catch (error) {
//       this.logger.error('Error during scheduled user count broadcast:', error);
//     }
//   }
// }
