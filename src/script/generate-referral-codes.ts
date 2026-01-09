import {
  pgTable,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const referralCodes = pgTable("referral_codes", {
  code: varchar("code", { length: 20 }).primaryKey(),
  userId: varchar("user_id", { length: 128 }),
  isUsed: boolean("is_used").notNull().default(false),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});


import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import crypto from "crypto";
// import { referralCodes } from "./db/schema/referral-codes";

/**
 * CONFIG
 */
const REFERRAL_CODE_LENGTH = 8;
const TOTAL_CODES = 100;
const REFERRAL_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a secure random referral code
 */
function generateReferralCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let code = "";

  for (let i = 0; i < length; i++) {
    code += REFERRAL_CHARSET[bytes[i] % REFERRAL_CHARSET.length];
  }

  return code;
}

function generateUniqueCodes(count: number, length: number): string[] {
  const set = new Set<string>();
  while (set.size < count) {
    set.add(generateReferralCode(length));
  }
  return [...set];
}

async function generateReferralCodes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);
  const codes = generateUniqueCodes(TOTAL_CODES, REFERRAL_CODE_LENGTH);

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(referralCodes)
        .values(
          codes.map((code) => ({
            code,
            isUsed: false,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          }))
        )
        .onConflictDoNothing();
    });

    console.log(`✅ Generated ${codes.length} referral codes`);
  } finally {
    await pool.end();
  }
}

generateReferralCodes().catch(() => process.exit(1));
