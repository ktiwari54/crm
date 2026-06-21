import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';

const LOCAL_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private bucket = 'crm-documents';
  private useS3 = false;

  constructor(private readonly config: ConfigService) {
    mkdirSync(LOCAL_DIR, { recursive: true });
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    if (endpoint) {
      this.useS3 = true;
      this.bucket = this.config.get<string>('S3_BUCKET') ?? 'crm-documents';
      this.s3 = new S3Client({
        endpoint,
        region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
        credentials: {
          accessKeyId: this.config.get<string>('S3_ACCESS_KEY') ?? 'crm_minio',
          secretAccessKey: this.config.get<string>('S3_SECRET_KEY') ?? 'crm_minio_password',
        },
        forcePathStyle: this.config.get<string>('S3_FORCE_PATH_STYLE') !== 'false',
      });
    }
  }

  async onModuleInit() {
    if (!this.s3) {
      this.logger.log('Document storage: local uploads/');
      return;
    }
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Document storage: S3 (${this.config.get('S3_ENDPOINT')})`);
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created S3 bucket: ${this.bucket}`);
      } catch (err) {
        this.logger.warn(`S3 unavailable, falling back to local storage: ${err}`);
        this.s3 = null;
        this.useS3 = false;
      }
    }
  }

  get mode(): 's3' | 'local' {
    return this.useS3 ? 's3' : 'local';
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.useS3 && this.s3) {
      try {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
          }),
        );
        return `/api/v1/files/${key}`;
      } catch (err) {
        this.logger.warn(`S3 upload failed, using local: ${err}`);
      }
    }
    writeFileSync(join(LOCAL_DIR, key), buffer);
    return `/api/v1/files/${key}`;
  }

  async getStream(key: string): Promise<{ stream: Readable; mimeType?: string } | null> {
    if (this.useS3 && this.s3) {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) return null;
      return {
        stream: res.Body as Readable,
        mimeType: res.ContentType,
      };
    }
    const path = join(LOCAL_DIR, key);
    if (!existsSync(path)) return null;
    return { stream: createReadStream(path) };
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    if (!this.useS3 || !this.s3) return null;
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }
}