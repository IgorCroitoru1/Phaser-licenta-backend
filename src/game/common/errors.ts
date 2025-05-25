// errors.ts
export class ColyseusError extends Error {
    constructor(public code: number, public message: string) {
      super(message);
      Object.setPrototypeOf(this, ColyseusError.prototype);
    }
  }
  
  export const Errors = {
    UNAUTHORIZED: new ColyseusError(401, "Utiliaztor neautorizat"),
    INVALID_TOKEN: new ColyseusError(403, "Token invalid"),
    PLAYER_NOT_FOUND: new ColyseusError(404, "Utilizatorul nu a fost gasit"),
  };