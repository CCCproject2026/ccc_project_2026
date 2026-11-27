// MQTT.js で Broker に接続・購読・再接続する（詳細設計 web/03 の4章）
// React に依存しない。状態の変化と受信メッセージはコールバックで知らせる。
// 注意: 受信した本文・接続情報（URL・パスワード）はログに出さない。
import type { MqttClient } from "mqtt";
import type { BrokerCredentials, ConnectionStatus } from "../types";

export const SUBSCRIBE_TOPIC = "fall/+/events";

// 再接続までの待ち時間（秒）。最後の値で止まる
const RETRY_DELAYS_SEC = [1, 2, 4, 8, 16, 30];

// MQTT 3.1.1 の CONNACK で「認証の拒否」を表す値
// 4 = ユーザー名・パスワードが違う、5 = 許可されていない
const CONNACK_AUTH_ERRORS = [4, 5];

// SUBACK で「購読の拒否」を表す QoS
const SUBACK_FAILURE = 128;

export type CredentialsResult =
	| { ok: true; credentials: BrokerCredentials }
	| { ok: false; status: number | null }; // null = 通信エラー

export type FallConnectionOptions = {
	onStatus: (status: ConnectionStatus) => void;
	onMessage: (topic: string, payload: Uint8Array, retained: boolean) => void;
	/** 切断のあと、もう一度 live になったとき（機器一覧の取り直しに使う） */
	onReconnected: () => void;
	/** 接続情報の取得。テストしやすいように差し替えられるようにする */
	fetchCredentials?: () => Promise<CredentialsResult>;
};

export type FallConnection = {
	/** 画面を閉じたときに呼ぶ。接続を残さない */
	stop: () => void;
};

