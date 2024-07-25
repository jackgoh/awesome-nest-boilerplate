import { IApiResponseFormat } from '@/interfaces';
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';

import { Response } from 'express';
import { map, Observable } from 'rxjs';

@Injectable()
export class ApiResponseInterceptor<DTO>
  implements NestInterceptor<DTO, IApiResponseFormat<DTO>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IApiResponseFormat<DTO>> {
    return next.handle().pipe(
      map((resp) => ({
        status: context.switchToHttp().getResponse<Response>().statusCode,
        message: 'success',
        data: resp,
      })),
    );
  }
}
