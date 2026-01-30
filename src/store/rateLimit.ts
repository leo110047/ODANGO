/**
 * 客戶端 Rate Limiting 模組
 *
 * 防止用戶濫用 API，在客戶端限制請求頻率
 */

import { load, Store } from '@tauri-apps/plugin-store';

const STORE_PATH = 'rate-limit.json';
let store: Store | null = null;

/**
 * Rate Limit 資料結構
 */
interface RateLimitData {
  /** 驗證碼請求次數（未完成驗證的請求） */
  pairCodeRequests: number;
  /** 最後一次成功驗證的時間 */
  lastSuccessfulVerification: number | null;
  /** 驗證碼請求被禁止到什麼時候（timestamp） */
  pairCodeBannedUntil: number | null;
  /** 登出次數（24 小時內） */
  logoutCount: number;
  /** 登出計數開始時間 */
  logoutCountStartTime: number | null;
  /** 登入次數（24 小時內） */
  loginCount: number;
  /** 登入計數開始時間 */
  loginCountStartTime: number | null;
  /** 最後一次 API 請求時間 */
  lastApiRequestTime: number | null;
}

const DEFAULT_RATE_LIMIT_DATA: RateLimitData = {
  pairCodeRequests: 0,
  lastSuccessfulVerification: null,
  pairCodeBannedUntil: null,
  logoutCount: 0,
  logoutCountStartTime: null,
  loginCount: 0,
  loginCountStartTime: null,
  lastApiRequestTime: null,
};

// 常數配置
const MAX_PAIR_CODE_REQUESTS = 5; // 最多 5 次未驗證請求
const PAIR_CODE_BAN_DURATION_MS = 24 * 60 * 60 * 1000; // 禁止 24 小時
const MAX_LOGOUT_PER_DAY = 5; // 每天最多 5 次登出
const MAX_LOGIN_PER_DAY = 10; // 每天最多 10 次登入
const MIN_API_REQUEST_INTERVAL_MS = 1000; // API 請求最小間隔 1 秒
const MIN_PAIR_CODE_REQUEST_INTERVAL_MS = 30 * 1000; // 驗證碼請求最小間隔 30 秒
const DAY_MS = 24 * 60 * 60 * 1000; // 24 小時

let cachedData: RateLimitData | null = null;
let lastPairCodeRequestTime: number | null = null;

/**
 * 取得 Store 實例
 */
async function getStore(): Promise<Store> {
  if (!store) {
    store = await load(STORE_PATH, { defaults: {} });
  }
  return store;
}

/**
 * 載入 Rate Limit 資料
 */
async function loadData(): Promise<RateLimitData> {
  if (cachedData) {
    return cachedData;
  }

  try {
    const s = await getStore();
    const data = await s.get<RateLimitData>('rateLimitData');
    cachedData = data ?? { ...DEFAULT_RATE_LIMIT_DATA };
    return cachedData;
  } catch (error) {
    console.error('Failed to load rate limit data:', error);
    cachedData = { ...DEFAULT_RATE_LIMIT_DATA };
    return cachedData;
  }
}

/**
 * 儲存 Rate Limit 資料
 */
async function saveData(data: RateLimitData): Promise<void> {
  try {
    const s = await getStore();
    await s.set('rateLimitData', data);
    await s.save();
    cachedData = data;
  } catch (error) {
    console.error('Failed to save rate limit data:', error);
  }
}

/**
 * Rate Limit 檢查結果
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
}

/**
 * 檢查是否可以請求驗證碼
 */
export async function canRequestPairCode(): Promise<RateLimitResult> {
  const data = await loadData();
  const now = Date.now();

  // 檢查是否被禁止
  if (data.pairCodeBannedUntil && now < data.pairCodeBannedUntil) {
    const retryAfterMs = data.pairCodeBannedUntil - now;
    const hoursLeft = Math.ceil(retryAfterMs / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `驗證碼請求已被暫時禁止，請在 ${hoursLeft} 小時後再試`,
      retryAfterMs,
    };
  }

  // 檢查請求間隔
  if (lastPairCodeRequestTime && now - lastPairCodeRequestTime < MIN_PAIR_CODE_REQUEST_INTERVAL_MS) {
    const retryAfterMs = MIN_PAIR_CODE_REQUEST_INTERVAL_MS - (now - lastPairCodeRequestTime);
    const secondsLeft = Math.ceil(retryAfterMs / 1000);
    return {
      allowed: false,
      reason: `請等待 ${secondsLeft} 秒後再發送驗證碼`,
      retryAfterMs,
    };
  }

  // 檢查未驗證請求次數
  if (data.pairCodeRequests >= MAX_PAIR_CODE_REQUESTS) {
    // 設定禁止時間
    data.pairCodeBannedUntil = now + PAIR_CODE_BAN_DURATION_MS;
    await saveData(data);
    return {
      allowed: false,
      reason: '驗證碼請求次數過多，請在 24 小時後再試',
      retryAfterMs: PAIR_CODE_BAN_DURATION_MS,
    };
  }

  return { allowed: true };
}

/** 警告門檻（第幾次請求後開始警告） */
const WARNING_THRESHOLD = 3;

/**
 * 取得當前未驗證的請求次數
 */
export async function getPairCodeRequestCount(): Promise<number> {
  const data = await loadData();
  return data.pairCodeRequests;
}

/**
 * 檢查是否需要顯示警告（已請求 3 次以上但未驗證）
 * @returns 剩餘次數，如果不需要警告則返回 null
 */
export async function shouldShowPairCodeWarning(): Promise<number | null> {
  const data = await loadData();
  if (data.pairCodeRequests >= WARNING_THRESHOLD) {
    const remaining = MAX_PAIR_CODE_REQUESTS - data.pairCodeRequests;
    return remaining;
  }
  return null;
}

