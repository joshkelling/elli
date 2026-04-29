'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useBackground } from '@/app/components/BackgroundProvider';

// Canvas dimensions
const CW = 800;
const CH = 480;
const GRAVITY = 0.38;
const BALL_R = 14;
const FLOOR_Y = 440;

// Jimmy's position (feet at floor)
const JX = 130;
const JGY = FLOOR_Y;

// Ball starts at Jimmy's raised right hand
const BALL_SX = JX + 42;
const BALL_SY = JGY - 150;

// Hoop
const HX = 650;
const HY = 185;
const RIM_HALF = 33;

// Backboard collision surface (must match coordinates in drawHoop)
const BOARD_X   = HX + RIM_HALF + 4;  // 687 — front (left) face
const BOARD_TOP = HY - 65;             // 120 — top edge
const BOARD_BOT = HY - 65 + 90;       // 210 — bottom edge
const BOARD_W   = 20;
const BOARD_RESTITUTION = 0.65;        // fraction of speed kept after bounce

// Floor bounce
const FLOOR_RESTITUTION = 0.52;        // fraction of vertical speed kept on floor bounce
const FLOOR_FRICTION    = 0.82;        // fraction of horizontal speed kept on floor bounce

// Coach Rocko
const ROCKO_X = 500;
const ROCKO_GY = FLOOR_Y;
const ROCKO_BLOCK_RADIUS = 52;        // px — arm-reach block zone when jumping
const ROCKO_BLOCK_MIN_Y  = 30;        // min yOffset before arms are considered raised

// Elli (flying teammate)
const ELLI_HOME_X = CW + 60;          // off-screen right
const ELLI_HOME_Y = 120;
const ELLI_SPEED = 11;
const ELLI_DUNK_SPEED = 9;
const ELLI_INTERCEPT_R = 24;
const ELLI_HOVER_X = HX - 8;
const ELLI_HOVER_Y = HY - 60;
const ELLI_DUNK_TARGET_X = HX;
const ELLI_DUNK_TARGET_Y = HY + 14;
const ELLI_MAX_CHARGES = 3;

type GameState = 'idle' | 'playing' | 'over';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  prevY: number;
  hasTraveled: boolean; // true once the ball has gone well past Jimmy toward the hoop
}

interface Rocko {
  state: 'idle' | 'jumping' | 'pickingUp' | 'throwing';
  // jump
  jumpTimer: number;
  jumpFrame: number;
  jumpDuration: number;
  jumpHeight: number;
  // pickup / throw
  actionFrame: number;
  actionDuration: number;
  holdingBall: boolean;
}

