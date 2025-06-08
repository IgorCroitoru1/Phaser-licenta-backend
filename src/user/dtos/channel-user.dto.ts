export class ChannelUserDto{
   
    id: string
    email: string
    name: string
    avatar: string
    // x: number
    // y: number
    currentZoneId: number = -1;
    constructor(id: string, email: string, name: string, avatar: string) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.avatar = avatar;
        // this.x = x;
        // this.y = y;
    }
}