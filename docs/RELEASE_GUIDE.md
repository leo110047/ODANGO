# ODANGO 發布指南

## 發布流程概述

由於 Tauri v2 在 GitHub Actions 環境中存在簽名密碼傳遞的 bug，我們採用混合建置策略：

1. **GitHub Actions**：建置安裝檔（DMG、MSI、EXE）
2. **本機**：簽名更新包並上傳

## 重要提醒

> ⚠️ **macOS 和 Windows 必須使用同一組金鑰！**
>
> 私鑰和公鑰必須在所有平台上保持一致，否則自動更新功能會失效。
> 如果在任一平台重新生成金鑰，必須：
> 1. 將新金鑰同步到所有平台
> 2. 更新 `tauri.conf.json` 中的 pubkey
> 3. 重新簽名所有平台的更新包

## 發布步驟

### 1. 更新版本號

使用版本同步腳本自動更新所有檔案的版本號：

```bash
# 檢查當前版本
node scripts/sync-version.mjs

# 更新到新版本
node scripts/sync-version.mjs x.x.x
```

這個腳本會自動更新：
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

> ⚠️ **注意**：更新版本後需要執行 `cargo generate-lockfile` 來更新 Cargo.lock

### 2. 提交並推送

```bash
git add -A
git commit -m "chore: bump version to vx.x.x"
git push
```

### 3. 建立 Tag 觸發 CI

```bash
git tag vx.x.x
git push origin vx.x.x
```

### 4. 等待 CI 完成

GitHub Actions 會自動建置安裝檔並建立 Draft Release。

查看建置狀態：
```bash
gh run list --workflow=release.yml --limit=1
```

### 5. macOS 本機簽名

CI 完成後，在 macOS 執行簽名腳本：

```bash
./scripts/sign-and-upload.sh vx.x.x
```

這個腳本會：
1. 從 Release 下載 `.tar.gz` 更新包
2. 使用本機私鑰簽名
3. 上傳 `.sig` 簽名檔
4. 更新 `latest.json`（僅含 macOS）

### 6. Windows 本機建置與簽名

在 Windows 上執行：

```powershell
# 1. 確認私鑰檔案存在（內容必須與 macOS 相同）
# 位置: %USERPROFILE%\.tauri\odango.key

# 2. 暫時修改 tauri.conf.json
# 將 createUpdaterArtifacts 從 false 改為 true

# 3. 設定環境變數並建置
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\odango.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "tauri2025"
npm run tauri build

# 4. 上傳更新包和簽名檔
gh release upload vx.x.x "src-tauri\target\release\bundle\nsis\ODANGO_x.x.x_x64-setup.nsis.zip"
gh release upload vx.x.x "src-tauri\target\release\bundle\nsis\ODANGO_x.x.x_x64-setup.nsis.zip.sig"

# 5. 更新 latest.json（加入 windows-x86_64 平台）
# 下載現有的 latest.json，加入 Windows 資訊後重新上傳

# 6. 將 createUpdaterArtifacts 改回 false（不要 commit）
```

### 7. 發布 Release

所有平台簽名完成後，發布 Release：

```bash
gh release edit vx.x.x --draft=false
```

或到 GitHub 網頁手動點擊 "Publish release"。

## 檔案說明

### 簽名金鑰

**所有平台使用同一組金鑰：**

- **私鑰位置**：
  - macOS/Linux: `~/.tauri/odango.key`
  - Windows: `%USERPROFILE%\.tauri\odango.key`
- **密碼**：`tauri2025`
- **公鑰**：已內嵌於 `src-tauri/tauri.conf.json`

**私鑰內容（base64 編碼，一行）：**
```
dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5ClJXUlRZMEl5b2JULzRtaVV6Q0VaVHJuaUxPYmJJUHdNK09wUUN1VzU4Yy81UWhpZHZoc0FBQkFBQUFBQUFBQUFBQUlBQUFBQUMxS3dyUnJiTzRsa2dHalZuRjNPc09GOStobEgrMDBCZEJPOFhwQzR5MTc0d21tRzM1OExmTEhyR3ZyaDAyKytULzZCZE5SVzNMVldIS0wvbmRjcEZRYndTQURuRlF4cWdzVFZWRWE3NlFjaE1DcGplWWZ0SEJyTmZ1VTlCaDNDb3dqdmZNVDdraGM9Cg==
```

