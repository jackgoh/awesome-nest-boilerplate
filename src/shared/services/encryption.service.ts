import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Hex } from 'viem';
import { ApiConfigService } from './api-config.service';

@Injectable()
export class EncryptionService {
  private AES_ALGORITHM = 'aes-256-cbc';

  constructor(private configService: ApiConfigService) {}

  encrypt(data: string) {
    const iv = randomBytes(16);

    // generate encrypted_data
    const cipher = createCipheriv(
      this.AES_ALGORITHM,
      Buffer.from(this.configService.aesSecretKey, 'hex'),
      iv,
    );

    let encrypted_data = cipher.update(data, 'utf8', 'hex');
    encrypted_data += cipher.final('hex');

    // concat encrypted_data with iv
    encrypted_data += ':' + iv.toString('hex');

    // return payload
    return encrypted_data as Hex;
  }

  decrypt(encrypted_data: string) {
    // extract encrypted data & iv
    let iv: string;
    [encrypted_data, iv] = encrypted_data.split(':');

    // decrypt
    const decipher = createDecipheriv(
      this.AES_ALGORITHM,
      Buffer.from(this.configService.aesSecretKey, 'hex'),
      Buffer.from(iv, 'hex'),
    );

    let decrypted_data = decipher.update(encrypted_data, 'hex', 'utf8');
    decrypted_data += decipher.final('utf8');

    // return decrypted data
    return decrypted_data as Hex;
  }
}
