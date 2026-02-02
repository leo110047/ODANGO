/**
 * 寵物動畫模組
 *
 * 負責控制寵物的移動、動畫和外觀
 * 支援多隻寵物同時顯示
 */

import { PetState, SpriteFacing } from '../types';
import { getSpriteUrl as fetchSpriteUrl } from '../store/spriteCache';

/** API 伺服器 URL（由外部設定） */
let apiBaseUrl: string = '';

/** 移動速度範圍 */
export const SPEED_MIN = 0.3;
export const SPEED_MAX = 2.0;
export const SPEED_DEFAULT = 1.0;

/** 螢幕大小參考值（用於計算寵物大小縮放） */
const REFERENCE_SCREEN_WIDTH = 1920;
const REFERENCE_SCREEN_HEIGHT = 1080;

/** 寵物基礎大小（在參考螢幕尺寸下） */
const BASE_PET_SIZE = 64;

/** 基礎顯示倍率（讓預設大小更適合觀看） */
const BASE_DISPLAY_MULTIPLIER = 1.5;

/** 螢幕縮放因子範圍 */
const MIN_SCREEN_SCALE_FACTOR = 0.75; // 最小縮放（小螢幕）
const MAX_SCREEN_SCALE_FACTOR = 1.5;  // 最大縮放（大螢幕）

/** 全域螢幕縮放因子 */
let globalScreenScaleFactor = 1.0;

/**
 * 根據螢幕大小計算縮放因子
 * @param screenWidth 螢幕寬度
 * @param screenHeight 螢幕高度
 */
export function calculateScreenScaleFactor(screenWidth: number, screenHeight: number): number {
  // 使用螢幕對角線來計算縮放比例
  const referenceDiagonal = Math.sqrt(
    REFERENCE_SCREEN_WIDTH ** 2 + REFERENCE_SCREEN_HEIGHT ** 2
  );
  const currentDiagonal = Math.sqrt(screenWidth ** 2 + screenHeight ** 2);

  // 計算縮放因子
  let scaleFactor = currentDiagonal / referenceDiagonal;

  // 限制在合理範圍內
  scaleFactor = Math.max(MIN_SCREEN_SCALE_FACTOR, Math.min(MAX_SCREEN_SCALE_FACTOR, scaleFactor));

  return scaleFactor;
}

/**
 * 設定全域螢幕縮放因子
 * @param screenWidth 螢幕寬度
 * @param screenHeight 螢幕高度
 */
export function setScreenSize(screenWidth: number, screenHeight: number): void {
  globalScreenScaleFactor = calculateScreenScaleFactor(screenWidth, screenHeight);
  console.log(`Screen size set: ${screenWidth}x${screenHeight}, scale factor: ${globalScreenScaleFactor.toFixed(2)}`);
}

/**
 * 取得當前的螢幕縮放因子
 */
export function getScreenScaleFactor(): number {
  return globalScreenScaleFactor;
}

/**
 * 設定 API 伺服器 URL
 */
export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url.replace(/\/$/, '');
}

/**
 * 取得 Sprite 完整 URL
 * 優先從快取取得，沒有則從 API 下載
 */
async function getSpriteUrl(spritePath: string): Promise<string> {
  if (!apiBaseUrl) {
    console.warn('API base URL not set, cannot load sprite');
    return '';
  }
  return fetchSpriteUrl(apiBaseUrl, spritePath);
}

/**
 * 單一寵物控制器
 */
export class PetController {
  private element: HTMLElement;
  private containerWidth: number;
  private x: number;
  private direction: 1 | -1 = 1; // 1 = 右, -1 = 左
  private baseSpeed: number = SPEED_DEFAULT;
  private scale: number = 1;
  private animationFrameId: number | null = null;
  private isPaused: boolean = false;
  private isMovementEnabled: boolean = true;
  private petId: string = '';
  private spritePath: string = '';
  private stage: string = 'egg';
  private defaultFacing: SpriteFacing = 'left';

  // 隨機漫步相關
  private targetX: number = 0;
  private isResting: boolean = false;
  private restEndTime: number = 0;
  private speedMultiplier: number = 1; // 每隻寵物略有不同的速度

