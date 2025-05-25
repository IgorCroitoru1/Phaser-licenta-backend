// import { Injectable } from '@nestjs/common';
// import * as fs from 'fs';
// import * as path from 'path';

// @Injectable()
// export class MapValidationService {
//   private readonly mapsDirectory = path.join(process.cwd(), 'data', 'maps');

//   /**
//    * Check if a map file exists in the data/maps directory
//    * @param mapName - The name of the map (with or without .json extension)
//    * @returns boolean indicating if the map exists
//    */
//   mapExists(mapName: string): boolean {
//     // Ensure the map name has .json extension
//     const fileName = mapName.endsWith('.json') ? mapName : `${mapName}.json`;
//     const filePath = path.join(this.mapsDirectory, fileName);
    
//     try {
//       return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
//     } catch (error) {
//       return false;
//     }
//   }

//   /**
//    * Get all available map names (without .json extension)
//    * @returns Array of map names
//    */
//   getAvailableMaps(): string[] {
//     try {
//       const files = fs.readdirSync(this.mapsDirectory);
//       return files
//         .filter(file => file.endsWith('.json'))
//         .map(file => file.replace('.json', ''));
//     } catch (error) {
//       return [];
//     }
//   }

//   /**
//    * Validate map name and return error message if invalid
//    * @param mapName - The map name to validate
//    * @returns null if valid, error message if invalid
//    */
//   validateMapName(mapName: string): string | null {
//     if (!mapName || mapName.trim() === '') {
//       return 'Numele hărții este obligatoriu';
//     }

//     if (!this.mapExists(mapName)) {
//       const availableMaps = this.getAvailableMaps();
//       return `Harta '${mapName}' nu există. Hărți disponibile: ${availableMaps.join(', ')}`;
//     }

//     return null;
//   }
// }
