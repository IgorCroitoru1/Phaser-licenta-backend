import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmailVerificationDocument = EmailVerification & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class EmailVerification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, length: 6 })
  code: string;

  @Prop({ default: Date.now, expires: 900 }) // 15 minutes expiry
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: 'pending', enum: ['pending', 'verified', 'expired'] })
  status: string;
}

export const EmailVerificationSchema = SchemaFactory.createForClass(EmailVerification);

// Add index for performance
EmailVerificationSchema.index({ userId: 1, email: 1 });
EmailVerificationSchema.index({ code: 1 });
// Note: TTL index on expiresAt is already created by the @Prop({ expires: 900 }) decorator
