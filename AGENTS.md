[Rules v5]
本檔是 Ambient Aurora 的實作規則。你是代碼實作者(Jules 或 Claude),只依任務修改程式碼;不分析、不評論、不新增依賴、不引入框架或打包工具。在 develop 分支作業。

[環境] 純前端靜態專案,無打包建置步驟。VM 內使用 npm test (執行 node --check 語法檢查) 與 npm run lint 進行靜態檢查;無法驗證畫面與效能,不得宣稱已驗證。

[模組] 路徑 → 掛載的 window.AA 成員
css/style.css 全部樣式
js/store/store.js(L1 window.AA 初始化,L2 版本註解)→ AA.util{$ qs on clamp}、AA.CONST{EASE_OUT}、AA.Store
js/webgl-engine/shaders.js → AA.SHADERS{vsSource,fsSource}
js/webgl-engine/webgl-engine.js → AA.WebGLEngine
js/clock-controller/animations.js → AA.CLOCK_ANIMS{ANIM_OPT,ANIM_REGISTRY}
js/clock-controller/clock-controller.js → AA.ClockController(constructor 把 this.ANIM_OPT、this.ANIM_REGISTRY 指向 AA.CLOCK_ANIMS)
js/ui-manager/locales.js → AA.DICT
js/ui-manager/ui-config.js → AA.UI_CONFIG{FONTS,THEMES,SLIDERS,UI_BINDINGS,BINDING_BY_ID}
js/ui-manager/ui-manager.js → AA.UIManager(靜態成員 DICT FONTS THEMES SLIDERS UI_BINDINGS 為轉接 getter,BINDING_BY_ID 為靜態屬性,均取自上兩檔;qsa、haptic 僅此檔)
js/main.js:defaultState、initPWA、啟動序列、visibilitychange;尾段雙層 rAF 移除 body.no-transitions 並呼叫 updateEvasion;不掛載成員
index.html:結構、SVG 濾鏡 #hollow-fx #glass-fx、script 載入順序
載入順序:store/store → webgl-engine/shaders → webgl-engine/webgl-engine → clock-controller/animations → clock-controller/clock-controller → ui-manager/locales → ui-manager/ui-config → ui-manager/ui-manager → main。經典 <script src>,無 import/export,命名空間 window.AA(唯一全域)。
依賴全為單向:webgl-engine → util、SHADERS;animations → CONST;clock-controller → util、CONST、CLOCK_ANIMS;ui-manager → util、CONST、Store、DICT、UI_CONFIG;main → 全部。不得新增循環。跨檔引用:檔頂 const { X } = AA;若成環,改呼叫時 AA.X。
新增 JS 檔須放進對應模組資料夾,並同輪在 index.html 依依賴順序加入 <script>。版本註解(store/store.js L2)只在任務寫「遞增版本」時修改。

[契約] 不得變更,除非任務明列授權且同步改所有呼叫端(呼叫端檔案須在可修改檔案內)。凡 id/class/CSS 變數/鍵名出現在 ≥2 個檔案者皆視為契約,以實際檔案為準;以下為已知項:
- AA.* 成員及其內容鍵、各類別公開方法簽章與靜態成員;狀態通道只有 store.subscribe / setState
- 事件:合成 resize(WebGLEngine 與 UIManager 共聽;ui-manager 多處派發,含 fullscreenchange);拖曳 .toggle-switch 時對 tgTarget 派發合成 change(bubbles)
- localStorage 鍵 aurora_settings
- DOM id:gl-canvas clock-layer clock clock-wrapper settings-panel bg-layer app-container hud-toast btn-lowpower btn-settings btn-fullscreen date custom-text;前綴 ctrl-* swatch-* custom-* hollow-* glass-*(對應 UIManager.glassEls)
- class:is-hidden is-vertical is-above is-flipping is-idle is-fullscreen is-dragging exiting active digit-old digit-new clock-module no-transitions disconnected is-active is-visible has-color
- CSS 變數(JS 或 HTML 內聯寫、CSS 讀):--clock-{size,weight,font,color,fill,stroke,blend,shadow-color,filter}、--digit-filter、--bg-color、--ampm-color、--date-color、--custom-text-color、--glass-press、--pos-{x,y}、--ox、--oy、--off-{x,y}、--evade-{x,y,scale}、--idle-scale、--hide-{tx,ml}(index.html 內聯)、--val
- 新增設定鍵須同步:main.js defaultState;store/store.js Store.validate(布林可走 default 分支,其他型別須具名 case);UI 綁定(滑桿/文字框/開關→ui-manager/ui-config.js 的 UI_BINDINGS,滑桿另加 SLIDERS;segmented、.mtg-btn、.tc-input→ui-manager.js renderPanel 的 data-prop 與 syncUI/bindEvents 分支;colorTarget、anchor、lowPower 為專屬分支);ui-manager/locales.js 的 DICT 各語言文字。

