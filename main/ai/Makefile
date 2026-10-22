.PHONY: fix check lint format

# Web の biome:write 相当: 自動修正 → 整形 → 最終確認。
fix:
	uvx ruff check . --fix
	uvx ruff format .
	$(MAKE) check

# Web の biome:check 相当: ファイルを変更せず確認。
check:
	uvx ruff check .
	uvx ruff format . --check

lint:
	uvx ruff check .

format:
	uvx ruff format .
