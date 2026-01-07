// src/utils/seed.ts
import { UserRepository } from '@/repositories/user.repository';
import { CryptoUtils } from '@/utils/crypto';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const initializeSuperAdmin = async () => {
  try {
    const userRepo = new UserRepository();
    
    const existingAdmin = await userRepo.findByEmail(env.SUPER_ADMIN_EMAIL!);
    
    if (existingAdmin) {
      logger.info('Super admin already exists');
      return;
    }

    const passwordHash = await CryptoUtils.hashPassword(env.SUPER_ADMIN_PASSWORD!);
    const referralCode = CryptoUtils.generateReferralCode();

    await userRepo.create({
      email: env.SUPER_ADMIN_EMAIL!.toLowerCase(),
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isEmailVerified: true,
      authProvider: 'EMAIL',
      displayName: 'Super Admin',
      referralCode,
      credits: 0,
    });

    logger.info('✅ Super admin created successfully');
  } catch (error) {
    logger.error('Failed to create super admin:', error);
  }
};

