# Ambient Aurora 性能與穩定性測試報告

## 測試目標
測試《Ambient Aurora》在高頻率狀態切換與長時間運行下的性能與穩定性，評估是否有效能瓶頸、記憶體洩漏 (Memory Leaks) 或是程式崩潰的問題，且確保不修改任何核心程式碼 (HTML/CSS/JS)。

## 測試環境與方法
* **測試腳本：** `console_test_script.js`，在瀏覽器環境下直接注入執行。
* **執行工具：** Playwright (Headless Chromium)，配合本地 HTTP 伺服器 (Python HTTP Server)。
* **測試時長：** 10 分鐘（600 秒）。
* **操作模式：**
  * 每 50 毫秒高頻隨機切換 1 到 3 個 `window.AA.store` 中的核心參數，包括：`mode`, `material`, `fontStyle`, `size`, `speed`, `clockAnimMode`, `clockLayout`, `colorTarget`。
* **監控指標：**
  * **FPS (每秒幀數)：** 透過 `requestAnimationFrame` 持續監聽每秒繪製幀數。
  * **記憶體 (JS Heap Size)：** 透過 `performance.memory` (Chromium 專有 API) 記錄記憶體走勢。
  * **錯誤 (Errors / Crashes)：** 監聽 `window.onerror` 與 `window.onunhandledrejection` 捕捉任何執行期例外或未處理的 Promise Rejection。

## 測試結果與數據總結

根據自動化測試腳本 (`test_result.json`) 所收集到的資料：

* **測試總時長:** 600 秒 (10 分鐘)
* **平均 FPS:** 60.00
* **最低 FPS:** 60
* **低於 60 幀的次數:** 0 次
* **記憶體洩漏檢測 (Memory Leak):** 未檢測到 (False)
* **初始記憶體使用量:** 6.13 MB
* **結束時記憶體使用量:** 6.18 MB
* **執行期錯誤 (JS Errors):** 0 次
* **崩潰紀錄 (Crash Log):** 無 (空陣列)

## 性能評估與分析

### 1. 渲染性能 (FPS)
測試結果顯示，即使在每 50 毫秒進行高頻率的狀態更新下（如頻繁切換 WebGL 材質、改變 DOM 的字體與排版、更新時鐘參數等），頁面仍能維持穩定的 60 FPS 滿幀運行。最低 FPS 亦為 60，代表 **完全沒有卡頓或掉幀現象**。這表示 `Store` 狀態機器的事件觸發與 `UIManager`/`ClockController`/`WebGLEngine` 之間的響應機制處理得相當高效，DOM 操作與 WebGL 渲染皆沒有造成主執行緒阻塞。

### 2. 記憶體管理 (Memory Leaks)
在 10 分鐘的壓力測試中，記憶體使用量從初始的 6.13 MB 微幅波動至最終的 6.18 MB。記憶體使用量完全在合理的垃圾回收 (Garbage Collection) 波動範圍內，且末期平均與初期平均並未出現顯著且不可逆的攀升。因此評估 **沒有任何記憶體洩漏 (Memory Leaks) 問題**，物件（如 WebGL 材質、Canvas 資源、綁定事件與閉包）都有被妥善管理與釋放。

### 3. 穩定性與容錯 (Crashes / Errors)
在極高頻度的狀態變更下，程式運行 10 分鐘期間 **並未觸發任何 JavaScript 錯誤或未處理的 Rejection**。這證明 `window.AA` 生態系統內模組間具有極高的容錯與防禦性，參數的有效性驗證 (如 `Store.validate`) 與非同步動畫的清理（如 `cancelAnimationFrame`、`typoAnim.cancel()`）皆運作良好，有效避免了競態條件 (Race Conditions) 導致的崩潰。

### 4. 效能浪費 (Performance Waste) 評估
綜合上述結果：
* **目前架構並未發現明顯的效能浪費。**
* 狀態切換時使用 `requestAnimationFrame` 來調度高成本操作（例如重繪 Glass 材質或 Typo 動畫）是成功的策略。
* 建議未來若增加更高解析度或更複雜的 WebGL Shader 運算時，可以繼續沿用目前的按需渲染 (On-demand Rendering) 與低功耗 (Low Power) 動態節流機制，維持卓越效能。

## 結論
Ambient Aurora 目前的程式核心結構 (HTML/CSS/JS) 展現了出色的穩定性與極高的性能，能夠完美應付極端高頻操作，**測試完美通過**。
