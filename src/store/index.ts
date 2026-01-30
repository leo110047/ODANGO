/**
 * Store 模組匯出
 */

export {
  loadConfig,
  saveConfig,
  saveServerUrl,
  saveToken,
  clearToken,
  savePollInterval,
  saveAllPets,
  saveSelectedPetIds,
  saveWindowPosition,
  savePetWindowY,
  saveWindowConfig,
  savePetSettings,
  getPetSettings,
  isTokenValid,
} from './config';

export {
  getSpriteUrl,
  preloadSprites,
  clearBlobUrlCache,
  getSpriteCachePath,
} from './spriteCache';

export {
  canRequestPairCode,
  recordPairCodeRequest,
  onVerificationSuccess,
  canLogout,
  recordLogout,
  canLogin,
  recordLogin,
  canMakeApiRequest,
  recordApiRequest,
  getRateLimitStatus,
  resetAllRateLimits,
  getPairCodeRequestCount,
  shouldShowPairCodeWarning,
} from './rateLimit';

export type { RateLimitResult } from './rateLimit';
