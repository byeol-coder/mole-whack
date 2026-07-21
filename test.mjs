import { JSDOM } from "jsdom";
import fs from "fs";

const html = fs.readFileSync("index.html", "utf-8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x/?dummy=1" });
const win = dom.window;
const M = win.DotMole;

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; } else { fails++; console.log("  FAIL:", m); } };

/* ---------- 1) 인코딩 불변식: EA / encodeFrame (600 hex) ---------- */
["up","down","left","right","center","check","cross"].forEach(k => {
  const hex = M.encodeFrame(M.buildFrame(k));
  ok(hex.length === 600 && /^[0-9a-f]+$/.test(hex), `buildFrame/encodeFrame(${k}) = 600 hex`);
});
const hexes = ["up","down","left","right","center"].map(k => M.encodeFrame(M.buildFrame(k)));
ok(new Set(hexes).size === 5, "5 directions produce distinct tactile frames");
ok(typeof win.getDotpadFrame === "function" && win.getDotpadFrame().length === 600, "window.getDotpadFrame() present, 600 hex");

/* ---------- 2) 기본 DOM 구조 ---------- */
ok(win.document.querySelectorAll(".mole-hole").length === 5, "5 mole holes rendered");
ok(win.document.querySelectorAll('svg[data-icon]').length > 5, "tabler icons rendered");
["start-game","start-practice","btn-replay","btn-status","btn-voice","btn-help","btn-pin","res-again","ready-button","help-tutorial"]
  .forEach(id => {
    const el = win.document.getElementById(id);
    ok(el && ((el.textContent||"").trim().length > 0 || el.querySelector("svg")), `button ${id} rendered`);
  });

/* ---------- 3) 모드/설정 읽기 ---------- */
ok(M.state.cfg.mode === "basic", "default mode = basic");
ok(M.state.cfg.speed === 2400, "default speed = 2400 (보통)");
ok(M.state.cfg.rounds === 10, "default rounds = 10");

/* ---------- 4) 기본 모드: 무제한 시간, reading 게이트 없음 ---------- */
M.startGame("basic");
ok(win.document.querySelector(".game-shell").dataset.screen === "play", "start -> play screen");
let gen = M.state.gameGen;
M.nextRound(gen);
ok(M.state.awaiting === true, "basic mode: awaiting immediately (no reading gate)");
ok(M.state.phase === "idle", "basic mode: phase idle (no timer UI)");
const basicDir = M.state.current;
M.handleInput(basicDir);
ok(M.state.hits === 1, "basic mode hit registered");
ok(M.state.score === 100, "basic mode hit: flat 100 (no speed bonus, streak bonus applies to *next* hit)");
ok(M.state.streak === 1, "streak = 1 after hit");

/* ---------- 5) 도전 모드: reading 중 준비 완료 없이 즉시 답 -> 최대 보너스 인정 ---------- */
M.state.gameGen++; gen = M.state.gameGen;
M.state.cfg.mode = "challenge";
M.nextRound(gen);
ok(M.state.phase === "reading", "challenge mode: starts in reading phase");
ok(M.state.awaiting === false, "challenge mode: not awaiting during reading");
const challengeDir = M.state.current;
const scoreBefore = M.state.score;
M.handleInput(challengeDir);
ok(M.state.hits === 2, "challenge mode instant-answer counted as hit");
ok(M.state.score > scoreBefore + 100, "instant answer during reading gets near-max speed bonus (+" + (M.state.score - scoreBefore) + ")");

/* ---------- 6) 도전 모드: 준비 완료 -> 오답 처리 ---------- */
M.state.gameGen++; gen = M.state.gameGen;
M.nextRound(gen);
ok(M.state.phase === "reading", "round starts reading (challenge)");
M.beginResponse(gen);
ok(M.state.phase === "responding", "beginResponse -> responding phase");
ok(M.state.awaiting === true, "responding phase: awaiting true (timer running)");
const correct = M.state.current;
const wrong = M.DIRS.map(d => d.key).find(k => k !== correct);
const streakBefore = M.state.streak;
M.handleInput(wrong);
ok(M.state.streak === 0 && streakBefore > 0, "wrong answer resets streak");
ok(win.document.querySelector('[data-dir="'+correct+'"]').dataset.answer === "true", "correct answer revealed on wrong");

/* ---------- 7) 시간 초과 (challenge, responding 중에만 가능) ---------- */
M.state.gameGen++; gen = M.state.gameGen;
M.nextRound(gen);
M.beginResponse(gen);
M.resolveTimeout(gen);
ok(M.state.awaiting === false, "timeout clears awaiting");
ok(M.state.phase === "idle", "timeout resets phase to idle");

/* ---------- 8) DotPad 키 라우팅 (F1-4 / Panning* / LPF1) — 모의 KeyCodes 주입 ---------- */
const FAKE_KEYS = { KeyFunction1:"F1", KeyFunction2:"F2", KeyFunction3:"F3", KeyFunction4:"F4",
  PanningLeft:"PL", PanningRight:"PR", PanningAll:"PA", LPF1:"LP1" };
M.setKeyCodesForTest(FAKE_KEYS);

M.state.gameGen++; gen = M.state.gameGen;
M.state.cfg.mode = "basic";
M.nextRound(gen);
const dpDir = M.state.current;
const dpKeyForDir = { up:"KeyFunction1", down:"KeyFunction2", left:"KeyFunction3", right:"KeyFunction4" };
{
  const hitsBefore = M.state.hits;
  if (dpDir in dpKeyForDir){
    M.handleDotPadKey(FAKE_KEYS[dpKeyForDir[dpDir]]);
  } else {
    M.handleDotPadKey(FAKE_KEYS.PanningLeft); // center
  }
  ok(M.state.hits === hitsBefore + 1, "DotPad key for direction '" + dpDir + "' resolves correct hit");
}

let tutorialThrew = false;
try { M.handleDotPadKey(FAKE_KEYS.PanningAll); } catch(e){ tutorialThrew = true; }
ok(!tutorialThrew, "PanningAll -> tutorial() does not throw");

const genBeforeRestart = M.state.gameGen;
M.handleDotPadKey(FAKE_KEYS.LPF1);
ok(M.state.gameGen !== genBeforeRestart, "LPF1 -> quickRestart bumps gameGen (new run)");
ok(win.document.querySelector(".game-shell").dataset.screen === "play", "LPF1 restart lands back on play screen");

/* ---------- 9) 종료 화면 + best 기록(모드별 분리) ---------- */
gen = M.state.gameGen;
M.state.round = M.state.cfg.rounds;
M.endGame(gen);
ok(win.document.querySelector(".game-shell").dataset.screen === "result", "endGame -> result screen");
ok((win.document.getElementById("res-score").textContent||"").length > 0, "result score filled");

/* ---------- 10) 음성 토글 ---------- */
const v0 = M.state.cfg.voice;
M.toggleVoice();
ok(M.state.cfg.voice === !v0, "voice toggles");
M.toggleVoice();

/* ---------- 11) 튜토리얼 함수 노출 확인 ---------- */
ok(typeof M.tutorial === "function", "tutorial() exposed");

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
