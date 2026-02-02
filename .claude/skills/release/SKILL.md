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

如果要更新版本，使用：
```bash
node scripts/sync-version.mjs $ARGUMENTS
cargo generate-lockfile
```

### 4. 建置測試

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

### Step 5: Windows 建置與簽名

提醒用戶執行 Windows 簽名流程（參考 `docs/RELEASE_GUIDE.md`）

### Step 6: 發布 Release
```bash
gh release edit v$ARGUMENTS --draft=false
```

---

## 重要提醒

- **金鑰資訊記錄在 `.keys/SIGNING_KEYS.md`（不會上傳 Git）**
- **每次發布前都要確認公鑰沒有被意外修改**
- **macOS 和 Windows 必須使用同一組金鑰**
