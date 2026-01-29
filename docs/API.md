# API 端點

ODANGO 連接 Discord Bot 後端的 API。

## 認證

大部分端點需要在 Header 中帶入 Token：

```
Authorization: Bearer <token>
```

## 端點列表

### 配對流程

#### 請求配對碼

```
POST /api/link/request
```

**Request Body:**
```json
{
  "discordId": "123456789012345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "配對碼已發送",
  "expiresAt": "2024-01-01T00:10:00Z"
}
```

**錯誤碼:**
- `INVALID_DISCORD_ID` - Discord ID 格式不正確
- `COOLDOWN_ACTIVE` - 冷卻中，請稍後再試
- `CANNOT_DM_USER` - 無法發送私訊
- `USER_NOT_FOUND` - 找不到此用戶
- `BOT_NOT_AVAILABLE` - Bot 無法使用

#### 完成配對

```
POST /api/link/complete
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "123456789012345678",
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

**錯誤碼:**
- `CODE_NOT_FOUND` - 配對碼無效
- `CODE_EXPIRED` - 配對碼已過期
- `CODE_ALREADY_USED` - 配對碼已使用
- `TOO_MANY_ATTEMPTS` - 嘗試次數過多

### 寵物資料

#### 取得所有寵物

```
GET /api/me/pets
```

**Response:**
```json
[
  {
    "odangoId": "uuid-string",
    "userId": "123456789012345678",
    "species": "charmander",
    "xp": 150,
    "scale": 1.2,
    "stage": "stage1",
    "stageName": "小火龍",
    "spritePath": "charmander/stage1.gif",
    "defaultFacing": "left",
    "pendingHatch": false,
    "isActive": true,
    "lastUpdatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### 靜態資源

#### 取得 Sprite 圖片

```
GET /assets/{spritePath}
```

例如：`GET /assets/charmander/stage1.gif`

### 系統

#### 健康檢查

```
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z",
  "pollMinSeconds": 600
}
```

#### 檢查更新

```
GET /update/{target}/{arch}/{version}
```

- `target`: `darwin` | `windows`
- `arch`: `aarch64` | `x86_64`
- `version`: 目前版本號

**Response (有更新):**
```json
{
  "version": "1.0.1",
  "url": "https://...",
  "signature": "...",
  "notes": "更新內容"
}
```

**Response (無更新):** HTTP 204 No Content
