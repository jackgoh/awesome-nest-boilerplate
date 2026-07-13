import { type CustomDecorator, SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'public_route';

export const Public = (): CustomDecorator =>
  SetMetadata(PUBLIC_ROUTE_KEY, true);
