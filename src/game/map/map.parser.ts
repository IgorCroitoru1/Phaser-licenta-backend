import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DoorObject, 
  TiledGroupLayer, 
  TiledLayer, 
  TiledMap, 
  TiledObjectGroupLayer, 
  TiledParsedGroupLayer, 
  TiledParsedImageLayer, 
  TiledParsedLayer, 
  TiledParsedMap, 
  TiledParsedObject, 
  TiledParsedObjectGroupLayer, 
  TiledParsedTileLayer, 
  TiledTileLayer, 
  ZoneObject } from './types/map.types';

@Injectable()
export class JsonMapParser {
public parsedMap: TiledParsedMap;
private mapsDir = join(process.cwd(), 'data', 'maps');
    constructor(mapId: string) {
      const rawData = readFileSync(
      join(this.mapsDir, `${mapId}.json`),
      'utf-8'
        );
       const mapData = JSON.parse(rawData) as TiledMap;
        this.parsedMap = {
            ...mapData,
            parsedLayers: [],
            parsedObjects: []
        };
        this.parseMapStructure();
    }

    public getParsedMap(): TiledParsedMap {
        return this.parsedMap;
    }

    private parseMapStructure(): void {
        this.parsedMap.parsedLayers = this.parseLayers(this.parsedMap.layers);
        this.parsedMap.parsedObjects = this.collectAllObjects();
    }

    private parseLayers(layers: TiledLayer[], currentPath: string[] = []): TiledParsedLayer[] {
        return layers.map(layer => {
            const layerPath = [...currentPath, layer.name];
            
            if (isGroupLayer(layer)) {
                const parsedLayer: TiledParsedGroupLayer = {
                    ...layer,
                    path: layerPath,
                    layers: this.parseLayers(layer.layers, layerPath)
                };
                return parsedLayer;
            }
            else if (isObjectGroupLayer(layer)) {
                const parsedLayer: TiledParsedObjectGroupLayer = {
                    ...layer,
                    path: layerPath,
                    objects: layer.objects.map(obj => ({
                        ...obj,
                        layerPath,
                        layerId: layer.id,
                        globalId: this.generateGlobalId(layer.id, obj.id)
                    }))
                };
                return parsedLayer;
            }
            else if (isTileLayer(layer)) {
                const parsedLayer: TiledParsedTileLayer = {
                    ...layer,
                    path: layerPath
                };
                return parsedLayer;
            }
            else { // Image layer
                const parsedLayer: TiledParsedImageLayer = {
                    ...layer,
                    path: layerPath
                };
                return parsedLayer;
            }
        });
    }

    private collectAllObjects(): TiledParsedObject[] {
        const objects: TiledParsedObject[] = [];
        
        const processLayer = (layer: TiledParsedLayer) => {
            if (isParsedObjectGroupLayer(layer)) {
                objects.push(...layer.objects);
            }
            if (isParsedGroupLayer(layer)) {
                layer.layers.forEach(processLayer);
            }
        };

        this.parsedMap.parsedLayers.forEach(processLayer);
        return objects;
    }

    private generateGlobalId(layerId: number, objectId: number): number {
        return (layerId << 16) | objectId;
    }
     /**
     * Get a zone object by ID
     * @param zoneId The zone ID to find
     * @returns The zone object or undefined if not found
     */
    getZone(zoneId: number): ZoneObject | undefined {
        const zone =  this.parsedMap.parsedObjects.find(obj => 
            obj.type === "zone" && obj.properties?.some(p => p.name === "id" && p.value === zoneId)
        )
        if(!zone) return undefined;
        const zoneObj : ZoneObject = {
            ...zone,
            zoneId: zone?.properties?.find(prop => prop.name === "id")?.value
        }
        return zoneObj;
    }

    get zones(): ZoneObject[] {
        const zones =  this.parsedMap.parsedObjects.filter(obj => 
            obj.type === "zone")
        return zones.map(zone => {
            return {
                ...zone,
                zoneId: zone?.properties?.find(prop => prop.name === "id")?.value
            } as ZoneObject
        })
      }
      get doors(): DoorObject[] {
        const doors =  this.parsedMap.parsedObjects.filter(obj => 
            obj.type === "door")
        return doors.map(door => {
            return {
                ...door,
                zoneId: door?.properties?.find(prop => prop.name === "zoneId")?.value,
                isOpen: door?.properties?.find(prop => prop.name === "isOpen")?.value
            } as DoorObject
        })
      }
    /**
     * Get a door object by ID with its containing zone
     * @param doorId The door ID to find
     * @returns Object with zone and door, or undefined if not found
     */
    getDoor(doorId: number): { zone: ZoneObject; door: DoorObject } | undefined {
        const door = this.parsedMap.parsedObjects.find(obj => 
            obj.type === "door" && obj.id === doorId
        )
        if (!door) return undefined;

        const doorObj : DoorObject = {
            ...door,
            zoneId: door?.properties?.find(prop => prop.name === "zoneId")?.value,
            isOpen: door?.properties?.some(prop => prop.name === "isOpen" && prop.value === true)
        }
        const zone = this.getZone(doorObj.zoneId);
        if (!zone) return undefined;
        return { zone, door: doorObj };
    }

    /**
     * Get all doors in a specific zone
     * @param zoneId The zone ID to find doors for
     * @returns Array of door objects
     */
    getDoorsByZoneId(zoneId: number): DoorObject[] {

        const doorObj =  this.parsedMap.parsedObjects.filter(obj => {
            return obj.type === "door" && obj.properties?.some(prop => prop.name === "zoneId" && prop.value === zoneId)
        })
        return doorObj.map(door => {
            return {
                ...door,
                isOpen: door.properties?.some(prop => prop.name === "isOpen" && prop.value === true),
                zoneId: zoneId
            } as DoorObject
        })
    }
    
}

// Type guards
function isGroupLayer(layer: TiledLayer): layer is TiledGroupLayer {
    return layer.type === "group";
}

function isObjectGroupLayer(layer: TiledLayer): layer is TiledObjectGroupLayer {
    return layer.type === "objectgroup";
}

function isTileLayer(layer: TiledLayer): layer is TiledTileLayer {
    return layer.type === "tilelayer";
}

function isParsedGroupLayer(layer: TiledParsedLayer): layer is TiledParsedGroupLayer {
    return layer.type === "group";
}

function isParsedObjectGroupLayer(layer: TiledParsedLayer): layer is TiledParsedObjectGroupLayer {
    return layer.type === "objectgroup";
}

// // Utility Functions
// export function parseTiledMap(mapId: string): JsonMapParser {
//     const rawData = readFileSync(
//       join(this.mapsDir, `${mapId}.json`),
//       'utf-8'
//     );
//     const json = JSON.parse(rawData) as TiledMap;
//     return new JsonMapParser(json);
// }