/**
 * 記錄驗證碼請求
 */
export async function recordPairCodeRequest(): Promise<void> {
  const data = await loadData();
  data.pairCodeRequests += 1;
  lastPairCodeRequestTime = Date.now();
  await saveData(data);
  console.log(`Pair code requests: ${data.pairCodeRequests}/${MAX_PAIR_CODE_REQUESTS}`);
}

/**
 * 驗證成功後重置計數
 */
export async function onVerificationSuccess(): Promise<void> {
  const data = await loadData();
  data.pairCodeRequests = 0;
  data.lastSuccessfulVerification = Date.now();
  data.pairCodeBannedUntil = null;
  await saveData(data);
  console.log('Verification successful, reset pair code request count');
}

/**
 * 檢查是否可以登出
 */
export async function canLogout(): Promise<RateLimitResult> {
  const data = await loadData();
  const now = Date.now();

  // 重置 24 小時前的計數
  if (data.logoutCountStartTime && now - data.logoutCountStartTime > DAY_MS) {
    data.logoutCount = 0;
    data.logoutCountStartTime = null;
    await saveData(data);
  }

  if (data.logoutCount >= MAX_LOGOUT_PER_DAY) {
    const retryAfterMs = data.logoutCountStartTime
      ? DAY_MS - (now - data.logoutCountStartTime)
      : 0;
    const hoursLeft = Math.ceil(retryAfterMs / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `今日登出次數已達上限（${MAX_LOGOUT_PER_DAY} 次），請 ${hoursLeft} 小時後再試`,
      retryAfterMs,
    };
  }

  return { allowed: true };
}

/**
 * 記錄登出
 */
export async function recordLogout(): Promise<void> {
  const data = await loadData();
  const now = Date.now();

  // 如果是新的 24 小時週期，重置計數
  if (!data.logoutCountStartTime || now - data.logoutCountStartTime > DAY_MS) {
    data.logoutCount = 1;
    data.logoutCountStartTime = now;
  } else {
    data.logoutCount += 1;
  }

  await saveData(data);
  console.log(`Logout count: ${data.logoutCount}/${MAX_LOGOUT_PER_DAY}`);
}

/**
 * 檢查是否可以登入
 */
export async function canLogin(): Promise<RateLimitResult> {
  const data = await loadData();
  const now = Date.now();

  // 重置 24 小時前的計數
  if (data.loginCountStartTime && now - data.loginCountStartTime > DAY_MS) {
    data.loginCount = 0;
    data.loginCountStartTime = null;
    await saveData(data);
  }

  if (data.loginCount >= MAX_LOGIN_PER_DAY) {
    const retryAfterMs = data.loginCountStartTime
      ? DAY_MS - (now - data.loginCountStartTime)
      : 0;
    const hoursLeft = Math.ceil(retryAfterMs / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `今日登入次數已達上限（${MAX_LOGIN_PER_DAY} 次），請 ${hoursLeft} 小時後再試`,
      retryAfterMs,
    };
  }

  return { allowed: true };
}

/**
 * 記錄登入（完成配對）
 */
export async function recordLogin(): Promise<void> {
  const data = await loadData();
  const now = Date.now();

  // 如果是新的 24 小時週期，重置計數
  if (!data.loginCountStartTime || now - data.loginCountStartTime > DAY_MS) {
    data.loginCount = 1;
    data.loginCountStartTime = now;
  } else {
    data.loginCount += 1;
  }

  await saveData(data);
  console.log(`Login count: ${data.loginCount}/${MAX_LOGIN_PER_DAY}`);
}

/**
 * 檢查是否可以發送 API 請求
 */
export async function canMakeApiRequest(): Promise<RateLimitResult> {
  const data = await loadData();
  const now = Date.now();

  if (data.lastApiRequestTime && now - data.lastApiRequestTime < MIN_API_REQUEST_INTERVAL_MS) {
    const retryAfterMs = MIN_API_REQUEST_INTERVAL_MS - (now - data.lastApiRequestTime);
    return {
      allowed: false,
      reason: '請求過於頻繁，請稍後再試',
      retryAfterMs,
    };
  }

  return { allowed: true };
}

/**
 * 記錄 API 請求
 */
export async function recordApiRequest(): Promise<void> {
  const data = await loadData();
  data.lastApiRequestTime = Date.now();
  await saveData(data);
}

/**
 * 取得目前的 rate limit 狀態（用於除錯）
 */
export async function getRateLimitStatus(): Promise<{
  pairCodeRequests: number;
  maxPairCodeRequests: number;
  isBanned: boolean;
  bannedUntil: Date | null;
  logoutCount: number;
  maxLogoutPerDay: number;
  loginCount: number;
  maxLoginPerDay: number;
}> {
  const data = await loadData();
  const now = Date.now();

  return {
    pairCodeRequests: data.pairCodeRequests,
    maxPairCodeRequests: MAX_PAIR_CODE_REQUESTS,
    isBanned: !!(data.pairCodeBannedUntil && now < data.pairCodeBannedUntil),
    bannedUntil: data.pairCodeBannedUntil ? new Date(data.pairCodeBannedUntil) : null,
    logoutCount: data.logoutCount,
    maxLogoutPerDay: MAX_LOGOUT_PER_DAY,
    loginCount: data.loginCount,
    maxLoginPerDay: MAX_LOGIN_PER_DAY,
  };
}

/**
 * 重置所有 rate limit（僅供開發測試用）
 */
export async function resetAllRateLimits(): Promise<void> {
  await saveData({ ...DEFAULT_RATE_LIMIT_DATA });
  lastPairCodeRequestTime = null;
  console.log('All rate limits reset');
}
