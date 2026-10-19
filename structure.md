# Ambient Aurora 專案結構與近期變更分析 (基於 v3.0.0 後的更新)

本文件旨在提供 AI 閱讀的專案架構指南，概述 `Ambient Aurora` 專案目前的狀態。由於您（AI）對專案的認知停留在 `tag v3.0.0`，因此這份文件除了說明現有結構外，也特別著重於 `v3.0.0` 之後的關鍵變更（Commit: `f1673ce` 等）。

## 核心設計模式：Global Namespace (`window.AA`)

本專案**沒有使用建置工具** (如 Webpack, Rollup) 進行模組化（即沒有 `import`/`export`），而是採用了傳統但高效的**全域命名空間模式 (Global Namespace Pattern)**。
所有的核心模組、常數與設定都掛載在 `window.AA` 物件下。這確保了直接在瀏覽器環境下可以依序加載 JS 檔案並進行通訊，最後在發布階段會由腳本合併為單一的 HTML 檔案。

加載順序嚴格依循功能相依性，定義在 `index.html` 的尾部：
1. `store` (資料層)
2. `webgl-engine` (渲染層)
3. `clock-controller` (邏輯層)
4. `ui-manager` (介面層)
5. `main.js` (進入點與 PWA 初始化)

## 專案目錄結構 (自 v3.0.0 後重構)

在 v3.0.0 之後，專案進行了重大的目錄結構重構，將原本肥大的檔案拆分成了具有明確職責的子模組，並放進各自的資料夾中：

```
.
├── index.html                 # 應用程式入口與 DOM 骨架，包含大量的 SVG Filter 定義 (如 #glass-fx)
├── css/
│   └── style.css              # 全域樣式設定
├── js/
│   ├── store/
│   │   └── store.js           # 狀態管理，定義 window.AA.Store、通用工具 (AA.util) 及 AA.CONST
│   ├── webgl-engine/
│   │   ├── shaders.js         # 【新增】將 WebGL 的 Vertex 與 Fragment 著色器 (GLSL) 抽離至此 (AA.SHADERS)
│   │   └── webgl-engine.js    # WebGL 渲染引擎核心，負責背景的動畫與材質渲染
│   ├── clock-controller/
│   │   ├── animations.js      # 【新增】時鐘動畫的註冊與實作抽離 (AA.ANIMATIONS)
│   │   └── clock-controller.js# 時鐘邏輯、時間格式化與 DOM 節點更新
│   ├── ui-manager/
│   │   ├── locales.js         # 【新增】多國語系字典檔抽離 (AA.DICT)
│   │   ├── ui-config.js       # 【新增】UI 控制面板的 Slider 設定、字型與主題色彩設定抽離 (AA.UI_CONFIG)
│   │   └── ui-manager.js      # 使用者介面互動、控制面板生成、Glass 材質的指標與陀螺儀效果計算
│   └── main.js                # 程式進入點，初始化 PWA 設定、賦予預設狀態 (defaultState) 並啟動所有控制器
├── console_test_script.js     # 【最新加入】高頻壓力測試腳本，能在瀏覽器 console 直接運行
└── PERFORMANCE_REPORT.md      # 【最新加入】自動化性能測試的結果與分析報告
```

## v3.0.0 以來的關鍵重構與優化 (Changelog)

### 1. 模組解耦 (Static Modules Extraction)
* **著色器 (Shaders):** 過去寫死在 `webgl-engine.js` 裡的 GLSL 程式碼，現在被抽取到了 `js/webgl-engine/shaders.js` 中。
* **時鐘動畫 (Animations):** 各種時鐘切換的動效配置與計算函數，抽取至 `js/clock-controller/animations.js`。
* **語系與 UI 設置 (UI Config & Locales):** 多國語系文本抽取至 `js/ui-manager/locales.js`；UI 滑桿、主題色彩與字型映射配置抽取至 `js/ui-manager/ui-config.js`。
* 此舉大幅降低了原本單一檔案的複雜度，使 `window.AA` 成為連接這些靜態配置的核心樞紐。

### 2. SVG Glass 特效最佳化 (Glass FX Optimization)
* 在 `index.html` 中重新梳理了 `<filter id="glass-fx">` 的結構，現在將 Glass 特效聚焦在單一容器 `#clock` 上。
* 導入了線性算術邊緣遮罩 (Linear Arithmetic Edge Masks)，有效解決了材質內部產生不必要半透明發光 (translucent inner glow) 的視覺瑕疵。

### 3. Glass 運算效能節流 (Throttling & Vector Quantization)
* 針對 `ui-manager.js` 中極其消耗效能的 `tickGlass()` 函數，加入了 **提早返回 (early-return) 最小步進節流 (minStep throttling)** 與 **向量量化 (Vector Quantization)** 邏輯。
* 此更新消除了因頻繁更新 SVG filter 屬性所導致的掉幀問題，使程式在複雜特效下依然能維持 140+ fps 的極致流暢度。

### 4. 移除 CSS Filter Blur 殘留物
* 在 WAAPI (Web Animations API) 的過場動畫配置中（如版面排版或字型切換），**移除了 `filter: blur(...)` 的強制覆寫**。
* 這個改變解決了過去在快速切換設定時，字體或版面會發生「純色填滿閃爍 (solid fill flashes)」的渲染錯誤。

### 5. 自動化性能評估 (Performance Automation)
* 新增了在瀏覽器運行的高頻隨機狀態切換腳本 (`console_test_script.js`)。
* 此腳本透過隨機切換 `store` 的 state (包含 mode, material, fontStyle 等) 來模擬極端壓力測試，並輸出了效能評估報告 (`PERFORMANCE_REPORT.md`)，證實經過前述優化後，即使每 50 毫秒進行一次全面狀態變更，專案依舊能穩定維持 60 FPS 且沒有 Memory Leaks 發生。

## 給 AI 的開發建議
* **State Driven (狀態驅動)：** 當您需要增加新功能時，請先從 `main.js` (定義 default state) 和 `store.js` (定義資料驗證 `Store.validate`) 著手，並在相應的 `ui-config.js` 增加 UI 控制項，最後再由 `ui-manager.js` / `clock-controller.js` 監聽狀態改變 (`store.subscribe`) 來反應變更。
* **DOM 效能考量：** 如果要修改 UI 或動畫，請遵循既有原則：盡量利用 `requestAnimationFrame` 進行節流，並且修改 CSS Custom Properties (CSS 變數) 來改變視覺效果，而非頻繁地直接改寫 inline-styles。
