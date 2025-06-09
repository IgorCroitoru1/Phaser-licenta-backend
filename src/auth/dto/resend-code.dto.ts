import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendCodeDto {
  @IsNotEmpty({ message: 'Email este obligatoriu' })
  @IsEmail({}, { message: 'Format email invalid' })
  email: string;
}
