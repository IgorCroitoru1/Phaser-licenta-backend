import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") id: string;
    @type("number") x: number;
    @type("number") y: number;
    @type("number") currentZoneId: number = -1;
    @type([ "string" ]) nearbyUsers = new ArraySchema<string>();
  }
export class Zone extends Schema {
    @type("number") id: number;
    @type("boolean") isOpen: boolean = true;
    @type("string") lockedBy: string | null = null;
}

export class Door extends Schema {
    @type("number") id: number;
    @type("number") zoneId: number;
    @type("boolean") isOpen: boolean
}