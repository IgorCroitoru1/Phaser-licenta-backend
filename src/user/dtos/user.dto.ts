import { Expose, Transform } from 'class-transformer';
export class UserDto {
    @Expose()
    id: string
    
    @Expose()
    email: string
    
    @Transform(({ obj }) => obj.fullName)
    @Expose()
    name: string
    
    @Expose()
    avatar?: string
    
    @Expose()
    roles: string[]
}
