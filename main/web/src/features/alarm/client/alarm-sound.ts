// アラーム音を Web Audio API で作って鳴らす。React に依存しない。
// 音声ファイルを使わないので、ライセンスや読み込み失敗の心配がない。
//
// 注意: ブラウザは、画面を一度もクリックしていないと音を鳴らさせない（自動再生の制限）。
// そのため unlock() をクリックなどの操作の中で呼び、鳴らせる状態にしておく。

// 「ピー・ポー」を1組として、この間隔でくり返す
const REPEAT_INTERVAL_MS = 1500;
const TONES = [
	{ frequency: 880, startSec: 0, durationSec: 0.3 },
	{ frequency: 660, startSec: 0.35, durationSec: 0.3 },
];
// 音量（0〜1）。大きすぎると驚かせるので控えめにする
const VOLUME = 0.3;

export type AlarmSound = {
	/** 鳴らせる状態か（自動再生の制限を外せたか） */
	isUnlocked: () => boolean;
	/** ユーザーの操作（クリック・キー入力）の中で呼ぶ。鳴らせるようになったら true */
	unlock: () => Promise<boolean>;
	/** 鳴らし始める。止めるまでくり返す。鳴らせなければ false */
	start: () => boolean;
	stop: () => void;
	isPlaying: () => boolean;
	/** 画面を閉じたときに呼ぶ */
	dispose: () => void;
};

/**
 * @param onStateChange 鳴らせる状態が変わったときに呼ぶ。
 *   一度有効にしても、OS の音声中断などで止まることがあるので、ずっと見張る
 */
export function createAlarmSound(
	onStateChange?: (unlocked: boolean) => void,
): AlarmSound {
	let context: AudioContext | null = null;
	let timer: ReturnType<typeof setInterval> | null = null;

	function getContext(): AudioContext | null {
		if (context !== null) return context;
		if (typeof window === "undefined" || !("AudioContext" in window)) {
			return null;
		}
		context = new AudioContext();
		context.onstatechange = () => onStateChange?.(isUnlocked());
		return context;
	}

	function isUnlocked(): boolean {
		return context !== null && context.state === "running";
	}

	// 「ピー・ポー」を1回鳴らす
	function playOnce() {
		if (context === null || context.state !== "running") return;
		const now = context.currentTime;
		for (const tone of TONES) {
			const oscillator = context.createOscillator();
			const gain = context.createGain();
			oscillator.type = "square";
			oscillator.frequency.value = tone.frequency;
			const start = now + tone.startSec;
			const end = start + tone.durationSec;
			// 急に始まる・終わると「プチッ」と鳴るので、少しだけ音量をなめらかに変える
			gain.gain.setValueAtTime(0, start);
			gain.gain.linearRampToValueAtTime(VOLUME, start + 0.02);
			gain.gain.setValueAtTime(VOLUME, end - 0.02);
			gain.gain.linearRampToValueAtTime(0, end);
			oscillator.connect(gain);
			gain.connect(context.destination);
			oscillator.start(start);
			oscillator.stop(end);
		}
	}

	return {
		isUnlocked,

		async unlock() {
			const ctx = getContext();
			if (ctx === null) return false;
			try {
				if (ctx.state !== "running") {
					await ctx.resume();
				}
			} catch {
				return false;
			}
			return isUnlocked();
		},

		start() {
			if (!isUnlocked()) return false;
			if (timer !== null) return true; // すでに鳴っている
			playOnce();
			timer = setInterval(playOnce, REPEAT_INTERVAL_MS);
			return true;
		},

		stop() {
			if (timer !== null) {
				clearInterval(timer);
				timer = null;
			}
		},

		isPlaying() {
			return timer !== null;
		},

		dispose() {
			if (timer !== null) {
				clearInterval(timer);
				timer = null;
			}
			if (context !== null) {
				void context.close();
				context = null;
			}
		},
	};
}
