# B04: Search: no 8-result cap on highlights + Japanese-aware matching

**Phase 1** · Size **S–M** · Agent ~2h · Review ~20 min · Depends on: Q00 · Touches: `src/components/MapSearch.vue`, `BarDirectory.vue`, new `src/utils/searchText.js`, `tests/searchText.test.js`

## Why
`MapSearch.vue:25` slices matches to 8, and the same capped list drives the map highlights and the "Search Results — X bars" drawer. Typing a street name highlights only 8 buildings. Matching is also plain `toLowerCase().includes`: katakana vs hiragana, full-width vs half-width, and spaces all break it (e.g. "ばー" doesn't find "バー", "ＢＡＲ" doesn't find "bar").

## Steps
1. `src/utils/searchText.js`: `normalize(str)`:
   - NFKC (folds full-width to half-width)
   - lowercase
   - katakana → hiragana (U+30A1–30F6 minus 0x60)
   - strip spaces, `・`, `-`, and long-vowel `ー` (optional, test it)

   `matches(bar, q)` searches name_en, name_jp, street, and tag labels (en + jp).
2. MapSearch: compute `allMatches` (uncapped) → emit `searchMatches`; show `allMatches.slice(0, 8)` in the dropdown plus a "+N more" footer row that opens the drawer with all results.
3. Use the same `matches()` in `BarDirectory.vue`.
4. Precompute normalised fields once per bar list (a computed map), not on every keystroke.

## Acceptance criteria
- [ ] Searching a street highlights every bar on that street, not just 8
- [ ] "ばー", "バー" and "ﾊﾞｰ" all match a bar containing "バー"
- [ ] Tag names are searchable ("karaoke", "カラオケ")
- [ ] Dropdown still shows at most 8, plus "+N more"
