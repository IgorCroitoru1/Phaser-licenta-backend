import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestVerificationCodeDto {
  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @IsEmail({}, { message: 'Format email invalid' })
  email: string;
}
