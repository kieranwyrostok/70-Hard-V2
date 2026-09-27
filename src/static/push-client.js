// Talks to the Netlify push functions. Used by the Habits & reminders screen.
(function () {
  function b64urlToBytes(s) {
    var pad = '='.repeat((4 - (s.length % 4)) % 4);
    var raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function sameKey(sub, pub) {
    try {
      var k = sub.options && sub.options.applicationServerKey;
      if (!k) return true;
      var a = new Uint8Array(k), b = b64urlToBytes(pub);
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    } catch (e) { return true; }
  }
  async function post(path, body) {
    var r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    var j = {};
    try { j = await r.json(); } catch (e) { /* empty */ }
    if (!r.ok) throw new Error(j.error || ('server ' + r.status));
    return j;
  }
  var isStandalone = function () {
    return navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  };

  window.PushClient = {
    supported: function () {
      return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    },
    iosNeedsInstall: function () {
      return /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
    },
    permission: function () {
      return 'Notification' in window ? Notification.permission : 'unsupported';
    },
    // Must be called straight from a tap: iOS only shows the permission prompt then.
    enable: async function (payload) {
      if (!this.supported()) throw new Error(this.iosNeedsInstall() ? 'Add to home screen first' : 'Not supported in this browser');
      var perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Blocked — allow notifications in Settings' : 'Permission not given');
      var reg = await navigator.serviceWorker.ready;
      var cfgRes = await fetch('/api/push-config');
      if (!cfgRes.ok) throw new Error('Server not reachable — is the site on Netlify?');
      var cfg = await cfgRes.json();
      var sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub, cfg.publicKey)) { await sub.unsubscribe(); sub = null; }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(cfg.publicKey) });
      payload.sub = sub.toJSON();
      await post('/api/push-subscribe', payload);
      return true;
    },
    sync: function (payload) { return post('/api/push-subscribe', payload); },
    test: function (id) { return post('/api/push-test', { id: id }); },
    disable: async function (id) {
      try {
        var reg = await navigator.serviceWorker.ready;
        var s = await reg.pushManager.getSubscription();
        if (s) await s.unsubscribe();
      } catch (e) { /* ignore */ }
      try { await post('/api/push-subscribe', { id: id, remove: true }); } catch (e) { /* ignore */ }
    }
  };
})();
