import { CookieOptions } from "express";
// DECLARED IN SECONDS FOR USING IN JWT
export const ACCESS_TOKEN_EXPIRATION = 60 * 60 * 24; // (1d)
export const INVITATION_LINK_EXPIRATION = 60*60*24*7; // 7D
export const REFRESH_TOKEN_EXPIRATION = 60*60*24*15 //15D
export const REFRESH_TOKEN_PATH = '/auth'


export const COOKIE_SETTINGS: {
  REFRESH_TOKEN: CookieOptions;
} = {
  REFRESH_TOKEN: {
      httpOnly: true,
      maxAge: REFRESH_TOKEN_EXPIRATION * 1000, // Convert seconds to milliseconds
      sameSite: 'lax',
      secure: false, // Remember, SameSite=None requires Secure=true, especially important for production
      domain: 'localhost',
      path: REFRESH_TOKEN_PATH
     
      
  },
};
  
  //In seconds

//GAME CONSTS
export const PLAYER_VISION_MASK_SIZE = 250;