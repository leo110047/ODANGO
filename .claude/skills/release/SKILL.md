---
name: release
description: 執行 ODANGO 發布前檢查和發布流程
disable-model-invocation: true
argument-hint: [version]
---

# ODANGO 發布流程

發布版本: **$ARGUMENTS**

## 發布前檢查清單

請依序完成以下檢查：

### 1. 簽名金鑰驗證

**確認 tauri.conf.json 中的公鑰正確**：

1. 讀取 `src-tauri/tauri.conf.json` 中的 `plugins.updater.pubkey`
2. 讀取 `.keys/SIGNING_KEYS.md` 中記錄的正確公鑰
3. 比對兩者是否完全相同

如果公鑰不正確，**立即停止**並通知用戶！

### 2. 確認私鑰存在

檢查私鑰檔案是否存在（路徑和密碼記錄在 `.keys/SIGNING_KEYS.md`）：
- macOS/Linux: `~/.tauri/odango.key`
- Windows: `%USERPROFILE%\.tauri\odango.key`

### 3. 版本號檢查

確認以下檔案的版本號一致：
- `package.json` -> `version`
- `src-tauri/tauri.conf.json` -> `version`
- `src-tauri/Cargo.toml` -> `version`

如果要更新版本，**只使用**：
```bash
node scripts/sync-version.mjs $ARGUMENTS
```

> ⚠️ **絕對不要執行 `cargo generate-lockfile`！**
> 這會重新解析所有 Rust 依賴，可能導致 Tauri crate 版本與 NPM 包版本不匹配，造成 CI 建置失敗。

### 4. 建置測試（可選）

在發布前確認本機可以成功建置：
```bash
npm run build
npm run tauri build
```

---

## 發布步驟

完成上述檢查後，執行以下發布流程：

### Step 1: 提交變更
```bash
git add -A
git commit -m "chore: bump version to v$ARGUMENTS"
git push
```

### Step 2: 建立 Tag 觸發 CI
```bash
git tag v$ARGUMENTS
git push origin v$ARGUMENTS
```

### Step 3: 等待 CI 完成
```bash
gh run list --workflow=release.yml --limit=1
```

### Step 4: macOS 簽名
```bash
./scripts/sign-and-upload.sh v$ARGUMENTS
```

### Step 5: Windows 簽名

> ⚠️ **CI 不會產生 .nsis.zip，需要手動建立！**

> ⚠️ **ZIP 壓縮方式很重要！**
> - Tauri updater 可能不支援某些壓縮方式（如 Deflate64、LZMA）
> - 使用 **Stored（無壓縮）** 最安全，所有解壓器都支援
> - 錯誤訊息：`unsupported Zip archive: Compression method not supported`

**正確做法：**

1. 從 GitHub Release 下載 CI 產生的 exe：
   `ODANGO_$ARGUMENTS_x64-setup.exe`

2. 用 **7-Zip** 建立 **Stored（無壓縮）** 的 zip：
   - 右鍵 → 7-Zip → 加入壓縮檔
   - 壓縮格式：zip
   - 壓縮等級：**僅儲存（Stored）**
   - 檔名：`ODANGO_$ARGUMENTS_x64-setup.nsis.zip`

3. 簽名 zip：
```powershell
npx tauri signer sign --private-key-path "$env:USERPROFILE\.tauri\odango.key" --password "tauri2025" "ODANGO_$ARGUMENTS_x64-setup.nsis.zip"
```

4. 上傳到 GitHub Release（覆蓋）：
   - `ODANGO_$ARGUMENTS_x64-setup.nsis.zip`
   - `ODANGO_$ARGUMENTS_x64-setup.nsis.zip.sig`

5. 把 .sig 檔內容提供給我更新 latest.json

### Step 6: 發布 Release
```bash
gh release edit v$ARGUMENTS --draft=false
```

---

## 重要提醒

- **金鑰資訊記錄在 `.keys/SIGNING_KEYS.md`（不會上傳 Git）**
- **每次發布前都要確認公鑰沒有被意外修改**
- **macOS 和 Windows 必須使用同一組金鑰**
- **不要執行 `cargo generate-lockfile`，會導致版本不匹配**
- **Windows zip 必須使用 Stored（無壓縮）方式建立**
