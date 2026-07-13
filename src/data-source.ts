import 'reflect-metadata';

import { loadEnvFile } from 'node:process';

import { DataSource } from 'typeorm';

import {
  createConfiguration,
  createTypeOrmOptions,
  getEnvironmentFilePaths,
  getValidatedEnvironment,
} from './config';

// Nest loads env files through ConfigModule. Standalone TypeORM commands need
// to load the same file before using the shared validation/configuration path.
for (const environmentFilePath of getEnvironmentFilePaths(
  process.env.NODE_ENV ?? 'development',
)) {
  try {
    loadEnvFile(environmentFilePath);
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )) {
      throw error;
    }
  }
}

const applicationConfig = createConfiguration(getValidatedEnvironment());

export const dataSourceOptions = createTypeOrmOptions(
  applicationConfig.database,
);

export const appDataSource = new DataSource(dataSourceOptions);
