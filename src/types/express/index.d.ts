import { UserDocument as UserModel } from '../../user/user.model';
declare module 'express' {
    interface Request {
      user?: UserModel;
    }
}