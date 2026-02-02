---
name: learn
description: 當犯錯或被糾正時，自動記錄教訓到對應的 skill 或文件中
disable-model-invocation: false
---

# 學習與記錄機制

當發生以下情況時，**必須立即**更新或建立對應的 skill：

1. **用戶糾正錯誤** - 當用戶指出我做錯了什麼
2. **操作失敗** - 當某個操作導致問題（如 CI 失敗、建置錯誤）
3. **發現潛在問題** - 當發現可能會再次發生的問題

## 記錄流程

### 1. 識別問題類型

判斷這個錯誤屬於哪個領域，找到或建立對應的 skill：
- 發布流程 → `.claude/skills/release/SKILL.md`
- Git 操作 → `.claude/skills/git/SKILL.md`（如不存在則建立）
- 建置問題 → `.claude/skills/build/SKILL.md`（如不存在則建立）
- 專案特定 → `CLAUDE.md` 或建立新 skill

### 2. 更新對應的 skill 文件

**直接修改對應的 skill 文件**，加入：
- 明確的警告標記（⚠️）
- 錯誤的描述
- 正確的做法
- 為什麼會出錯

**不要把教訓寫在這個 `/learn` 文件裡！**

### 3. 確認更新

更新後告知用戶已記錄，例如：
> 已將此教訓記錄到 `/release` skill 中，以後不會再犯。

## 自動觸發

此 skill 設定為 `disable-model-invocation: false`，表示當我察覺到錯誤或被糾正時，應該**主動**執行此流程：

1. 識別錯誤屬於哪個 skill
2. 更新或建立該 skill
3. 告知用戶已記錄

不需要用戶明確呼叫 `/learn`。
