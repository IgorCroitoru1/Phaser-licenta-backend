import { IsEmail, IsNotEmpty, MinLength, MaxLength, Matches, Length } from 'class-validator';

export class RegisterWithCodeDto {
  @IsNotEmpty({ message: 'Numele complet este obligatoriu' })
  @MinLength(3, { message: 'Numele complet trebuie să aibă cel puțin 3 caractere' })
  @MaxLength(40, { message: 'Numele complet nu poate depăși 40 de caractere' })
  fullName: string;

  @IsNotEmpty({ message: 'Email-ul este obligatoriu' })
  @IsEmail({}, { message: 'Format email invalid' })
  email: string;

  @IsNotEmpty({ message: 'Parola este obligatorie' })
  @MinLength(8, { message: 'Parola trebuie să aibă cel puțin 8 caractere' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'Parola trebuie să conțină cel puțin o literă mare și o cifră',
  })
  password: string;

  @IsNotEmpty({ message: 'Codul de verificare este obligatoriu' })
  @Length(6, 6, { message: 'Codul de verificare trebuie să aibă exact 6 cifre' })
  @Matches(/^\d{6}$/, { message: 'Codul de verificare trebuie să conțină doar cifre' })
  verificationCode: string;
}
