// Opt-in debug verification inside the actual Tauri WebKit view. No device
// permission is requested and the driver uses an isolated WebKit data store.
if (!window.__omnicraftDesktopProbe) {
  window.__omnicraftDesktopProbe = true;
  void (async () => {
    const report = { at: new Date().toISOString(), environment: 'Actual Tauri WebKit development view', url: location.href, userAgent: navigator.userAgent, tests: {} };
    const save = () => window.__TAURI_INTERNALS__.invoke('desktop_probe_report', { payload: JSON.stringify(report, null, 2) });
    const wait = async (read, label, milliseconds = 120000) => {
      const until = Date.now() + milliseconds;
      while (Date.now() < until) { const value = read(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 150)); }
      throw Error(`Timed out: ${label}`);
    };
    const assert = (value, message) => { if (!value) throw Error(message); };
    const button = label => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label);
    try {
      await wait(() => document.querySelector('#studio-hero-title'), 'home');
      assert(document.querySelector('[data-testid=brand-title]').textContent === 'OmniCraft OS', 'Product identity');
      assert(!document.querySelector('iframe'), 'Home must not start a WASM editor');
      report.tests.home = { passed: true, heading: document.querySelector('h1').textContent, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
      await save();
      document.querySelector('.oc-workflow-row button').click();
      await wait(() => document.querySelector('.recorder-studio h1'), 'Capture route');
      report.tests.capture = { passed: true, mediaRecorder: typeof MediaRecorder === 'function', screenCaptureApi: typeof navigator.mediaDevices?.getDisplayMedia === 'function', cameraApi: typeof navigator.mediaDevices?.getUserMedia === 'function', mp4Reported: window.MediaRecorder?.isTypeSupported('video/mp4') || false, physicalDevicesTested: false };
      if (!report.tests.capture.screenCaptureApi) {
        button('Choose screen or window').click();
        await wait(() => document.querySelector('[role=alert]')?.textContent.includes('Screen capture is unavailable'), 'honest unsupported capture message');
        report.tests.capture.unsupportedScreenMessage = true;
      }
      await save();
      document.querySelector('.capture-back').click();
      await wait(() => document.querySelector('[data-testid=card-open-solidcraft]'), 'Model launcher');
      document.querySelector('[data-testid=card-open-solidcraft]').click();
      await wait(() => button('New part') && !button('New part').disabled, 'CAD engine');
      button('New part').click(); button('Create solid part').click();
      await wait(() => document.querySelector('.model-status [role=status]')?.textContent.includes('Part created.'), 'CAD part creation');
      const api = document.querySelector('.model-viewport iframe').contentWindow.solidcraft;
      const measurement = await api.execute('inspect.measure', {});
      const expected = (80 * 60 - Math.PI * (11 * 11 + 4 * 2.5 * 2.5)) * 8;
      assert(Math.abs(measurement.total.volume_mm3 - expected) / expected < .0001, 'CAD volume');
      button('Save project').click();
      await wait(() => document.querySelector('.model-status [role=status]')?.textContent.includes('Project saved'), 'CAD local save');
      report.tests.model = { passed: true, actualKernelVolumeMm3: measurement.total.volume_mm3, expectedVolumeMm3: expected, savedInWebKitStorage: true, nativeDownloadVerified: false };
      report.passed = true;
    } catch (error) { report.passed = false; report.error = String(error.stack || error); }
    await save();
  })();
}