interface Elli {
  state: 'idle' | 'flyingIn' | 'hovering' | 'slamming' | 'flyingOut';
  x: number;
  y: number;
  vx: number;
  vy: number;
  frame: number;
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawRocko(ctx: CanvasRenderingContext2D, rocko: Rocko, yOffset: number) {
  const x = ROCKO_X;
  const gy = ROCKO_GY - yOffset;

  // ── Derive animation values ───────────────────────────────────────────────
  const isJumping  = rocko.state === 'jumping' && yOffset > ROCKO_BLOCK_MIN_Y;
  const isPicking  = rocko.state === 'pickingUp';
  const isThrowing = rocko.state === 'throwing';

  let bendAmt  = 0; // 0 = upright, 1 = fully bent
  let throwAmt = 0; // 0 = start of throw, 1 = fully followed through

  if (isPicking) {
    const half = rocko.actionDuration / 2;
    bendAmt = rocko.actionFrame < half
      ? rocko.actionFrame / half
      : (rocko.actionDuration - rocko.actionFrame) / half;
  }
  if (isThrowing) {
    throwAmt = rocko.actionFrame / rocko.actionDuration;
  }

  // ── Shadow (fixed to ground) ──────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, ROCKO_GY + 1, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Lower body (does not rotate with bend) ────────────────────────────────
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.ellipse(x - 15, gy, 15, 7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 15, gy, 15, 7, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#F0B88A';
  ctx.fillRect(x - 23, gy - 44, 18, 42);
  ctx.fillRect(x + 5, gy - 44, 18, 42);

  ctx.fillStyle = '#6B7280';
  ctx.beginPath();
  ctx.roundRect(x - 27, gy - 84, 54, 42, 4);
  ctx.fill();
  ctx.fillStyle = '#4B5563';
  ctx.fillRect(x - 27, gy - 84, 54, 5);

  // ── Upper body — pivot at hip when bending ────────────────────────────────
  ctx.save();
  ctx.translate(x, gy - 82);       // hip pivot point
  ctx.rotate(bendAmt * 0.7);       // up to ~40° forward lean

  // Coords are now relative to hip (0,0); positive Y = downward

  // Green shirt
  ctx.fillStyle = '#16A34A';
  ctx.beginPath();
  ctx.roundRect(-30, -78, 60, 82, [5, 5, 0, 0]);
  ctx.fill();
  // Belly bulge
  ctx.fillStyle = '#15803D';
  ctx.beginPath();
  ctx.ellipse(2, -20, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // COACH label
  ctx.fillStyle = 'white';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('COACH', 0, -40);
  ctx.textAlign = 'left';

  // Arm endpoints (local coords relative to hip)
  const sLX = -30, sLY = -63;
  const sRX =  30, sRY = -63;
  let hLX: number, hLY: number, hRX: number, hRY: number;

  if (isJumping) {
    hLX = -52; hLY = -115;
    hRX =  52; hRY = -115;
  } else if (bendAmt > 0) {
    // Reaching down to scoop up the ball
    hLX = -10; hLY = 80;
    hRX =  20; hRY = 82;
  } else if (isThrowing) {
    if (throwAmt < 0.4) {
      // Wind-up: right arm cocked back toward hoop
      const t = throwAmt / 0.4;
      hRX = 55 - t * 10; hRY = -80 + t * 15;
      hLX = -42; hLY = -10;
    } else {
      // Follow-through: arm swings toward Jimmy (−x)
      const t = (throwAmt - 0.4) / 0.6;
      hRX = 45 - t * 95; hRY = -65 + t * 60;
      hLX = -42; hLY = -10 - t * 25;
    }
  } else {
    // Relaxed at sides
    hLX = -50; hLY = 18;
    hRX =  50; hRY = 18;
  }

  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#16A34A';
  ctx.beginPath();
  ctx.moveTo(sLX, sLY); ctx.lineTo(hLX, hLY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sRX, sRY); ctx.lineTo(hRX, hRY);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Ball in Rocko's hands
  if (rocko.holdingBall) {
    const bx = isThrowing ? hRX : (hLX + hRX) / 2;
    const by = isThrowing ? hRY : (hLY + hRY) / 2;
    ctx.fillStyle = '#E8650A';
    ctx.beginPath();
    ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7C2D12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by - BALL_R);
    ctx.bezierCurveTo(bx + BALL_R*0.5, by - BALL_R*0.4, bx + BALL_R*0.5, by + BALL_R*0.4, bx, by + BALL_R);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - BALL_R, by);
    ctx.bezierCurveTo(bx - BALL_R*0.5, by - BALL_R*0.5, bx + BALL_R*0.5, by - BALL_R*0.5, bx + BALL_R, by);
    ctx.stroke();
  }

  // Head
  const headY = -108;
  ctx.fillStyle = '#F0B88A';
  ctx.beginPath();
  ctx.arc(0, headY, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2D1B00';
  ctx.beginPath();
  ctx.arc(-9, headY - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, headY - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-8, headY + 10);
  ctx.lineTo(8, headY + 10);
  ctx.stroke();

  // Salt-and-pepper hair
  ctx.fillStyle = '#888';
  ctx.fillRect(-28, headY - 25, 7, 23);
  ctx.fillRect(21, headY - 25, 7, 23);
  ctx.beginPath();
  ctx.ellipse(0, headY - 23, 21, 9, 0, Math.PI, 0);
  ctx.fill();

  // Backwards cap
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  ctx.roundRect(-19, headY - 42, 38, 30, [12, 12, 3, 3]);
  ctx.fill();
  ctx.fillStyle = '#374151';
  ctx.fillRect(-19, headY - 24, 38, 5);
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  ctx.ellipse(-14, headY - 28, 28, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawElli(ctx: CanvasRenderingContext2D, elli: Elli, holdingBall: boolean) {
  if (elli.state === 'idle') return;

  const x = elli.x;
  const y = elli.y;
  const facing = elli.vx >= 0 ? 1 : -1;       // 1 = facing right, -1 = facing left
  const flutter = Math.sin(elli.frame * 0.25) * 4;

  ctx.save();

  // ── Cape (drawn first, behind body) ─────────────────────────────────────
  // Anchored at shoulders (x, y - 22), trailing opposite direction of motion
  ctx.fillStyle = '#EC4899';
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 22);
  ctx.quadraticCurveTo(
    x - facing * 28,
    y - 4 + flutter,
    x - facing * 46,
    y + 22 + flutter,
  );
  ctx.quadraticCurveTo(
    x - facing * 22,
    y + 18,
    x + 4,
    y - 22,
  );
  ctx.fill();
  // Cape collar/edge
  ctx.strokeStyle = '#BE185D';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Legs (yellow tights) ────────────────────────────────────────────────
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(x - 12, y + 18, 9, 24);
  ctx.fillRect(x + 3, y + 18, 9, 24);
  // Boots (pink)
  ctx.fillStyle = '#EC4899';
  ctx.beginPath();
  ctx.ellipse(x - 7, y + 44, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 7, y + 44, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Body (yellow leotard) ───────────────────────────────────────────────
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.roundRect(x - 16, y - 22, 32, 42, [4, 4, 6, 6]);
  ctx.fill();

  // Pink star on chest
  ctx.fillStyle = '#EC4899';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const r = 7;
    const px = x + Math.cos(a) * r;
    const py = y - 5 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    const ai = a + Math.PI / 5;
    const ri = 3;
    ctx.lineTo(x + Math.cos(ai) * ri, y - 5 + Math.sin(ai) * ri);
  }
  ctx.closePath();
  ctx.fill();

  // ── Arms ────────────────────────────────────────────────────────────────
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#FACC15';
  if ((elli.state === 'hovering' || elli.state === 'slamming') && holdingBall) {
    // Lead arm raised overhead holding the ball
    ctx.beginPath();
    ctx.moveTo(x + facing * 12, y - 16);
    ctx.lineTo(x + facing * 6, y - 36);
    ctx.stroke();
    // Trailing arm flared back
    ctx.beginPath();
    ctx.moveTo(x - facing * 12, y - 16);
    ctx.lineTo(x - facing * 22, y - 4);
    ctx.stroke();
  } else if (elli.state === 'flyingIn') {
    // Both arms extended forward (Superman pose)
    ctx.beginPath();
    ctx.moveTo(x + facing * 8, y - 14);
    ctx.lineTo(x + facing * 24, y - 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + facing * 8, y - 8);
    ctx.lineTo(x + facing * 22, y - 6);
    ctx.stroke();
  } else {
    // Trailing arms (flyingOut)
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 14);
    ctx.lineTo(x - 24, y - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 14);
    ctx.lineTo(x + 24, y - 4);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // ── Head (skin) ─────────────────────────────────────────────────────────
  const headY = y - 38;
  ctx.fillStyle = '#F2D2B0';
  ctx.beginPath();
  ctx.arc(x, headY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Black hair fringe + top
  ctx.fillStyle = '#1F1208';
  ctx.beginPath();
  ctx.ellipse(x, headY - 14, 18, 9, 0, Math.PI, 0);
  ctx.fill();
  // Fringe across forehead
  ctx.beginPath();
  ctx.ellipse(x - 4, headY - 8, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pigtails (slightly trailing opposite facing for motion)
  const pigOffset = -facing * 3;
  ctx.fillStyle = '#1F1208';
  ctx.beginPath();
  ctx.ellipse(x - 19 + pigOffset, headY - 2, 6, 12, -0.2 * facing, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 19 + pigOffset, headY - 2, 6, 12, 0.2 * facing, 0, Math.PI * 2);
  ctx.fill();
  // Pigtail ties (pink)
  ctx.fillStyle = '#EC4899';
  ctx.beginPath();
  ctx.arc(x - 19 + pigOffset, headY - 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 19 + pigOffset, headY - 8, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Yellow superhero mask (band across eyes)
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.roundRect(x - 16, headY - 5, 32, 9, 3);
  ctx.fill();
  ctx.strokeStyle = '#CA8A04';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eyes (inside the mask)
  ctx.fillStyle = '#1F1208';
  ctx.beginPath();
  ctx.arc(x - 6, headY - 1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 6, headY - 1, 2, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#7C3A1A';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, headY + 6, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();

  // ── Ball overhead while she's carrying it (drawn last, on top) ──────────
  if (holdingBall) {
    drawBall(ctx, x + facing * 6, y - 36);
  }
}

function drawScene(ctx: CanvasRenderingContext2D, ball: Ball, holdingBall: boolean, boardFlash = 0, squish = 0, rocko: Rocko, rockoYOffset = 0, elli: Elli, ballAttachedToElli = false) {
  ctx.clearRect(0, 0, CW, CH);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  sky.addColorStop(0, '#5BA3D9');
  sky.addColorStop(1, '#A8D8EA');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, FLOOR_Y);

  // Hardwood floor
  ctx.fillStyle = '#C8863C';
  ctx.fillRect(0, FLOOR_Y, CW, CH - FLOOR_Y);
  ctx.fillStyle = '#A0662A';
  ctx.fillRect(0, FLOOR_Y, CW, 4);

  // Court arc (decorative)
  ctx.strokeStyle = 'rgba(255,220,80,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(20, FLOOR_Y, 210, -Math.PI / 2 + 0.35, 0.05);
  ctx.stroke();
  ctx.setLineDash([]);

  drawHoop(ctx, boardFlash);
  drawRocko(ctx, rocko, rockoYOffset);

  // Free-flying ball (skip when Elli is carrying it — she draws it overhead)
  if (ball.active && !ballAttachedToElli) {
    drawBall(ctx, ball.x, ball.y, squish);
  } else if (!ball.active && !rocko.holdingBall) {
    // Jimmy has the ball (Rocko's hand drawing handles it when Rocko holds it)
    drawBall(ctx, BALL_SX, BALL_SY);
  }

  drawElli(ctx, elli, ballAttachedToElli);

  drawJimmy(ctx, holdingBall && !rocko.holdingBall);
}

function drawHoop(ctx: CanvasRenderingContext2D, boardFlash = 0) {
  const x = HX;
  const y = HY;

  // Support pole
  ctx.fillStyle = '#888';
  ctx.fillRect(x + RIM_HALF + 14, y - 40, 10, FLOOR_Y - y + 40);

  // Backboard
  ctx.fillStyle = '#EEE';
  ctx.fillRect(x + RIM_HALF + 4, y - 65, 20, 90);
  ctx.strokeStyle = '#AAA';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + RIM_HALF + 4, y - 65, 20, 90);

  // Backboard target box
  ctx.strokeStyle = '#CC0000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + RIM_HALF + 7, y - 18, 14, 30);

  // Backboard flash when ball hits it
  if (boardFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 160, ${boardFlash * 0.6})`;
    ctx.fillRect(x + RIM_HALF + 4, y - 65, 20, 90);
  }

  // Rim support arm
  ctx.fillStyle = '#999';
  ctx.fillRect(x + RIM_HALF + 2, y - 6, 12, 12);

  // Rim bar
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - RIM_HALF, y);
  ctx.lineTo(x + RIM_HALF, y);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Rim end circles for depth
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.arc(x - RIM_HALF, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + RIM_HALF, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Net strands
  const netTop = y + 5;
  const netBot = y + 34;
  const strands = 8;
  ctx.strokeStyle = 'rgba(240,240,240,0.85)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= strands; i++) {
    const t = i / strands;
    const topX = x - RIM_HALF + RIM_HALF * 2 * t;
    const botX = x - (RIM_HALF - 12) + (RIM_HALF - 12) * 2 * t;
    ctx.beginPath();
    ctx.moveTo(topX, netTop);
    ctx.lineTo(botX, netBot);
    ctx.stroke();
  }
  // Net horizontal crossings
  for (let r = 1; r <= 3; r++) {
    const frac = r / 4;
    const shrink = 12 * frac;
    ctx.beginPath();
    ctx.moveTo(x - RIM_HALF + shrink, netTop + (netBot - netTop) * frac);
    ctx.lineTo(x + RIM_HALF - shrink, netTop + (netBot - netTop) * frac);
    ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, bx: number, by: number, squish = 0) {
  // Floor shadow (not squished — stays on the floor plane)
  if (by > CH - 120) {
    const a = Math.min(0.3, ((by - (CH - 120)) / 120) * 0.3);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath();
    ctx.ellipse(bx, FLOOR_Y + 2, BALL_R * (0.9 + squish * 0.5), 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Squish: widen horizontally, flatten vertically on floor impact
  ctx.save();
  ctx.translate(bx, by);
  if (squish > 0) ctx.scale(1 + squish * 0.45, 1 - squish * 0.3);

  const r = BALL_R;
  ctx.fillStyle = '#E8650A';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#7C2D12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Basketball seams
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.5, -r * 0.4, r * 0.5, r * 0.4, 0, r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(-r * 0.5, -r * 0.4, -r * 0.5, r * 0.4, 0, r);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.bezierCurveTo(-r * 0.5, -r * 0.5, r * 0.5, -r * 0.5, r, 0);
  ctx.stroke();

  ctx.restore();
}

function drawJimmy(ctx: CanvasRenderingContext2D, holdingBall: boolean) {
  const x = JX;
  const gy = JGY;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, gy + 1, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shoes
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.ellipse(x - 13, gy, 14, 7, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 13, gy, 14, 7, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Lower legs (skin)
  ctx.fillStyle = '#F5C9A0';
  ctx.fillRect(x - 21, gy - 42, 16, 40);
  ctx.fillRect(x + 5, gy - 42, 16, 40);

  // Blue shorts
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.roundRect(x - 24, gy - 77, 48, 37, 4);
  ctx.fill();
  // Shorts stripe
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(x - 24, gy - 77, 48, 6);

  // Orange shirt
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.roundRect(x - 24, gy - 145, 48, 72, [5, 5, 0, 0]);
  ctx.fill();

  // Jersey number
  ctx.fillStyle = 'white';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('1', x, gy - 99);
  ctx.textAlign = 'left';

  // Arms
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#F97316';
  if (holdingBall) {
    // Right arm raised (holding ball)
    ctx.beginPath();
    ctx.moveTo(x + 24, gy - 130);
    ctx.lineTo(x + 46, gy - 157);
    ctx.stroke();
    // Left arm out for balance
    ctx.beginPath();
    ctx.moveTo(x - 24, gy - 130);
    ctx.lineTo(x - 44, gy - 105);
    ctx.stroke();
  } else {
    // Both arms at sides (just shot)
    ctx.beginPath();
    ctx.moveTo(x + 24, gy - 130);
    ctx.lineTo(x + 44, gy - 105);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 24, gy - 130);
    ctx.lineTo(x - 44, gy - 105);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Head (skin)
  ctx.fillStyle = '#F5C9A0';
  ctx.beginPath();
  ctx.arc(x, gy - 172, 27, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#2D1B00';
  ctx.beginPath();
  ctx.arc(x - 9, gy - 175, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 9, gy - 175, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x - 7.5, gy - 176, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10.5, gy - 176, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#7C3A1A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, gy - 167, 10, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Brown hair (sides)
  ctx.fillStyle = '#6B3A2A';
  ctx.fillRect(x - 29, gy - 196, 8, 23);
  ctx.fillRect(x + 21, gy - 196, 8, 23);
  // Hair top arc
  ctx.beginPath();
  ctx.ellipse(x, gy - 195, 22, 10, 0, Math.PI, 0);
  ctx.fill();

  // Hat brim (darker orange)
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.ellipse(x + 2, gy - 198, 31, 8, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // Hat dome (orange)
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.roundRect(x - 19, gy - 231, 38, 35, [12, 12, 3, 3]);
  ctx.fill();

  // Hat stripe
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(x - 19, gy - 209, 38, 6);

  // Hat button on top
  ctx.fillStyle = '#C2410C';
  ctx.beginPath();
  ctx.arc(x + 1, gy - 231, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ── Component ────────────────────────────────────────────────────────────────

export default function JimmyBasketball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball>({ x: BALL_SX, y: BALL_SY, vx: 0, vy: 0, active: false, prevY: BALL_SY, hasTraveled: false });
  const scoreRef = useRef(0);
  const gameStateRef = useRef<GameState>('idle');
  const animFrameRef = useRef<number>(0);
  const msgTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const backboardHitRef = useRef(0); // counts down frames for flash effect
  const squishRef = useRef(0);       // counts down frames for floor-bounce squish
  const rockoRef = useRef<Rocko>({ state: 'idle', jumpTimer: 100, jumpFrame: -1, jumpDuration: 48, jumpHeight: 68, actionFrame: 0, actionDuration: 0, holdingBall: false });
  const rockoYRef = useRef(0);       // current pixel offset (0 = on ground)
  const elliRef = useRef<Elli>({ state: 'idle', x: ELLI_HOME_X, y: ELLI_HOME_Y, vx: 0, vy: 0, frame: 0 });
  const elliChargesRef = useRef(ELLI_MAX_CHARGES);
  const ballAttachedToElliRef = useRef(false);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [message, setMessage] = useState('');
  const [messageClass, setMessageClass] = useState('bg-green-500');
  const [charges, setCharges] = useState(ELLI_MAX_CHARGES);

  const { selectedPhoto } = useBackground();

  // Draw static scene when not in the game loop
  useEffect(() => {
    if (gameState === 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawScene(ctx, ballRef.current, true, 0, 0, rockoRef.current, 0, elliRef.current, false);
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const ball = ballRef.current;

      // ── Coach Rocko state machine ───────────────────────────────────────────
      const rocko = rockoRef.current;

      if (rocko.state === 'idle') {
        rockoYRef.current = 0;
        if (
          ball.active &&
          ball.hasTraveled &&
          !ballAttachedToElliRef.current &&
          Math.abs(ball.x - ROCKO_X) < 65 &&
          ball.y > FLOOR_Y - 90
        ) {
          rocko.state = 'pickingUp';
          rocko.actionFrame = 0;
          rocko.actionDuration = 38;
        } else {
          rocko.jumpTimer--;
          if (rocko.jumpTimer <= 0) {
            rocko.state = 'jumping';
            rocko.jumpFrame = 0;
            rocko.jumpHeight   = Math.floor(Math.random() * 85) + 15;
            rocko.jumpDuration = Math.floor(rocko.jumpHeight * 0.55) + 20;
          }
        }
      }

      if (rocko.state === 'jumping') {
        rockoYRef.current = Math.sin(Math.PI * rocko.jumpFrame / rocko.jumpDuration) * rocko.jumpHeight;
        rocko.jumpFrame++;
        if (rocko.jumpFrame >= rocko.jumpDuration) {
          rocko.state = 'idle';
          rockoYRef.current = 0;
          rocko.jumpTimer = Math.floor(Math.random() * 190) + 70;
        }
      }

      if (rocko.state === 'pickingUp') {
        rockoYRef.current = 0;
        const grabFrame = Math.floor(rocko.actionDuration / 2);
        if (rocko.actionFrame === grabFrame && !rocko.holdingBall) {
          ball.active = false;
          rocko.holdingBall = true;
        }
        rocko.actionFrame++;
        if (rocko.actionFrame >= rocko.actionDuration) {
          rocko.state = 'throwing';
          rocko.actionFrame = 0;
          rocko.actionDuration = 35;
        }
      }

      if (rocko.state === 'throwing') {
        rockoYRef.current = 0;
        const launchFrame = Math.floor(rocko.actionDuration * 0.4);
        if (rocko.actionFrame === launchFrame && rocko.holdingBall) {
          ball.x = ROCKO_X - 20;
          ball.y = ROCKO_GY - 185;
          ball.prevY = ball.y;
          ball.vx = -5.8;
          ball.vy = -9.5;
          ball.active = true;
          ball.hasTraveled = true;
          rocko.holdingBall = false;
        }
        rocko.actionFrame++;
        if (rocko.actionFrame >= rocko.actionDuration) {
          rocko.state = 'idle';
          rocko.jumpTimer = Math.floor(Math.random() * 120) + 60;
        }
      }

      // Block check: only while jumping and high enough
      const rockoY = rockoYRef.current;
      if (rocko.state === 'jumping' && ball.active && ball.vx > 0 && rockoY > ROCKO_BLOCK_MIN_Y) {
        const blockCX = ROCKO_X;
        const blockCY = ROCKO_GY - rockoY - 175;
        const dx = ball.x - blockCX;
        const dy = ball.y - blockCY;
        if (dx * dx + dy * dy < ROCKO_BLOCK_RADIUS * ROCKO_BLOCK_RADIUS) {
          ball.vx = -Math.abs(ball.vx) * 0.75;
          ball.vy = -Math.abs(ball.vy) * 0.5 - 1;
          setMessageClass('bg-red-500');
          setMessage('Blocked by Coach Rocko!');
          clearTimeout(msgTimeoutRef.current);
          msgTimeoutRef.current = setTimeout(() => { setMessage(''); setMessageClass('bg-green-500'); }, 1600);
        }
      }

      // ── Elli state machine ──────────────────────────────────────────────────
      const elli = elliRef.current;
      if (elli.state !== 'idle') {
        elli.frame++;

        if (elli.state === 'flyingIn') {
          // Steer toward live ball position
          const tx = ball.x;
          const ty = ball.y;
          const dx = tx - elli.x;
          const dy = ty - elli.y;
          const d = Math.hypot(dx, dy) || 1;
          elli.vx = (dx / d) * ELLI_SPEED;
          elli.vy = (dy / d) * ELLI_SPEED;
          elli.x += elli.vx;
          elli.y += elli.vy;

          // Intercept the ball
          if (ball.active && d < ELLI_INTERCEPT_R) {
            ballAttachedToElliRef.current = true;
            ball.vx = 0;
            ball.vy = 0;
            elli.state = 'hovering';
          } else if (!ball.active) {
            // Ball got picked up by Rocko or scored — abort, fly out
            elli.state = 'flyingOut';
            elli.vx = 9;
            elli.vy = -3;
          }
        } else if (elli.state === 'hovering') {
          // Carry the ball up to the hover spot above the rim
          const dx = ELLI_HOVER_X - elli.x;
          const dy = ELLI_HOVER_Y - elli.y;
          const d = Math.hypot(dx, dy) || 1;
          elli.vx = (dx / d) * ELLI_SPEED;
          elli.vy = (dy / d) * ELLI_SPEED;
          elli.x += elli.vx;
          elli.y += elli.vy;
          // Commit to the slam once we're at the hover spot — no going back
          if (d < ELLI_SPEED + 1) {
            elli.x = ELLI_HOVER_X;
            elli.y = ELLI_HOVER_Y;
            elli.state = 'slamming';
          }
        } else if (elli.state === 'slamming') {
          // Drive straight down through the rim — fixed velocity, no re-targeting
          elli.vx = 0;
          elli.vy = ELLI_DUNK_SPEED;
          elli.x += elli.vx;
          elli.y += elli.vy;
        }

        // Carry the ball with Elli
        if (ballAttachedToElliRef.current) {
          ball.prevY = ball.y;
          ball.x = elli.x;
          ball.y = elli.y + 10;
          ball.vx = 0;
          ball.vy = 0;

          // Rocko swat check vs Elli's ball
          if (rocko.state === 'jumping' && rockoY > ROCKO_BLOCK_MIN_Y) {
            const blockCY = ROCKO_GY - rockoY - 175;
            const sdx = ball.x - ROCKO_X;
            const sdy = ball.y - blockCY;
            if (sdx * sdx + sdy * sdy < ROCKO_BLOCK_RADIUS * ROCKO_BLOCK_RADIUS) {
              // Swatted!
              ballAttachedToElliRef.current = false;
              ball.vx = -6;
              ball.vy = -2;
              ball.active = true;
              ball.hasTraveled = true;
              elli.state = 'flyingOut';
              elli.vx = 7;
              elli.vy = -4;
              setMessageClass('bg-red-500');
              setMessage('Blocked by Coach Rocko!');
              clearTimeout(msgTimeoutRef.current);
              msgTimeoutRef.current = setTimeout(() => { setMessage(''); setMessageClass('bg-green-500'); }, 1600);
            }
          }

          // Score the alley-oop when ball crosses the rim plane downward
          if (
            ballAttachedToElliRef.current &&
            elli.state === 'slamming' &&
            ball.prevY < HY &&
            ball.y >= HY &&
            ball.x > HX - RIM_HALF + BALL_R - 5 &&
            ball.x < HX + RIM_HALF - BALL_R + 5
          ) {
            scoreRef.current += 3;
            setScore(scoreRef.current);
            setMessageClass('bg-green-500');
            setMessage('Elli alley-oop!  +3');
            clearTimeout(msgTimeoutRef.current);
            msgTimeoutRef.current = setTimeout(() => setMessage(''), 1600);
            ballAttachedToElliRef.current = false;
            ball.active = false;
            elli.state = 'flyingOut';
            elli.vx = 9;
            elli.vy = -3;
          }
        }

        if (elli.state === 'flyingOut') {
          elli.vy += 0.3;
          elli.x += elli.vx;
          elli.y += elli.vy;
          if (elli.x > CW + 80 || elli.x < -80 || elli.y > CH + 80) {
            elli.state = 'idle';
            elli.x = ELLI_HOME_X;
            elli.y = ELLI_HOME_Y;
            elli.vx = 0;
            elli.vy = 0;
          }
        }
      }

      if (ball.active && !ballAttachedToElliRef.current) {
        ball.prevY = ball.y;
        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Backboard — front (left) face
        if (
          ball.vx > 0 &&
          ball.x + BALL_R >= BOARD_X &&
          ball.x - BALL_R <  BOARD_X + BOARD_W &&
          ball.y + BALL_R >  BOARD_TOP &&
          ball.y - BALL_R <  BOARD_BOT
        ) {
          ball.x = BOARD_X - BALL_R;
          ball.vx = -ball.vx * BOARD_RESTITUTION;
          backboardHitRef.current = 10;
        }

        // Backboard — top edge
        if (
          ball.vy > 0 &&
          ball.y + BALL_R >= BOARD_TOP &&
          ball.y + BALL_R <  BOARD_TOP + Math.abs(ball.vy) + 2 &&
          ball.x + BALL_R >  BOARD_X &&
          ball.x - BALL_R <  BOARD_X + BOARD_W
        ) {
          ball.y = BOARD_TOP - BALL_R;
          ball.vy = -ball.vy * BOARD_RESTITUTION;
          backboardHitRef.current = 10;
        }

        // Floor bounce
        if (ball.y + BALL_R >= FLOOR_Y) {
          ball.y = FLOOR_Y - BALL_R;
          ball.vy = -Math.abs(ball.vy) * FLOOR_RESTITUTION;
          ball.vx *= FLOOR_FRICTION;
          squishRef.current = 8;
          // Settle if bounce is too weak — Jimmy gets the ball back
          if (Math.abs(ball.vy) < 1.5) {
            ball.active = false;
          }
        }

        // Mark that the ball has genuinely traveled out toward the hoop
        if (ball.x > JX + 150) ball.hasTraveled = true;

        // Jimmy catches the ball when it bounces back into his zone —
        // but only after it has traveled out past him (prevents catching dribbles)
        if (
          ball.hasTraveled &&
          ball.vx < 0 &&
          ball.x > JX - 60 &&
          ball.x < JX + 260 &&
          ball.y > JGY - 240 &&
          ball.y < JGY
        ) {
          ball.active = false;
          setMessageClass('bg-green-500');
          setMessage('Nice catch!');
          clearTimeout(msgTimeoutRef.current);
          msgTimeoutRef.current = setTimeout(() => setMessage(''), 1200);
        }

        // Score: ball crosses the rim plane going downward within the inner opening
        if (
          ball.vy > 0 &&
          ball.prevY < HY &&
          ball.y >= HY &&
          ball.x > HX - RIM_HALF + BALL_R - 5 &&
          ball.x < HX + RIM_HALF - BALL_R + 5
        ) {
          scoreRef.current += 2;
          setScore(scoreRef.current);
          setMessageClass('bg-green-500');
          setMessage('Swish!  +2');
          clearTimeout(msgTimeoutRef.current);
          msgTimeoutRef.current = setTimeout(() => setMessage(''), 1500);
        }

        // Reset ball when it leaves the canvas
        if (ball.y > CH + 60 || ball.x > CW + 60 || ball.x < -60) {
          ball.active = false;
        }
      }

      const boardFlash = backboardHitRef.current / 10;
      if (backboardHitRef.current > 0) backboardHitRef.current--;
      const squish = squishRef.current / 8;
      if (squishRef.current > 0) squishRef.current--;
      drawScene(ctx, ball, !ball.active, boardFlash, squish, rockoRef.current, rockoYRef.current, elliRef.current, ballAttachedToElliRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [gameState]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          gameStateRef.current = 'over';
          setGameState('over');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const shoot = useCallback((clickX: number, clickY: number) => {
    if (gameStateRef.current !== 'playing') return;
    const ball = ballRef.current;
    const elli = elliRef.current;
    const rocko = rockoRef.current;

    // Elli call: ball in flight, Elli idle, charges remain, Rocko not handling ball
    if (
      ball.active &&
      elli.state === 'idle' &&
      elliChargesRef.current > 0 &&
      !rocko.holdingBall &&
      rocko.state !== 'pickingUp' &&
      rocko.state !== 'throwing'
    ) {
      elliChargesRef.current--;
      setCharges(elliChargesRef.current);
      elli.state = 'flyingIn';
      elli.x = ELLI_HOME_X;
      elli.y = ELLI_HOME_Y;
      elli.vx = -ELLI_SPEED;
      elli.vy = 0;
      elli.frame = 0;
      return;
    }

    if (ball.active) return;

    const dx = clickX - BALL_SX;
    const dy = clickY - BALL_SY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    // Speed scales with click distance, capped to feel natural
    const speed = Math.min(Math.max(dist * 0.06 + 7, 9), 24);
    ball.x = BALL_SX;
    ball.y = BALL_SY;
    ball.prevY = BALL_SY;
    ball.vx = (dx / dist) * speed;
    ball.vy = (dy / dist) * speed;
    ball.active = true;
    ball.hasTraveled = false;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    shoot((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  }, [shoot]);

  const startGame = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    ballRef.current = { x: BALL_SX, y: BALL_SY, vx: 0, vy: 0, active: false, prevY: BALL_SY, hasTraveled: false };
    backboardHitRef.current = 0;
    squishRef.current = 0;
    rockoRef.current = { state: 'idle', jumpTimer: 100, jumpFrame: -1, jumpDuration: 48, jumpHeight: 68, actionFrame: 0, actionDuration: 0, holdingBall: false };
    rockoYRef.current = 0;
    elliRef.current = { state: 'idle', x: ELLI_HOME_X, y: ELLI_HOME_Y, vx: 0, vy: 0, frame: 0 };
    elliChargesRef.current = ELLI_MAX_CHARGES;
    ballAttachedToElliRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(60);
    setMessage('');
    setMessageClass('bg-green-500');
    setCharges(ELLI_MAX_CHARGES);
    gameStateRef.current = 'playing';
    setGameState('playing');
  }, []);

  const textColor = selectedPhoto ? 'text-yellow-400' : 'text-zinc-900 dark:text-zinc-100';
  const textSecondary = selectedPhoto ? 'text-yellow-300' : 'text-zinc-600 dark:text-zinc-400';
  const cardBg = selectedPhoto ? 'bg-black/60 backdrop-blur-sm' : 'bg-white dark:bg-zinc-800';

  return (
    <div className={`min-h-screen ${selectedPhoto ? 'bg-transparent' : 'bg-zinc-50 dark:bg-zinc-900'}`}>
      <nav className={`${selectedPhoto ? 'bg-black/50 backdrop-blur-sm' : 'bg-white dark:bg-zinc-800'} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-8 h-16">
            <a href="/" className={`inline-flex items-center px-4 text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${textColor}`}>Home</a>
            <a href="/games" className={`inline-flex items-center px-4 text-lg font-medium border-b-2 ${selectedPhoto ? 'text-yellow-400 border-yellow-400' : 'text-blue-600 dark:text-blue-400 border-blue-600'}`}>Games</a>
            <a href="/about" className={`inline-flex items-center px-4 text-lg font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${textColor}`}>About</a>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className={`text-4xl font-bold mb-2 text-center ${textColor}`}>
          Jimmy's Basketball
        </h1>
        <p className={`text-center mb-6 ${textSecondary}`}>
          Click to aim and shoot! Score as many baskets as you can in 60 seconds!
        </p>

        {/* Score / Charges / Timer bar */}
        <div className={`flex justify-between items-center mb-4 px-6 py-3 rounded-lg shadow ${cardBg}`}>
          <div className={`text-xl font-bold ${textColor}`}>Score: {score}</div>
          <div
            className="flex items-center gap-1"
            aria-label={`${charges} Elli charge${charges === 1 ? '' : 's'} remaining`}
            title="Elli charges — click after a shot to call her for an alley-oop!"
          >
            {Array.from({ length: ELLI_MAX_CHARGES }).map((_, i) => (
              <span
                key={i}
                className={`text-2xl leading-none transition-opacity ${i < charges ? 'text-pink-400 drop-shadow' : 'text-zinc-400 opacity-30'}`}
              >
                ★
              </span>
            ))}
          </div>
          <div className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : textColor}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Game canvas */}
        <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-orange-500">
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="w-full cursor-crosshair block"
            onClick={handleCanvasClick}
          />

          {/* Score / block message */}
          {message && (
            <div className={`absolute top-6 left-1/2 -translate-x-1/2 ${messageClass} text-white px-6 py-2 rounded-full text-xl font-bold shadow-lg pointer-events-none`}>
              {message}
            </div>
          )}

          {/* Idle overlay */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <h2 className="text-white text-5xl font-extrabold drop-shadow">Jimmy's Basketball</h2>
                <p className="text-orange-300 text-xl mt-3">Click the court to aim and shoot!</p>
              </div>
              <button
                onClick={startGame}
                className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-white px-12 py-4 rounded-full text-2xl font-bold transition-all shadow-xl"
              >
                Play!
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {gameState === 'over' && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
              <h2 className="text-white text-5xl font-extrabold drop-shadow">Time's Up!</h2>
              <p className="text-orange-400 text-4xl font-bold">Score: {score}</p>
              <p className="text-white text-xl">
                {score >= 20 ? "Amazing! Jimmy is unstoppable!" :
                 score >= 12 ? "Great shooting, Jimmy!" :
                 score >= 6  ? "Nice work! Keep practicing!" :
                               "Keep trying! You've got this!"}
              </p>
              <button
                onClick={startGame}
                className="bg-orange-500 hover:bg-orange-400 active:scale-95 text-white px-12 py-4 rounded-full text-2xl font-bold transition-all shadow-xl"
              >
                Play Again!
              </button>
            </div>
          )}
        </div>

        <p className={`mt-3 text-center text-sm ${textSecondary}`}>
          Tip: Click above and toward the hoop to arc your shot. While the ball is in the air, click again to call Elli for an alley-oop! ★ x {ELLI_MAX_CHARGES} per game.
        </p>
      </main>
    </div>
  );
}
