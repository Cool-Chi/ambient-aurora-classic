(function() {
  console.log('Starting Ambient Aurora Performance Test...');

  const stateKeys = [
    { key: 'mode', getValues: () => [1, 2, 3, 4, 5] },
    { key: 'material', getValues: () => [0, 1, 2, 3] },
    { key: 'fontStyle', getValues: () => [0, 1, 2] },
    { key: 'size', getValues: () => [5, 10, 15, 20] },
    { key: 'speed', getValues: () => [0.1, 1, 2, 4] },
    { key: 'clockAnimMode', getValues: () => [0, 1, 2, 3] },
    { key: 'clockLayout', getValues: () => [0, 1] },
    { key: 'colorTarget', getValues: () => [[0.21, 0.11, 0.47], [0.06, 0.36, 0.27], [0.47, 0.14, 0.11]] }
  ];

  let frameCount = 0;
  let lastTime = performance.now();
  const fpsHistory = [];
  const memoryHistory = [];
  let errorCount = 0;
  let crashLog = [];
  let isRunning = true;

  // Error tracking
  window.onerror = function(message, source, lineno, colno, error) {
    errorCount++;
    crashLog.push(`[${new Date().toISOString()}] Error: ${message} at ${source}:${lineno}:${colno}`);
  };
  window.onunhandledrejection = function(event) {
    errorCount++;
    crashLog.push(`[${new Date().toISOString()}] Unhandled Rejection: ${event.reason}`);
  };

  // FPS Monitoring
  function monitorFPS() {
    if (!isRunning) return;
    const now = performance.now();
    frameCount++;
    if (now - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastTime));
      fpsHistory.push(fps);
      frameCount = 0;
      lastTime = now;

      // Memory Monitoring (Chrome only, but safe to check)
      if (performance.memory) {
        memoryHistory.push({
          time: new Date().toISOString(),
          usedJSHeapSize: performance.memory.usedJSHeapSize / (1024 * 1024) // in MB
        });
      }
    }
    requestAnimationFrame(monitorFPS);
  }
  requestAnimationFrame(monitorFPS);

  // State switching loop
  let testInterval;
  function startSwitching() {
    testInterval = setInterval(() => {
      if (!window.AA || !window.AA.store) return;

      // Randomly pick 1 to 3 keys to change
      const numChanges = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numChanges; i++) {
        const keyDef = stateKeys[Math.floor(Math.random() * stateKeys.length)];
        const values = keyDef.getValues();
        const randomVal = values[Math.floor(Math.random() * values.length)];
        window.AA.store.setState(keyDef.key, randomVal);
      }
    }, 50); // Change state very frequently (every 50ms)
  }

  startSwitching();

  // Stop logic
  // Running for 10 minutes (600,000 ms)
  const TEST_DURATION = 10 * 60 * 1000;

  setTimeout(() => {
    isRunning = false;
    clearInterval(testInterval);

    // Evaluate performance
    const avgFps = fpsHistory.length ? fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length : 0;
    const minFps = fpsHistory.length ? Math.min(...fpsHistory) : 0;

    // Evaluate memory leaks
    let memoryLeakDetected = false;
    if (memoryHistory.length > 10) {
      // Very basic heuristic: check if the last 10 records are consistently higher than the first 10
      const first10Avg = memoryHistory.slice(0, 10).reduce((a, b) => a + b.usedJSHeapSize, 0) / 10;
      const last10Avg = memoryHistory.slice(-10).reduce((a, b) => a + b.usedJSHeapSize, 0) / 10;
      if (last10Avg > first10Avg * 1.5) { // 50% growth over 10 minutes might be a leak
        memoryLeakDetected = true;
      }
    }

    const reportData = {
      testDurationSeconds: TEST_DURATION / 1000,
      averageFPS: avgFps.toFixed(2),
      minimumFPS: minFps,
      fpsDropsBelow60: fpsHistory.filter(f => f < 60).length,
      fpsHistoryCount: fpsHistory.length,
      memoryLeakDetected: memoryLeakDetected,
      initialMemoryMB: memoryHistory.length ? memoryHistory[0].usedJSHeapSize.toFixed(2) : "N/A",
      finalMemoryMB: memoryHistory.length ? memoryHistory[memoryHistory.length - 1].usedJSHeapSize.toFixed(2) : "N/A",
      errorCount: errorCount,
      crashLog: crashLog
    };

    // Print marker and JSON for the Node runner to capture
    console.log('---TEST_COMPLETE---');
    console.log(JSON.stringify(reportData, null, 2));

  }, TEST_DURATION);

})();
