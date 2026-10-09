import { useEffect, useState } from "react";

/**
 * 入力値の反映を遅延させる。検索入力のたびにリクエストが
 * 飛びすぎないよう debounce する。
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
