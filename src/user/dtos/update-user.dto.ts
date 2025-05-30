import { Expose, Transform } from 'class-transformer';
import { IsOptional, IsString, IsEmail, MaxLength, MinLength, IsUrl } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Numele complet trebuie să fie text' })
  @MinLength(2, { message: 'Numele complet trebuie să aibă cel puțin 2 caractere' })
  @MaxLength(100, { message: 'Numele complet nu poate depăși 100 de caractere' })
  @Transform(({ value, obj }) => {
    // If 'name' is provided, use it as fullName
    return value || obj.name;
  })
  @Expose({ name: 'name' })
  readonly fullName?: string;

  


//   @IsOptional()
//   @IsEmail({}, { message: 'Adresa de email nu este validă' })
//   readonly email?: string;

//   @IsOptional()
//   @IsString({ message: 'Avatar-ul trebuie să fie text' })
//   @IsUrl({}, { message: 'Avatar-ul trebuie să fie o URL validă' })
//   readonly avatar?: string;

 
}
