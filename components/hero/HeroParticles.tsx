'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// Three.js depth layer for the hero: drifting gold particles +
// floating translucent candlesticks with mouse parallax.
const CANDLE_SEEDS = Array.from({ length: 8 }, (_, i) => ({
  x: 1.5 + (i % 4) * 1.6 + Math.sin(i * 3.7) * 0.5,
  y: Math.sin(i * 2.3) * 2.4,
  z: -1 - (i % 3),
  h: 0.5 + Math.abs(Math.sin(i * 1.9)) * 0.7,
  up: i % 3 !== 1,
  speed: 0.4 + (i % 4) * 0.14,
  phase: i * 1.1,
}));

export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Drifting gold points
    const n = 220;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.04, color: 0xe8c484, transparent: true, opacity: 0.5,
      sizeAttenuation: true, depthWrite: false,
    }));
    scene.add(points);

    // Floating candles
    const candleGroup = new THREE.Group();
    const candles: THREE.Group[] = [];
    for (const s of CANDLE_SEEDS) {
      const g = new THREE.Group();
      g.position.set(s.x, s.y, s.z);
      const col = s.up ? 0x34d399 : 0xf87171;
      const wickCol = s.up ? 0x6ee7b7 : 0xfca5a5;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, s.h, 0.16),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4 }),
      );
      const wick = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, s.h * 1.8, 0.025),
        new THREE.MeshBasicMaterial({ color: wickCol, transparent: true, opacity: 0.3 }),
      );
      g.add(body, wick);
      candleGroup.add(g);
      candles.push(g);
    }
    scene.add(candleGroup);

    let mouseX = 0, mouseY = 0;
    function onMouse(e: MouseEvent) {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('mousemove', onMouse, { passive: true });

    let disposed = false;
    let animId = 0;
    const clock = new THREE.Clock();

    function resize() {
      const w = canvas!.clientWidth, h = canvas!.clientHeight;
      const dpr = renderer.getPixelRatio();
      if (canvas!.width !== w * dpr || canvas!.height !== h * dpr) {
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      }
    }

    function animate() {
      if (disposed) return;
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      points.rotation.y = t * 0.018;
      points.rotation.x = Math.sin(t * 0.1) * 0.04;

      for (let i = 0; i < candles.length; i++) {
        const s = CANDLE_SEEDS[i];
        candles[i].position.y = s.y + Math.sin(t * s.speed + s.phase) * 0.35;
        candles[i].rotation.y = t * 0.15 + s.phase;
      }

      camera.position.x += (mouseX * 0.7 - camera.position.x) * 0.04;
      camera.position.y += (mouseY * 0.45 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      resize();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouse);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />;
}
