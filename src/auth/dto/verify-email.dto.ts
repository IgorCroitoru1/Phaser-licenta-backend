import { IsEmail, IsNotEmpty, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Email este obligatoriu' })
  @IsEmail({}, { message: 'Format email invalid' })
  email: string;

  @IsNotEmpty({ message: 'Codul de verificare este obligatoriu' })
  @Length(6, 6, { message: 'Codul de verificare trebuie să aibă exact 6 cifre' })
  @Matches(/^\d{6}$/, { message: 'Codul de verificare trebuie să conțină doar cifre' })
  code: string;
}
