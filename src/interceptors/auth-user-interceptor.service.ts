import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';

import { UserEntity } from '@/modules/user-v2/user.entity';
import { ContextProvider } from '../providers';

@Injectable()
export class AuthUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    const user = <UserEntity>request.user;
    ContextProvider.setAuthUser(user);

    return next.handle();
  }
}
