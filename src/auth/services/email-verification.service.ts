import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailVerification, EmailVerificationDocument } from '../models/email-verification.model';
import { EmailService } from './email.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly MAX_ATTEMPTS = 3;
  private readonly RESEND_COOLDOWN = 60000; // 1 minute in milliseconds

  constructor(
    @InjectModel(EmailVerification.name) 
    private emailVerificationModel: Model<EmailVerificationDocument>,
    private emailService: EmailService,
    private userService: UserService,
  ) {}

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code to user's email
   */
  async sendVerificationCode(userId: string, email: string, fullName: string): Promise<void> {
    try {
      // Check if there's a recent code sent (rate limiting)
      const recentCode = await this.emailVerificationModel
        .findOne({
          userId,
          email,
          createdAt: { $gte: new Date(Date.now() - this.RESEND_COOLDOWN) }
        })
        .sort({ createdAt: -1 });

      if (recentCode) {
        throw new BadRequestException('Poți solicita un nou cod doar o dată pe minut. Te rugăm să aștepți.');
      }

      // Invalidate any existing codes for this user/email
      await this.emailVerificationModel.updateMany(
        { userId, email, status: 'pending' },
        { status: 'expired', isUsed: true }
      );

      // Generate new code
      const code = this.generateVerificationCode();

      // Save to database
      const verification = new this.emailVerificationModel({
        userId,
        email,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      await verification.save();

      // Send email
      await this.emailService.sendVerificationEmail(email, fullName, code);

      this.logger.log(`Verification code sent to ${email} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send verification code to ${email}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Nu am putut trimite codul de verificare. Te rugăm să încerci din nou.');
    }
  }

  /**
   * Verify the email with the provided code
   */
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find the verification record
      const verification = await this.emailVerificationModel.findOne({
        email,
        code,
        status: 'pending',
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verification) {
        // Check if code exists but is expired or used
        const expiredCode = await this.emailVerificationModel.findOne({
          email,
          code
        });

        if (expiredCode) {
          if (expiredCode.isUsed) {
            throw new BadRequestException('Acest cod a fost deja folosit');
          }
          if (expiredCode.expiresAt < new Date()) {
            throw new BadRequestException('Codul a expirat. Te rugăm să soliciți unul nou');
          }
        }

        // Track failed attempts for this email
        await this.emailVerificationModel.updateMany(
          { email, status: 'pending' },
          { $inc: { attempts: 1 } }
        );

        throw new BadRequestException('Cod de verificare invalid');
      }

      // Check attempts
      if (verification.attempts >= this.MAX_ATTEMPTS) {
        verification.status = 'expired';
        verification.isUsed = true;
        await verification.save();
        throw new BadRequestException('Prea multe încercări. Te rugăm să soliciți un cod nou');
      }

      // Mark as verified
      verification.status = 'verified';
      verification.isUsed = true;
      await verification.save();

      // Update user's email verification status
      await this.userService.markEmailAsVerified(verification.userId.toString());

      // Send welcome email
      const user = await this.userService.findById(verification.userId.toString());
      if (user) {
        await this.emailService.sendWelcomeEmail(email, user.fullName || 'Jucător');
      }

      this.logger.log(`Email ${email} verified successfully for user ${verification.userId}`);

      return {
        success: true,
        message: 'Email verificat cu succes! Acum te poți conecta la cont.'
      };

    } catch (error) {
      this.logger.error(`Email verification failed for ${email}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Verificarea email-ului a eșuat. Te rugăm să încerci din nou.');
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email: string): Promise<void> {
    try {
      // Find user by email
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new NotFoundException('Nu există un cont cu această adresă de email');
      }

      // Check if already verified
      if (user.isEmailVerified) {
        throw new ConflictException('Adresa de email este deja verificată');
      }

      // Send new code
      await this.sendVerificationCode(user._id.toString(), email, user.fullName || 'Jucător');

    } catch (error) {
      this.logger.error(`Failed to resend verification code to ${email}:`, error);
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Nu am putut retrimite codul de verificare. Te rugăm să încerci din nou.');
    }
  }

  /**
   * Clean up expired verification codes (called by a cron job)
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      const result = await this.emailVerificationModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      this.logger.log(`Cleaned up ${result.deletedCount} expired verification codes`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired codes:', error);
    }
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<{
    hasActiveCode: boolean;
    lastCodeSentAt?: Date;
    attemptsRemaining?: number;
  }> {
    try {
      const verification = await this.emailVerificationModel
        .findOne({
          userId,
          status: 'pending',
          isUsed: false,
          expiresAt: { $gt: new Date() }
        })
        .sort({ createdAt: -1 });

      if (!verification) {
        return { hasActiveCode: false };
      }

      return {
        hasActiveCode: true,
        lastCodeSentAt: verification.createdAt,
        attemptsRemaining: Math.max(0, this.MAX_ATTEMPTS - verification.attempts)
      };

    } catch (error) {
      this.logger.error(`Failed to get verification status for user ${userId}:`, error);
      return { hasActiveCode: false };
    }
  }

  /**
   * Send verification code for email before registration (no user ID yet)
   */
  async sendPreRegistrationCode(email: string): Promise<void> {
    try {
      // Check if email is already registered
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('Un cont cu această adresă de email există deja');
      }

      // Check rate limiting
      const recentCode = await this.emailVerificationModel
        .findOne({
          email,
          createdAt: { $gte: new Date(Date.now() - this.RESEND_COOLDOWN) }
        })
        .sort({ createdAt: -1 });

      if (recentCode) {
        throw new BadRequestException('Poți solicita un nou cod doar o dată pe minut. Te rugăm să aștepți.');
      }

      // Invalidate any existing codes for this email
      await this.emailVerificationModel.updateMany(
        { email, status: 'pending' },
        { status: 'expired', isUsed: true }
      );

      // Generate new code - use a temporary userId (we'll create a placeholder document)
      const code = this.generateVerificationCode();

      // Save to database with a placeholder userId
      const verification = new this.emailVerificationModel({
        userId: new Date().getTime().toString(), // Temporary placeholder
        email,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      await verification.save();

      // Send email
      await this.emailService.sendVerificationEmail(email, 'Utilizator', code);

      this.logger.log(`Pre-registration verification code sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send pre-registration code to ${email}:`, error);
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Nu am putut trimite codul de verificare. Te rugăm să încerci din nou.');
    }
  }

  /**
   * Verify code during registration process
   */
  async verifyPreRegistrationCode(email: string, code: string): Promise<boolean> {
    try {
      // Find the verification record
      const verification = await this.emailVerificationModel.findOne({
        email,
        code,
        status: 'pending',
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verification) {
        // Check if code exists but is expired or used
        const expiredCode = await this.emailVerificationModel.findOne({
          email,
          code
        });

        if (expiredCode) {
          if (expiredCode.isUsed) {
            throw new BadRequestException('Acest cod a fost deja folosit');
          }
          if (expiredCode.expiresAt < new Date()) {
            throw new BadRequestException('Codul a expirat. Te rugăm să soliciți unul nou');
          }
        }

        // Track failed attempts for this email
        await this.emailVerificationModel.updateMany(
          { email, status: 'pending' },
          { $inc: { attempts: 1 } }
        );

        throw new BadRequestException('Cod de verificare invalid');
      }

      // Check attempts
      if (verification.attempts >= this.MAX_ATTEMPTS) {
        verification.status = 'expired';
        verification.isUsed = true;
        await verification.save();
        throw new BadRequestException('Prea multe încercări. Te rugăm să soliciți un cod nou');
      }

      // Mark as verified but don't delete yet (we'll use it to confirm registration)
      verification.status = 'verified';
      await verification.save();

      this.logger.log(`Pre-registration code verified for email ${email}`);
      return true;

    } catch (error) {
      this.logger.error(`Pre-registration verification failed for ${email}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Verificarea codului a eșuat. Te rugăm să încerci din nou.');
    }
  }

  /**
   * Complete the verification process after user registration
   */
  async completeVerification(email: string, userId: string): Promise<void> {
    try {
      // Find the verified pre-registration code
      const verification = await this.emailVerificationModel.findOne({
        email,
        status: 'verified',
        isUsed: false
      });

      if (verification) {
        // Update with real user ID and mark as used
        verification.userId = userId as any;
        verification.isUsed = true;
        await verification.save();

        // Mark user email as verified
        await this.userService.markEmailAsVerified(userId);        // Send welcome email
        const user = await this.userService.findById(userId);
        if (user) {
          await this.emailService.sendWelcomeEmail(email, user.fullName || 'Jucător');
        }

        this.logger.log(`Email verification completed for ${email}, user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to complete verification for ${email}:`, error);
      throw new BadRequestException('Nu am putut finaliza verificarea email-ului.');
    }
  }
}