**公鑰內容：**
```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDE5MkZGNzJGQzcxMDc2MDUKUldRRmRoREhML2N2R2E3enI2cWc0aDBoOUpjajJ1SkVhdXNNYW9aQmQ2cTRZNThFOUFmazduZjQK
```

> ⚠️ 私鑰請妥善保管，遺失將無法發布更新！

### Release 檔案結構

```
vx.x.x Release
├── ODANGO_x.x.x_aarch64.dmg              # macOS ARM 安裝檔
├── ODANGO_x.x.x_x64.dmg                  # macOS Intel 安裝檔
├── ODANGO_x.x.x_x64-setup.exe            # Windows 安裝檔
├── ODANGO_x.x.x_x64_en-US.msi            # Windows MSI 安裝檔
├── ODANGO_aarch64.app.tar.gz             # macOS ARM 更新包
├── ODANGO_aarch64.app.tar.gz.sig         # macOS ARM 簽名
├── ODANGO_x64.app.tar.gz                 # macOS Intel 更新包
├── ODANGO_x64.app.tar.gz.sig             # macOS Intel 簽名
├── ODANGO_x.x.x_x64-setup.nsis.zip       # Windows 更新包
├── ODANGO_x.x.x_x64-setup.nsis.zip.sig   # Windows 簽名
└── latest.json                            # 更新資訊
```

## 故障排除

### CI 建置失敗

1. 檢查錯誤訊息：
   ```bash
   gh run view <run_id> --log-failed
   ```

2. 常見問題：
   - `createUpdaterArtifacts` 應該設為 `false`（CI 不需要簽名）
   - 移除 workflow 中的 `TAURI_SIGNING_PRIVATE_KEY` 環境變數

### 簽名失敗

1. 確認私鑰存在且內容正確：
   ```bash
   # macOS
   cat ~/.tauri/odango.key

   # Windows (PowerShell)
   Get-Content "$env:USERPROFILE\.tauri\odango.key"
   ```

2. 測試簽名：
   ```bash
   echo "test" > test.txt
   npx tauri signer sign --private-key-path ~/.tauri/odango.key --password "tauri2025" test.txt
   ```

3. 常見問題：
   - 私鑰檔案不能有多餘的換行符（應該是一行 base64）
   - 確認密碼正確：`tauri2025`
   - **macOS 和 Windows 的私鑰內容必須完全相同**

### 更新功能不工作

1. 確認 `latest.json` 內容正確
2. 確認簽名與公鑰匹配
3. 確認 App 內嵌的公鑰與簽名用的私鑰是同一對
4. **確認所有平台使用同一組金鑰**

### 金鑰不匹配

如果 macOS 和 Windows 使用了不同的金鑰：

1. 選擇一組金鑰作為標準（建議使用已經在 `tauri.conf.json` 中的公鑰對應的私鑰）
2. 將私鑰同步到所有平台的 `~/.tauri/odango.key`
3. 如果公鑰也需要更新，修改 `tauri.conf.json` 中的 `pubkey`
4. 重新簽名所有平台的更新包
5. 更新 `latest.json`

## 重新生成金鑰對

如果需要重新生成金鑰對：

```bash
# 生成新金鑰對（必須設定密碼，不能留空）
npx tauri signer generate -w ~/.tauri/odango.key -p "tauri2025"

# 查看公鑰
cat ~/.tauri/odango.key.pub

# 更新 tauri.conf.json 中的 pubkey
# 將輸出的公鑰複製到 tauri.conf.json 的 plugins.updater.pubkey

# 同步私鑰到所有平台
# 將 ~/.tauri/odango.key 的內容複製到 Windows
```

> ⚠️ 重新生成金鑰後，舊版本的 App 將無法自動更新到新版本！

## 技術細節

### 為什麼不在 CI 簽名？

Tauri v2 在 CI 環境（GitHub Actions）中存在已知 bug：
- 環境變數 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 無法正確傳遞
- 即使用空密碼生成的金鑰，在 macOS 上也會產生一個帶有未知密碼的加密金鑰

相關 Issue：https://github.com/tauri-apps/tauri/issues/13485

### tauri.conf.json 設定

```json
{
  "bundle": {
    "createUpdaterArtifacts": false  // CI 不生成更新包，避免簽名錯誤
  },
  "plugins": {
    "updater": {
      "endpoints": ["https://github.com/.../releases/latest/download/latest.json"],
      "pubkey": "..."  // 公鑰，用於驗證更新包
    }
  }
}
```

### workflow 設定

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  # 簽名在本機執行，不在 CI 執行
  # TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  # TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```
