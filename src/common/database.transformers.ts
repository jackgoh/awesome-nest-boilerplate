import { type ValueTransformer } from 'typeorm';

export const bigintNumberTransformer: ValueTransformer = {
  from: (value: string | number): number => Number(value),
  to: (value: number): number => value,
};
