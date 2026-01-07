import { UserRepository } from '@/repositories/user.repository';
import { 
  RefreshTokenRepository, 
  SessionRepository, 
  EmailVerificationRepository,
  PasswordResetRepository 
} from '@/repositories/auth.repository';
import { AuditLogRepository } from '@/repositories/audit.repository';
import { CryptoUtils } from '@/utils/crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '@/config/env';
import { ServiceResponse, GoogleTokenPayload, JwtPayload } from '@/types';
import { cacheService } from '@/config/redis';

export class AuthService {
  private userRepo: UserRepository;
  private refreshTokenRepo: RefreshTokenRepository;
  private sessionRepo: SessionRepository;
  private emailVerificationRepo: EmailVerificationRepository;
  private passwordResetRepo: PasswordResetRepository;
  private auditLogRepo: AuditLogRepository;
  private googleClient: OAuth2Client;

  constructor() {
    this.userRepo = new UserRepository();
    this.refreshTokenRepo = new RefreshTokenRepository();
    this.sessionRepo = new SessionRepository();
    this.emailVerificationRepo = new EmailVerificationRepository();
    this.passwordResetRepo = new PasswordResetRepository();
    this.auditLogRepo = new AuditLogRepository();
    this.googleClient = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    referralCode?: string;
  }, deviceInfo?: any): Promise<ServiceResponse> {
    try {
      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser) {
        return { success: false, error: 'Email already registered', statusCode: 400 };
      }

      let referrerId: string | undefined;
      if (data.referralCode) {
        const referrer = await this.userRepo.findByReferralCode(data.referralCode);
        if (!referrer) {
          return { success: false, error: 'Invalid referral code', statusCode: 400 };
        }
        referrerId = referrer.id;
      }

      const passwordHash = await CryptoUtils.hashPassword(data.password);
      const referralCode = CryptoUtils.generateReferralCode();

      const user = await this.userRepo.create({
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.email,
        referralCode,
        referredById: referrerId,
        authProvider: 'EMAIL',
        credits: env.BASE_REFERRAL_CREDITS,
      });

      // Create email verification token
      const verificationToken = CryptoUtils.generateRandomToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await this.emailVerificationRepo.create(user.id, verificationToken, expiresAt);

      // Log audit
      await this.auditLogRepo.create({
        userId: user.id,
        action: 'LOGIN',
        details: { method: 'email_registration' },
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.userAgent,
      });

      const tokens = await this.generateTokens(user, deviceInfo);

      return {
        success: true,
        data: {
          user: this.sanitizeUser(user),
          tokens,
          verificationToken, // In production, send via email
        },
        statusCode: 201,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async login(email: string, password: string, deviceInfo?: any): Promise<ServiceResponse> {
    try {
      const user = await this.userRepo.findByEmail(email);
      if (!user || !user.passwordHash) {
        return { success: false, error: 'Invalid credentials', statusCode: 401 };
      }

      if (user.status === 'BANNED') {
        return { success: false, error: 'Account is banned', statusCode: 403 };
      }

      if (user.status === 'SUSPENDED') {
        return { success: false, error: 'Account is suspended', statusCode: 403 };
      }

      const isPasswordValid = await CryptoUtils.comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid credentials', statusCode: 401 };
      }

      await this.userRepo.updateLastLogin(user.id, deviceInfo?.ip || 'unknown');

      await this.auditLogRepo.create({
        userId: user.id,
        action: 'LOGIN',
        details: { method: 'email_password' },
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.userAgent,
      });

      const tokens = await this.generateTokens(user, deviceInfo);

      return {
        success: true,
        data: {
          user: this.sanitizeUser(user),
          tokens,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async googleLogin(idToken: string, deviceInfo?: any): Promise<ServiceResponse> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload() as GoogleTokenPayload;
      if (!payload || !payload.email) {
        return { success: false, error: 'Invalid Google token', statusCode: 401 };
      }

      let user = await this.userRepo.findByEmail(payload.email);

      if (!user) {
        // Auto-register with Google
        const referralCode = CryptoUtils.generateReferralCode();
        user = await this.userRepo.create({
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          firstName: payload.given_name,
          lastName: payload.family_name,
          displayName: payload.name || payload.email,
          avatar: payload.picture,
          authProvider: 'GOOGLE',
          isEmailVerified: payload.email_verified || true,
          referralCode,
          credits: env.BASE_REFERRAL_CREDITS,
        });
      } else if (!user.googleId) {
        // Link Google account to existing email account
        user = await this.userRepo.update(user.id, {
          googleId: payload.sub,
          isEmailVerified: true,
          avatar: user.avatar || payload.picture,
        }) as any;
      }

      if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
        return { success: false, error: `Account is ${user.status.toLowerCase()}`, statusCode: 403 };
      }

      await this.userRepo.updateLastLogin(user.id, deviceInfo?.ip || 'unknown');

      await this.auditLogRepo.create({
        userId: user.id,
        action: 'LOGIN',
        details: { method: 'google_oauth' },
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.userAgent,
      });

      const tokens = await this.generateTokens(user, deviceInfo);

      return {
        success: true,
        data: {
          user: this.sanitizeUser(user),
          tokens,
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async refreshToken(refreshToken: string, deviceInfo?: any): Promise<ServiceResponse> {
    try {
      const payload = CryptoUtils.verifyRefreshToken(refreshToken);
      
      const tokenRecord = await this.refreshTokenRepo.findByToken(refreshToken);
      if (!tokenRecord) {
        return { success: false, error: 'Invalid refresh token', statusCode: 401 };
      }

      const user = await this.userRepo.findById(payload.userId);
      if (!user) {
        return { success: false, error: 'User not found', statusCode: 404 };
      }

      // Revoke old token
      await this.refreshTokenRepo.revokeToken(refreshToken);

      // Generate new tokens
      const tokens = await this.generateTokens(user, deviceInfo);

      return {
        success: true,
        data: { tokens },
        statusCode: 200,
      };
    } catch (error: any) {
      return { success: false, error: 'Invalid refresh token', statusCode: 401 };
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<ServiceResponse> {
    try {
      if (refreshToken) {
        await this.refreshTokenRepo.revokeToken(refreshToken);
      }

      await this.auditLogRepo.create({
        userId,
        action: 'LOGOUT',
      });

      // Clear cache
      await cacheService.delete(`user:${userId}`);

      return { success: true, statusCode: 200 };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  async logoutAllSessions(userId: string): Promise<ServiceResponse> {
    try {
      await this.refreshTokenRepo.revokeAllUserTokens(userId);
      await this.sessionRepo.invalidateAllUserSessions(userId);

      await this.auditLogRepo.create({
        userId,
        action: 'LOGOUT',
        details: { type: 'all_sessions' },
      });

      await cacheService.delete(`user:${userId}`);

      return { success: true, statusCode: 200 };
    } catch (error: any) {
      return { success: false, error: error.message, statusCode: 500 };
    }
  }

  private async generateTokens(user: any, deviceInfo?: any) {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = CryptoUtils.generateAccessToken(payload);
    const refreshToken = CryptoUtils.generateRefreshToken(payload);
    const sessionToken = CryptoUtils.generateSessionToken();

    // Store refresh token
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.refreshTokenRepo.create({
      userId: user.id,
      token: refreshToken,
      deviceInfo,
      expiresAt: refreshExpiresAt,
    });

    // Create session
    await this.sessionRepo.create({
      userId: user.id,
      sessionToken,
      deviceInfo,
      expiresAt: refreshExpiresAt,
    });

    return { accessToken, refreshToken, sessionToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}