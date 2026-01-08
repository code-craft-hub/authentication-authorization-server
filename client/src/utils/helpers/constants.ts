export const APP_CONFIG = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1",
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  APP_NAME: import.meta.env.VITE_APP_NAME || "Enterprise Auth App",
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
  ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA === "true",
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",

  DASHBOARD: "/dashboard",
  PROFILE: "/dashboard/profile",
  REFERRALS: "/dashboard/referrals",
  CREDITS: "/dashboard/credits",
  SETTINGS: "/dashboard/settings",

  ADMIN: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_USER_DETAILS: "/admin/users/:id",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    GOOGLE: "/auth/google",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    LOGOUT_ALL: "/auth/logout-all",
  },
  USER: {
    PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/profile",
    REFERRAL_STATS: "/users/referrals/stats",
    REFERRED_USERS: "/users/referrals/users",
    CREDIT_HISTORY: "/users/credits/history",
    LEADERBOARD: "/users/leaderboard",
  },
  ADMIN: {
    USERS: "/admin/users",
    USER_BY_ID: (id: string) => `/admin/users/${id}`,
    UPDATE_USER: (id: string) => `/admin/users/${id}`,
    SUSPEND_USER: (id: string) => `/admin/users/${id}/suspend`,
    BAN_USER: (id: string) => `/admin/users/${id}/ban`,
    SIGN_OUT_USER: (id: string) => `/admin/users/${id}/sign-out`,
    SIGN_OUT_ALL: "/admin/sign-out-all",
    DELETE_USER: (id: string) => `/admin/users/${id}`,
    DASHBOARD: "/admin/dashboard",
    AUDIT_LOGS: "/admin/audit-logs",
  },
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
  THEME: "theme",
  LANGUAGE: "language",
} as const;

export const QUERY_KEYS = {
  USER: "user",
  PROFILE: "profile",
  REFERRAL_STATS: "referralStats",
  REFERRED_USERS: "referredUsers",
  CREDIT_HISTORY: "creditHistory",
  LEADERBOARD: "leaderboard",
  ADMIN_USERS: "adminUsers",
  ADMIN_USER: "adminUser",
  ADMIN_STATS: "adminStats",
  AUDIT_LOGS: "auditLogs",
} as const;

export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  BANNED: "BANNED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
} as const;
