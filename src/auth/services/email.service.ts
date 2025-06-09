import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }
  private createTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAILTRAP_HOST', 'sandbox.smtp.mailtrap.io'),
      port: this.configService.get<number>('MAILTRAP_PORT', 2525),
      auth: {
        user: this.configService.get<string>('MAILTRAP_USER'),
        pass: this.configService.get<string>('MAILTRAP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, fullName: string, code: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM', 'noreply@yourgame.com'),
        to: email,
        subject: 'Verifică-ți adresa de email - Jocul nostru 2D',
        html: this.getVerificationEmailTemplate(fullName, code),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}. Message ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Nu am putut trimite email-ul de verificare');
    }
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM', 'noreply@yourgame.com'),
        to: email,
        subject: 'Bun venit în jocul nostru 2D! 🎮',
        html: this.getWelcomeEmailTemplate(fullName),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${email}. Message ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error for welcome email as it's not critical
    }
  }

  private getVerificationEmailTemplate(fullName: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html lang="ro">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificare Email</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2c3e50;
            margin-bottom: 10px;
          }
          .code-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin: 25px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: white;
            letter-spacing: 8px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .code-label {
            color: #f8f9fa;
            font-size: 14px;
            margin-top: 10px;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
          .game-emoji {
            font-size: 24px;
            margin: 0 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 Bun venit, ${fullName}! 🎮</h1>
            <p>Îți mulțumim că te-ai înregistrat în jocul nostru 2D!</p>
          </div>
          
          <p>Pentru a-ți activa contul, te rugăm să introduci codul de verificare de mai jos:</p>
          
          <div class="code-container">
            <div class="code">${code}</div>
            <div class="code-label">Codul tău de verificare</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>Acest cod este valabil doar 15 minute</li>
              <li>Nu împărtăși acest cod cu nimeni</li>
              <li>Dacă nu ai solicitat această verificare, ignoră acest email</li>
            </ul>
          </div>
          
          <p>După verificare, vei putea:</p>
          <ul>
            <li><span class="game-emoji">🎯</span> Să te conectezi la joc</li>
            <li><span class="game-emoji">🏆</span> Să participi la competiții</li>
            <li><span class="game-emoji">💬</span> Să chat-uiești cu alți jucători</li>
            <li><span class="game-emoji">🎪</span> Să explorezi lumea jocului</li>
          </ul>
          
          <div class="footer">
            <p>Echipa Jocului 2D<br>
            <small>Dacă ai probleme, contactează-ne la support@yourgame.com</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(fullName: string): string {
    return `
      <!DOCTYPE html>
      <html lang="ro">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bun venit!</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .celebration {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin: 25px 0;
            color: white;
          }
          .feature-list {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .feature-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
            border-left: 4px solid #667eea;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Felicitări, ${fullName}! 🎉</h1>
          </div>
          
          <div class="celebration">
            <h2>Contul tău a fost verificat cu succes!</h2>
            <p>Acum faci parte din comunitatea noastră de jucători!</p>
          </div>
          
          <p>Te-am verificat cu succes și acum poți să te bucuri de toate funcționalitățile jocului nostru 2D!</p>
          
          <div class="feature-list">
            <h3>Ce poți face acum:</h3>
            <div class="feature-item">🎮 <strong>Joacă-te</strong> - Explorează lumea fascinantă a jocului nostru</div>
            <div class="feature-item">👥 <strong>Conectează-te</strong> - Fă-ți prieteni și joacă-te împreună</div>
            <div class="feature-item">💬 <strong>Chat</strong> - Comunică cu alți jucători în timp real</div>
            <div class="feature-item">🏆 <strong>Competiții</strong> - Participă la turnee și câștigă premii</div>
            <div class="feature-item">⭐ <strong>Progres</strong> - Dezvoltă-ți personajul și urcă în clasamente</div>
          </div>
          
          <p><strong>Gata să începi aventura?</strong> Conectează-te acum și descoperă ce te așteaptă!</p>
          
          <div class="footer">
            <p>Bun venit în echipă! 🚀<br>
            <strong>Echipa Jocului 2D</strong><br>
            <small>Pentru suport: support@yourgame.com</small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
