(function () {
  'use strict';
  var ctx = null, started = false;

  function isMuted() { var a = window.castleApp; return a && a.soundEnabled === false; }

  function sunAngle() {
    var a = window.castleApp;
    if (!a || !a.clock) return 0;
    return (a.clock.getElapsedTime() % 60) / 60 * Math.PI * 2 - Math.PI / 2;
  }
  function isNight() { return Math.sin(sunAngle()) < -0.1; }
  function dayVol() { return Math.max(0, Math.sin(sunAngle())); }

  function brownNoise(dest) {
    var buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = buf.getChannelData(0), b = 0;
    for (var i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; }
    var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start();
  }

  function whiteNoise(dest) {
    var buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start();
  }

  function startBirds(master) {
    function chirp() {
      if (!isMuted()) {
        var vol = isNight() ? 0 : dayVol() * 0.18;
        if (vol > 0.01) {
          var pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 2 - 1;
          var g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
          g.connect(pan); pan.connect(master);
          var o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(800, ctx.currentTime);
          o.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
          o.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
          o.connect(g); o.start(); o.stop(ctx.currentTime + 0.22);
        }
      }
      setTimeout(chirp, 2000 + Math.random() * 4000);
    }
    chirp();
  }

  function startRiver(master) {
    var g = ctx.createGain(); g.gain.value = 0.04;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    brownNoise(lp); lp.connect(g); g.connect(master);
    setInterval(function () {
      if (!isMuted()) g.gain.setTargetAtTime(0.03 + Math.random() * 0.02, ctx.currentTime, 2);
    }, 3000);
  }

  function startFireCrackle(master) {
    function crackle() {
      if (!isMuted()) {
        var dur = 0.02 + Math.random() * 0.03;
        var g = ctx.createGain(); g.gain.setValueAtTime(0.02, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
        bp.frequency.value = 1800 + Math.random() * 400; bp.Q.value = 0.5;
        whiteNoise(bp); bp.connect(g); g.connect(master);
      }
      setTimeout(crackle, 100 + Math.random() * 400);
    }
    crackle();
  }

  function startWind(master) {
    var g = ctx.createGain(); g.gain.value = 0.02;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
    whiteNoise(lp); lp.connect(g); g.connect(master);
    var phase = 0;
    setInterval(function () {
      phase += 0.1;
      if (!isMuted()) g.gain.setTargetAtTime(0.01 + 0.03 * (0.5 + 0.5 * Math.sin(phase)), ctx.currentTime, 1);
    }, 1000);
  }

  function startCrickets(master) {
    function chirp() {
      if (!isMuted() && isNight()) {
        var g = ctx.createGain(); g.gain.setValueAtTime(0.015, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05); g.connect(master);
        var o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.value = 4000 + Math.random() * 1000;
        o.connect(g); o.start(); o.stop(ctx.currentTime + 0.05);
      }
      setTimeout(chirp, 200 + Math.random() * 600);
    }
    chirp();
  }

  function initAudio() {
    if (started) return; started = true;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    var master = ctx.createGain(); master.gain.value = 0.3; master.connect(ctx.destination);
    startBirds(master); startRiver(master); startFireCrackle(master);
    startWind(master); startCrickets(master);
  }

  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });
})();
