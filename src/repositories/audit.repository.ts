import { db } from '@/config/database';
import { auditLogs } from '@/models/schema';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';
import { PaginationParams, PaginatedResponse } from '@/types';

export class AuditLogRepository {
  async create(data: {
    userId?: string;
    adminId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const [log] = await db.insert(auditLogs).values(data as any).returning();
    return log;
  }

  async findByUserId(userId: string, params: PaginationParams) {
    const { page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId));

    const total = totalResult?.count || 0;

    const data = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findByAdminId(adminId: string, params: PaginationParams) {
    const { page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.adminId, adminId));

    const total = totalResult?.count || 0;

    const data = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.adminId, adminId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findAll(params: PaginationParams & { action?: string }) {
    const { page = 1, limit = 50, action } = params;
    const offset = (page - 1) * limit;

    const conditions = action ? [eq(auditLogs.action, action as any)] : [];

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult?.count || 0;

    const data = await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getRecentActivity(limit: number = 100) {
    return db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async deleteOldLogs(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db
      .delete(auditLogs)
      .where(sql`${auditLogs.createdAt} < ${cutoffDate}`);
  }
}