export function startFallConnection(
	options: FallConnectionOptions,
): FallConnection {
	const fetchCredentials = options.fetchCredentials ?? fetchBrowserCredentials;

	let stopped = false;
	let client: MqttClient | null = null;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	let retryCount = 0; // 待ち時間を決めるための、続けて失敗した回数
	let authRejectCount = 0; // 認証拒否の回数（2回目で止める）
	let wasLiveBefore = false; // 一度でも live になったか（つながり直しの判定）
	// 古い接続のイベントを無視するための番号。接続をやり直すたびに増やす
	let generation = 0;

	function setStatus(status: ConnectionStatus) {
		if (stopped) return;
		// 状態の変化だけをログに出す（URL・資格情報は出さない）
		console.info("[realtime] status", status.kind);
		options.onStatus(status);
	}

	function closeClient() {
		if (client !== null) {
			client.removeAllListeners();
			// 閉じる途中で error が出ても「処理されないエラー」にならないようにする
			client.on("error", () => {});
			// 再接続の待ちを残さないよう、強制的に閉じる
			client.end(true);
			client = null;
		}
	}

	function scheduleRetry() {
		if (stopped) return;
		closeClient();
		const index = Math.min(retryCount, RETRY_DELAYS_SEC.length - 1);
		const delayMs = RETRY_DELAYS_SEC[index] * 1000;
		retryCount += 1;
		setStatus({
			kind: "waiting_retry",
			retryAt: new Date(Date.now() + delayMs),
		});
		retryTimer = setTimeout(() => {
			retryTimer = null;
			void begin();
		}, delayMs);
	}

	function stopWith(reason: "unauthenticated" | "forbidden" | "rejected") {
		closeClient();
		setStatus({ kind: "stopped", reason });
		stopped = true;
	}

	// 入口。予想外の失敗（mqtt の読み込み失敗など）でも「接続中…」のまま止めず、再接続に戻す
	async function begin() {
		if (stopped) return;
		generation += 1;
		const myGeneration = generation;
		try {
			await connectOnce(myGeneration);
		} catch (error) {
			if (stopped || myGeneration !== generation) return;
			console.warn(
				"[realtime] connect failed",
				error instanceof Error ? error.name : typeof error,
			);
			scheduleRetry();
		}
	}

	async function connectOnce(myGeneration: number) {
		setStatus({ kind: "fetching_credentials" });
		const result = await fetchCredentials();
		if (stopped || myGeneration !== generation) return;

		if (!result.ok) {
			// ログインしていない・無効なスタッフは、待っても直らないので止める
			if (result.status === 401) {
				stopWith("unauthenticated");
				return;
			}
			if (result.status === 403) {
				stopWith("forbidden");
				return;
			}
			scheduleRetry();
			return;
		}

		setStatus({ kind: "connecting" });
		// mqtt は大きいので、ブラウザで必要になったときだけ読み込む
		// 注意: ブラウザ用の mqtt（dist/mqtt.esm.js）は default export しか持たない。
		// Node 用（build/index.js）は名前付きの connect を持つので、両方に対応する
		const mqttModule = await import("mqtt");
		if (stopped || myGeneration !== generation) return;
		const connect = mqttModule.default?.connect ?? mqttModule.connect;

		const { url, username, password } = result.credentials;
		const newClient = connect(url, {
			protocolVersion: 4, // MQTT 3.1.1（AI 側と同じ）
			clean: true, // 切断中の結果をためない
			clientId: randomClientId(), // タブごとに違う ID（同じだと他のタブが切られる）
			keepalive: 60,
			reconnectPeriod: 0, // 自動再接続は使わず、待ち時間を自分で管理する
			connectTimeout: 10_000,
			username: username ?? undefined,
			password: password ?? undefined,
		});
		client = newClient;

		// この接続のイベントかどうか（古い接続の close などを無視する）
		const isCurrent = () =>
			!stopped && myGeneration === generation && client === newClient;

		newClient.on("connect", () => {
			if (!isCurrent()) return;
			authRejectCount = 0;
			setStatus({ kind: "subscribing" });
			newClient.subscribe(SUBSCRIBE_TOPIC, { qos: 1 }, (error, granted) => {
				if (!isCurrent()) return;
				const rejected =
					error != null ||
					granted === undefined ||
					granted.length === 0 ||
					granted.some((g) => g.qos === SUBACK_FAILURE);
				if (rejected) {
					// 購読の拒否は ACL の設定の問題なので、再接続しても直らない
					stopWith("rejected");
					return;
				}
				retryCount = 0;
				setStatus({ kind: "live" });
				if (wasLiveBefore) {
					options.onReconnected();
				}
				wasLiveBefore = true;
			});
		});

		newClient.on("message", (topic, payload, packet) => {
			if (!isCurrent()) return;
			options.onMessage(topic, payload, packet.retain === true);
		});

		newClient.on("error", (error) => {
			if (!isCurrent()) return;
			const code = (error as { code?: unknown }).code;
			if (typeof code === "number" && CONNACK_AUTH_ERRORS.includes(code)) {
				authRejectCount += 1;
				setStatus({ kind: "auth_error" });
				closeClient();
				if (authRejectCount >= 2) {
					stopWith("rejected");
					return;
				}
				// 資格情報が古い可能性があるので、1回だけ取り直す
				void begin();
				return;
			}
			// それ以外のエラーは close が続くので、そちらで再接続する
			console.warn("[realtime] connection error", error.name);
		});

		newClient.on("close", () => {
			if (!isCurrent()) return;
			// つながらない・切断された。切れていた間の結果は取り戻さない
			scheduleRetry();
		});
	}

	void begin();

	return {
		stop() {
			stopped = true;
			generation += 1;
			if (retryTimer !== null) {
				clearTimeout(retryTimer);
				retryTimer = null;
			}
			closeClient();
		},
	};
}

// GET /api/realtime/credentials から接続情報を受け取る
async function fetchBrowserCredentials(): Promise<CredentialsResult> {
	try {
		const response = await fetch("/api/realtime/credentials", {
			cache: "no-store",
			credentials: "same-origin",
		});
		if (!response.ok) {
			return { ok: false, status: response.status };
		}
		const body = (await response.json()) as Partial<BrokerCredentials>;
		if (typeof body.url !== "string") {
			return { ok: false, status: null };
		}
		return {
			ok: true,
			credentials: {
				url: body.url,
				username: typeof body.username === "string" ? body.username : null,
				password: typeof body.password === "string" ? body.password : null,
			},
		};
	} catch {
		return { ok: false, status: null };
	}
}

// web-<ランダムな16進数>。crypto.randomUUID は http の LAN 接続で使えないことがあるため、
// どこでも使える getRandomValues を使う
function randomClientId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	let hex = "";
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return `web-${hex}`;
}
