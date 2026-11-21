// SHADOWLINE — sound, synthesized with WebAudio and nothing else:
// no audio files, no network. A short blip for footsteps, a ping for
// a thrown coin, a chime for intel, a wail while the alarm runs and a
// little arpeggio for a cleared wing. Mute with M.

export function createAudio() {
  let ctx = null;
  let muted = false;
  let alarmNodes = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.12, when = 0, slideTo = null) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function startAlarm() {
    if (muted || alarmNodes) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const lfo = ac.createOscillator();
    const lfoAmp = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 420;
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    lfoAmp.gain.value = 140;
    lfo.connect(lfoAmp);
    lfoAmp.connect(osc.frequency);
    amp.gain.value = 0.045;
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start();
    lfo.start();
    alarmNodes = { osc, amp, lfo };
  }

  function stopAlarm() {
    if (!alarmNodes) return;
    const { osc, lfo } = alarmNodes;
    alarmNodes = null;
    try {
      osc.stop();
      lfo.stop();
    } catch {
      // Already stopped: nothing to do.
    }
  }

  return {
    get muted() {
      return muted;
    },
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) stopAlarm();
      return muted;
    },
    step() {
      tone(140, 0.05, 'triangle', 0.05);
    },
    coin() {
      tone(1250, 0.09, 'sine', 0.1);
      tone(1800, 0.12, 'sine', 0.07, 0.07);
    },
    clink() {
      tone(2400, 0.06, 'square', 0.045);
      tone(1700, 0.08, 'square', 0.035, 0.05);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.11);
      tone(990, 0.14, 'sine', 0.11, 0.08);
    },
    suspicious() {
      tone(330, 0.16, 'triangle', 0.09, 0, 260);
    },
    alarmOn() {
      startAlarm();
    },
    alarmOff() {
      stopAlarm();
    },
    caught() {
      tone(320, 0.4, 'sawtooth', 0.1, 0, 90);
    },
    level() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'sine', 0.1, i * 0.09));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'sine', 0.1, i * 0.11));
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, i * 0.13));
    },
  };
}
