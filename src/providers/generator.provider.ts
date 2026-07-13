import { generateUuid } from '../common/uuid';

interface IS3PublicUrlConfiguration {
  bucketRegion: string;
  bucketName: string;
}

export class GeneratorProvider {
  private static s3Config: IS3PublicUrlConfiguration | undefined;

  static configureS3(config: IS3PublicUrlConfiguration): void {
    GeneratorProvider.s3Config = config;
  }

  static uuid(): string {
    return generateUuid();
  }

  static fileName(ext: string): string {
    return GeneratorProvider.uuid() + '.' + ext;
  }

  static getS3PublicUrl(key: string): string {
    if (!key) {
      throw new TypeError('key is required');
    }

    const config = GeneratorProvider.getS3Config();

    return `https://s3.${config.bucketRegion}.amazonaws.com/${config.bucketName}/${key}`;
  }

  static getS3Key(publicUrl: string): string {
    if (!publicUrl) {
      throw new TypeError('key is required');
    }

    const config = GeneratorProvider.getS3Config();
    const urlPrefix = `https://s3.${config.bucketRegion}.amazonaws.com/${config.bucketName}/`;

    if (!publicUrl.startsWith(urlPrefix)) {
      throw new TypeError('publicUrl is invalid');
    }

    return publicUrl.slice(urlPrefix.length);
  }

  static generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  static generatePassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = lowercase.toUpperCase();
    const numbers = '0123456789';

    let text = '';

    for (let i = 0; i < 4; i++) {
      text += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      text += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      text += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    return text;
  }

  /**
   * generate random string
   * @param length
   */
  static generateRandomString(length: number): string {
    return Math.random()
      .toString(36)
      .replaceAll(/[^\dA-Za-z]+/g, '')
      .slice(0, Math.max(0, length));
  }

  private static getS3Config(): IS3PublicUrlConfiguration {
    if (!GeneratorProvider.s3Config) {
      throw new Error('S3 URL configuration has not been initialized');
    }

    return GeneratorProvider.s3Config;
  }
}
