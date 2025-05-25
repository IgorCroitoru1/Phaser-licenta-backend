import { IsString, IsNumber, IsOptional, Min, Max, IsBoolean } from 'class-validator';
import { MapExists } from '../../shared/validators/map-exists.validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsString({ message: 'Numele canalului trebuie să fie text' })
  readonly name?: string;
  @IsOptional()
  @IsString({ message: 'Numele hărții trebuie să fie text' })
  @MapExists({ message: 'Harta specificată nu există în sistemul de fișiere' })
  readonly mapName?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Numărul maxim de utilizatori trebuie să fie numeric' })
  @Min(1, { message: 'Numărul maxim de utilizatori trebuie să fie cel puțin 1' })
  @Max(100, { message: 'Numărul maxim de utilizatori nu poate depăși 100' })
  readonly maxUsers?: number;

  @IsOptional()
  @IsBoolean({ message: 'Starea de activare trebuie să fie boolean (true/false)' })
  readonly isActive?: boolean;
}