  constructor(element: HTMLElement, containerWidth: number, initialX?: number) {
    this.element = element;
    this.containerWidth = containerWidth;
    this.x = initialX ?? Math.random() * (containerWidth - 100) + 50;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    // 每隻寵物有 ±20% 的速度差異
    this.speedMultiplier = 0.8 + Math.random() * 0.4;
    // 設定初始目標
    this.pickNewTarget();
    this.updatePosition();
    this.updateDirection();
  }

  /**
   * 選擇新的隨機目標位置
   */
  private pickNewTarget(): void {
    const petWidth = this.element.offsetWidth || 64;
    const margin = 20;
    const minX = margin;
    const maxX = this.containerWidth - petWidth - margin;

    // 隨機選擇目標，但至少要離當前位置 50px
    let newTarget: number;
    do {
      newTarget = minX + Math.random() * (maxX - minX);
    } while (Math.abs(newTarget - this.x) < 50 && maxX - minX > 100);

    this.targetX = newTarget;
    this.direction = newTarget > this.x ? 1 : -1;
    this.updateDirection();
  }

  /**
   * 開始休息
   */
  private startResting(): void {
    this.isResting = true;
    // 休息 2-8 秒
    const restDuration = 2000 + Math.random() * 6000;
    this.restEndTime = Date.now() + restDuration;
    this.element.classList.remove('walking');
  }

  /**
   * 檢查是否為蛋（蛋不能移動）
   */
  private isEgg(): boolean {
    return this.stage === 'egg';
  }

  /**
   * 取得寵物 ID
   */
  getPetId(): string {
    return this.petId;
  }

  /**
   * 更新寵物狀態
   */
  updateState(state: PetState): void {
    this.petId = state.odangoId;
    this.scale = state.scale;
    this.spritePath = state.spritePath;
    this.stage = state.stage;
    this.defaultFacing = state.defaultFacing || 'left';
    this.updateSprite();
    this.updateScale();
    this.updateDirection(); // 更新方向以反映新的 defaultFacing
  }

  /**
   * 設定移動速度
   */
  setSpeed(speed: number): void {
    this.baseSpeed = Math.max(SPEED_MIN, Math.min(SPEED_MAX, speed));
  }

  /**
   * 更新素材
   */
  private updateSprite(): void {
    if (this.spritePath) {
      // 先設定 fallback 背景色，確保視窗可見
      this.element.style.backgroundColor = '#7c3aed';
      this.element.style.borderRadius = '50%';

      // 非同步載入 sprite
      getSpriteUrl(this.spritePath).then(spriteUrl => {
        if (spriteUrl) {
          this.element.style.backgroundImage = `url("${spriteUrl}")`;
          this.element.style.backgroundColor = 'transparent';
        }
      }).catch(err => {
        console.error('Failed to load sprite:', err);
      });
    }
  }

  /**
   * 更新大小
   * 根據寵物的 scale、基礎顯示倍率和螢幕縮放因子計算實際大小
   */
  private updateScale(): void {
    // 結合寵物本身的 scale、基礎顯示倍率和螢幕縮放因子
    const effectiveScale = this.scale * BASE_DISPLAY_MULTIPLIER * globalScreenScaleFactor;
    const size = Math.round(BASE_PET_SIZE * effectiveScale);
    this.element.style.width = `${size}px`;
    this.element.style.height = `${size}px`;
  }

  /**
   * 更新位置
   */
  private updatePosition(): void {
    this.element.style.left = `${this.x}px`;
  }

  /**
   * 更新方向
   * 根據 sprite 的預設朝向和當前移動方向決定是否翻轉
   * - defaultFacing = 'left' 且 direction = 1（向右）→ 翻轉
   * - defaultFacing = 'left' 且 direction = -1（向左）→ 不翻轉
   * - defaultFacing = 'right' 且 direction = 1（向右）→ 不翻轉
   * - defaultFacing = 'right' 且 direction = -1（向左）→ 翻轉
   */
  private updateDirection(): void {
    // 判斷是否需要翻轉：移動方向與預設朝向相反時需要翻轉
    const needsFlip =
      (this.defaultFacing === 'left' && this.direction === 1) ||
      (this.defaultFacing === 'right' && this.direction === -1);

    if (needsFlip) {
      this.element.classList.add('facing-right');
      this.element.classList.remove('facing-left');
    } else {
      this.element.classList.add('facing-left');
      this.element.classList.remove('facing-right');
    }
  }

