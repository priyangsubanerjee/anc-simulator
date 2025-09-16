"use client";
import React, { useEffect, useRef, useState } from "react";

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
  const [freq, setFreq] = useState(100);
  const [phase, setPhase] = useState(110); // degrees
  const [invert, setInvert] = useState(false);

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

    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

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

  useEffect(() => {
    if (!running || !gain2.current || !audioCtx.current) return;
    gain2.current.gain.setValueAtTime(invert ? -1 : 1, audioCtx.current.currentTime);
  }, [invert, running]);


  return (
    <div className="bg-neutral-100 min-h-svh md:pt-8">
      <div className="bg-white max-w-[1000px] mx-auto p-5 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-16">
          <div>
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

          </div>
          <div>
            <canvas ref={canvasRef}
              className="w-full mt-8 border border-neutral-300 rounded-xl" />
            <ul className="space-y-2 mt-6 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 bg-[#1d4ed8]"></div> Reference tone.
              </li>
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 bg-[#dc2626]"></div> Anti-noise
              </li>
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 bg-[#6b7280]"></div> Constructive or destructive interference between the two.
              </li>
            </ul>
            <p className=" text-sm text-neutral-700 mt-5 leading-6">
              For reliable cancellation keep <b>Invert</b> checked (gain = -1) and phase ≈ 180°.
              Use headphones for best results.
            </p>
            <a href="https://en.wikipedia.org/wiki/Active_noise_control" className="flex gap-1 items-center text-sm mt-6 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5" viewBox="0 0 512 512">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={32} d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"></path>
              </svg>
              <span>Learn more about ANC</span>
            </a>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-neutral-600">This project is maintained by: <a className="text-blue-600" href="https://priyangsu.dev/">@priyangsubanerjee</a> </p>
          <p className="text-sm text-neutral-600 mt-2">
            <a className="text-blue-600 flex items-center gap-2" href="https://github.com/priyangsubanerjee/anc-simulator">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5" viewBox="0 0 512 512">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={32} d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"></path>
              </svg>
              <span>Source code</span>
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
