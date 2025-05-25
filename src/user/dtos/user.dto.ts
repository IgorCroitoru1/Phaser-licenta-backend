export class UserDto{
    id: string
    email: string
    name: string
    // avatar: string
    roles: string[]
    constructor(id: string, email: string, fullName: string, roles: string[]){
        this.id = id
        this.email = email
        this.name = fullName
        this.roles = roles

    }
}