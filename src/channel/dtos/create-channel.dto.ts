import { IsString, IsNumber, IsOptional, Min, Max, IsNotEmpty, MaxLength } from 'class-validator';
import { MapExists } from '../../shared/validators/map-exists.validator';

export class CreateChannelDto {  @IsString({ message: 'Numele canalului trebuie să fie text' })
  @IsNotEmpty({ message: 'Numele canalului este obligatoriu' })
  @MaxLength(30, { message: 'Numele canalului nu poate depăși 30 de caractere' })
  readonly name: string;
  @IsString({ message: 'Numele hărții trebuie să fie text' })
  @IsNotEmpty({ message: 'Numele hărții este obligatoriu' })
  @MapExists({ message: 'Harta specificată nu există în sistemul de fișiere' })
  readonly mapName: string;

  @IsOptional()
  @IsNumber({}, { message: 'Numărul maxim de utilizatori trebuie să fie numeric' })
  @Min(1, { message: 'Numărul maxim de utilizatori trebuie să fie cel puțin 1' })
  @Max(100, { message: 'Numărul maxim de utilizatori nu poate depăși 100' })
  readonly maxUsers?: number;

  @IsOptional()
  readonly createdBy?: string; // Will be set from JWT token
}