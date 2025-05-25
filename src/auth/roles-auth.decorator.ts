import { SetMetadata } from "@nestjs/common";
import { RolesEnumType } from "src/user/constants/roles.constant";
export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolesEnumType[]) => SetMetadata(ROLES_KEY, roles);