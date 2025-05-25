// export interface Map {
//     id: string;
//     name: string;
//     zones: Zone[];
//   }
  
//   export interface Zone {
//     id: number;
//     name: string;
//     bounds: Rectangle;
//     doors: Door[];
//   }
  
//   export interface Door {
//     id: number;
//     name: string;
//     position: Point;
//     size: Size;
//     zoneId: number;
//     isOpen: boolean;
//   }
  
//   export interface Point {
//     x: number;
//     y: number;
//   }
  
//   export interface Size {
//     width: number;
//     height: number;
//   }
//   export type LayerType = "group" | "objectgroup" | "imagelayer" | "tilelayer" 
    
  
//   export interface Rectangle extends Point, Size {}

// Type Definitions
export interface TiledMap {
  compressionlevel: number;
  height: number;
  infinite: boolean;
  layers: TiledLayer[];
  nextlayerid: number;
  nextobjectid: number;
  orientation: string;
  renderorder: string;
  tiledversion: string;
  tileheight: number;
  tilesets: TiledTileset[];
  tilewidth: number;
  type: "map";
  version: string;
  width: number;
}

export type LayerType = "tilelayer" | "imagelayer" | "objectgroup" | "group";

export interface TiledBaseLayer {
  id: number;
  name: string;
  type: LayerType;
  opacity: number;
  visible: boolean;
  x: number;
  y: number;
  class?: string;
  offsetx?: number;
  offsety?: number;
  parallaxx?: number;
  parallaxy?: number;
}

export interface TiledTileLayer extends TiledBaseLayer {
  type: "tilelayer";
  chunks?: TiledChunk[];
  compression?: string;
  data?: number[] | string;
  encoding?: string;
  height: number;
  width: number;
  locked?: boolean;
  startx?: number;
  starty?: number;
}

export interface TiledImageLayer extends TiledBaseLayer {
  type: "imagelayer";
  image: string;
  transparentcolor?: string;
  repeatx?: boolean;
  repeaty?: boolean;
}

export interface TiledObjectGroupLayer extends TiledBaseLayer {
  type: "objectgroup";
  draworder: "topdown" | "index";
  objects: TiledObject[];
}

export interface TiledGroupLayer extends TiledBaseLayer {
  type: "group";
  layers: TiledLayer[];
}

export type TiledLayer = TiledTileLayer | TiledImageLayer | TiledObjectGroupLayer | TiledGroupLayer;

export interface TiledChunk {
  data: number[] | string;
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  gid?: number;
  ellipse?: boolean;
  point?: boolean;
  polygon?: TiledPoint[];
  polyline?: TiledPoint[];
  properties?: TiledProperty[];
  template?: string;
  text?: TiledText;
}

export interface TiledPoint {
  x: number;
  y: number;
}

export interface TiledProperty {
  name: string;
  type: string;
  value: any;
}

export interface TiledText {
  text: string;
  color?: string;
  bold?: boolean;
  fontfamily?: string;
  halign?: "center" | "right" | "justify" | "left";
  italic?: boolean;
  kerning?: boolean;
  pixelsize?: number;
  strikeout?: boolean;
  underline?: boolean;
  valign?: "center" | "bottom" | "top";
  wrap?: boolean;
}

export interface TiledTileset {
  class?: string;
  firstgid: number;
  source?: string;
  name?: string;
  type?: "tileset";
}

// Enhanced Type Definitions
export interface TiledParsedMap extends TiledMap {
  parsedLayers: TiledParsedLayer[];
  parsedObjects: TiledParsedObject[];
}

// Create parsed versions of each layer type
export interface TiledParsedTileLayer extends TiledTileLayer {
  path: string[];
}

export interface TiledParsedImageLayer extends TiledImageLayer {
  path: string[];
}

export interface TiledParsedObjectGroupLayer extends TiledObjectGroupLayer {
  path: string[];
  objects: TiledParsedObject[];
}

export interface TiledParsedGroupLayer extends TiledGroupLayer {
  path: string[];
  layers: TiledParsedLayer[];
}

// Union type for all parsed layer types
export type TiledParsedLayer = 
  | TiledParsedTileLayer 
  | TiledParsedImageLayer 
  | TiledParsedObjectGroupLayer 
  | TiledParsedGroupLayer;

export interface TiledParsedObject extends TiledObject {
  layerPath: string[];
  layerId: number;
  globalId: number;
}

export interface ZoneObject extends Omit<TiledObject, 'id'> {
  // Custom properties you expect on zone objects
  zoneId: number;
}

export interface DoorObject extends TiledObject {
  // Custom properties you expect on door objects
  zoneId: number;
  isOpen: boolean;
}
