# 開發指南

## 系統需求

- **Node.js** 18+
- **Rust** (最新穩定版)
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools 2019+

## 安裝 Rust

如果尚未安裝 Rust：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

## 安裝專案依賴

```bash
cd discord-pet-overlay
npm install
```

## 開發模式

```bash
npm run tauri dev
```

## 執行測試

```bash
npm test
```

## 打包

```bash
npm run tauri build
```

產出檔案位於 `src-tauri/target/release/bundle/`

## 專案結構

```
discord-pet-overlay/
├── src/                    # 前端原始碼
│   ├── api/                # API Client
│   │   └── client.ts       # HTTP 請求封裝
│   ├── store/              # 設定儲存
│   │   ├── config.ts       # Tauri Store 封裝
│   │   └── spriteCache.ts  # Sprite 快取
│   ├── anim/               # 動畫系統
│   │   └── pet.ts          # 寵物控制器
│   ├── main.ts             # 主視窗入口
│   ├── settings-window.ts  # 設定視窗
│   ├── interaction-mode.ts # 互動模式（拖曳、縮放）
│   ├── styles.css          # 主視窗樣式
│   ├── settings.css        # 設定視窗樣式
│   └── types.ts            # TypeScript 類型
├── src-tauri/              # Tauri 後端（Rust）
│   ├── src/
│   │   ├── main.rs         # 主程式
│   │   └── lib.rs          # 程式庫
│   ├── capabilities/       # 權限設定
│   ├── Cargo.toml          # Rust 依賴
│   └── tauri.conf.json     # Tauri 設定
├── index.html              # 主視窗 HTML
├── settings.html           # 設定視窗 HTML
├── vite.config.ts          # Vite 設定
├── tsconfig.json           # TypeScript 設定
└── package.json
```

## 主要模組說明

### API Client (`src/api/`)

負責與後端 API 通訊，包含：
- 配對碼請求與驗證
- 寵物狀態獲取
- Token 管理

### Store (`src/store/`)

使用 Tauri Store plugin 持久化儲存：
- 使用者設定
- Token 資訊
- 寵物選擇
- 視窗位置

### Animation (`src/anim/`)

寵物動畫控制：
- 移動邏輯
- Sprite 翻轉
- 多寵物管理

### Interaction Mode (`src/interaction-mode.ts`)

視窗互動模式：
- 熱鍵偵測
- 視窗拖曳
- 寬度調整
