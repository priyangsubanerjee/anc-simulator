"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { BlockMath, InlineMath } from "react-katex";

export default function Home() {

  const audioCtx = useRef(null);
  const osc1 = useRef(null);
  const osc2 = useRef(null);
  const analyser1 = useRef(null);
  const analyser2 = useRef(null);
  const analyserSum = useRef(null);
  const gain2 = useRef(null);
  const delayNode = useRef(null);
  const sumGain = useRef(null);
  const raf = useRef(null);
  const canvasRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [freq, setFreq] = useState(440);
  const [phase, setPhase] = useState(110); // degrees
  const [invert, setInvert] = useState(false); // negative gain inversion by default

  useEffect(() => {
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioCtx.current && audioCtx.current.state !== "closed") {
        try { audioCtx.current.close(); } catch (e) { }
      }
    };
  }, []);

  const draw = () => {
    const c = canvasRef.current;
    if (!c || !analyser1.current || !analyser2.current || !analyserSum.current) return;
    const ctx = c.getContext("2d");
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    const N = analyser1.current.fftSize;
    const buf1 = new Float32Array(N);
    const buf2 = new Float32Array(N);
    const bufsum = new Float32Array(N);
    analyser1.current.getFloatTimeDomainData(buf1);
    analyser2.current.getFloatTimeDomainData(buf2);
    analyserSum.current.getFloatTimeDomainData(bufsum);

    // center line
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // helper to plot
    const plot = (data, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = (i / N) * W;
        const y = H / 2 - data[i] * (H / 2 - 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // inside draw()
    plot(bufsum, "#6b7280");      // gray, base layer
    plot(buf2, "#dc2626");        // red, middle
    plot(buf1, "#1d4ed8");        // blue, top
    raf.current = requestAnimationFrame(draw);
  };

  const start = async () => {
    if (running) return;
    if (!audioCtx.current) return;
    await audioCtx.current.resume();
    const ctx = audioCtx.current;

    // create nodes
    osc1.current = ctx.createOscillator();
    osc2.current = ctx.createOscillator();
    osc1.current.type = "sine";
    osc2.current.type = "sine";
    osc1.current.frequency.value = freq;
    osc2.current.frequency.value = freq;

    analyser1.current = ctx.createAnalyser();
    analyser2.current = ctx.createAnalyser();
    analyserSum.current = ctx.createAnalyser();
    analyser1.current.fftSize = 2048;
    analyser2.current.fftSize = 2048;
    analyserSum.current.fftSize = 2048;

    // summing node (will sum both oscillators)
    sumGain.current = ctx.createGain();
    sumGain.current.gain.value = 1;

    // delay and invert-gain for osc2 path
    delayNode.current = ctx.createDelay(1.0); // max 1s
    // compute delay from phase & freq (seconds)
    const delayTime = (phase / 360) * (1 / freq);
    delayNode.current.delayTime.value = delayTime;

    gain2.current = ctx.createGain();
    gain2.current.gain.value = invert ? -1 : 1; // negative gain = inversion

    // connect osc1 -> analyser1 (tap) and -> sumGain (summed path)
    osc1.current.connect(analyser1.current);
    osc1.current.connect(sumGain.current);

    // connect osc2 -> analyser2 (tap) and -> delay -> gain2 -> sumGain
    osc2.current.connect(delayNode.current);
    delayNode.current.connect(gain2.current);
    gain2.current.connect(analyser2.current);   // tap AFTER delay/gain
    gain2.current.connect(sumGain.current);

    // sum -> analyserSum -> destination
    sumGain.current.connect(analyserSum.current);
    analyserSum.current.connect(ctx.destination);

    const now = ctx.currentTime;
    osc1.current.start(now);
    osc2.current.start(now);

    setRunning(true);
    raf.current = requestAnimationFrame(draw);
  };

  const stop = () => {
    if (!running) return;
    try {
      osc1.current && osc1.current.stop();
      osc2.current && osc2.current.stop();
    } catch (e) { }
    try {
      osc1.current && osc1.current.disconnect();
      osc2.current && osc2.current.disconnect();
      analyser1.current && analyser1.current.disconnect();
      analyser2.current && analyser2.current.disconnect();
      analyserSum.current && analyserSum.current.disconnect();
      delayNode.current && delayNode.current.disconnect();
      gain2.current && gain2.current.disconnect();
      sumGain.current && sumGain.current.disconnect();
    } catch (e) { }

    osc1.current = null;
    osc2.current = null;
    analyser1.current = null;
    analyser2.current = null;
    analyserSum.current = null;
    delayNode.current = null;
    gain2.current = null;
    sumGain.current = null;

    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setRunning(false);
  };

  useEffect(() => {
    if (!running || !audioCtx.current) return;
    const now = audioCtx.current.currentTime;
    osc1.current && osc1.current.frequency.setValueAtTime(freq, now);
    osc2.current && osc2.current.frequency.setValueAtTime(freq, now);
    if (delayNode.current) {
      const dt = (phase / 360) * (1 / freq);
      delayNode.current.delayTime.setValueAtTime(dt, now);
    }
  }, [freq, phase, running]);

  // update invert live
  useEffect(() => {
    if (!running || !gain2.current || !audioCtx.current) return;
    gain2.current.gain.setValueAtTime(invert ? -1 : 1, audioCtx.current.currentTime);
  }, [invert, running]);


  return (
    <div className="bg-neutral-100 min-h-svh md:pt-20">
      <div className="bg-white max-w-[550px] mx-auto p-5 md:p-8">
        <p className="text-xs font-mono tracking-[2px] text-center text-neutral-600">FOR EDUCATIONAL PURPOSE</p>
        <h1 className="text-xl md:text-2xl font-semibold text-center text-pretty mt-4">
          Active Noise Cancellation Simulator
        </h1>
        <p className="text-sm text-neutral-700 mt-3 leading-[1.6]">
          A browser-based interactive demo that visualizes how sound waves can cancel each other through phase inversion. Using the Web Audio API, two sine oscillators are generated with adjustable frequency, phase shift, and gain inversion.
        </p>
        <p className="text-xs leading-5 mt-5 text-neutral-500 italic border-l border-neutral-300 pl-4 py-2">
          This is a simplified simulation of active noise cancellation using two oscillators. Real ANC systems use microphones and adaptive filtering.
        </p>
        <div className="grid grid-cols-2 gap-5 mt-8">
          <div>
            <p className="font-medium text-sm">Frequency: {freq} Hz</p>
            <input
              type="range"
              min="50"
              max="1000"
              value={freq}
              className="w-full mt-3"
              onChange={(e) => setFreq(Number(e.target.value))}
            />
          </div>
          <div>
            <p className="text-sm font-medium">Phase angle: {phase}°</p>
            <input
              type="range"
              min="0"
              max="360"
              value={phase}
              onChange={(e) => setPhase(Number(e.target.value))}
              className="w-full mt-3"
            />
          </div>
        </div>
        <div className="flex items-center mt-10">
          <button onClick={() => {
            if (running) stop(); else start();
          }} className=" bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
            {running ? "Stop simulation" : "Start simulation"}
          </button>
          <label className="flex items-center ml-auto gap-2">
            <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
            <span className="text-sm text-neutral-700 select-none">Invert (negative gain)</span>
          </label>
        </div>
        <canvas ref={canvasRef}
          className="w-full mt-8 border border-neutral-300 rounded-xl" />
        <ul className="list-disc pl-5 space-y-2 mt-6 text-sm">
          <li>
            Blue is the reference tone.
          </li>
          <li>Red is the anti-noise
            tone you&apos;re adjusting with phase and inversion.</li>
          <li>Gray is the result, constructive or destructive interference between the two.</li>
        </ul>
        <p className=" text-sm text-neutral-700 mt-5 leading-6">
          For reliable cancellation keep <b>Invert</b> checked (gain = -1) and phase ≈ 180°.
          Use headphones for best results.
        </p>

        <div className="space-y-10 mt-10 text-sm leading-6">
          <h1 className="text-lg font-medium underline">Noise Cancellation Demo - Scientific Explanation</h1>
          <section>
            <h2 className="text-xl font-medium">Sound Wave Representation</h2>
            <p className="text-sm text-neutral-600 mt-1 mb-4">
              Sound waves are oscillations of air pressure and can be modeled mathematically as sine waves:
            </p>
            <BlockMath math={'y(t) = A \\cdot \\sin(\\omega t + \\phi)'} />
            <p>Where:</p>
            <ul className="list-disc ml-6">
              <li><InlineMath math={'y(t)'} /> = instantaneous amplitude at time <InlineMath math={'t'} /></li>
              <li><InlineMath math={'A'} /> = amplitude (volume) of the wave</li>
              <li><InlineMath math={'\\omega = 2\\pi f'} /> = angular frequency, <InlineMath math={'f'} /> is frequency in Hz</li>
              <li><InlineMath math={'\\phi'} /> = phase of the wave in radians</li>
            </ul>
          </section>


          <section>
            <h2 className="text-xl font-medium">Superposition Principle</h2>
            <p className="leading-6 mt-2 mb-4">When two waves meet, their amplitudes add algebraically:</p>
            <BlockMath math={'y_{total}(t) = y_1(t) + y_2(t)'} />
            <p>
              If <InlineMath math={'y_1'} /> and <InlineMath math={'y_2'} /> are in phase (<InlineMath math={'\\phi_1 = \\phi_2'} />), they constructively interfere:
            </p>
            <BlockMath math={'y_{total}(t) = 2A \\sin(\\omega t)'} />
            <p>
              If they are 180° out of phase (<InlineMath math={'\\phi_2 = \\phi_1 + \\pi'} />), they destructively interfere, cancelling each other:
            </p>
            <BlockMath math={'y_{total}(t) = A \\sin(\\omega t) + (-A \\sin(\\omega t)) = 0'} />
          </section>


          <section>
            <h2 className="text-xl font-medium">Phase Shift Calculation</h2>
            <p className="leading-6 mt-2 mb-4">To shift a wave by a specific phase in degrees:</p>
            <BlockMath math={'Delay = \\frac{Phase(\\degree)}{360} \\cdot T'} />
            <p>
              Where <InlineMath math={'T = 1/f'} /> is the wave period.
            </p>
            <p>
              Example: For a 440 Hz wave (<InlineMath math={'T \\approx 0.00227'} /> s), a 180° phase shift:
            </p>
            <BlockMath math={'Delay = 0.5 \\cdot 0.00227 \\approx 0.001135 s'} />
          </section>


          <section>
            <h2 className="text-xl font-medium">Inversion via Negative Gain</h2>
            <p className="leading-6 mt-2 mb-4">
              Instead of a delay, we can invert the wave using negative gain:
            </p>
            <BlockMath math={'y_2(t) = -y_1(t)'} />
            <p>
              Setting <InlineMath math={'gain.value = -1'} /> in Web Audio flips the wave, producing exact destructive interference when the phase offset is 180°.
            </p>
          </section>


          <section>
            <h2 className="text-xl font-medium">Combined Waveform</h2>
            <p className="leading-6 mt-2 mb-4">
              If we sum both waves:
            </p>
            <BlockMath math={'y_{sum}(t) = y_1(t) + y_2(t)'} />
            <p>
              For 180° phase difference & inversion:
            </p>
            <BlockMath math={'y_{sum}(t) = 0'} />
            <p>
              For other phase differences, partial cancellation occurs:
            </p>
            <BlockMath math={'y_{sum, max} = 2A \\cos(\\phi/2)'} />
          </section>


          <section>
            <h2 className="text-xl font-medium">Key Notes</h2>
            <ul className="list-disc ml-6">
              <li>Cancellation works best at single frequencies (pure tones).</li>
              <li>Real-world noise is broadband, so ANC systems require filtering and adaptive algorithms.</li>
              <li>Room acoustics or headphone leakage can reduce the effectiveness of destructive interference.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
