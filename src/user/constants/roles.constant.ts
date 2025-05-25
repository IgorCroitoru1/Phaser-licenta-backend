export const RolesEnum = {
    ADMIN: 'admin',
    MODERATOR: 'teacher',
    USER: 'user',
    GUEST: 'guest',
  } as const;
  
  export type RolesEnumType = (typeof RolesEnum)[keyof typeof RolesEnum];
  