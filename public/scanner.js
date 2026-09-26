// Barcode scanner overlay. Scanner.open() resolves with the barcode digits, or null if cancelled.
// Uses the phone's built-in BarcodeDetector when there is one (Android Chrome),
// otherwise the ZXing library (iPhone), loaded only the first time you scan.
(function () {
  var ZXING_LOCAL = 'vendor/zxing.min.js';
  var ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  var zxingLoading = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { s.remove(); rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadZxing() {
    if (window.ZXing) return Promise.resolve();
    if (!zxingLoading) zxingLoading = loadScript(ZXING_LOCAL).catch(function () { return loadScript(ZXING_CDN); });
    return zxingLoading;
  }

  async function makeDecoder() {
    if ('BarcodeDetector' in window) {
      try {
        var want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
        var have = BarcodeDetector.getSupportedFormats ? await BarcodeDetector.getSupportedFormats() : want;
        var formats = want.filter(function (f) { return have.indexOf(f) >= 0; });
        if (formats.length) {
          var det = new BarcodeDetector({ formats: formats });
          return async function (video) {
            var codes = await det.detect(video);
            return codes && codes.length ? codes[0].rawValue : null;
          };
        }
      } catch (e) { /* fall back to ZXing */ }
    }
    await loadZxing();
    var Z = window.ZXing;
    var hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    var reader = new Z.MultiFormatReader();
    reader.setHints(hints);
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    return async function (video) {
      var w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) return null;
      // decode the middle band of the frame, where the guide box is
      var cw = Math.round(w * 0.9), ch = Math.round(h * 0.45);
      canvas.width = cw; canvas.height = ch;
      ctx.drawImage(video, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, cw, ch);
      try {
        var src = new Z.HTMLCanvasElementLuminanceSource(canvas);
        var bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(src));
        return reader.decodeWithState(bmp).getText();
      } catch (e) { return null; }
      finally { reader.reset(); }
    };
  }

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text) e.textContent = text;
    return e;
  }
  var MONO = "'IBM Plex Mono',monospace";

  function open() {
    return new Promise(function (resolve) {
      var done = false, stream = null, timer = null;
      var ov = el('div', 'position:fixed;inset:0;z-index:50;background:#0a0b06;display:flex;flex-direction:column;color:#e8e9e0;font-family:Barlow,system-ui,sans-serif');
      var top = el('div', 'padding:calc(env(safe-area-inset-top,0px) + 18px) 22px 12px;display:flex;align-items:center;justify-content:space-between');
      top.appendChild(el('div', "font:700 22px/1 'Saira Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase", 'Scan barcode'));
      var close = el('div', 'padding:12px;margin:-12px;cursor:pointer;font:600 12px/1 ' + MONO + ';letter-spacing:.1em;color:#d9a02b', 'CANCEL');
      top.appendChild(close);
      var stage = el('div', 'position:relative;flex:1;overflow:hidden;background:#000');
      var video = el('video', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover');
      video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true;
      var box = el('div', 'position:absolute;left:5%;right:5%;top:27.5%;height:45%;border:2px solid #d9a02b;box-shadow:0 0 0 9999px rgba(0,0,0,.45)');
      var line = el('div', 'position:absolute;left:0;right:0;top:50%;height:2px;background:rgba(217,160,43,.8)');
      box.appendChild(line);
      stage.appendChild(video); stage.appendChild(box);
      var msg = el('div', 'padding:14px 22px 6px;font:500 12px/1.5 ' + MONO + ';letter-spacing:.06em;color:#8b8f7e;text-align:center', 'STARTING CAMERA…');
      var manual = el('div', 'margin:6px 22px calc(env(safe-area-inset-bottom,0px) + 20px);border:1px solid #3a4029;padding:15px;text-align:center;cursor:pointer;font:600 12px/1 ' + MONO + ';letter-spacing:.1em', 'TYPE THE NUMBER INSTEAD');
      ov.appendChild(top); ov.appendChild(stage); ov.appendChild(msg); ov.appendChild(manual);
      document.body.appendChild(ov);

      function finish(code) {
        if (done) return; done = true;
        clearTimeout(timer);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        ov.remove();
        if (code && navigator.vibrate) navigator.vibrate(60);
        resolve(code ? String(code).replace(/\D/g, '') || null : null);
      }
      close.onclick = function () { finish(null); };
      manual.onclick = function () {
        var v = window.prompt('Barcode number (the digits under the bars):');
        if (v && v.replace(/\D/g, '').length >= 6) finish(v);
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg.textContent = 'THIS BROWSER CAN’T OPEN THE CAMERA — TYPE THE NUMBER INSTEAD';
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (s) {
          if (done) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          stream = s; video.srcObject = s;
          return video.play().catch(function () {}).then(makeDecoder).then(function (decode) {
            msg.textContent = 'LINE THE BARCODE UP INSIDE THE BOX';
            var tick = async function () {
              if (done) return;
              var code = null;
              try { code = await decode(video); } catch (e) { code = null; }
              if (code && /^\d{6,14}$/.test(code)) return finish(code);
              timer = setTimeout(tick, 180);
            };
            tick();
          });
        })
        .catch(function (e) {
          msg.textContent = (e && e.name === 'NotAllowedError')
            ? 'CAMERA ACCESS WAS DENIED — ALLOW IT IN SETTINGS, OR TYPE THE NUMBER'
            : 'COULDN’T START THE CAMERA — TYPE THE NUMBER INSTEAD';
        });
    });
  }

  window.Scanner = { open: open };
})();