[高風險區] 未授權的邏輯與未列入【可修改檔案】的檔案原封不動。下列即使在可修改檔案內,也須任務的「本輪授權」明列才可動:shaders.js 的 fsSource | webgl-engine.js 的 render 時序 | animations.js 的 ANIM_REGISTRY | clock-controller.js 的 diffDOM、tick、updateEvasion | ui-manager.js 的 applyVisualVars(含 0.99 重繪)、tickGlass、updateGlassVectors、idle/wakeLock/exitApp/runPixelShift | store/store.js 的 validate、load 與 main.js 的 defaultState(鍵須同步) | style.css 的 .settings-panel .tab-pane .clock-layer .clock-module | main.js 的 initPWA 與啟動序列(initPWA 須在 main.js 開頭呼叫)。「本輪授權」可放行高風險區或指定契約,不可覆寫 SD。

[Motion] --ease-out: cubic-bezier(.23,1,.32,1);--ease-in-out: cubic-bezier(.77,0,.175,1);JS 用 AA.CONST.EASE_OUT;ANIM_OPT={duration:300,easing:EASE_OUT}(animations.js)。UI 進退場禁用 ease-in、scale(0)、transition: all。

[SD]
1 diffDOM 中 .digit-new 預填同一字元(clock-controller.js 的 diffDOM 模板;constructor 冒號預填同理)
2 ampmCont 只經 diffDOM 更新(tick),無其他寫入點
3 樣式變更後 Chromium opacity .99 強制重繪(ui-manager.js applyVisualVars 尾段,this.rp 計時還原);全專案禁用 color-dodge,光暈用 screen
4 .settings-panel 預設 opacity 0 / visibility hidden;.tab-pane.active 用 visibility: inherit;body.is-idle .ui-layer>* 的 visibility 1500ms(style.css)
5 .clock-layer.is-flipping 轉場鎖(style.css;clock-controller.js handleStateChange 的 anchor 分支)
6 時鐘/日期/自訂文字留在 #clock-wrapper 內(index.html);.clock-module 為 min-width:0; min-height:0; overflow:visible,#clock span 為 overflow:visible(style.css)
7 保留 PIXEL_BUDGET 2500000(webgl-engine.js resize() 內區域常數)、timeWrapState、wrapFade、minInterval FPS 節流(webgl-engine.js constructor/draw/render)、ui-manager.js tickGlass 的 minStep、main.js 的 visibilitychange
8 defaultState(main.js)鍵須與 Store.validate(store/store.js)一致;SLIDERS(ui-config.js)的 key 是 DICT(locales.js)查找鍵(opacity→clockOpacity、offset→offsetX/Y),非 state 鍵;state 對應見 UI_BINDINGS/BINDING_BY_ID

[準則]
- 修 bug 或效能類:先在實際檔案定位成因,再最小修改;視覺輸出須等價;不順手重構、不修無關問題(發現者記入回報);不為其他假設擴大範圍。
- 必須違反 SD 或契約才能達成時,停止並回報,不得自行變通。模糊處選最保守且不違反 SD 的解讀。
- 沿用檔案原本的換行格式(CRLF/LF)與縮排風格,不整檔重排或轉換。本檔不得修改。

[交付(Jules)]
- 只改任務【可修改檔案】內的檔案;計畫超出範圍時自行縮小。
- 最終任務回覆只寫:修 bug 或效能類第一行「成因:<一句話>」;其後最多 5 條「檔案#函式:改了什麼」;列出未能在 VM 驗證的項目(畫面、效能);最後附上推送的分支名稱與被修改檔案清單。
- 不要在回覆貼出整檔程式碼。

[Strict Workflow Directive(Jules)]
- Do NOT create or open a Pull Request on GitHub.
- Before pushing, generate a diff patch against origin/develop (`git diff origin/develop > diff.patch`) and include it in the commit.
- Push your changes directly to a new remote branch, and output the branch name and modified file list.
