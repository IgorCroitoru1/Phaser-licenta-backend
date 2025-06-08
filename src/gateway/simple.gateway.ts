import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/simple',
})
export class SimpleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SimpleGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }  @SubscribeMessage('hello')
  handleHelloMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string, timestamp?: string }
  ): any {
    this.logger.log(`Received hello from ${data.name}, ${data.timestamp}`);
    
    // Broadcast to all other clients (optional)
    client.broadcast.emit('user_said_hello', {
      name: data.name,
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });

    // // Return WsResponse to the sender
    // return {
    //     message: `Hello ${data.name}! Your socket ID is ${client.id}`,
    //     timestamp: new Date().toISOString(),
    //     success: true,
    // };
    return {
      message: `Hello ${data.name}! Your socket ID is ${client.id}`,
  }
  }
  // Alternative pattern: Return data directly (event name will be the same as the message)
  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any): any {
    this.logger.log('Received ping');
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }

  // Alternative pattern: Async with WsResponse
  @SubscribeMessage('echo')
  async handleEcho(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string }
  ): Promise<WsResponse<any>> {
    this.logger.log(`Echo request: ${data.text}`);
    
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      event: 'echo_response',
      data: {
        original: data.text,
        echo: data.text.toUpperCase(),
        socketId: client.id,
      }
    };
  }
}
