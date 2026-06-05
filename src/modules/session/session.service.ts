import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { Session } from './schemas/session.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    private configService: ConfigService,
  ) {}

  // hash token bằng SHA-256, không cần salt vì token đã đủ entropy (random 64 bytes)
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createSession(
    userId: string | Types.ObjectId,
  ): Promise<{ rawToken: string; expiresAt: Date }> {
    const uid = new Types.ObjectId(userId.toString());

    await this.sessionModel.deleteMany({ userId: uid });

    const ttlDays = parseInt(this.configService.get('TTL_REFRESH_TOKEN')) || 7;
    const rawToken = randomBytes(64).toString('hex');
    const hash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await this.sessionModel.create({
      userId: uid,
      refreshTokenHash: hash,
      expiresAt,
    });

    return { rawToken, expiresAt };
  }

  async verifySession(rawToken: string): Promise<Types.ObjectId | null> {
    const hash = this.hashToken(rawToken);
    const session = await this.sessionModel.findOne({
      refreshTokenHash: hash,
      expiresAt: { $gt: new Date() },
    });

    return session ? session.userId : null;
  }

  async deleteSession(rawToken: string): Promise<void> {
    const hash = this.hashToken(rawToken);
    await this.sessionModel.deleteOne({ refreshTokenHash: hash });
  }

  async deleteAllUserSessions(userId: string | Types.ObjectId): Promise<void> {
    await this.sessionModel.deleteMany({
      userId: new Types.ObjectId(userId.toString()),
    });
  }
}
