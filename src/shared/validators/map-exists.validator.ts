import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator, ValidationOptions } from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';

@ValidatorConstraint({ name: 'MapExists', async: false })
export class MapExistsConstraint implements ValidatorConstraintInterface {
  validate(mapName: string, args: ValidationArguments) {
    if (!mapName) return false;
    
    const mapsDirectory = path.join(process.cwd(), 'data', 'maps');
    const fileName = mapName.endsWith('.json') ? mapName : `${mapName}.json`;
    const filePath = path.join(mapsDirectory, fileName);
    
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const mapsDirectory = path.join(process.cwd(), 'data', 'maps');
    let availableMaps: string[] = [];
    
    try {
      const files = fs.readdirSync(mapsDirectory);
      availableMaps = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      // If can't read directory, just show basic error
    }

    if (availableMaps.length > 0) {
      return `Harta '${args.value}' nu există. Hărți disponibile: ${availableMaps.join(', ')}`;
    } else {
      return `Harta '${args.value}' nu există`;
    }
  }
}

export function MapExists(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: MapExistsConstraint,
    });
  };
}
