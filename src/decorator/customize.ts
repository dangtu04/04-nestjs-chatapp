import { UserRole } from '@/enum/user.enum';
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) => {
  return SetMetadata(RESPONSE_MESSAGE, message);
};

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const FRIENDSHIP_BODY_KEY = 'friendship_body_key';
export const FriendshipBodyKey = (key: string) =>
  SetMetadata(FRIENDSHIP_BODY_KEY, key);
