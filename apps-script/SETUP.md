# 表單後端（已部署完成 2026-08-31）

訪客按下 Request a Trial Lesson 之後：

1. 資料寫進 Google Sheet，接洽狀態預設「新進詢問」
2. `opusstudio.nyc@gmail.com` 收到通知信，**按回覆就直接回給家長**
3. 家長收到一封自動確認信

全程不需要訪客的郵件軟體，也不需要第三方付費服務。

## 目前設定

| 項目 | 內容 |
|---|---|
| Google 帳號 | `opusstudio.nyc@gmail.com` |
| 試算表 | Opus Studio — Trial Lesson Enquiries（工作表 `Enquiries`） |
| Apps Script 專案 | Opus Studio Trial Lesson Form（獨立專案，非綁定試算表） |
| 部署 | Web app，執行身分 `Me`，存取權 `Anyone` |

## 試算表欄位

`時間戳記` → 表單 13 欄 → `接洽狀態` `進度` → **5 個勾選框** → `服務範圍` `負責老師` `下次跟進日` `內部備註`

- **接洽狀態**：下拉選單，依內容自動變底色
- **進度**：公式欄，依右邊勾選框自動算出進度條與百分比（勾兩項 = `██░░░ 40%`），不要手動編輯
- **勾選框**：已回覆 / 已排時間 / 體驗完成 / 已報價 / 已成交

要改任務項目，編輯 `Code.gs` 的 `TASKS` 再重新部署並跑一次 setup。

## 維護網址

| 用途 | 網址 |
|---|---|
| 健康檢查 | Web app 網址 |
| 重建格式 | Web app 網址 + `?setup=<SETUP_TOKEN>` |
| 清空資料並重建 | Web app 網址 + `?reset=<SETUP_TOKEN>` |

`SETUP_TOKEN` 在部署版的 `Code.gs` 最上面，repo 這份留空。

> 用網址觸發是因為編輯器的函式選單在這個環境很難操作。

> **注意**：`setupSheet` 只在「真的有資料的列」鋪勾選框與公式。
> 千萬不要改成預先鋪滿整欄——`appendRow` 是接在最後一列有內容的下面，
> 預鋪公式會讓新表單資料被寫到幾百列之外。

> 程式用 `SHEET_ID` 指向試算表，所以是獨立專案。
> repo 裡的 `Code.gs` 那一行留空，實際部署的版本才填了 ID——
> 這個 repo 是公開的，不把檔案 ID 放進來。

## 修改程式之後要重新部署

Apps Script 改完存檔不會自動生效，必須：

**部署 → 管理部署作業 → 編輯（鉛筆圖示）→ 版本選「新版本」→ 部署**

網址不會變，`index.html` 不用動。

## 常用連結

- 試算表與 Apps Script 專案都在 `opusstudio.nyc@gmail.com` 的雲端硬碟
- 健康檢查：用瀏覽器直接開 Web app 網址，應該回 `{"ok":true,...}`

---

# 附錄：從零開始的部署步驟

以下保留完整流程，供日後重建或移交給客戶時參考。

## 步驟 1 — 建立試算表

用 `opusstudio.nyc@gmail.com` 登入 Google，開一份新的 Google 試算表，
命名為 `Opus Studio — Trial Lesson Enquiries`。

## 步驟 2 — 貼上程式

在該試算表選 **擴充功能 → Apps Script**。

把編輯器裡預設的 `function myFunction() {}` 全部刪掉，
貼上同資料夾的 `Code.gs` 全部內容，按存檔。

## 步驟 3 — 初始化工作表

編輯器上方的函式下拉選單選 **`setupSheet`**，按 **執行**。

第一次會跳出授權要求：選你的帳號 → 「進階」→「前往 ...（不安全）」→ 允許。
這是因為程式沒有經過 Google 商店審核，是你自己寫的腳本，正常現象。

執行完回試算表看，會多出一個 `Enquiries` 工作表，標題列已建好：

| 時間戳記 | 表單欄位 ×13 | 接洽狀態 | 進度 | 服務範圍 | 負責老師 | 下次跟進日 | 內部備註 |
|---|---|---|---|---|---|---|---|

深色底的六欄是給你手動維護的。「接洽狀態」和「服務範圍」有下拉選單：

- **接洽狀態**：新進詢問 / 已回覆 / 已排體驗課 / 體驗完成 / 已成交 / 未成交 / 暫緩
- **服務範圍**：Private Lesson / Online Lesson / Practice Coaching / Group Class / Chamber Music

選項要改的話，直接改 `Code.gs` 最上面的 `STATUS_OPTIONS` 和 `SCOPE_OPTIONS` 再跑一次 `setupSheet`。

## 步驟 4 — 部署成 Web App

編輯器右上角 **部署 → 新增部署作業**：

| 欄位 | 選項 |
|---|---|
| 類型 | 網頁應用程式 |
| 執行身分 | **我**（這樣才能用你的 Gmail 寄信） |
| 誰可以存取 | **所有人** |

按部署，複製產生的**網頁應用程式網址**（長得像
`https://script.google.com/macros/s/AKfycb.../exec`）。

> 「所有人」指的是任何人都能送出這張表單，不是任何人都能看你的試算表。
> 試算表本身仍然只有你看得到。

## 步驟 5 — 接回網站

打開 `index.html`，找到最底下這一行（約在第 655 行）：

```js
var ENDPOINT = '';
```

把步驟 4 的網址貼進去：

```js
var ENDPOINT = 'https://script.google.com/macros/s/AKfycb.../exec';
```

存檔後 commit 並 push，GitHub Pages 約一分鐘後自動更新。

---

## 驗證

打開 https://kevinadrsss.github.io/opus-studio-site/#book 填一筆假資料送出。

- 按鈕變 `Sending…`，接著出現金色的 Thank you 區塊 → 成功
- 試算表多一列，接洽狀態是「新進詢問」
- Gmail 收到通知信，試著按回覆，收件人應該是你剛才填的測試信箱

## 故障排除

**送出後出現「已為你開啟郵件」而不是 Thank you**
表示後端呼叫失敗，程式自動退回 mailto 模式（刻意設計，不讓訪客白填）。
檢查 `ENDPOINT` 有沒有貼錯、部署時「誰可以存取」是不是選了「所有人」。

**通知信沒收到**
Apps Script 用 `MailApp`，免費帳號每天 100 封上限。
到 Apps Script 編輯器左側「執行項目」看有沒有錯誤紀錄。

**改了 Code.gs 之後沒生效**
Apps Script 要重新部署才會生效：部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選「新版本」→ 部署。
網址不會變。

## 之後想擴充

- **自動建 Google 日曆邀請**：在 `doPost` 加 `CalendarApp.createEvent`
- **Slack / LINE 通知**：用 `UrlFetchApp.fetch` 打 webhook
- **跟進提醒**：在試算表加時間驅動的觸發程序，掃「下次跟進日」是今天的列寄信提醒自己
