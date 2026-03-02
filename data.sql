--
-- PostgreSQL database dump
--

\restrict fvJfW6m26KV7Gzvp0hT7CmBeRggymPKoVOVCGVvZ5CEAHO8gQe35nLvvhbZTjLl

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: annotations; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.annotations DISABLE TRIGGER ALL;



ALTER TABLE public.annotations ENABLE TRIGGER ALL;

--
-- Data for Name: bars; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.bars DISABLE TRIGGER ALL;

INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (500, 'ナナ', 'ナナ', 'Nana', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '700', '', NULL, '', '', '', '', '', true, '2026-02-13 06:25:09.497566+09', '2026-03-02 17:06:15.42776+09', 'bldg-132', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (223, '十月', '十月', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.769239+09', '2026-02-13 00:33:29.808606+09', 'bldg-115', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (514, '洗濯船', '洗濯船', '', 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.581799+09', '2026-03-02 17:06:59.719606+09', 'bldg-126', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (511, 'ジュテ', 'ジュテ', '', 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.563378+09', '2026-03-02 17:40:26.949606+09', 'bldg-141', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (510, 'シャドウ', 'シャドウ', 'Shadow', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-13 06:25:09.557238+09', '2026-03-02 17:45:25.047362+09', 'bldg-46', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (515, 'ソワレ', 'ソワレ', 'Bar Soiree', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JQ 新宿区、東京都', '800', '', NULL, '352728088', '', '', '', 'https://soiree.in/bar_soiree/', true, '2026-02-13 06:25:09.588598+09', '2026-03-02 17:17:54.407142+09', 'bldg-127', '700', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (512, 'スエズ', 'スエズ', 'Suez', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '', '', '0', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-13 06:25:09.569304+09', '2026-03-02 17:22:07.351633+09', 'bldg-19', '', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (222, '小鉄', '小鉄', 'Kotetsu', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.768502+09', '2026-02-13 13:45:29.49482+09', 'bldg-115', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (501, 'ナベサン', 'ナベサン', '', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+GX 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.503364+09', '2026-03-02 17:46:41.106995+09', 'bldg-44', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (499, 'どこ', 'どこ', 'Bar Doko', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HW 新宿区、東京都', '1000', '', NULL, '', '', '', '', 'https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://twitter.com/doco_g&ved=2ahUKEwjf4uzmv6eGAxVwl1YBHXZnDFoQFnoECBQQAQ&usg=AOvVaw3N93bjrPr2NGzFBLBtSyIs', true, '2026-02-13 06:25:09.490381+09', '2026-03-02 17:52:05.649094+09', 'bldg-27', '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (503, '無銘喫茶', '無銘喫茶', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HV 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://mumeikissa.hp.peraichi.com/', true, '2026-02-13 06:25:09.515277+09', '2026-03-02 17:52:41.180869+09', 'bldg-26', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (519, 'sokai', '租界', 'Sokai', 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-03-02 17:15:36.816096+09', '2026-03-02 17:53:07.644529+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (507, '原子心母', '原子心母', 'Atom Heart Mother', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+JR 新宿区、東京都', '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-13 06:25:09.53947+09', '2026-03-02 19:14:59.172465+09', 'bldg-139', '600', true, 'https://maps.app.goo.gl/egWi7Vf6BYCTKWw89', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (508, 'ゴールデンダスト', 'ゴールデンダスト', 'Golden Dust', 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.545375+09', '2026-03-02 14:17:11.599334+09', 'bldg-22', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (505, '裏窓', '裏窓', '', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.527282+09', '2026-03-02 17:22:45.699734+09', 'bldg-18', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (513, 'すず', 'すず', '', 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.575533+09', '2026-03-02 17:24:08.322615+09', 'bldg-17', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (506, 'ガルガンチュア', 'ガルガンチュア', 'Gargantua', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.533425+09', '2026-03-02 17:24:26.065041+09', 'bldg-58', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (498, '新宿櫻亭', '新宿櫻亭', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 １番街', 'MPV3+JQ 新宿区、東京都', NULL, NULL, NULL, '352738796', NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.483727+09', '2026-03-02 17:32:09.02305+09', 'bldg-130', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (496, '音吉', '音吉', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 一番街', 'MPV3+HR 新宿区、東京都', '500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.470804+09', '2026-03-02 17:34:59.186843+09', 'bldg-136', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (502, 'ｂｉｌｌｙ', 'BILLY', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '新宿区歌舞伎町1-1-8', '', '1000', '', 6, '', '18:00-02:00', '', '', '', true, '2026-02-13 06:25:09.509127+09', '2026-03-02 17:35:25.206119+09', 'bldg-138', '', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (516, 'たちばな診察室', 'たちばな診察室', '', 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ 2階 花園三番街', 'MPV3+HV 新宿区、東京都', NULL, NULL, NULL, '332084148', NULL, NULL, NULL, 'https://mobile.twitter.com/BarTachibanaSin?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor', true, '2026-02-13 06:25:09.595008+09', '2026-03-02 17:37:43.534924+09', 'bldg-24', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (497, '申', '申', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１ 花園一番街', 'MPV3+HV 新宿区、東京都', NULL, NULL, NULL, '332020621', NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.477374+09', '2026-03-02 17:53:40.96959+09', 'bldg-23', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (495, '遠足', '遠足', '', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１', 'MPV3+HV 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.46398+09', '2026-03-02 17:53:43.764149+09', 'bldg-23', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (504, '赤花', '赤花', '', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.521027+09', '2026-03-02 17:57:56.451858+09', 'bldg-54', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (509, '沙華', '沙華', '', 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-13 06:25:09.55125+09', '2026-03-02 17:58:01.660163+09', 'bldg-54', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (19, 'bar-tomorrow', 'トゥモ ロー', 'BAR tomorrow', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目８ 番 街 花園１番', 'MPV3+JQ 新宿区、東京都', '700', '', NULL, '332020616', '18:00-02:00', '', '', 'http://www.golden-tomorrow.com/', true, '2026-02-12 19:30:43.464248+09', '2026-03-02 17:08:25.557033+09', 'bldg-129', '700', true, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (225, '酔2', '酔２', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.770845+09', '2026-02-13 00:33:56.072297+09', 'bldg-114', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (74, 'who', 'WHO', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.527331+09', '2026-02-13 06:17:26.514372+09', 'bldg-4', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (226, 'up-out', 'UP OUT', '', 'G2', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目 １−１０ １ １０ 1F', 'MPV3+GQ 新宿区、東京都', '0', '', NULL, '', '19:00-02:00', '', '', '', true, '2026-02-12 20:51:14.771717+09', '2026-03-02 19:10:39.811138+09', 'bldg-112', '900', true, 'https://maps.app.goo.gl/vkEzT7SnpRzdG2hb7', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (227, 'reno', 'RENO', '', 'G2', 2, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.772527+09', '2026-02-13 13:43:59.655399+09', 'bldg-112', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (292, 'トロール', 'トロール', 'Bar Troll', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.828043+09', '2026-02-13 13:54:07.361693+09', 'bldg-121', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (39, 'bar-38', 'ぺんぎん村', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ あかるい花園 ５番街', 'MPV3+JW 新宿区、東京都', NULL, NULL, NULL, '332093761', NULL, NULL, NULL, 'http://penson.web.fc2.com/', true, '2026-02-12 19:30:43.484051+09', '2026-03-02 17:29:27.60488+09', 'bldg-16', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (25, 'bar-24', 'ばるぼら屋', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+JR 新宿区、東京都', '300', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.470893+09', '2026-03-02 17:41:10.652342+09', 'bldg-140', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (54, 'bar-53', 'こっこめ', 'Kokkome', 'maneki-dori', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ 橋本ビル', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, '8099713471', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.500417+09', '2026-03-02 16:56:26.981919+09', 'bldg-95', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (58, 'bar-57', '肉人', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ 橋本ビル', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, '332052910', NULL, NULL, NULL, 'http://2910.tokyo/', true, '2026-02-12 19:30:43.504141+09', '2026-03-02 16:57:17.884207+09', 'bldg-91', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (229, '凪', '凪', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.774174+09', '2026-02-13 00:35:54.117496+09', 'bldg-155', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (29, 'bar-28', 'カンガルーコート', 'Kangaroo Court', 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, '500', NULL, NULL, '', '18:00-02:00', NULL, NULL, '', true, '2026-02-12 19:30:43.474813+09', '2026-03-02 19:18:07.873949+09', 'bldg-63', '700', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (34, 'bar-33', 'トミー', 'Tommy', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JV 新宿区、東京都', '0', NULL, NULL, '', '', NULL, NULL, '', true, '2026-02-12 19:30:43.479419+09', '2026-03-02 17:09:14.933597+09', 'bldg-125', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (47, 'zilch', 'Zilch', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１ あかるい花園 三番街', 'MPV3+HV 新宿区、東京都', '1000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.493424+09', '2026-02-13 06:25:18.050964+09', 'bldg-54', '700', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (141, 'bar-137', 'ロベリヤ', 'Roberiya', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '東京都新宿区歌舞伎町１丁目１−７ あかるい花園５番街２階', 'MPV3+JR 新宿区、東京都', '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.60034+09', '2026-03-02 19:20:50.773737+09', 'bldg-147', '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (31, 'cabochard', 'カボシャー ル', 'Cabochard', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JV 新宿区、東京都', '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.47669+09', '2026-03-02 17:17:02.244198+09', 'bldg-7', '', true, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (234, 'フラッパー', 'フラッパー', 'Bar Flapper', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '21:00-07:00', '', '', '', true, '2026-02-12 20:51:14.779314+09', '2026-03-02 12:07:59.572007+09', 'bldg-155', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (517, 'tale-of-two-capitals', '二都 物語', 'Tale of Two Capitals', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JX 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-03-02 16:32:17.739475+09', '2026-03-02 16:33:32.159602+09', 'bldg-62', NULL, NULL, 'https://maps.app.goo.gl/yDH2FsS8vMbSjMNR9', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (233, 'こもれび-2', 'こもれび', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.777372+09', '2026-02-13 00:36:02.230177+09', 'bldg-155', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (28, 'bar-27', '追い風', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.473873+09', '2026-03-02 17:27:44.134848+09', 'bldg-57', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (40, 'bar-39', '真湖', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.486053+09', '2026-03-02 16:36:57.179605+09', 'bldg-14', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (230, '451', '451℉', '', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.775003+09', '2026-02-13 13:42:32.355875+09', 'bldg-155', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (228, 'barca', 'BARCA', '', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.77336+09', '2026-02-13 13:42:56.733705+09', 'bldg-155', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (232, 'こもれび', 'こもれび', 'comorebi', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '550', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.776594+09', '2026-03-02 16:19:30.757182+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (24, 'bar-23', '珍呑', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.469962+09', '2026-03-02 17:45:32.66651+09', 'bldg-46', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (33, 'bar-32', '西瓜糖', 'suikatō', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+MV 新宿区、東京都', NULL, NULL, 9, NULL, '20:00-5:00', NULL, NULL, NULL, true, '2026-02-12 19:30:43.478515+09', '2026-03-02 19:27:15.113506+09', 'bldg-12', NULL, NULL, 'https://maps.app.goo.gl/F1csHQYA8oWAGZKi8', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (196, '小鳥', '小鳥', 'Kojima', 'G1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.745056+09', '2026-02-13 14:39:59.475571+09', 'bldg-111', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (21, 'buoy', 'Buoy', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.467049+09', '2026-03-02 17:49:37.811445+09', 'bldg-40', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (199, '突風', '突風', NULL, 'G1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.747757+09', '2026-02-13 00:38:55.428799+09', 'bldg-157', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (22, 'bar-21', '祖界', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, '800', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.468032+09', '2026-03-02 17:53:22.662781+09', NULL, '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (10, 'bar-9', 'ブルーローズ', 'Blue Rose', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HV 新宿区、東京都', '', '', NULL, '', '', '', '', 'https://x.com/rose_goldengai?t=rVDrZpDIVNF-w-BM-cFT3Q&s=09', true, '2026-02-12 19:30:43.451659+09', '2026-03-02 17:53:55.87558+09', 'bldg-31', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (44, 'janjune', 'JANJUNE', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.49015+09', '2026-02-13 06:17:26.454008+09', 'bldg-55', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (20, 'bar-19', 'スクエア', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.465208+09', '2026-03-02 17:55:00.153778+09', 'bldg-42', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (38, 'bar-37', 'ビッグリバー', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ あかるい花園', 'MPV3+MR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.483094+09', '2026-03-02 17:57:16.084056+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (231, 'paras-ol', 'PARASOL', '', 'G2', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.775814+09', '2026-03-02 18:01:00.81905+09', 'bldg-155', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (202, 'suzu-bar', 'SUZU BAR', '', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '0362280309', '20:00-3:00', '', '', 'https://suzubar.wixsite.com/mysite', true, '2026-02-12 20:51:14.750158+09', '2026-03-02 18:50:16.336457+09', 'bldg-159', NULL, NULL, 'https://maps.app.goo.gl/SjRiVA1vSPyZU3bK6', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (8, 'ghetto', 'GHETTO', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, '700', NULL, 10, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.445833+09', '2026-03-02 19:26:46.056478+09', 'bldg-31', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (91, 'add', 'add+', '', 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, '1000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.544105+09', '2026-02-13 06:25:18.068901+09', 'bldg-11', '800', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (126, 'bar-122', 'プラージュ', 'Plage', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MR 新宿区、東京都', '0', '', NULL, '9074051389', '', '', '', 'https://www.instagram.com/plage.goldengai?igsh=ZjdicXVmZXQ2NzMz', true, '2026-02-12 19:30:43.58547+09', '2026-02-13 14:01:50.848418+09', 'bldg-86', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (518, 'big-river', 'ビッグ リバー', 'BIG RIVER', 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-03-02 16:40:17.100861+09', '2026-03-02 16:51:30.500293+09', 'bldg-87', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (41, 'bar-40', '松鐘亭', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.487064+09', '2026-03-02 17:26:52.027275+09', 'bldg-52', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (207, 'hecate', 'Hecate', '', 'G1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−１０', 'MPV3+CV 新宿区、東京都', '1000', '', NULL, '0364576045', '', '', '', '', true, '2026-02-12 20:51:14.755644+09', '2026-03-02 18:54:41.071612+09', 'bldg-73', '1000', NULL, 'https://maps.app.goo.gl/RGUtk4NL9yrrY8vv8', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (210, 'rocket', 'ROCKET', NULL, 'G1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.758137+09', '2026-02-12 20:57:27.616948+09', 'bldg-74', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (240, '和三盆', '和三盆', 'Wasanbon', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.784053+09', '2026-02-13 13:37:29.68496+09', 'bldg-75', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (239, 'ナイチンゲール', 'ナイチンゲール', 'Bar Nightingale', 'G2', 1, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.783249+09', '2026-02-19 14:27:48.160935+09', 'bldg-75', '', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (92, 'adieu-lami', 'ADIEU L’AMI', '', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MR 新宿区、東京都', '', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.544965+09', '2026-03-02 12:06:54.62257+09', 'bldg-82', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (209, 'zory', 'zory', '', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '700', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.757263+09', '2026-03-02 12:07:45.766527+09', 'bldg-74', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (213, 'bon-s', 'Bon''s', '', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '500', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.760843+09', '2026-03-02 13:21:44.633869+09', 'bldg-71', NULL, NULL, 'https://maps.app.goo.gl/ejZReLoCFNbBKi9H7', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (214, 'humphrey', 'Hungry Humphrey', '', 'G1', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.761633+09', '2026-03-02 16:25:00.562446+09', 'bldg-71', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (45, 'bar-44', 'レカン', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ あかるい花園 ５番街', 'MPV3+JW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/golden_gai_rekan?igsh=ZmdncWZzOHkzcHkz', true, '2026-02-12 19:30:43.491281+09', '2026-03-02 16:34:54.04147+09', 'bldg-60', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (208, 'パパズドリーム', 'パパズドリーム', NULL, 'G1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.756446+09', '2026-02-12 20:58:39.58901+09', 'bldg-73', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (63, 'bar-62', '生ハム＆バー エポカ', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, '800', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.51254+09', '2026-02-13 06:25:18.057703+09', 'bldg-55', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (197, '夢二', '夢二', '', 'G1', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.745951+09', '2026-03-02 18:00:23.46176+09', 'bldg-113', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (206, 'decoy', 'Decoy', NULL, 'G1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.75474+09', '2026-02-12 20:58:46.993802+09', 'bldg-72', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (241, 'halo', 'Halo', NULL, 'G2', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.784841+09', '2026-02-12 20:59:13.210492+09', 'bldg-77', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (235, '吐夢', '吐夢', NULL, 'G2', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.780163+09', '2026-02-12 20:59:58.025577+09', 'bldg-33', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (256, 'あるぱか', 'あるぱか', 'Alpaca', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.797439+09', '2026-03-02 18:03:41.50401+09', 'bldg-149', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (255, 'うとうと', 'うとうと', 'Utouto', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.796705+09', '2026-02-13 13:55:06.831767+09', 'bldg-149', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (254, 'ダンさん', 'ダンさん', 'Dansan', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.795932+09', '2026-02-13 14:40:23.526516+09', 'bldg-149', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (203, 'しん亭こう路', 'しん亭こう路', NULL, 'G1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.750923+09', '2026-02-12 21:00:07.605667+09', 'bldg-78', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (219, 'カルマ', 'カルマ', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.765889+09', '2026-02-12 21:01:40.461401+09', 'bldg-107', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (218, '月に吠える', '月に吠える', NULL, 'G2', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.765006+09', '2026-02-12 21:01:40.461304+09', 'bldg-107', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (217, '猪鹿蝶', '猪鹿蝶', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.764125+09', '2026-02-12 21:02:01.369247+09', 'bldg-107', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (246, 'oil', 'OIL', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '21:00-04:00', '', '', '', true, '2026-02-12 20:51:14.789238+09', '2026-02-13 13:56:12.156971+09', 'bldg-134', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (221, 'シラムレン', 'シラムレン', NULL, 'G2', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.767619+09', '2026-02-12 21:09:50.809507+09', 'bldg-115', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (220, 'peg', 'Peg', NULL, 'G2', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.766753+09', '2026-02-12 21:09:50.809234+09', 'bldg-115', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (198, 'twin', 'TWIN', '', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.746886+09', '2026-02-13 13:26:35.474123+09', 'bldg-158', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (193, '三坪', '三坪±', NULL, 'G1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.742197+09', '2026-02-12 21:10:05.753681+09', 'bldg-110', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (106, 'bar-105', 'シネストーク', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.558821+09', '2026-03-02 18:05:28.794291+09', 'bldg-150', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (257, '風の森', '風の森', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.798268+09', '2026-02-13 00:19:00.345402+09', 'bldg-150', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (216, 'anime-holic', 'ANIME HOLIC', '', 'G2', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−１０ 2F', 'MPV3+GP 新宿区、東京都', '0', '', NULL, '0352738999', '18:00-5:00', '', '', 'https://www.k-smalls.com/', true, '2026-02-12 20:51:14.763265+09', '2026-03-02 18:48:01.549841+09', 'bldg-106', '1000', NULL, 'https://maps.app.goo.gl/EEvzCU8hYj6AzUWv5', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (258, 'アパッシュ', 'アパッシュ', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.799065+09', '2026-02-13 00:19:29.547108+09', 'bldg-150', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (275, 'クラクラ', 'クラクラ', 'Kurakura', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.814327+09', '2026-02-13 14:08:50.542895+09', 'bldg-116', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (238, 'くればわかる2', 'くればわかる２', 'Kurebawakaru 2', 'G2', 2, NULL, NULL, NULL, NULL, '', '', '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.782493+09', '2026-03-02 19:07:27.553396+09', 'bldg-34', '800', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (97, 'bar-96', 'かおりノ夢ハ夜ヒラク', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.550479+09', '2026-02-12 21:44:36.771079+09', 'bldg-59', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (191, 'diamond-bar', 'Diamond bar', NULL, 'G1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '20:00-4:00', '月曜日', NULL, NULL, true, '2026-02-12 20:51:14.740339+09', '2026-03-02 18:56:53.845664+09', 'bldg-109', NULL, NULL, 'https://maps.app.goo.gl/RXBsqUsNZYgmKK6Y7', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (266, '久絽', '久絽', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.806551+09', '2026-02-13 00:00:28.091122+09', 'bldg-30', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (276, 'どんがらがっしゃん', 'どんがらがっしゃん', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.81509+09', '2026-02-13 00:22:13.018875+09', 'bldg-120', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (274, 'くさんちっぺ', 'くさんちっぺ', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.813586+09', '2026-02-13 00:22:46.630973+09', 'bldg-120', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (249, 'buzz', 'Buzz', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.791832+09', '2026-02-13 00:22:52.270678+09', 'bldg-134', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (248, '気仙坂', '気仙坂', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.790886+09', '2026-02-13 00:23:34.312184+09', 'bldg-134', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (250, '虎の穴', '虎の穴', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.792719+09', '2026-02-13 00:23:45.137784+09', 'bldg-119', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (252, 'slow-hand', 'SLOW HAND', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '20:00-04:00', NULL, NULL, NULL, true, '2026-02-12 20:51:14.794463+09', '2026-02-13 06:00:02.035055+09', 'bldg-118', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (205, '花の園', '花の園', 'Hana no Sono', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.753841+09', '2026-02-13 13:30:30.739326+09', 'bldg-72', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (195, 'エクリプス', 'エクリプス', 'Eclipse', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.744142+09', '2026-02-13 14:34:17.211277+09', 'bldg-113', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (260, 'miso-soup', 'MISO SOUP', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−９', 'MPV3+HV 新宿区、東京都', '500', '1000', NULL, '', '18:00-05:00', '', '', 'https://www.instagram.com/misosoup.g/?hl=ja', true, '2026-02-12 20:51:14.800632+09', '2026-03-02 19:11:47.270647+09', 'bldg-32', '1000', NULL, 'https://maps.app.goo.gl/Y1dejenvXSZS751aA', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (236, '大吉', '大吉', '', 'G2', 2, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.780955+09', '2026-02-13 13:40:39.620399+09', 'bldg-33', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (243, '石の花', '石の花', 'Torai No Hana', 'G2', 1, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.786657+09', '2026-02-19 14:24:56.83293+09', 'bldg-75', '', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (278, 'ace-s', 'Ace''s', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.816654+09', '2026-02-13 13:47:50.444551+09', 'bldg-116', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (189, '水の木', '水の木', 'Mizu No Ki', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.738293+09', '2026-02-13 14:34:56.815205+09', 'bldg-108', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (215, 'チャンピオン', 'チャンピオン', 'CHAMPION', 'G2', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−１０', 'MPV3+GP 新宿区、東京都', '0', '', NULL, '0332096418', '18:00-02:00', '月曜日', '', '', true, '2026-02-12 20:51:14.762477+09', '2026-03-02 18:59:55.572462+09', 'bldg-106', '500', NULL, 'https://maps.app.goo.gl/QC8hATjfCq8R5HDV7', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (204, 'bar-uisce', 'BAR UISCE', '', 'G1', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−１０ 新宿ゴールデン街 G1通り', 'MPV3+FV 新宿区、東京都', '800', '', NULL, '', '18:00-1:00', '日曜日', '', 'https://twitter.com/BarUisce', true, '2026-02-12 20:51:14.752856+09', '2026-03-02 13:47:00.158283+09', 'bldg-76', NULL, true, 'https://maps.app.goo.gl/CcyURiUNAEHvMPWP7', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (259, 'ボニータ', 'ボニータ', 'Bonita', 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.799858+09', '2026-03-02 13:17:30.051125+09', 'bldg-150', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (194, 'barたまや', 'BARたまや', 'BAR TAMAYA', 'G1', 2, NULL, NULL, NULL, NULL, '', NULL, '900', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.743194+09', '2026-02-13 14:35:27.486855+09', 'bldg-110', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (187, 'がまぐち', 'がまぐち', 'Gamaguchi', 'G1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.733305+09', '2026-03-02 13:23:46.602375+09', 'bldg-106', NULL, NULL, 'https://maps.app.goo.gl/qRU8acBYkdNBSLPRA', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (53, 'bar-52', 'キャロット', 'Bar Carrot', 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JQ 新宿区、東京都', '400', NULL, NULL, NULL, '20:00-05:00', NULL, NULL, NULL, true, '2026-02-12 19:30:43.499516+09', '2026-03-02 13:18:31.702987+09', 'bldg-99', '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (51, 'zuma', 'zuma.', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.497648+09', '2026-02-13 06:17:26.468192+09', 'bldg-4', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (245, 'hide', 'HIDE', NULL, 'G2', 3, NULL, NULL, NULL, NULL, NULL, NULL, '1000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.788417+09', '2026-03-02 19:06:20.316063+09', 'bldg-70', '700', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (57, 'sing', '談SINGシネマ', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.503232+09', '2026-02-13 06:17:26.478871+09', 'bldg-55', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (65, 'bali', 'Bali', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, '900', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.514871+09', '2026-02-13 06:25:18.059589+09', 'bldg-143', '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (68, 'bar', 'Bar 髙宗', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ 2f', 'MPV3+JV 新宿区、東京都', '500', NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/bar_takamune', true, '2026-02-12 19:30:43.519601+09', '2026-02-13 06:25:18.061497+09', 'bldg-19', '700', false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (64, 'hamoon-d', 'ハモンド', 'Hamoon-d', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '', '', '1100', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.513673+09', '2026-03-02 17:47:21.018985+09', 'bldg-38', '700', true, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (271, '友', '友', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.811052+09', '2026-02-13 00:53:21.244554+09', 'bldg-121', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (85, 'happy', 'Happy', '', 'maneki-dori', 3, NULL, NULL, NULL, NULL, '', '', '900', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.538309+09', '2026-02-19 14:10:46.106088+09', 'bldg-50', '', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (272, 'パンピ', 'パンピ', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.811858+09', '2026-02-13 01:34:41.509405+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (82, 'b', '初回盤B', NULL, 'maneki-dori', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.534894+09', '2026-02-13 06:17:26.528508+09', 'bldg-50', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (83, 'chilly-chili-nine', 'Chilly chili nine', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.535739+09', '2026-02-13 06:17:26.530086+09', 'bldg-50', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (86, 'bar--1f', 'BARウラメン', NULL, 'maneki-dori', -1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.539331+09', '2026-02-13 06:17:26.537367+09', 'bldg-50', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (90, 'azito', 'AZITO', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.543211+09', '2026-02-13 06:17:26.54578+09', 'bldg-84', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (101, '92', '92蜜', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.55419+09', '2026-02-13 06:17:26.579904+09', 'bldg-14', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (102, 'grey', 'Grey', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.555074+09', '2026-02-13 06:17:26.582336+09', 'bldg-16', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (261, '澤', '澤', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.801339+09', '2026-02-13 00:07:29.2855+09', 'bldg-32', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (263, 'desert-inn', 'DESERT INN', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.802881+09', '2026-02-13 00:07:41.838042+09', 'bldg-29', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (262, 'エスパ', 'エスパ', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.802108+09', '2026-02-13 00:07:56.118451+09', 'bldg-29', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (297, '新栄-2', '新栄', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.832804+09', '2026-03-02 17:04:27.233489+09', 'bldg-123', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (244, 'plasticmodel', 'plasticmodel', NULL, 'G2', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.787482+09', '2026-02-12 20:57:34.685039+09', 'bldg-75', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (273, 'brian-bar', 'BRIAN BAR', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.812748+09', '2026-02-12 21:03:23.96635+09', 'bldg-120', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (50, 'bar-49', 'ビストロ パボ', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ パレスビル １－C', 'MPV3+MX 新宿区、東京都', NULL, NULL, NULL, '362738282', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.496661+09', '2026-03-02 17:23:04.945689+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (77, 'bar-76', 'マワシゲリ', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.530096+09', '2026-02-12 21:33:09.191773+09', 'bldg-9', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (277, '青春', '青春', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.815858+09', '2026-02-13 00:18:08.459231+09', 'bldg-117', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (279, '夜間飛行', '夜間飛行', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.817385+09', '2026-02-13 00:18:19.888796+09', 'bldg-153', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (253, 'レスポワール純', 'レスポワール純', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.795222+09', '2026-02-13 00:20:37.447534+09', 'bldg-149', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (80, 'uracue', 'ウラ キュー', 'URACUE', 'maneki-dori', 3, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ マルハビル 3F', 'MPV3+HX 新宿区、東京都', '800', '', 12, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.532944+09', '2026-03-02 17:25:32.542068+09', 'bldg-50', '600', true, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (112, 'bar-111', '鳥立ち', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.564466+09', '2026-02-12 21:36:50.149863+09', 'bldg-8', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (142, 'bar-138', 'あび庵', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.601258+09', '2026-02-13 01:04:12.691911+09', 'bldg-1', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (128, 'bar-124', 'ポヨ', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, '2026-02-12 19:30:43.587299+09', '2026-02-12 19:30:43.587299+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (145, 'bar-141', 'クリシュナ', NULL, 'hanazono-8', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.603874+09', '2026-02-13 01:54:04.472359+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (76, 'baltimore', 'ボルチモア', 'Baltimore', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '', '', '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.52916+09', '2026-03-02 17:41:50.971071+09', 'bldg-141', '600', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (305, 'hhhh', 'HHHH', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.839442+09', '2026-02-13 01:47:49.389999+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (155, 'bar-151', 'モンシリ', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.612841+09', '2026-02-13 01:56:15.051912+09', 'bldg-67', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (300, 'ダーリン', 'ダーリン', 'Bar Darling', 'hanazono-8', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.83517+09', '2026-02-13 14:20:41.623977+09', 'bldg-93', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (159, 'bar-155', '如月', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, NULL, NULL, '800', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.616282+09', '2026-02-13 06:25:18.079579+09', 'bldg-89', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (267, 'こどじ', 'こどじ', '', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.807527+09', '2026-03-02 16:26:09.763329+09', 'bldg-28', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (268, '双葉', '双葉', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.808502+09', '2026-02-13 13:52:54.664793+09', 'bldg-30', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (280, 'クラクラ2', 'クラクラ2', 'Kurakura 2', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.818274+09', '2026-02-13 14:35:57.317044+09', 'bldg-116', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (242, 'のんちゃん', 'のんちゃん', 'Non-chan', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.785779+09', '2026-02-13 13:53:25.617318+09', 'bldg-77', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (270, 'エピローグ', 'エピローグ', 'Epilogue', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.810265+09', '2026-02-13 13:55:35.541082+09', 'bldg-133', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (94, 'ukatsu', 'UKATSU', '', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '1000', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.547851+09', '2026-02-13 14:03:33.185841+09', 'bldg-145', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (269, 'チルドレン', 'チルドレン', 'Bar Children', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.80941+09', '2026-02-13 14:37:58.552691+09', 'bldg-122', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (265, 'うるわし', 'うるわし', 'Uruwashi', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.805703+09', '2026-02-13 14:37:44.102344+09', 'bldg-30', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (264, 'しの', 'しの', 'Shino', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', '', '0', '', 16, '', '18:00-05:00', '', '', '', true, '2026-02-12 20:51:14.80479+09', '2026-03-02 12:05:45.313743+09', 'bldg-28', '', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (89, 'yours', 'YOURS', '', 'maneki-dori', -1, NULL, NULL, NULL, NULL, '', '', '0', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.542297+09', '2026-02-19 14:09:17.923175+09', 'bldg-50', '800', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (55, 'bar-54', 'スナック ハニー', 'Snack Honey', 'maneki-dori', 2, NULL, NULL, NULL, NULL, NULL, NULL, '0', NULL, NULL, '', '', NULL, NULL, '', true, '2026-02-12 19:30:43.501356+09', '2026-03-02 16:52:59.610643+09', 'bldg-93', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (72, 'piece', 'PIECE', '', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '', '', '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.525319+09', '2026-03-02 12:06:27.31962+09', 'bldg-21', '700', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (60, 'booth', '東京BOOTH', 'TOKYO BOOTH', 'hanazono-3', 2, NULL, NULL, NULL, NULL, '明るい花園3番街通り 2F, １丁目-１-７ 歌舞伎町 新宿区 東京都 160-0021', 'MPV3+JV 新宿区、東京都', '800', NULL, NULL, '368796859', NULL, NULL, NULL, 'https://www.instagram.com/tokyo.booth?igsh=MXdxbXVyamZ0bXo4NQ==', true, '2026-02-12 19:30:43.509132+09', '2026-03-02 13:17:05.166888+09', 'bldg-20', '600', false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (122, 'bar-118', 'ビアンカ', 'Bianca', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.580964+09', '2026-03-02 17:28:11.34849+09', 'bldg-59', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (143, 'qt', 'QT', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.602154+09', '2026-02-13 06:17:26.716812+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (150, 'bar-spade', 'BAR SPADE', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ パレスビル', 'MPV4+M2 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.608329+09', '2026-02-13 06:17:26.728353+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (157, 'if', 'If', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ 新宿ゴールデン街', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.614598+09', '2026-02-13 06:17:26.740418+09', 'bldg-88', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (2, 'bar-1', 'HOD', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ 新宿ゴールデン街 明るい花園 一番街', 'MPV3+HR 新宿区、東京都', '', '', NULL, '', '18:00-02:00', '', '', 'http://hod118.com/', true, '2026-02-12 19:30:43.43714+09', '2026-03-02 17:33:54.308828+09', 'bldg-137', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (298, 'bar-ジュール', 'Bar ジュール', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.833562+09', '2026-02-12 20:51:14.833562+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (299, 'smile', 'Smile', NULL, 'hanazono-8', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.83433+09', '2026-02-12 20:51:14.83433+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (301, 'adieu-l-ami', 'ADIEU L''AMI', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.835974+09', '2026-02-12 20:51:14.835974+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (295, 'barるつぼ', 'BARるつぼ', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.831289+09', '2026-02-12 20:53:31.238296+09', 'bldg-42', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (294, 'bar滝', 'BAR滝', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.830569+09', '2026-02-12 21:25:06.707157+09', 'bldg-131', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (293, 'bar-sono', 'bar sono', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.828805+09', '2026-02-12 21:02:44.704965+09', 'bldg-121', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (3, 'bar-2', '奥亭', 'Okutei', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 １番街', 'MPV3+HV 新宿区、東京都', '500', '1000', NULL, '332009295', '18:00-02:00', '', '', 'https://x.com/okuteiO2?t=glge800AfwYxxZW9eX5j9w&s=09', true, '2026-02-12 19:30:43.438705+09', '2026-03-02 17:35:54.284467+09', 'bldg-5', '800', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (5, 'bar-4', 'サーヤ', 'Saya', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.441557+09', '2026-03-02 17:44:58.616499+09', 'bldg-43', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (307, '銀河系', '銀河系', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.841353+09', '2026-02-12 21:43:25.254462+09', 'bldg-53', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (310, 'bar-0-1f', '一歩', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区新宿５丁目１７−２３', 'MPV3+GX 新宿区、東京都', NULL, NULL, NULL, '352732084', NULL, NULL, NULL, NULL, true, '2026-02-13 06:17:26.351784+09', '2026-03-02 17:46:16.880958+09', 'bldg-44', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (6, 'bar-5', '深夜＋１', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+JQ 新宿区、東京都', NULL, NULL, NULL, '332097872', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.443029+09', '2026-03-02 17:51:44.703961+09', 'bldg-39', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (130, 'bar-126', 'マチュカ・バー', 'Mature Bar', 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, '1000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.589684+09', '2026-03-02 19:20:10.742438+09', 'bldg-15', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (304, 'barブラン別館', 'BARブラン別館', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.838472+09', '2026-02-12 21:49:44.750327+09', 'bldg-51', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (133, 'bar-129', 'ミロク倶楽部', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.592829+09', '2026-02-12 21:50:47.025445+09', 'bldg-51', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (137, 'bar-133', 'ルマタン', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.596701+09', '2026-02-12 21:51:18.839675+09', 'bldg-49', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (237, 'くればわかる', 'くればわかる', 'Kurebawakaru', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.781735+09', '2026-03-02 19:07:41.53028+09', 'bldg-34', '800', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (291, 'しんしら', 'しんしら', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.827188+09', '2026-02-13 00:08:35.369517+09', 'bldg-30', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (289, '10cc', '10cc', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.825609+09', '2026-02-13 00:08:49.203112+09', 'bldg-35', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (283, 'かぼちゃ', 'かぼちゃ', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.82068+09', '2026-02-13 00:09:04.187581+09', 'bldg-154', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (290, '出窓', '出窓', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.826398+09', '2026-02-13 00:09:16.265968+09', 'bldg-35', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (282, '中村酒店', '中村酒店', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.81989+09', '2026-02-13 00:18:00.162146+09', 'bldg-117', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (286, 'zucca', 'ZUCCA', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.822963+09', '2026-02-13 00:18:42.469065+09', 'bldg-151', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (1, 'bar-0', '愛鷹', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 １番街', 'MPV3+HW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/ashitaka_golden?igsh=MWxzYmRpcWZ1MWFoaQ==', true, '2026-02-12 19:30:43.433204+09', '2026-02-13 06:17:26.347252+09', 'bldg-27', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (247, '南海', '南海', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.790043+09', '2026-02-12 21:03:50.373459+09', 'bldg-134', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (192, 'barブラン', 'Barブラン', NULL, 'G1', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.741262+09', '2026-02-12 21:09:59.015487+09', 'bldg-109', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (170, 'bar-166', '待夢', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.627779+09', '2026-02-13 00:58:24.468736+09', 'bldg-133', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (308, 'あの時の女', 'あの時の女', '', 'hanazono-3', 2, NULL, NULL, NULL, NULL, '', '', '600', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.842242+09', '2026-02-19 14:00:12.899023+09', 'bldg-17', '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (281, 'ちゃこ', 'ちゃこ', 'Chaco', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', 6, '', '', '', '', '', true, '2026-02-12 20:51:14.819082+09', '2026-02-13 14:33:41.072052+09', 'bldg-152', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (224, 'anchor', 'anchor', '', 'G2', 1, NULL, NULL, NULL, NULL, '', NULL, '1100', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.77007+09', '2026-02-13 13:44:24.829533+09', 'bldg-114', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (306, 'bar時', 'BAR時', 'BAR TOKI', 'hanazono-3', 1, NULL, NULL, NULL, NULL, NULL, NULL, '700', 'なし', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 20:51:14.840373+09', '2026-03-02 13:17:20.834923+09', 'bldg-57', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (287, 'asterisk', 'ASTERISK', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.823823+09', '2026-02-13 13:50:20.955136+09', 'bldg-152', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (285, 'araku', 'araku', '', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', NULL, '0', '', 25, '', '', '', '', '', true, '2026-02-12 20:51:14.822192+09', '2026-02-13 13:52:16.413693+09', 'bldg-35', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (110, 'bar-109', 'ところ処', 'tocorodocoro', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.562323+09', '2026-02-13 13:58:59.332763+09', 'bldg-147', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (134, 'bar-130', '百千鳥', '', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.593732+09', '2026-02-13 14:06:58.171631+09', 'bldg-11', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (284, '瑠璃', '瑠璃', 'Ruri', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', '', '900', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.821387+09', '2026-03-02 12:06:04.304493+09', 'bldg-153', '900', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (113, 'bar-112', '夏の扉', '', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '', '', '800', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.565391+09', '2026-03-02 12:07:11.353751+09', 'bldg-60', '', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (188, '図書室', '図書室', 'Toshokan', 'G1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.737113+09', '2026-02-13 14:36:46.883859+09', 'bldg-106', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (140, 'bar-136', 'れもんの木', 'Lemon no ki', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '', '', '0', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.599463+09', '2026-02-19 14:03:50.532164+09', 'bldg-6', '800', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (303, '雨樋', '雨樋', '', 'hanazono-8', 1, NULL, NULL, NULL, NULL, '', '', '700', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.837735+09', '2026-02-19 14:07:03.883191+09', 'bldg-62', '700', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (302, '紅孔雀', '紅孔雀', '', 'hanazono-8', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.836875+09', '2026-03-02 16:38:25.493991+09', 'bldg-13', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (174, 'bar-170', 'ハーメルン', 'Hameln', 'maneki-dori', 1, NULL, NULL, NULL, NULL, '新宿区歌舞伎町1-1-6', '', '500', '', 9, '03-5272-0406', '18:00-02:00', '日曜日', '', '', true, '2026-02-12 19:30:43.631126+09', '2026-03-02 11:50:01.283775+09', 'bldg-123', '700', false, 'https://maps.app.goo.gl/vm4YMnPHve4p4fYh9', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (288, 'evi', 'Evi', '', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.824768+09', '2026-03-02 12:08:07.597358+09', 'bldg-154', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (185, 'bar-178', '美香', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.643542+09', '2026-02-13 01:43:01.295792+09', 'bldg-99', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (23, 'bar-22', 'たくのみ', 'Takunomi', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HW 新宿区、東京都', '800', '', 16, '', '19:00-23:00', '火曜日', '', 'https://x.com/takunomi2020?t=BOuwDc622-sE7MLt1dfEkA&s=09', true, '2026-02-12 19:30:43.469035+09', '2026-03-02 19:30:27.52416+09', 'bldg-37', '800', NULL, 'https://maps.app.goo.gl/ifFMBsEXGfZXsn2TA', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (26, 'asyl', 'Asyl', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'http://asyl.exblog.jp/', true, '2026-02-12 19:30:43.471935+09', '2026-02-13 06:17:26.413937+09', 'bldg-37', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (100, 'bar-99', '蛾王', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ あかるい花園 ５番街', 'MPV3+JX 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.553249+09', '2026-02-12 21:43:05.507819+09', 'bldg-52', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (105, 'bar-104', '琥珀', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ あかるい花園 ５番街', 'MPV3+MR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/shirokohaku_kurokohaku?igsh=aTYzOW1mcW5nanV4', true, '2026-02-12 19:30:43.557917+09', '2026-02-12 21:45:48.018017+09', 'bldg-87', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (32, 'cambiare', 'CAMBIARE', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+HX 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.477603+09', '2026-02-13 06:17:26.428724+09', 'bldg-55', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (104, 'bar-103', '現在地', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ 2F', 'MPV3+MR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.556986+09', '2026-02-12 21:45:59.475775+09', 'bldg-86', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (18, 'bar-17', '酒乱童べるじゅらっく', '', 'hanazono-3', 2, NULL, NULL, NULL, NULL, '', '', '100', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.46337+09', '2026-03-02 17:19:51.730493+09', 'bldg-143', '', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (62, 'dume-bar', 'Dume bar', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ 2F', 'MPV3+JQ 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.511426+09', '2026-02-13 06:17:26.489709+09', 'bldg-22', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (67, 'bar-coo', 'BAR COO 空', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園三番街', 'MPV3+HW 新宿区、東京都', NULL, NULL, NULL, '9030605243', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.518628+09', '2026-02-13 06:17:26.499744+09', 'bldg-25', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (96, 'the-open-book', 'The Open Book', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ ゴールデン街 5番街', 'MPV3+JX 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.549652+09', '2026-02-13 06:17:26.565593+09', 'bldg-48', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (107, 'seasun', 'Sea&Sun', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ あかるい花園 ５番街', 'MPV3+JW 新宿区、東京都', NULL, NULL, NULL, '332084423', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.559714+09', '2026-02-13 06:17:26.603583+09', 'bldg-16', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (124, 'pitou', 'PITOU', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ 花園5番街', 'MPV3+JX 新宿区、東京都', NULL, NULL, NULL, '352858877', NULL, NULL, NULL, 'http://www.instagram.com/barpitou', true, '2026-02-12 19:30:43.582858+09', '2026-02-13 06:17:26.678745+09', 'bldg-56', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (30, 'o2', 'O2', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ 2F', 'MPV3+JR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.475772+09', '2026-02-13 06:25:18.045061+09', 'bldg-148', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (35, 'kenzos-bar', 'KENZO''S BAR', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ 2f', 'MPV3+JW 新宿区、東京都', '500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.480391+09', '2026-02-13 06:25:18.047181+09', 'bldg-18', '700', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (37, 'bar-36', 'パノラマの夜', 'Panorama no Yoru', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ あかるい花園５番街 ２Ｆ', 'MPV3+JR 新宿区、東京都', '1000', NULL, NULL, '', '', NULL, NULL, '', true, '2026-02-12 19:30:43.482231+09', '2026-03-02 19:18:57.055576+09', 'bldg-8', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (136, 'bar-132', 'やどかり', 'Yadokari', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JR 新宿区、東京都', '0', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.595772+09', '2026-03-02 12:04:34.841839+09', 'bldg-13', '800', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (71, 'the-pearl', 'The PearL', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園３番街 ２Ｆ', 'MPV3+HR 新宿区、東京都', '1000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.522449+09', '2026-02-13 06:25:18.06231+09', 'bldg-139', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (73, '5gallons', '5GALLONS', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ 明るい花園 三番街', 'MPV3+JQ 新宿区、東京都', '0', NULL, NULL, '362339946', NULL, NULL, NULL, 'https://www.cafe-gallon.com/', true, '2026-02-12 19:30:43.52638+09', '2026-02-13 06:25:18.063344+09', 'bldg-131', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (42, 'shampoo', 'shampoo', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ あかるい花園 ３番街', 'MPV3+JR 新宿区、東京都', '1000', NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/shampoo_goldengai?igsh=bTZqdHVyMHF6c3li', true, '2026-02-12 19:30:43.488099+09', '2026-03-02 19:05:25.37337+09', 'bldg-148', '800', NULL, 'https://maps.app.goo.gl/dSxXkVKVudCVvbU67', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (75, 'blue-dragon', 'ブルードラゴン', 'BLUE DRAGON', 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ 2F', 'MPV3+JR 新宿区、東京都', '500', '', NULL, '352858841', '', '', '', 'http://www.interq.or.jp/pink/sucoti/bluedragon.html', true, '2026-02-12 19:30:43.52824+09', '2026-02-13 14:22:46.802611+09', 'bldg-144', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (121, 'hip', 'HIP', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JX 新宿区、東京都', NULL, NULL, NULL, '332041522', NULL, NULL, NULL, 'https://m.facebook.com/goldenguy.HIP/', true, '2026-02-12 19:30:43.579976+09', '2026-02-13 06:25:18.075426+09', 'bldg-49', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (167, 'bar-163', 'すみれ', 'Smile', 'maneki-dori', 2, NULL, NULL, NULL, NULL, '', NULL, '500', '', NULL, '', '', '', '', '', false, '2026-02-12 19:30:43.623263+09', '2026-02-13 14:20:02.365557+09', 'bldg-92', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (182, 'bar-pho', 'BAR PHO', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, NULL, NULL, '300', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.6393+09', '2026-02-13 06:25:18.086677+09', 'bldg-95', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (184, 'pink-roro', 'Pink Roro', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '1200', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.641513+09', '2026-02-13 06:25:18.087492+09', 'bldg-92', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (27, 'bar-26', '㈲マルハ企画', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.472949+09', '2026-03-02 17:37:56.403314+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (175, 'bar-171', 'バンビ', 'Bambi', 'maneki-dori', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', false, '2026-02-12 19:30:43.632823+09', '2026-02-13 13:56:52.107553+09', 'bldg-133', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (98, 'calimero', 'Calimero', '', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JW 新宿区、東京都', '0', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.551411+09', '2026-02-13 14:08:06.504649+09', 'bldg-61', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (56, 'bar-55', '誠美興業株式会社', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.502298+09', '2026-03-02 17:38:01.23991+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (12, 'bar-11', '十六夜', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HV 新宿区、東京都', NULL, NULL, NULL, '8032733339', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.453714+09', '2026-03-02 17:38:18.494723+09', 'bldg-24', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (165, 'sasuke', 'SASUKE', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.62148+09', '2026-03-02 16:53:59.150234+09', 'bldg-93', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (14, 'bar-13', 'キネマ倶楽部', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 ３番街', 'MPV3+JQ 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.bar-cinema.com/', true, '2026-02-12 19:30:43.459498+09', '2026-03-02 17:42:14.893952+09', 'bldg-128', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (11, 'bar-10', 'ロンリー', 'Bar Lonely', 'hanazono-1', 1, NULL, NULL, NULL, NULL, '', NULL, '0', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.452637+09', '2026-03-02 17:44:33.998907+09', 'bldg-45', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (9, 'bar-8', 'ねこ娘', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HW 新宿区、東京都', NULL, NULL, NULL, '332093470', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.450389+09', '2026-03-02 17:51:50.962066+09', 'bldg-39', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (7, 'bar-6', 'ドラゴンナイト!!', NULL, 'hanazono-1', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８', 'MPV3+HR 新宿区、東京都', NULL, NULL, NULL, '9075413334', NULL, NULL, NULL, 'https://mobile.twitter.com/doragonnight118', true, '2026-02-12 19:30:43.444515+09', '2026-03-02 17:55:38.401527+09', 'bldg-135', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (201, 'プッシーフット', 'プッシーフット', 'Pussyfoot', 'G1', 2, NULL, NULL, NULL, NULL, '', '', '', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.749389+09', '2026-03-02 17:59:52.017856+09', 'bldg-158', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (15, 'bar-14', '強飲', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://www.instagram.com/goin_1fgoldengai/%3Fhl%3Dja&ved=2ahUKEwiVwMG2vKeGAxVSs1YBHR3jD10QFnoECAQQAQ&usg=AOvVaw3a_MT1P159WvPB-yXUwX7E', true, '2026-02-12 19:30:43.460645+09', '2026-03-02 17:17:26.12774+09', 'bldg-142', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (148, 'diner-5gallons', 'DINER 5GALLONS', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ 新宿ゴールデン街 ８番街', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, '363021748', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.606496+09', '2026-02-13 06:17:26.724915+09', 'bldg-1', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (115, 'bar-114', 'ぱいんつりー', 'Pine Tree', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '東京都新宿区歌舞伎町１丁目１−６ あかるい花園５番街 ２Ｆ', 'MPV3+JW 新宿区、東京都', '', '', NULL, '', '18:00-02:00', '', '', 'https://www.instagram.com/pinetree_golden/profilecard/?igsh=NDU4ZHhxMjUwMW1z', true, '2026-02-12 19:30:43.567277+09', '2026-02-19 15:03:02.968238+09', 'bldg-60', '', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (103, 'k-st', 'K-St.', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ あかるい花園 ２Ｆ にて５番街', 'MPV3+JR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/goldengai_kst?igsh=MTAwZ2gyc3E4Z3JvNg==', true, '2026-02-12 19:30:43.556074+09', '2026-02-13 06:17:26.585976+09', 'bldg-145', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (151, 'bar-fujisan', 'BAR FUJISAN', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/bar_fujisan', true, '2026-02-12 19:30:43.609262+09', '2026-02-13 06:17:26.729915+09', 'bldg-94', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (154, 'familymart', 'FamilyMart新宿ゴールデン街店', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MX 新宿区、東京都', NULL, NULL, NULL, '352919781', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.611996+09', '2026-02-13 06:17:26.735126+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (161, 'cremaster', 'CREMASTER', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−３', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://facebook.com/profile.php?id=100047284628092', true, '2026-02-12 19:30:43.618018+09', '2026-02-13 06:17:26.750954+09', 'bldg-90', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (168, 'suzyq', 'SUZY－Q', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−３', 'MPV3+RV 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://m.facebook.com/profile.php?id=193440797371823&_rdr', true, '2026-02-12 19:30:43.626+09', '2026-02-13 06:17:26.76601+09', 'bldg-88', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (172, 'nagune', 'nagune', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ 橋本ビル', 'MPV3+MR 新宿区、東京都', NULL, NULL, NULL, '332098852', NULL, NULL, NULL, 'https://nagune.info/', true, '2026-02-12 19:30:43.629458+09', '2026-02-13 06:17:26.773154+09', 'bldg-85', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (149, 'bar-145', '天然温泉テルマー湯', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−２ テルマー湯内 B1F', 'MPV4+R3 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.607448+09', '2026-02-13 00:42:15.572702+09', 'bldg-66', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (177, 'bar-k', 'Bar K', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, '332094089', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.634552+09', '2026-02-13 06:17:26.784568+09', 'bldg-124', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (186, '88p', '88p', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MQ 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://x.com/88p13?t=eqt9W_jBzICBjRvAlOaanA&s=09', true, '2026-02-12 19:30:43.644591+09', '2026-02-13 06:17:26.81035+09', 'bldg-100', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (4, 'bar-3', 'ガルシア', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 １番街1F', 'MPV3+HW 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.439948+09', '2026-03-02 17:49:56.663598+09', 'bldg-40', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (16, 'bar-15', 'シエロ', 'Shiero', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '', '', '1000', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 19:30:43.461596+09', '2026-03-02 17:57:53.175661+09', 'bldg-54', '700', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (162, 'bar-158', 'グリゼット', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'http://grisettegoldengai.blogspot.com/', true, '2026-02-12 19:30:43.618882+09', '2026-02-13 01:24:16.724881+09', 'bldg-96', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (116, 'bar-albatross', 'BAR ALBATROSS', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ ゴールデン街 5番街 5th Avenue Golden Gai, 1-1-7 Kabukicho, Shinjuku-ku, Tokyo', 'MPV3+JV 新宿区、東京都', '500', NULL, NULL, '332033699', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.570737+09', '2026-02-13 06:25:18.072657+09', 'bldg-8', '1000', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (125, 'buti', 'Buti', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MV 新宿区、東京都', '1000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.583855+09', '2026-02-13 06:25:18.076543+09', 'bldg-12', '700', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (156, 'bar-152', '流民', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５', 'MPV3+PR 新宿区、東京都', '1000', NULL, NULL, '332030721', NULL, NULL, NULL, 'https://twitter.com/liumin_G', true, '2026-02-12 19:30:43.613725+09', '2026-02-13 06:25:18.078662+09', 'bldg-94', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (93, 'bar-92', '居酒屋ぺぺ', 'Bar Pepe', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JR 新宿区、東京都', '0', '', 7, '', '18:00-0:00', '日曜日', '', '', true, '2026-02-12 19:30:43.545885+09', '2026-03-02 12:07:13.555396+09', 'bldg-146', '1000', true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (176, 'bar-woods', 'BAR WOODS', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ まねき通り', 'MPV3+PV 新宿区、東京都', '300', NULL, NULL, '368844954', NULL, NULL, NULL, 'https://www.instagram.com/sono.pho.woods?igsh=MXZmemFuMmNqZjY4dg==', true, '2026-02-12 19:30:43.63371+09', '2026-02-13 06:25:18.08484+09', 'bldg-95', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (78, 'bar-77', 'ラッキー', 'Lucky', 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒164-0021 東京都新宿区歌舞伎町１丁目１−８ 明るい花園 3番街', 'MPV3+JV 新宿区、東京都', '0', NULL, NULL, '9097161542', NULL, NULL, NULL, 'https://www.instagram.com/lucky_goldengai/', true, '2026-02-12 19:30:43.53104+09', '2026-03-02 13:16:56.175183+09', 'bldg-9', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (200, '4-cs-bar-rosso', '4''Cs BAR ROSSO', '', 'G1', 2, NULL, NULL, NULL, NULL, '', NULL, '1000', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.748524+09', '2026-03-02 18:50:39.063798+09', 'bldg-159', '600', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (211, 'ポニー', 'ポニー', 'Pony', 'G1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−１３', 'MPV3+CW 新宿区、東京都', '1500', '', NULL, '', '19:00-2:00', '', '', 'https://x.com/pony_tipple', true, '2026-02-12 20:51:14.759031+09', '2026-03-02 19:04:58.72042+09', 'bldg-74', '800', NULL, 'https://maps.app.goo.gl/XcLsfkmryQMtXvUY9', '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (146, '3rd-room', '3rd ROOM', '', 'hanazono-8', 4, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ パレスビル ４F', 'MPV4+M2 新宿区、東京都', '500', '', NULL, '332059827', '', '', '', 'https://bar-3rdroom.com/', true, '2026-02-12 19:30:43.604708+09', '2026-02-13 14:09:22.762097+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (190, 'トレトレ', 'トレトレ', 'TORETORE', 'G1', 2, NULL, NULL, NULL, NULL, '', NULL, '', '', NULL, '', '', '', '', '', true, '2026-02-12 20:51:14.739338+09', '2026-02-13 14:36:30.624501+09', 'bldg-108', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (139, 'red', 'red.', '', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ 花園5番街 ２F', 'MPV3+MV 新宿区、東京都', '1000', '', NULL, '', '18:00-02:00', '', '', 'https://bar.smappa.net/', true, '2026-02-12 19:30:43.598432+09', '2026-02-19 14:04:21.409616+09', 'bldg-6', '', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (251, 'alley-nuts', 'Alley nuts', '', 'hanazono-1', 2, NULL, NULL, NULL, NULL, '', '', '0', '', NULL, '', '18:00-02:00', '', '', '', true, '2026-02-12 20:51:14.793644+09', '2026-02-19 14:13:23.495293+09', 'bldg-119', '900', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (49, 'bar-48', 'シーホース', 'Seahorse', 'hanazono-8', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ 新宿ゴールデン街 あかるい花園8番街 流民2階', 'MPV3+PR 新宿区、東京都', NULL, NULL, NULL, '332048326', NULL, NULL, NULL, 'https://seahorse-4.jimdosite.com/', true, '2026-02-12 19:30:43.495462+09', '2026-03-02 16:54:29.82501+09', 'bldg-94', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (181, 'bar-174', 'バーバスター', 'BAR BUSTER', 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ まねき通り', 'MPV3+QR 新宿区、東京都', '', '', NULL, '5053161804', '18:00-02:00', '', '', 'https://www.facebook.com/barbuster.info', true, '2026-02-12 19:30:43.638175+09', '2026-03-02 16:55:46.739407+09', 'bldg-79', '', NULL, '', '{"default": {"open": "18:00", "close": "02:00"}, "overrides": {}, "closedDays": []}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (171, 'bar-167', '中ちゃん', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５', 'MPV3+MV 新宿区、東京都', NULL, NULL, NULL, '9084879650', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.628651+09', '2026-02-13 01:24:41.579608+09', 'bldg-97', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (183, 'bar-176', 'ひまわり', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ まねき通り', 'MPV3+MQ 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.640424+09', '2026-02-13 01:25:07.888846+09', 'bldg-98', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (61, 'toto-bar', 'toto Bar', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 １番街 2F', 'MPV3+MR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.510295+09', '2026-02-13 06:17:26.488039+09', 'bldg-21', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (87, 'heavy-gauge', 'HEAVY GAUGE', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ マルハビル 2階', 'MPV3+HX 新宿区、東京都', NULL, NULL, NULL, '332050550', NULL, NULL, NULL, 'https://www.facebook.com/heavygauge2006', true, '2026-02-12 19:30:43.540275+09', '2026-02-13 06:17:26.538972+09', 'bldg-50', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (132, 'mar', 'Mar そんなかんじ…', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ あかるい花園 ５番街', 'MPV3+JR 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.591901+09', '2026-02-13 06:17:26.697631+09', 'bldg-8', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (153, 'b-to-b', 'B to B', NULL, 'hanazono-8', 3, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−５ パレスビル ４F', 'MPV4+M2 新宿区、東京都', NULL, NULL, NULL, '332071889', NULL, NULL, NULL, 'https://www.instagram.com/bar_btob/', true, '2026-02-12 19:30:43.611065+09', '2026-02-13 06:17:26.733161+09', 'bldg-65', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (164, 'bar-160', 'ゴッサム', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MQ 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://x.com/golden_gotham', true, '2026-02-12 19:30:43.620539+09', '2026-03-02 17:05:31.752406+09', 'bldg-100', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (13, 'bar-12', 'オレンジ王子', 'Orange', 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JR 新宿区、東京都', '700', '', NULL, '', '', '', '', 'http://www.interq.or.jp/pink/sucoti/orange.html', true, '2026-02-12 19:30:43.454971+09', '2026-03-02 17:18:07.982466+09', 'bldg-144', NULL, false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (109, 'skavla', 'SKAVLA', NULL, 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ ゴールデン街 5番街', 'MPV3+JX 新宿区、東京都', '500', NULL, NULL, '332041522', NULL, NULL, NULL, 'http://bar-skavla.com/', true, '2026-02-12 19:30:43.561433+09', '2026-02-13 06:25:18.071712+09', 'bldg-51', '700', false, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (48, 'bar-47', '百済', NULL, 'hanazono-8', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−３', 'MPV3+RV 新宿区、東京都', NULL, NULL, NULL, '352911585', NULL, NULL, NULL, 'https://www.hotpepper.jp/strJ000677523/', true, '2026-02-12 19:30:43.494368+09', '2026-03-02 17:21:53.297934+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (36, 'bar-35', '二都物語', NULL, 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+JX 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.481301+09', '2026-03-02 17:38:40.998591+09', NULL, NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (17, '248', '2×4＝8', NULL, 'hanazono-1', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 １番街', 'MPV3+HR 新宿区、東京都', '800', NULL, NULL, NULL, NULL, NULL, NULL, 'https://x.com/goldensport248?t=zoYbUuCKwsmesRUQXStx3Q&s=09', true, '2026-02-12 19:30:43.462482+09', '2026-02-13 06:25:18.037979+09', 'bldg-135', NULL, true, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (84, 'dragon-i', 'dragon_i', NULL, 'maneki-dori', 2, NULL, NULL, NULL, NULL, 'Tokyo, ゴールデン街 2階 東京都新宿区歌舞伎町1-1-7 マルハビル, 新宿, 160-0021', 'MPV3+HX 新宿区、東京都', '0', NULL, 16, '03-5285-3137', '8:00-17:00', '1月1日～3日及び連休最終日', NULL, NULL, true, '2026-02-12 19:30:43.536624+09', '2026-03-02 13:19:05.908801+09', 'bldg-50', '800', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (46, 'junco', 'jun&co.', NULL, 'hanazono-3', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ あかるい花園 ３番街２Ｆ', 'MPV3+HW 新宿区、東京都', '0', NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/jun_and_co?igsh=MXA1aXdzaW5wcjd6ZA==', true, '2026-02-12 19:30:43.492411+09', '2026-02-13 06:25:18.050054+09', 'bldg-36', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (59, 'death-match', 'DEATH MATCH！', NULL, 'hanazono-3', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−８ ゴールデン街 ３番街', 'MPV3+HX 新宿区、東京都', '0', NULL, NULL, '9025245575', NULL, NULL, NULL, NULL, true, '2026-02-12 19:30:43.505209+09', '2026-02-13 06:25:18.055702+09', 'bldg-41', '666', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (43, 'bar-42', 'モンゴリアンドランク', 'Mongolian Drunk', 'hanazono-5', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７', 'MPV3+JV 新宿区、東京都', NULL, NULL, NULL, '352720272', NULL, NULL, NULL, 'https://mongoliandrunk.com/golden/', true, '2026-02-12 19:30:43.489156+09', '2026-03-02 19:18:31.868524+09', 'bldg-10', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (81, 'clarisse', 'clarisse', '', 'maneki-dori', -1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ マルハビル 地下1階 BF1', 'MPV3+HX 新宿区、東京都', '0', '', NULL, '5036323908', '18:00-02:00', '', '', 'https://x.com/bar_clarisse_', true, '2026-02-12 19:30:43.53399+09', '2026-02-19 14:09:48.543019+09', 'bldg-50', '900', NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (69, 'bar-2f', 'BAR 翁', 'Bar Okina', 'hanazono-5', 2, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ 2F', 'MPV3+JW 新宿区、東京都', '', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.520429+09', '2026-02-13 14:02:42.924168+09', 'bldg-82', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (79, 'unlimited', 'unLIMITED', '', 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−７ マルハビル', 'MPV3+HX 新宿区、東京都', '500', '', NULL, '', '', '', '', '', true, '2026-02-12 19:30:43.531953+09', '2026-02-13 13:46:07.122875+09', 'bldg-50', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (52, 'bar-51', '紀久子', NULL, 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６', 'MPV3+MQ 新宿区、東京都', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.instagram.com/kikuko_goldengai?igsh=MWpnbWpmMXhzMHRoaA==', true, '2026-02-12 19:30:43.498639+09', '2026-03-02 17:00:47.055716+09', 'bldg-100', NULL, NULL, NULL, '{}');
INSERT INTO public.bars OVERRIDING SYSTEM VALUE VALUES (70, 'bar-1f', 'Bar 何となく…', 'Bar Nantonaku...', 'maneki-dori', 1, NULL, NULL, NULL, NULL, '〒160-0021 東京都新宿区歌舞伎町１丁目１−６ まねき通り', 'MPV3+MQ 新宿区、東京都', '1000', '1000', 10, '03-3208-2001', '18:00-5:00', '1月1日', '', '', true, '2026-02-12 19:30:43.521429+09', '2026-03-02 17:01:48.724538+09', 'bldg-100', NULL, NULL, NULL, '{}');


ALTER TABLE public.bars ENABLE TRIGGER ALL;

--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.tags DISABLE TRIGGER ALL;

INSERT INTO public.tags VALUES ('smoking', 'Smoking OK', '/icons/tags/smoking.png', '#888');
INSERT INTO public.tags VALUES ('no-smoking', 'No Smoking', '/icons/tags/no-smoking.png', '#4CAF50');
INSERT INTO public.tags VALUES ('english-ok', 'English OK', '/icons/tags/english.png', '#2196F3');
INSERT INTO public.tags VALUES ('japanese-only', 'Japanese Only', '/icons/tags/japanese.png', '#F44336');
INSERT INTO public.tags VALUES ('members-only', 'Members Only', '/icons/tags/lock.png', '#9E9E9E');
INSERT INTO public.tags VALUES ('otoshi', 'Otoshi Included', '/icons/tags/otoshi.png', '#795548');
INSERT INTO public.tags VALUES ('bottle-keep', 'Bottle Keep', '/icons/tags/bottle.png', '#FF9800');
INSERT INTO public.tags VALUES ('karaoke', 'Karaoke', '/icons/tags/karaoke.png', '#E91E63');
INSERT INTO public.tags VALUES ('cash-only', 'Cash Only', '/icons/tags/cash.png', '#FFC107');
INSERT INTO public.tags VALUES ('card', 'Credit Card OK', '', '#9141ac');


ALTER TABLE public.tags ENABLE TRIGGER ALL;

--
-- Data for Name: bar_tags; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.bar_tags DISABLE TRIGGER ALL;

INSERT INTO public.bar_tags VALUES (496, 'smoking');
INSERT INTO public.bar_tags VALUES (496, 'cash-only');
INSERT INTO public.bar_tags VALUES (251, 'smoking');
INSERT INTO public.bar_tags VALUES (251, 'card');
INSERT INTO public.bar_tags VALUES (215, 'card');
INSERT INTO public.bar_tags VALUES (215, 'english-ok');
INSERT INTO public.bar_tags VALUES (215, 'karaoke');
INSERT INTO public.bar_tags VALUES (215, 'smoking');
INSERT INTO public.bar_tags VALUES (243, 'japanese-only');
INSERT INTO public.bar_tags VALUES (115, 'smoking');
INSERT INTO public.bar_tags VALUES (115, 'card');
INSERT INTO public.bar_tags VALUES (1, 'smoking');
INSERT INTO public.bar_tags VALUES (310, 'smoking');
INSERT INTO public.bar_tags VALUES (204, 'cash-only');
INSERT INTO public.bar_tags VALUES (209, 'cash-only');
INSERT INTO public.bar_tags VALUES (4, 'smoking');
INSERT INTO public.bar_tags VALUES (209, 'smoking');
INSERT INTO public.bar_tags VALUES (115, 'otoshi');
INSERT INTO public.bar_tags VALUES (236, 'otoshi');
INSERT INTO public.bar_tags VALUES (6, 'smoking');
INSERT INTO public.bar_tags VALUES (232, 'card');
INSERT INTO public.bar_tags VALUES (230, 'smoking');
INSERT INTO public.bar_tags VALUES (7, 'smoking');
INSERT INTO public.bar_tags VALUES (227, 'smoking');
INSERT INTO public.bar_tags VALUES (222, 'card');
INSERT INTO public.bar_tags VALUES (222, 'smoking');
INSERT INTO public.bar_tags VALUES (17, 'smoking');
INSERT INTO public.bar_tags VALUES (278, 'english-ok');
INSERT INTO public.bar_tags VALUES (9, 'smoking');
INSERT INTO public.bar_tags VALUES (285, 'card');
INSERT INTO public.bar_tags VALUES (285, 'english-ok');
INSERT INTO public.bar_tags VALUES (21, 'smoking');
INSERT INTO public.bar_tags VALUES (19, 'smoking');
INSERT INTO public.bar_tags VALUES (285, 'smoking');
INSERT INTO public.bar_tags VALUES (19, 'cash-only');
INSERT INTO public.bar_tags VALUES (268, 'members-only');
INSERT INTO public.bar_tags VALUES (268, 'smoking');
INSERT INTO public.bar_tags VALUES (26, 'smoking');
INSERT INTO public.bar_tags VALUES (12, 'smoking');
INSERT INTO public.bar_tags VALUES (292, 'english-ok');
INSERT INTO public.bar_tags VALUES (80, 'smoking');
INSERT INTO public.bar_tags VALUES (30, 'smoking');
INSERT INTO public.bar_tags VALUES (292, 'smoking');
INSERT INTO public.bar_tags VALUES (270, 'japanese-only');
INSERT INTO public.bar_tags VALUES (32, 'smoking');
INSERT INTO public.bar_tags VALUES (270, 'members-only');
INSERT INTO public.bar_tags VALUES (14, 'smoking');
INSERT INTO public.bar_tags VALUES (35, 'smoking');
INSERT INTO public.bar_tags VALUES (270, 'smoking');
INSERT INTO public.bar_tags VALUES (80, 'cash-only');
INSERT INTO public.bar_tags VALUES (15, 'smoking');
INSERT INTO public.bar_tags VALUES (70, 'smoking');
INSERT INTO public.bar_tags VALUES (141, 'smoking');
INSERT INTO public.bar_tags VALUES (69, 'no-smoking');
INSERT INTO public.bar_tags VALUES (42, 'smoking');
INSERT INTO public.bar_tags VALUES (76, 'smoking');
INSERT INTO public.bar_tags VALUES (44, 'smoking');
INSERT INTO public.bar_tags VALUES (216, 'english-ok');
INSERT INTO public.bar_tags VALUES (46, 'smoking');
INSERT INTO public.bar_tags VALUES (47, 'smoking');
INSERT INTO public.bar_tags VALUES (20, 'smoking');
INSERT INTO public.bar_tags VALUES (98, 'smoking');
INSERT INTO public.bar_tags VALUES (51, 'smoking');
INSERT INTO public.bar_tags VALUES (98, 'card');
INSERT INTO public.bar_tags VALUES (22, 'smoking');
INSERT INTO public.bar_tags VALUES (11, 'smoking');
INSERT INTO public.bar_tags VALUES (11, 'cash-only');
INSERT INTO public.bar_tags VALUES (57, 'smoking');
INSERT INTO public.bar_tags VALUES (24, 'smoking');
INSERT INTO public.bar_tags VALUES (59, 'smoking');
INSERT INTO public.bar_tags VALUES (59, 'english-ok');
INSERT INTO public.bar_tags VALUES (216, 'smoking');
INSERT INTO public.bar_tags VALUES (60, 'smoking');
INSERT INTO public.bar_tags VALUES (61, 'smoking');
INSERT INTO public.bar_tags VALUES (62, 'smoking');
INSERT INTO public.bar_tags VALUES (216, 'karaoke');
INSERT INTO public.bar_tags VALUES (211, 'no-smoking');
INSERT INTO public.bar_tags VALUES (65, 'smoking');
INSERT INTO public.bar_tags VALUES (25, 'smoking');
INSERT INTO public.bar_tags VALUES (211, 'card');
INSERT INTO public.bar_tags VALUES (67, 'smoking');
INSERT INTO public.bar_tags VALUES (68, 'smoking');
INSERT INTO public.bar_tags VALUES (300, 'smoking');
INSERT INTO public.bar_tags VALUES (300, 'card');
INSERT INTO public.bar_tags VALUES (71, 'smoking');
INSERT INTO public.bar_tags VALUES (300, 'english-ok');
INSERT INTO public.bar_tags VALUES (73, 'smoking');
INSERT INTO public.bar_tags VALUES (74, 'smoking');
INSERT INTO public.bar_tags VALUES (515, 'smoking');
INSERT INTO public.bar_tags VALUES (13, 'smoking');
INSERT INTO public.bar_tags VALUES (13, 'card');
INSERT INTO public.bar_tags VALUES (82, 'smoking');
INSERT INTO public.bar_tags VALUES (83, 'smoking');
INSERT INTO public.bar_tags VALUES (84, 'smoking');
INSERT INTO public.bar_tags VALUES (84, 'bottle-keep');
INSERT INTO public.bar_tags VALUES (8, 'smoking');
INSERT INTO public.bar_tags VALUES (86, 'smoking');
INSERT INTO public.bar_tags VALUES (87, 'smoking');
INSERT INTO public.bar_tags VALUES (27, 'smoking');
INSERT INTO public.bar_tags VALUES (8, 'japanese-only');
INSERT INTO public.bar_tags VALUES (10, 'smoking');
INSERT INTO public.bar_tags VALUES (90, 'smoking');
INSERT INTO public.bar_tags VALUES (91, 'smoking');
INSERT INTO public.bar_tags VALUES (91, 'members-only');
INSERT INTO public.bar_tags VALUES (194, 'smoking');
INSERT INTO public.bar_tags VALUES (8, 'members-only');
INSERT INTO public.bar_tags VALUES (5, 'smoking');
INSERT INTO public.bar_tags VALUES (8, 'otoshi');
INSERT INTO public.bar_tags VALUES (28, 'smoking');
INSERT INTO public.bar_tags VALUES (96, 'smoking');
INSERT INTO public.bar_tags VALUES (5, 'japanese-only');
INSERT INTO public.bar_tags VALUES (8, 'bottle-keep');
INSERT INTO public.bar_tags VALUES (29, 'smoking');
INSERT INTO public.bar_tags VALUES (5, 'members-only');
INSERT INTO public.bar_tags VALUES (101, 'smoking');
INSERT INTO public.bar_tags VALUES (102, 'smoking');
INSERT INTO public.bar_tags VALUES (103, 'smoking');
INSERT INTO public.bar_tags VALUES (93, 'cash-only');
INSERT INTO public.bar_tags VALUES (93, 'english-ok');
INSERT INTO public.bar_tags VALUES (93, 'smoking');
INSERT INTO public.bar_tags VALUES (107, 'smoking');
INSERT INTO public.bar_tags VALUES (109, 'smoking');
INSERT INTO public.bar_tags VALUES (8, 'cash-only');
INSERT INTO public.bar_tags VALUES (34, 'smoking');
INSERT INTO public.bar_tags VALUES (33, 'smoking');
INSERT INTO public.bar_tags VALUES (33, 'cash-only');
INSERT INTO public.bar_tags VALUES (36, 'smoking');
INSERT INTO public.bar_tags VALUES (33, 'otoshi');
INSERT INTO public.bar_tags VALUES (116, 'smoking');
INSERT INTO public.bar_tags VALUES (37, 'smoking');
INSERT INTO public.bar_tags VALUES (121, 'smoking');
INSERT INTO public.bar_tags VALUES (38, 'smoking');
INSERT INTO public.bar_tags VALUES (124, 'smoking');
INSERT INTO public.bar_tags VALUES (125, 'smoking');
INSERT INTO public.bar_tags VALUES (125, 'members-only');
INSERT INTO public.bar_tags VALUES (39, 'smoking');
INSERT INTO public.bar_tags VALUES (40, 'smoking');
INSERT INTO public.bar_tags VALUES (41, 'smoking');
INSERT INTO public.bar_tags VALUES (132, 'smoking');
INSERT INTO public.bar_tags VALUES (43, 'smoking');
INSERT INTO public.bar_tags VALUES (45, 'smoking');
INSERT INTO public.bar_tags VALUES (264, 'cash-only');
INSERT INTO public.bar_tags VALUES (264, 'japanese-only');
INSERT INTO public.bar_tags VALUES (264, 'smoking');
INSERT INTO public.bar_tags VALUES (512, 'cash-only');
INSERT INTO public.bar_tags VALUES (136, 'cash-only');
INSERT INTO public.bar_tags VALUES (136, 'smoking');
INSERT INTO public.bar_tags VALUES (139, 'smoking');
INSERT INTO public.bar_tags VALUES (303, 'card');
INSERT INTO public.bar_tags VALUES (303, 'smoking');
INSERT INTO public.bar_tags VALUES (89, 'smoking');
INSERT INTO public.bar_tags VALUES (89, 'karaoke');
INSERT INTO public.bar_tags VALUES (72, 'smoking');
INSERT INTO public.bar_tags VALUES (72, 'cash-only');
INSERT INTO public.bar_tags VALUES (143, 'smoking');
INSERT INTO public.bar_tags VALUES (48, 'smoking');
INSERT INTO public.bar_tags VALUES (295, 'smoking');
INSERT INTO public.bar_tags VALUES (284, 'smoking');
INSERT INTO public.bar_tags VALUES (49, 'smoking');
INSERT INTO public.bar_tags VALUES (148, 'smoking');
INSERT INTO public.bar_tags VALUES (298, 'smoking');
INSERT INTO public.bar_tags VALUES (150, 'smoking');
INSERT INTO public.bar_tags VALUES (151, 'smoking');
INSERT INTO public.bar_tags VALUES (50, 'smoking');
INSERT INTO public.bar_tags VALUES (153, 'smoking');
INSERT INTO public.bar_tags VALUES (154, 'smoking');
INSERT INTO public.bar_tags VALUES (284, 'cash-only');
INSERT INTO public.bar_tags VALUES (502, 'smoking');
INSERT INTO public.bar_tags VALUES (157, 'smoking');
INSERT INTO public.bar_tags VALUES (157, 'members-only');
INSERT INTO public.bar_tags VALUES (52, 'smoking');
INSERT INTO public.bar_tags VALUES (502, 'otoshi');
INSERT INTO public.bar_tags VALUES (202, 'smoking');
INSERT INTO public.bar_tags VALUES (53, 'smoking');
INSERT INTO public.bar_tags VALUES (3, 'smoking');
INSERT INTO public.bar_tags VALUES (161, 'smoking');
INSERT INTO public.bar_tags VALUES (3, 'cash-only');
INSERT INTO public.bar_tags VALUES (54, 'smoking');
INSERT INTO public.bar_tags VALUES (204, 'no-smoking');
INSERT INTO public.bar_tags VALUES (165, 'smoking');
INSERT INTO public.bar_tags VALUES (55, 'smoking');
INSERT INTO public.bar_tags VALUES (205, 'smoking');
INSERT INTO public.bar_tags VALUES (207, 'card');
INSERT INTO public.bar_tags VALUES (168, 'smoking');
INSERT INTO public.bar_tags VALUES (168, 'members-only');
INSERT INTO public.bar_tags VALUES (56, 'smoking');
INSERT INTO public.bar_tags VALUES (240, 'card');
INSERT INTO public.bar_tags VALUES (240, 'smoking');
INSERT INTO public.bar_tags VALUES (172, 'smoking');
INSERT INTO public.bar_tags VALUES (58, 'smoking');
INSERT INTO public.bar_tags VALUES (58, 'japanese-only');
INSERT INTO public.bar_tags VALUES (234, 'cash-only');
INSERT INTO public.bar_tags VALUES (234, 'smoking');
INSERT INTO public.bar_tags VALUES (232, 'smoking');
INSERT INTO public.bar_tags VALUES (176, 'smoking');
INSERT INTO public.bar_tags VALUES (177, 'smoking');
INSERT INTO public.bar_tags VALUES (177, 'members-only');
INSERT INTO public.bar_tags VALUES (226, 'cash-only');
INSERT INTO public.bar_tags VALUES (226, 'smoking');
INSERT INTO public.bar_tags VALUES (3, 'english-ok');
INSERT INTO public.bar_tags VALUES (224, 'card');
INSERT INTO public.bar_tags VALUES (182, 'smoking');
INSERT INTO public.bar_tags VALUES (224, 'smoking');
INSERT INTO public.bar_tags VALUES (184, 'smoking');
INSERT INTO public.bar_tags VALUES (184, 'members-only');
INSERT INTO public.bar_tags VALUES (79, 'smoking');
INSERT INTO public.bar_tags VALUES (186, 'smoking');
INSERT INTO public.bar_tags VALUES (17, 'cash-only');
INSERT INTO public.bar_tags VALUES (16, 'smoking');
INSERT INTO public.bar_tags VALUES (30, 'cash-only');
INSERT INTO public.bar_tags VALUES (35, 'cash-only');
INSERT INTO public.bar_tags VALUES (63, 'smoking');
INSERT INTO public.bar_tags VALUES (25, 'cash-only');
INSERT INTO public.bar_tags VALUES (71, 'cash-only');
INSERT INTO public.bar_tags VALUES (16, 'bottle-keep');
INSERT INTO public.bar_tags VALUES (78, 'smoking');
INSERT INTO public.bar_tags VALUES (91, 'cash-only');
INSERT INTO public.bar_tags VALUES (306, 'smoking');
INSERT INTO public.bar_tags VALUES (306, 'bottle-keep');
INSERT INTO public.bar_tags VALUES (156, 'smoking');
INSERT INTO public.bar_tags VALUES (159, 'smoking');
INSERT INTO public.bar_tags VALUES (159, 'cash-only');
INSERT INTO public.bar_tags VALUES (23, 'smoking');
INSERT INTO public.bar_tags VALUES (79, 'card');
INSERT INTO public.bar_tags VALUES (288, 'cash-only');
INSERT INTO public.bar_tags VALUES (288, 'smoking');
INSERT INTO public.bar_tags VALUES (287, 'no-smoking');
INSERT INTO public.bar_tags VALUES (268, 'japanese-only');
INSERT INTO public.bar_tags VALUES (242, 'no-smoking');
INSERT INTO public.bar_tags VALUES (23, 'card');
INSERT INTO public.bar_tags VALUES (246, 'members-only');
INSERT INTO public.bar_tags VALUES (246, 'japanese-only');
INSERT INTO public.bar_tags VALUES (246, 'no-smoking');
INSERT INTO public.bar_tags VALUES (175, 'smoking');
INSERT INTO public.bar_tags VALUES (110, 'smoking');
INSERT INTO public.bar_tags VALUES (126, 'card');
INSERT INTO public.bar_tags VALUES (92, 'smoking');
INSERT INTO public.bar_tags VALUES (92, 'cash-only');
INSERT INTO public.bar_tags VALUES (94, 'smoking');
INSERT INTO public.bar_tags VALUES (94, 'card');
INSERT INTO public.bar_tags VALUES (134, 'japanese-only');
INSERT INTO public.bar_tags VALUES (134, 'members-only');
INSERT INTO public.bar_tags VALUES (146, 'smoking');
INSERT INTO public.bar_tags VALUES (146, 'card');
INSERT INTO public.bar_tags VALUES (23, 'english-ok');
INSERT INTO public.bar_tags VALUES (167, 'smoking');
INSERT INTO public.bar_tags VALUES (167, 'english-ok');
INSERT INTO public.bar_tags VALUES (167, 'card');
INSERT INTO public.bar_tags VALUES (75, 'smoking');
INSERT INTO public.bar_tags VALUES (75, 'karaoke');
INSERT INTO public.bar_tags VALUES (281, 'smoking');
INSERT INTO public.bar_tags VALUES (189, 'smoking');
INSERT INTO public.bar_tags VALUES (500, 'smoking');
INSERT INTO public.bar_tags VALUES (500, 'cash-only');
INSERT INTO public.bar_tags VALUES (23, 'otoshi');
INSERT INTO public.bar_tags VALUES (29, 'cash-only');
INSERT INTO public.bar_tags VALUES (34, 'cash-only');
INSERT INTO public.bar_tags VALUES (499, 'smoking');
INSERT INTO public.bar_tags VALUES (499, 'japanese-only');
INSERT INTO public.bar_tags VALUES (499, 'members-only');
INSERT INTO public.bar_tags VALUES (34, 'karaoke');
INSERT INTO public.bar_tags VALUES (53, 'cash-only');
INSERT INTO public.bar_tags VALUES (55, 'card');
INSERT INTO public.bar_tags VALUES (31, 'smoking');
INSERT INTO public.bar_tags VALUES (31, 'cash-only');
INSERT INTO public.bar_tags VALUES (2, 'smoking');
INSERT INTO public.bar_tags VALUES (64, 'smoking');
INSERT INTO public.bar_tags VALUES (64, 'cash-only');
INSERT INTO public.bar_tags VALUES (198, 'members-only');
INSERT INTO public.bar_tags VALUES (198, 'no-smoking');
INSERT INTO public.bar_tags VALUES (198, 'card');
INSERT INTO public.bar_tags VALUES (260, 'smoking');
INSERT INTO public.bar_tags VALUES (260, 'english-ok');
INSERT INTO public.bar_tags VALUES (260, 'otoshi');
INSERT INTO public.bar_tags VALUES (174, 'otoshi');
INSERT INTO public.bar_tags VALUES (174, 'smoking');
INSERT INTO public.bar_tags VALUES (174, 'card');
INSERT INTO public.bar_tags VALUES (174, 'english-ok');
INSERT INTO public.bar_tags VALUES (18, 'smoking');
INSERT INTO public.bar_tags VALUES (18, 'karaoke');
INSERT INTO public.bar_tags VALUES (18, 'cash-only');
INSERT INTO public.bar_tags VALUES (308, 'card');
INSERT INTO public.bar_tags VALUES (308, 'smoking');
INSERT INTO public.bar_tags VALUES (140, 'smoking');
INSERT INTO public.bar_tags VALUES (113, 'cash-only');
INSERT INTO public.bar_tags VALUES (113, 'smoking');
INSERT INTO public.bar_tags VALUES (81, 'smoking');
INSERT INTO public.bar_tags VALUES (85, 'smoking');
INSERT INTO public.bar_tags VALUES (507, 'cash-only');
INSERT INTO public.bar_tags VALUES (507, 'otoshi');
INSERT INTO public.bar_tags VALUES (507, 'smoking');


ALTER TABLE public.bar_tags ENABLE TRIGGER ALL;

--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.photos DISABLE TRIGGER ALL;

INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (2, 91, 'bars/91/bfba905e-be2f-426b-a8cd-b2b9d08f3a2b.png', 'general', 0, '2026-02-13 05:09:55.19745+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (1, 91, 'bars/91/eda52532-ac22-4834-a58b-db3a8f936c4b.png', 'general', 0, '2026-02-13 05:09:55.197354+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (3, 25, 'bars/25/50bf6352-52f5-4db2-8424-a714e26a1ae5.png', 'general', 0, '2026-02-13 05:22:30.954067+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (4, 1, 'bars/1/b09ae092-da52-4a1c-90cc-97e66fc0f362.png', 'general', 0, '2026-02-13 05:22:30.961873+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (5, 26, 'bars/26/f339a4f8-a7e0-4bda-855d-6a5672e66d92.png', 'general', 0, '2026-02-13 05:22:30.969719+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (6, 91, 'bars/91/0395dfd2-271a-4515-bec6-e22deb63a649.png', 'general', 0, '2026-02-13 05:22:30.976262+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (7, 92, 'bars/92/e337edf5-4e1c-4ebf-baa5-0f994eb2d25f.png', 'general', 0, '2026-02-13 05:22:30.984352+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (8, 142, 'bars/142/fa0a9883-903e-4e1b-93eb-209cbd29e3e2.png', 'general', 0, '2026-02-13 05:22:30.991488+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (9, 79, 'bars/79/34720b54-5184-475c-ad81-deada3c0ee6c.png', 'general', 0, '2026-02-13 05:22:30.999091+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (10, 93, 'bars/93/8599932c-46e6-4e0b-a20c-a84a5b7c7ebe.png', 'general', 0, '2026-02-13 05:22:31.005994+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (11, 27, 'bars/27/af5eb5dc-be21-4608-a4a1-e3ffc396a5c8.png', 'general', 0, '2026-02-13 05:22:31.012766+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (12, 2, 'bars/2/c231a840-2521-4227-b0c0-1cd71298a429.png', 'general', 0, '2026-02-13 05:22:31.019344+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (13, 157, 'bars/157/1639f0ca-7812-4c88-beb2-c515ea8fe05a.png', 'general', 0, '2026-02-13 05:22:31.02601+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (14, 94, 'bars/94/68acf646-051d-4c19-85df-f95a56e60536.png', 'general', 0, '2026-02-13 05:22:31.03281+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (15, 80, 'bars/80/bbc4a4b7-eb45-47b8-b410-3fab8daaa80f.png', 'general', 0, '2026-02-13 05:22:31.041127+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (16, 28, 'bars/28/7e3c20b0-4ae4-46a2-9523-d3cbd2841304.png', 'general', 0, '2026-02-13 05:22:31.047629+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (17, 3, 'bars/3/97348e24-4e20-44e0-90c0-c87f74833ba5.png', 'general', 0, '2026-02-13 05:22:31.054148+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (18, 4, 'bars/4/d04b2792-66b0-4caa-8717-47bbaa7014a6.png', 'general', 0, '2026-02-13 05:22:31.060343+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (20, 5, 'bars/5/fd3819aa-15e3-48bf-a482-0e5ac742b425.png', 'general', 0, '2026-02-13 05:22:31.072762+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (21, 6, 'bars/6/e9838b11-e7d8-43df-9a81-ae8cf8b504ef.png', 'general', 0, '2026-02-13 05:22:31.078834+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (22, 29, 'bars/29/eee11b46-9ebf-4569-8ec1-c8a48580aa6f.png', 'general', 0, '2026-02-13 05:22:31.085111+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (23, 30, 'bars/30/3cfd1b89-31d9-4f1a-a3b6-e2cda3475e19.png', 'general', 0, '2026-02-13 05:22:31.091464+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (24, 96, 'bars/96/20a8b7d4-fd97-4f00-8cce-06aed51a4533.png', 'general', 0, '2026-02-13 05:22:31.097732+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (25, 97, 'bars/97/b6123d78-c4cc-4821-996f-478c49f8fdb9.png', 'general', 0, '2026-02-13 05:22:31.104252+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (26, 31, 'bars/31/b2ea1507-8033-4e56-8cd2-414523794daa.png', 'general', 0, '2026-02-13 05:22:31.110667+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (27, 98, 'bars/98/86b26fea-e52c-4315-b53d-f72389135810.png', 'general', 0, '2026-02-13 05:22:31.116998+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (29, 32, 'bars/32/1e9eddee-2920-4243-b229-df749db3dadd.png', 'general', 0, '2026-02-13 05:22:31.12957+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (30, 100, 'bars/100/3b5c7d77-93e5-4212-a7f7-af0106165903.png', 'general', 0, '2026-02-13 05:22:31.13591+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (31, 33, 'bars/33/be09f9df-3b2c-456a-846c-e0fd4e9d5730.png', 'general', 0, '2026-02-13 05:22:31.142144+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (32, 7, 'bars/7/8aa08b1c-9b91-41f6-8f47-c1cf53fde3a0.png', 'general', 0, '2026-02-13 05:22:31.148321+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (34, 159, 'bars/159/b2b9172d-9321-4dc7-85c9-4b8381acd717.png', 'general', 0, '2026-02-13 05:22:31.161645+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (35, 34, 'bars/34/0ebd1585-fa8b-42c9-b3c9-ac13fa915096.png', 'general', 0, '2026-02-13 05:22:31.169567+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (37, 143, 'bars/143/5cc5bcaa-5231-4090-92dd-dcb8ebc5d275.png', 'general', 0, '2026-02-13 05:22:31.182289+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (39, 101, 'bars/101/01f5e940-6c9f-4fc0-8423-956e5d4570cd.png', 'general', 0, '2026-02-13 05:22:31.194749+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (40, 81, 'bars/81/358ac946-dc17-478a-a5cb-c24a5d3424ec.png', 'general', 0, '2026-02-13 05:22:31.200841+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (41, 145, 'bars/145/484e9df8-fd92-475b-bd7b-bbb8f778e560.png', 'general', 0, '2026-02-13 05:22:31.20671+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (42, 161, 'bars/161/6fed4990-7d4d-4bd1-8ebb-7764cb3425a6.png', 'general', 0, '2026-02-13 05:22:31.212527+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (43, 162, 'bars/162/953daef6-dc96-4257-9774-002b21d9bd35.png', 'general', 0, '2026-02-13 05:22:31.218836+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (44, 102, 'bars/102/daf2a1d8-63da-4930-b521-c2090d164f5a.png', 'general', 0, '2026-02-13 05:22:31.225258+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (45, 35, 'bars/35/0edc09ac-fb81-47a2-9353-b346679ed796.png', 'general', 0, '2026-02-13 05:22:31.231401+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (46, 103, 'bars/103/a3c931be-8d9d-40c9-a541-a7fbe10889f6.png', 'general', 0, '2026-02-13 05:22:31.237731+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (47, 8, 'bars/8/1d3d62ee-a9aa-476a-b4be-b7e26a04a685.png', 'general', 0, '2026-02-13 05:22:31.243851+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (48, 104, 'bars/104/a3d28d96-f3ed-4ebf-a25b-307aa7468f14.png', 'general', 0, '2026-02-13 05:22:31.250115+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (49, 36, 'bars/36/7d827040-27d4-47b8-99db-80d3bf2c18f9.png', 'general', 0, '2026-02-13 05:22:31.256504+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (51, 105, 'bars/105/21a735e2-58d9-4ba1-8ecd-148f89113feb.png', 'general', 0, '2026-02-13 05:22:31.269276+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (52, 37, 'bars/37/24cbecfd-e37e-4097-93d5-d11550f336a7.png', 'general', 0, '2026-02-13 05:22:31.275597+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (53, 164, 'bars/164/3e27d48c-ebf4-4645-abea-e4087a7f4a51.png', 'general', 0, '2026-02-13 05:22:31.281735+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (54, 38, 'bars/38/524c2984-8665-4ef7-a410-ae6616a8cd36.png', 'general', 0, '2026-02-13 05:22:31.287788+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (55, 165, 'bars/165/9d7ab40b-1754-4499-841e-e43925445bfe.png', 'general', 0, '2026-02-13 05:22:31.294048+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (56, 9, 'bars/9/169ba77c-c02e-4a90-9de2-c1cd763df7fc.png', 'general', 0, '2026-02-13 05:22:31.299883+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (57, 146, 'bars/146/af6acf13-b25c-4afa-a0fb-6a435172e74e.png', 'general', 0, '2026-02-13 05:22:31.306065+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (58, 10, 'bars/10/e3f374f2-d442-470f-ac92-4f4a153bca39.png', 'general', 0, '2026-02-13 05:22:31.311827+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (59, 39, 'bars/39/ac3fd58c-a848-492c-896c-759469c239ec.png', 'general', 0, '2026-02-13 05:22:31.318031+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (60, 106, 'bars/106/3baa241b-27e3-4f05-ad71-d4c07a84f25c.png', 'general', 0, '2026-02-13 05:22:31.324253+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (61, 40, 'bars/40/cc4134c7-0121-4f26-9f3c-574a151bdcff.png', 'general', 0, '2026-02-13 05:22:31.330607+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (62, 41, 'bars/41/0d1b61a6-ba7c-4d2c-b48f-52b9e74bd10b.png', 'general', 0, '2026-02-13 05:22:31.337287+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (63, 42, 'bars/42/2a2910a5-2d12-4b6c-8920-3f20ff751c78.png', 'general', 0, '2026-02-13 05:22:31.343684+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (64, 43, 'bars/43/6681146f-e7ac-4202-8a35-96614d357ab5.png', 'general', 0, '2026-02-13 05:22:31.349682+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (65, 82, 'bars/82/e3c9b34c-fd1e-4d49-960e-09eefc1d1808.png', 'general', 0, '2026-02-13 05:22:31.357335+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (66, 11, 'bars/11/5ec9aac6-53e0-4b09-ab36-8e36b3a3de1b.png', 'general', 0, '2026-02-13 05:22:31.363186+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (67, 12, 'bars/12/2d2fde0d-8638-4457-83b7-5289cf62e1b3.png', 'general', 0, '2026-02-13 05:22:31.369046+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (68, 107, 'bars/107/774b4bd8-232a-45f8-98cc-6b03379b8422.png', 'general', 0, '2026-02-13 05:22:31.375383+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (70, 44, 'bars/44/71958c0d-cc95-4b60-ac55-0e22db6afbc0.png', 'general', 0, '2026-02-13 05:22:31.387504+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (71, 45, 'bars/45/7d1e8085-a240-4b66-9b4c-751ca1262b41.png', 'general', 0, '2026-02-13 05:22:31.393513+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (72, 46, 'bars/46/3e62d426-3e35-4a9c-9a8e-0994ec10ff77.png', 'general', 0, '2026-02-13 05:22:31.39961+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (73, 47, 'bars/47/326280d3-8488-40de-9d22-cb52679fc6f6.png', 'general', 0, '2026-02-13 05:22:31.406119+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (75, 48, 'bars/48/f1a05557-51c4-4297-857c-aaecef94a78d.png', 'general', 0, '2026-02-13 05:22:31.418109+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (76, 109, 'bars/109/205d2933-3190-4056-9943-f5f95ae450a8.png', 'general', 0, '2026-02-13 05:22:31.424745+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (77, 49, 'bars/49/fb504676-d1c8-4f15-ba86-172568c6da41.png', 'general', 0, '2026-02-13 05:22:31.430836+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (78, 50, 'bars/50/79dcc523-b6d7-4b4c-8a47-e5a1e3245262.png', 'general', 0, '2026-02-13 05:22:31.436983+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (80, 167, 'bars/167/bca43532-88b7-4793-aeba-874665e20e19.png', 'general', 0, '2026-02-13 05:22:31.448999+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (81, 168, 'bars/168/e4a52d30-b78e-4943-9699-11a47147e2fe.png', 'general', 0, '2026-02-13 05:22:31.454814+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (82, 51, 'bars/51/c814ed12-0976-433c-bcd3-9f61dfefa7e6.png', 'general', 0, '2026-02-13 05:22:31.461309+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (84, 52, 'bars/52/baddbf0b-3a27-4ce3-902a-9c60b1dfc138.png', 'general', 0, '2026-02-13 05:22:31.474012+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (85, 53, 'bars/53/c722efd4-68f3-4945-baeb-e8640ebd636b.png', 'general', 0, '2026-02-13 05:22:31.480197+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (86, 54, 'bars/54/02c4bcbe-fdd3-41b9-b3df-820dfe77841c.png', 'general', 0, '2026-02-13 05:22:31.486278+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (87, 170, 'bars/170/17b65307-85d9-4f1a-81ef-1516a0ed6fdb.png', 'general', 0, '2026-02-13 05:22:31.492261+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (88, 55, 'bars/55/cf33ff09-4837-4b39-8494-ec794f366073.png', 'general', 0, '2026-02-13 05:22:31.498265+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (89, 56, 'bars/56/beda1cab-dbd9-4af3-b8cc-cd6968fca0cd.png', 'general', 0, '2026-02-13 05:22:31.504315+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (90, 148, 'bars/148/d740ae2e-a0fa-40cb-9bb5-f3e1f7cf7029.png', 'general', 0, '2026-02-13 05:22:31.510348+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (91, 57, 'bars/57/ba82b3ac-41d3-47fe-b669-fdc19cf9d521.png', 'general', 0, '2026-02-13 05:22:31.516271+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (92, 83, 'bars/83/55624f2f-adce-48ac-abd0-aaabc1ad66ae.png', 'general', 0, '2026-02-13 05:22:31.522654+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (93, 58, 'bars/58/a1b3badb-dd3d-482f-bf90-6d5a496fcb88.png', 'general', 0, '2026-02-13 05:22:31.528673+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (94, 149, 'bars/149/6004de4a-5ef5-422e-936e-956b618902e0.png', 'general', 0, '2026-02-13 05:22:31.535072+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (95, 59, 'bars/59/a5d8f42a-c978-4989-a39c-ae61bf723eeb.png', 'general', 0, '2026-02-13 05:22:31.54239+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (96, 60, 'bars/60/d78c6daa-ebcd-45f0-bf73-666aa4b055a9.png', 'general', 0, '2026-02-13 05:22:31.548527+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (97, 110, 'bars/110/8f91835b-2c80-4622-9f7f-34694a03118b.png', 'general', 0, '2026-02-13 05:22:31.554782+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (98, 61, 'bars/61/ac85c5e9-36c1-4879-a278-58cb1b250aab.png', 'general', 0, '2026-02-13 05:22:31.560741+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (100, 112, 'bars/112/193da60f-9757-46b0-a9dd-8d247cf4a9fd.png', 'general', 0, '2026-02-13 05:22:31.572916+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (101, 62, 'bars/62/b2ebb8b9-42b8-4ef3-9183-79a97320e128.png', 'general', 0, '2026-02-13 05:22:31.579362+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (102, 13, 'bars/13/0125db51-b0bf-465c-86b1-fa3e4f0e8268.png', 'general', 0, '2026-02-13 05:22:31.58578+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (103, 84, 'bars/84/c6ca9a99-dbfe-4ece-af3e-92c65ff11775.png', 'general', 0, '2026-02-13 05:22:31.592543+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (104, 14, 'bars/14/817b20ab-23d0-4c99-8d7d-620974b25d01.png', 'general', 0, '2026-02-13 05:22:31.598743+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (105, 171, 'bars/171/68d00527-0411-4e37-b7c0-dc9404819c08.png', 'general', 0, '2026-02-13 05:22:31.605205+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (106, 172, 'bars/172/f778835a-1690-462e-b72c-4a1ce42db480.png', 'general', 0, '2026-02-13 05:22:31.611141+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (107, 113, 'bars/113/adefa3b8-239d-4e1f-9cb4-b562a65fc61f.png', 'general', 0, '2026-02-13 05:22:31.617225+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (108, 15, 'bars/15/f8772372-7869-46cb-b95e-f9c22f53948a.png', 'general', 0, '2026-02-13 05:22:31.62343+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (109, 16, 'bars/16/c00ba210-b3ec-4643-a572-cf0570d57429.png', 'general', 0, '2026-02-13 05:22:31.629385+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (110, 63, 'bars/63/d347d725-a2c2-4944-bcc0-c0fceef75c30.png', 'general', 0, '2026-02-13 05:22:31.635491+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (112, 17, 'bars/17/9f5de16d-cb2f-44e0-8cc3-2ee5d3f12ab6.png', 'general', 0, '2026-02-13 05:22:31.647702+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (114, 18, 'bars/18/8c8bd2ff-fa82-49db-a4da-7e02e725a5ee.png', 'general', 0, '2026-02-13 05:22:31.659881+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (115, 85, 'bars/85/e9a38a1c-f2cb-4b93-ad21-4e89638ef17a.png', 'general', 0, '2026-02-13 05:22:31.66592+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (116, 64, 'bars/64/f6201198-9895-4c8c-bf8a-2d08c77c485c.png', 'general', 0, '2026-02-13 05:22:31.672216+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (117, 174, 'bars/174/78929996-65cb-4c9f-a7cd-94f5b1d36fa3.png', 'general', 0, '2026-02-13 05:22:31.678685+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (118, 115, 'bars/115/bfc48d2f-dc4b-47d9-932c-4bd6f162754b.png', 'general', 0, '2026-02-13 05:22:31.684877+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (119, 65, 'bars/65/e14a71c3-94af-45b6-8eb8-de4c6342bb40.png', 'general', 0, '2026-02-13 05:22:31.690837+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (121, 175, 'bars/175/382ddfeb-45fe-46a2-8fed-a6e6bebb1c39.png', 'general', 0, '2026-02-13 05:22:31.703044+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (122, 116, 'bars/116/3792b1b2-fabc-4416-8474-51c617b37c92.png', 'general', 0, '2026-02-13 05:22:31.708888+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (123, 176, 'bars/176/cfb19140-a2be-4c1d-b983-a3e593d9ab8a.png', 'general', 0, '2026-02-13 05:22:31.715997+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (124, 86, 'bars/86/53cf7045-602d-452d-bf7e-0558120ac51e.png', 'general', 0, '2026-02-13 05:22:31.722386+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (125, 69, 'bars/69/cdf230d8-41a7-40cd-9ad5-f55ca0d016dd.png', 'general', 0, '2026-02-13 05:22:31.73045+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (126, 67, 'bars/67/49e20c77-e5ee-4160-af77-b8346b6ccf97.png', 'general', 0, '2026-02-13 05:22:31.736782+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (127, 177, 'bars/177/c9b4f944-decd-4e66-90c4-822636e32f87.png', 'general', 0, '2026-02-13 05:22:31.74308+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (128, 150, 'bars/150/9f888879-5f5c-46a1-84b4-48cc1db8ffe9.png', 'general', 0, '2026-02-13 05:22:31.749135+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (129, 68, 'bars/68/9648c554-21aa-475d-b22a-a6c56dd95e1d.png', 'general', 0, '2026-02-13 05:22:31.755138+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (130, 294, 'bars/294/7a366d01-56ae-475a-adc0-b52e691183a4.png', 'general', 0, '2026-02-13 05:22:31.761238+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (131, 300, 'bars/300/2a027ee7-f648-4daa-9315-19a004699549.png', 'general', 0, '2026-02-13 05:22:31.767348+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (132, 19, 'bars/19/84611e23-ede2-42f7-a086-c627b5803ad7.png', 'general', 0, '2026-02-13 05:22:31.77326+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (133, 306, 'bars/306/bd340ba3-1520-4e0a-abde-b62deaf926a8.png', 'general', 0, '2026-02-13 05:22:31.778946+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (134, 70, 'bars/70/a9101a7b-3a35-4b71-839e-4c42c31e9b18.png', 'general', 0, '2026-02-13 05:22:31.785641+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (135, 181, 'bars/181/c5a84cc3-4fbe-4783-a604-7dc15442b65a.png', 'general', 0, '2026-02-13 05:22:31.791813+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (136, 182, 'bars/182/254f90af-a9c7-483d-a571-15b1816e488d.png', 'general', 0, '2026-02-13 05:22:31.797704+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (137, 151, 'bars/151/c9ea22a9-f220-42e1-ba82-29a7c644a829.png', 'general', 0, '2026-02-13 05:22:31.804007+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (138, 304, 'bars/304/6a7acb7c-9178-474f-b91a-b0ea5b9836ef.png', 'general', 0, '2026-02-13 05:22:31.809997+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (139, 295, 'bars/295/bca87252-6d4f-452a-8b84-0d87867120e1.png', 'general', 0, '2026-02-13 05:22:31.816098+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (141, 71, 'bars/71/8ebfbe26-84a3-44b1-8aeb-d67dd5797a08.png', 'general', 0, '2026-02-13 05:22:31.827977+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (142, 121, 'bars/121/dc4c2713-8eef-49d2-bf0b-d9e3582bf82d.png', 'general', 0, '2026-02-13 05:22:31.83373+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (143, 183, 'bars/183/d7b5481d-0f3a-4d2f-b0e7-93a0997c0770.png', 'general', 0, '2026-02-13 05:22:31.839731+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (144, 122, 'bars/122/da58b925-8783-46c2-883d-4e153cc34576.png', 'general', 0, '2026-02-13 05:22:31.845807+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (147, 20, 'bars/20/903eaf32-9c6c-4361-bfe9-28469a7c9c47.png', 'general', 0, '2026-02-13 05:22:31.864712+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (148, 153, 'bars/153/fa48be2e-3d97-4ce0-94f3-9b90a5cd58cb.png', 'general', 0, '2026-02-13 05:22:31.871031+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (149, 124, 'bars/124/b8099d13-9945-4659-b6bf-c981a45ab671.png', 'general', 0, '2026-02-13 05:22:31.877301+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (150, 184, 'bars/184/9a17b724-90fa-4a47-a764-82ec439f2a5e.png', 'general', 0, '2026-02-13 05:22:31.883333+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (151, 72, 'bars/72/d71c5264-e72a-4a40-91de-e5053d89b4e3.png', 'general', 0, '2026-02-13 05:22:31.889395+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (152, 73, 'bars/73/46617623-b517-4886-91c9-1f1bb215f63a.png', 'general', 0, '2026-02-13 05:22:31.896753+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (153, 154, 'bars/154/a183e610-f1f4-425e-a8e7-26da55c9aadd.png', 'general', 0, '2026-02-13 05:22:31.902639+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (154, 74, 'bars/74/cb327cca-bbd0-42a3-b7d4-0a28c2bf4223.png', 'general', 0, '2026-02-13 05:22:31.908881+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (155, 21, 'bars/21/85b29c07-41e3-4bec-961b-97461dbf4400.png', 'general', 0, '2026-02-13 05:22:31.915299+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (156, 125, 'bars/125/2fdccf4c-c6c7-457d-971c-9c517ee8eca8.png', 'general', 0, '2026-02-13 05:22:31.921865+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (157, 75, 'bars/75/0bf1b2ac-b99b-4d12-828e-07084317e234.png', 'general', 0, '2026-02-13 05:22:31.927812+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (158, 22, 'bars/22/be0eba62-301e-4c63-9686-a638bd50ded5.png', 'general', 0, '2026-02-13 05:22:31.933642+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (159, 126, 'bars/126/5f85f99f-bc3b-49f6-be9e-0ac87dd82f90.png', 'general', 0, '2026-02-13 05:22:31.940061+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (160, 87, 'bars/87/e4f29a78-498f-42d1-930e-fef0f6ddcaaf.png', 'general', 0, '2026-02-13 05:22:31.946226+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (162, 76, 'bars/76/aad00691-0dc1-4152-a1c6-21d251345156.png', 'general', 0, '2026-02-13 05:22:31.958085+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (163, 128, 'bars/128/e221a0b2-20f9-4d30-b8e5-cef412e487aa.png', 'general', 0, '2026-02-13 05:22:31.965604+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (165, 130, 'bars/130/b498a6a3-3f87-4067-8238-79548821fe2c.png', 'general', 0, '2026-02-13 05:22:31.9825+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (167, 77, 'bars/77/636b0a32-6c32-42d5-b682-5daea2f3cee4.png', 'general', 0, '2026-02-13 05:22:31.99551+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (168, 132, 'bars/132/c582e862-a37b-47ae-8374-dc79e0b69a05.png', 'general', 0, '2026-02-13 05:22:32.001917+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (169, 185, 'bars/185/4e257eb6-00c0-49bc-93ba-0fcc6239ad3d.png', 'general', 0, '2026-02-13 05:22:32.008222+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (170, 133, 'bars/133/e7b48d3d-ede5-4799-b978-41ce71451a39.png', 'general', 0, '2026-02-13 05:22:32.014103+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (171, 23, 'bars/23/5c624349-d42c-4ad2-ac1e-3491c9ee9f32.png', 'general', 0, '2026-02-13 05:22:32.020029+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (172, 134, 'bars/134/7778702e-88f6-4be6-969a-b1db41b0ecea.png', 'general', 0, '2026-02-13 05:22:32.026023+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (174, 155, 'bars/155/d8f49b5d-9d5e-422b-a3ff-4d44a88c6455.png', 'general', 0, '2026-02-13 05:22:32.03779+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (175, 136, 'bars/136/e684f00c-2cfe-4f04-8f53-f55b69203345.png', 'general', 0, '2026-02-13 05:22:32.043834+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (176, 89, 'bars/89/634ae565-d4be-4a37-a103-ea733e47b137.png', 'general', 0, '2026-02-13 05:22:32.049717+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (177, 78, 'bars/78/15e2da11-9dab-487d-9843-5b050331d9df.png', 'general', 0, '2026-02-13 05:22:32.055988+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (178, 156, 'bars/156/2247dcb2-4022-42bf-9e2f-fbf5c4978ce7.png', 'general', 0, '2026-02-13 05:22:32.061948+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (179, 137, 'bars/137/9c3b3a5a-7fec-4cd7-ac3e-bd1076900887.png', 'general', 0, '2026-02-13 05:22:32.068282+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (180, 186, 'bars/186/4e6bb6bd-c350-4a1f-827a-838e53e1ff87.png', 'general', 0, '2026-02-13 05:22:32.074241+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (182, 139, 'bars/139/d9e67ac3-c7d1-4888-b0b1-6557d3390c0b.png', 'general', 0, '2026-02-13 05:22:32.086058+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (183, 140, 'bars/140/0d2530d2-7eeb-4788-80ec-2865f96e7fc2.png', 'general', 0, '2026-02-13 05:22:32.091873+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (184, 141, 'bars/141/308cd84d-f369-45da-bea7-95395cff1485.png', 'general', 0, '2026-02-13 05:22:32.097652+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (185, 24, 'bars/24/ef942170-16dd-4d75-bdf9-6473f24f31d6.png', 'general', 0, '2026-02-13 05:22:32.103816+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (186, 13, 'bars/13/1ee9abb6-6892-41a3-958c-de07f2d6560e.png', 'general', 0, '2026-02-13 14:28:55.188019+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (187, 13, 'bars/13/e0e5bbc8-bdb9-42a6-bcab-766b931e0cb6.png', 'general', 0, '2026-02-13 14:28:55.188134+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (189, 5, 'bars/5/dd81a65d-53d0-4c65-bc3b-e182c82f1da6.png', 'general', 0, '2026-02-13 14:39:10.835586+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (188, 5, 'bars/5/9018db0e-f7fd-4843-87a2-ad1cb86cf1e3.png', 'general', 0, '2026-02-13 14:39:10.835512+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (191, 499, 'bars/499/f7a77fbc-5798-46f7-9bcf-ca53623b5e3b.png', 'general', 0, '2026-02-13 19:51:30.209465+09');
INSERT INTO public.photos OVERRIDING SYSTEM VALUE VALUES (192, 499, 'bars/499/a074fd9b-9472-40a6-9a32-5011a929f394.png', 'general', 0, '2026-02-13 19:51:30.209814+09');


ALTER TABLE public.photos ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;



ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: visited; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.visited DISABLE TRIGGER ALL;



ALTER TABLE public.visited ENABLE TRIGGER ALL;

--
-- Name: bars_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bars_id_seq', 519, true);


--
-- Name: photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.photos_id_seq', 192, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict fvJfW6m26KV7Gzvp0hT7CmBeRggymPKoVOVCGVvZ5CEAHO8gQe35nLvvhbZTjLl