  /**
   * 開始動畫循環
   */
  start(): void {
    if (this.animationFrameId !== null) return;

    this.element.classList.add('walking');
    this.animate();
  }

  /**
   * 停止動畫循環
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.element.classList.remove('walking');
  }

  /**
   * 暫停/繼續
   */
  togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.element.classList.remove('walking');
    } else {
      this.element.classList.add('walking');
    }
  }

  /**
   * 設定容器寬度
   * 同時確保寵物位置在視窗內
   */
  setContainerWidth(width: number): void {
    this.containerWidth = width;
    // 確保寵物位置在新的視窗範圍內
    this.clampPositionToContainer();
  }

  /**
   * 同步位置（當外部拖曳寵物後呼叫）
   */
  syncPosition(): void {
    this.x = this.element.offsetLeft;
    // 更新目標位置，避免寵物立刻跑回原來的目標
    if (!this.isEgg() && !this.isResting) {
      this.pickNewTarget();
    }
  }

  /**
   * 確保寵物位置在容器範圍內
   */
  private clampPositionToContainer(): void {
    const petWidth = this.element.offsetWidth || 64;
    const margin = 10;
    const maxX = this.containerWidth - petWidth - margin;

    if (this.x > maxX) {
      this.x = Math.max(margin, maxX);
      this.updatePosition();
      // 如果正在移動，重新選擇目標
      if (!this.isResting && !this.isEgg()) {
        this.pickNewTarget();
      }
    }
  }

  /**
   * 設定是否啟用移動
   */
  setMovementEnabled(enabled: boolean): void {
    this.isMovementEnabled = enabled;
    if (!enabled) {
      this.element.classList.remove('walking');
    } else if (!this.isPaused && this.animationFrameId !== null) {
      this.element.classList.add('walking');
    }
  }

  /**
   * 取得是否啟用移動
   */
  isMovementEnabledState(): boolean {
    return this.isMovementEnabled;
  }

  /**
   * 動畫主循環
   */
  private animate = (): void => {
    // 蛋不移動，只播放動畫
    if (this.isEgg()) {
      this.animationFrameId = requestAnimationFrame(this.animate);
      return;
    }

    if (!this.isPaused && this.isMovementEnabled) {
      const now = Date.now();

      // 如果在休息中，檢查是否休息結束
      if (this.isResting) {
        if (now >= this.restEndTime) {
          this.isResting = false;
          this.pickNewTarget();
          this.element.classList.add('walking');
        }
      } else {
        // 移動中
        const effectiveSpeed = this.baseSpeed * this.speedMultiplier;
        this.x += effectiveSpeed * this.direction;

        // 邊界檢測
        const petWidth = this.element.offsetWidth || 64;
        const margin = 10;
        if (this.x <= margin) {
          this.x = margin;
          this.startResting();
          this.pickNewTarget();
        } else if (this.x >= this.containerWidth - petWidth - margin) {
          this.x = this.containerWidth - petWidth - margin;
          this.startResting();
          this.pickNewTarget();
        }

        // 檢查是否到達目標
        const distanceToTarget = Math.abs(this.x - this.targetX);
        if (distanceToTarget < effectiveSpeed * 2) {
          // 到達目標，開始休息
          this.startResting();
        }

        this.updatePosition();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * 設定位置
   */
  setPosition(x: number): void {
    this.x = x;
    this.updatePosition();
  }

  /**
   * 取得位置
   */
  getPosition(): number {
    return this.x;
  }

  /**
   * 取得 DOM 元素
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * 銷毀
   */
  destroy(): void {
    this.stop();
    this.element.remove();
  }
}

/** 寵物顯示設定（從外部傳入） */
export interface PetDisplaySettings {
  movementEnabled: boolean;
  movementSpeed: number;
}

/**
 * 多寵物管理器
 */
export class MultiPetManager {
  private container: HTMLElement;
  private containerWidth: number;
  private controllers: Map<string, PetController> = new Map();
  private onPetClick: ((petId: string) => void) | null = null;
  private petSettingsGetter: ((petId: string) => PetDisplaySettings) | null = null;

  constructor(container: HTMLElement, containerWidth: number) {
    this.container = container;
    this.containerWidth = containerWidth;
  }

  /**
   * 設定寵物設定取得器
   */
  setPetSettingsGetter(getter: (petId: string) => PetDisplaySettings): void {
    this.petSettingsGetter = getter;
  }

  /**
   * 更新單隻寵物的設定
   */
  updatePetSettings(petId: string, settings: PetDisplaySettings): void {
    const controller = this.controllers.get(petId);
    if (controller) {
      controller.setMovementEnabled(settings.movementEnabled);
      controller.setSpeed(settings.movementSpeed);
    }
  }

  /**
   * 設定寵物點擊回調
   */
  setOnPetClick(callback: (petId: string) => void): void {
    this.onPetClick = callback;
  }

  /**
   * 更新顯示的寵物列表
   */
  updatePets(pets: PetState[]): void {
    const currentIds = new Set(this.controllers.keys());
    const newIds = new Set(pets.map(p => p.odangoId));

    // 移除不在列表中的寵物
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        this.removePet(id);
      }
    }

    // 新增或更新寵物
    for (const pet of pets) {
      if (this.controllers.has(pet.odangoId)) {
        // 更新現有寵物
        this.controllers.get(pet.odangoId)!.updateState(pet);
      } else {
        // 新增寵物（隨機位置）
        this.addPet(pet);
      }
    }
  }

  /**
   * 新增寵物
   */
  private addPet(pet: PetState): void {
    // 建立 DOM 元素
    const element = document.createElement('div');
    element.className = 'pet';
    element.dataset.petId = pet.odangoId;
    this.container.appendChild(element);

    // 建立控制器（位置會在建構子中隨機產生）
    const controller = new PetController(element, this.containerWidth);
    controller.updateState(pet);

    // 套用個別設定
    if (this.petSettingsGetter) {
      const settings = this.petSettingsGetter(pet.odangoId);
      controller.setMovementEnabled(settings.movementEnabled);
      controller.setSpeed(settings.movementSpeed);
    }

    controller.start();

    // 綁定點擊事件
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onPetClick) {
        this.onPetClick(pet.odangoId);
      }
    });

    this.controllers.set(pet.odangoId, controller);
  }

  /**
   * 移除寵物
   */
  private removePet(petId: string): void {
    const controller = this.controllers.get(petId);
    if (controller) {
      controller.destroy();
      this.controllers.delete(petId);
    }
  }

  /**
   * 設定容器寬度
   */
  setContainerWidth(width: number): void {
    this.containerWidth = width;
    for (const controller of this.controllers.values()) {
      controller.setContainerWidth(width);
    }
  }

  /**
   * 同步寵物位置（當外部拖曳寵物後呼叫）
   */
  syncPetPosition(petId: string): void {
    const controller = this.controllers.get(petId);
    if (controller) {
      controller.syncPosition();
    }
  }

  /**
   * 開始所有寵物動畫
   */
  startAll(): void {
    for (const controller of this.controllers.values()) {
      controller.start();
    }
  }

  /**
   * 停止所有寵物動畫
   */
  stopAll(): void {
    for (const controller of this.controllers.values()) {
      controller.stop();
    }
  }

  /**
   * 取得寵物數量
   */
  getPetCount(): number {
    return this.controllers.size;
  }

  /**
   * 清除所有寵物
   */
  clear(): void {
    for (const controller of this.controllers.values()) {
      controller.destroy();
    }
    this.controllers.clear();
  }

  /**
   * 銷毀
   */
  destroy(): void {
    this.clear();
  }
}

/**
 * 建立單一寵物控制器（向後相容）
 */
export function createPetController(
  element: HTMLElement,
  containerWidth: number
): PetController {
  return new PetController(element, containerWidth);
}

/**
 * 建立多寵物管理器
 */
export function createMultiPetManager(
  container: HTMLElement,
  containerWidth: number
): MultiPetManager {
  return new MultiPetManager(container, containerWidth);
}
