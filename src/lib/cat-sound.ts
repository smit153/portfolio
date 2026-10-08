// The desk cat's sounds (ElevenLabs sound effects), played through Web Audio so each one gets its own volume.
// They follow the hero's sound toggle (`desk-muted` in localStorage) and stay silent until the visitor's first
// click, tap or key press, since browsers block audio before that anyway.
import meowUrl from '../assets/cat/sounds/meow.mp3?url';
import pickupUrl from '../assets/cat/sounds/pickup.mp3?url';
import thumpUrl from '../assets/cat/sounds/thump.mp3?url';
import purrUrl from '../assets/cat/sounds/purr.mp3?url';

const CLIPS = { meow: meowUrl, pickup: pickupUrl, thump: thumpUrl, purr: purrUrl };
type Clip = keyof typeof CLIPS;
const VOLUME: Record<Clip, number> = { meow: 0.5, pickup: 0.45, thump: 0.55, purr: 0.05 };
const PURR_FADE = 1.5; // seconds

let ctx: AudioContext | null = null;
let ready: Promise<Partial<Record<Clip, AudioBuffer>>> | null = null;
let purr: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let wantPurr = false;
const lastPlayed: Partial<Record<Clip, number>> = {};

const muted = () => {
	try {
		return localStorage.getItem('desk-muted') === '1';
	} catch {
		return false;
	}
};

function unlock() {
	if (ctx) return;
	ctx = new AudioContext();
	const ac = ctx;
	ready = Promise.all(
		Object.entries(CLIPS).map(async ([name, url]) => {
			try {
				const bytes = await (await fetch(url)).arrayBuffer();
				return [name, await ac.decodeAudioData(bytes)] as const;
			} catch {
				return [name, undefined] as const;
			}
		}),
	).then((list) => Object.fromEntries(list));
	if (wantPurr) startPurr();
}
const gestures = ['pointerdown', 'keydown', 'touchend'] as const;
gestures.forEach((t) => document.addEventListener(t, unlock, { capture: true, once: true }));
// the hero's toggle announces changes, so a purr in progress follows it right away
document.addEventListener('desk-muted', () => (muted() ? stopPurr() : wantPurr && startPurr()));

/** play a one-shot; `level` scales its volume (0–1) and `gap` skips it if it played that recently (ms) */
export function play(name: Exclude<Clip, 'purr'>, level = 1, gap = 250) {
	if (!ctx || !ready || muted()) return;
	const now = performance.now();
	if (now - (lastPlayed[name] ?? -Infinity) < gap) return;
	lastPlayed[name] = now;
	const ac = ctx;
	ready.then((buffers) => {
		const buffer = buffers[name];
		if (!buffer) return;
		if (ac.state === 'suspended') ac.resume();
		const src = ac.createBufferSource();
		src.buffer = buffer;
		src.playbackRate.value = 0.94 + Math.random() * 0.12; // a slightly different pitch each time
		const gain = ac.createGain();
		gain.gain.value = VOLUME[name] * level;
		src.connect(gain).connect(ac.destination);
		src.start();
	});
}

/** a soft purr that loops while it naps, fading in and out */
export function purring(on: boolean) {
	wantPurr = on;
	if (on) startPurr();
	else stopPurr();
}
function startPurr() {
	if (!ctx || !ready || purr || muted()) return;
	const ac = ctx;
	ready.then((buffers) => {
		const buffer = buffers.purr;
		if (!buffer || purr || !wantPurr) return;
		const src = ac.createBufferSource();
		src.buffer = buffer;
		src.loop = true;
		// skip the mp3 encoder's padding at both ends so the loop doesn't click
		src.loopStart = 0.05;
		src.loopEnd = buffer.duration - 0.05;
		const gain = ac.createGain();
		gain.gain.setValueAtTime(0, ac.currentTime);
		gain.gain.linearRampToValueAtTime(VOLUME.purr, ac.currentTime + PURR_FADE);
		src.connect(gain).connect(ac.destination);
		src.start(0, src.loopStart);
		purr = { src, gain };
	});
}
function stopPurr() {
	if (!ctx || !purr) return;
	const { src, gain } = purr;
	purr = null;
	const t = ctx.currentTime;
	gain.gain.cancelScheduledValues(t);
	gain.gain.setValueAtTime(gain.gain.value, t);
	gain.gain.linearRampToValueAtTime(0, t + PURR_FADE / 3);
	src.stop(t + PURR_FADE / 3);
}
