import { type ConfigModuleOptions } from '@nestjs/config';

import { configuration } from './configuration';
import { validateEnvironment } from './environment.schema';

export function getEnvironmentFilePaths(nodeEnvironment: string): string[] {
  if (nodeEnvironment === 'production') {
    return [];
  }

  return nodeEnvironment === 'test'
    ? ['.env.test.local', '.env.test', '.env.local', '.env']
    : ['.env.local', '.env'];
}

export function createConfigModuleOptions(
  environment: Record<string, string | undefined> = process.env,
): ConfigModuleOptions {
  const nodeEnvironment = environment.NODE_ENV ?? 'development';
  const isProduction = nodeEnvironment === 'production';

  return {
    isGlobal: true,
    cache: true,
    expandVariables: false,
    ignoreEnvFile: isProduction,
    envFilePath: getEnvironmentFilePaths(nodeEnvironment),
    load: [configuration],
    validate: validateEnvironment,
  };
}

export const configModuleOptions = createConfigModuleOptions();
