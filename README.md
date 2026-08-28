# Opus Studio — 網站視覺示意稿

音樂教室 Opus Studio 的網站設計稿。單一 HTML 檔，所有圖片以 base64 內嵌，
不需要伺服器、不需要建置流程，雙擊即可用瀏覽器開啟。

## 檔案

| 檔案 | 說明 |
|---|---|
| `opus-studio.html` | 完整網站，含首頁與預約分頁 |

## 頁面

- **首頁** — 主視覺、四項理念、About、Lessons（私人課／線上課／練習指導／團體課）、Faculty、Student Achievements（版型預留）、CTA
- **預約分頁**（`#book`）— Trial Lesson Request Form，用 hash 路由切換，仍在同一個檔案內

## 表單送出方式

目前用 `mailto:` 組信，開啟訪客自己的郵件軟體，收件人為 `opusstudio.nyc@gmail.com`。
若自動開信被瀏覽器擋下，頁面會展開一個面板顯示信件全文並提供複製按鈕。

正式上線建議改接表單後端（Formspree、Netlify Forms 或嵌入 Google 表單），
讓資料直接進信箱或試算表，不依賴訪客的郵件軟體。

## 設計

- 色：金 `#b08d4f` / 奶油白 `#fbf9f5` / 墨 `#2c2925`
- 字：Cormorant Garamond（標題）+ Jost（內文），由 Google Fonts 載入
- 主視覺與 logo 由客戶提供；白底 logo 是從黑底發光版以高通濾波抽出線條後重新上色

## 待補

- Student Achievements 區內容（比賽獲獎、錄取紀錄、家長回饋）
- 電話與地址
- Voice Group Class 是否開課
- 課程價格依原始文件標註為暫定，仍可能調整
