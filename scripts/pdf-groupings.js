/**
 * Building groupings extracted from the PDF map layout.
 * Each entry represents a physical building with the bars inside it.
 * Format: { street, bars: [{ name_jp, floor }] }
 *
 * Streets:
 *   G1 = ゴールデン街G1 (bottom of map)
 *   G2 = ゴールデン街G2
 *   hanazono-1 = あかるい花園1番街
 *   hanazono-3 = あかるい花園3番街
 *   hanazono-8 = あかるい花園8番街
 *   maneki = まねき通り
 */

export const buildingGroups = [
  // ===== ゴールデン街 G1 (bottom row) =====
  // Reading left to right from the PDF bottom section
  { street: 'G1', bars: [
    { name: 'がまぐち', floor: 1 },
    { name: '図書室', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: '水の木', floor: 1 },
    { name: 'トレトレ', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'Diamond bar', floor: 1 },
    { name: 'Barブラン', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: '三坪±', floor: 1 },
    { name: 'BARたまや', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'エクリプス', floor: 1 },
    { name: '小鳥', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: '夢二', floor: 1 },
  ]},
  { street: 'G1', bars: [
    { name: 'TWIN', floor: 1 },
  ]},
  { street: 'G1', bars: [
    { name: '突風', floor: 1 },
    { name: "4'Cs BAR ROSSO", floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'プッシーフット', floor: 1 },
  ]},
  { street: 'G1', bars: [
    { name: 'SUZU BAR', floor: 1 },
    { name: 'しん亭こう路', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'BAR UISCE', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: '久', floor: 1 },
  ]},
  { street: 'G1', bars: [
    { name: '花の園', floor: 1 },
    { name: 'Decoy', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'Hecate', floor: 1 },
    { name: 'パパズドリーム', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'zory', floor: 1 },
    { name: 'ROCKET', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: 'ポニー', floor: 1 },
    { name: 'Hungry', floor: 2 },
  ]},
  { street: 'G1', bars: [
    { name: "Bon's", floor: 1 },
    { name: 'Humphrey', floor: 2 },
  ]},

  // ===== ゴールデン街 G2 =====
  // Left side
  { street: 'G2', bars: [
    { name: 'チャンピオン', floor: 1 },
    { name: 'ANIME HOLIC', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'ami', floor: 1 },
    { name: '猪鹿蝶', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: '月に吠える', floor: 1 },
    { name: 'カルマ', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'Peg', floor: 1 },
    { name: 'シラムレン', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: '小鉄', floor: 1 },
    { name: '十月', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'anchor', floor: 1 },
    { name: '酔２', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'UP OUT', floor: 1 },
    { name: 'RENO', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'BARCA', floor: 1 },
    { name: '凪', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: '451℉', floor: 1 },
    { name: 'PARAS OL', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'こもれび', floor: 1 },
    { name: 'こもれび', floor: 2 },  // こもれび appears on both floors
  ]},
  { street: 'G2', bars: [
    { name: 'フラッパー', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: '吐夢', floor: 1 },
    { name: '大吉', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'くればわかる', floor: 1 },
    { name: 'くればわかる２', floor: 2 },
  ]},
  { street: 'G2', bars: [
    { name: 'ナイチンゲール', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: '和三盆', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: 'Halo', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: 'のんちゃん', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: '石の花', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: 'plasticmodel', floor: 1 },
  ]},
  { street: 'G2', bars: [
    { name: '誠美興業', floor: 1 },
    { name: 'HIDE', floor: 3 },
  ]},

  // ===== あかるい花園1番街 =====
  { street: 'hanazono-1', bars: [
    { name: 'OIL', floor: 1 },
    { name: '南海', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '気仙坂', floor: 1 },
    { name: 'Buzz', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '虎の穴', floor: 1 },
    { name: 'Alley nuts', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'SLOW HAND', floor: 1 },
    { name: '？', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'レスポワール純', floor: 1 },
    { name: 'ダンさん', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'うとうと', floor: 1 },
    { name: 'あるぱか', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '風の森', floor: 1 },
    { name: 'シネストークYOYO', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'アパッシュ', floor: 1 },
    { name: 'ボニータ', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'MISO SOUP', floor: 1 },
    { name: '澤', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'エスパ', floor: 1 },
    { name: 'DESERT INN', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'しの', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'うるわし', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '久絽', floor: 1 },
  ]},
  // 駐車場 (parking) - skip
  { street: 'hanazono-1', bars: [
    { name: 'こどじ', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '双葉', floor: 1 },
  ]},
  // Bottom row of hanazono-1 area
  { street: 'hanazono-1', bars: [
    { name: 'チルドレン', floor: 1 },
    { name: 'エピローグ', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '友', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'パンピ', floor: 1 },
  ]},
  // Left column south side
  { street: 'hanazono-1', bars: [
    { name: 'BRIAN BAR', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'くさんちっぺ', floor: 2 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'クラクラ', floor: 2 },
    { name: 'どんがらがっしゃん', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '青春', floor: 2 },
    { name: "Ace's", floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '夜間飛行', floor: 2 },
    { name: 'クラクラ2', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'ちゃこ', floor: 2 },
    { name: '中村酒店', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'かぼちゃ', floor: 2 },
    { name: '瑠璃', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'araku', floor: 2 },
    { name: 'ZUCCA', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'ASTERISK', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'Evi', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '10cc', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: '出窓', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'しんしら', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'トロール', floor: 1 },
  ]},
  { street: 'hanazono-1', bars: [
    { name: 'bar sono', floor: 1 },
  ]},

  // ===== あかるい花園3番街 =====
  // Top row (south side of street)
  { street: 'hanazono-3', bars: [
    { name: '新宿櫻亭', floor: 1 },
    { name: 'ナナ', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BAR tomorrow', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'HOD', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '音吉', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ドラゴンナイト！！', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '2×4＝8', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BILLY', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '申', floor: 1 },
    { name: '遠足', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ブルーローズ', floor: 1 },
    { name: 'GHETTO', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '奥亭', floor: 1 },  // listed as 2F in some contexts
  ]},
  // North side
  { street: 'hanazono-3', bars: [
    { name: '洗濯船', floor: 1 },
    { name: 'BARキネマ倶楽部', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '5GALLONS', floor: 1 },
    { name: 'BAR滝', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ばるぼら屋', floor: 1 },
    { name: 'ジュテ', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '原子心母', floor: 1 },
    { name: 'The PearL', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'zuma.', floor: 1 },
    { name: 'WHO', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '十六夜', floor: 1 },
    { name: 'たちばな診察室', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ゴールデンダスト', floor: 1 },
    { name: 'Dume BAR', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'PIECE', floor: 1 },
    { name: 'toto BAR', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '赤花', floor: 1 },
    { name: 'zilch', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'シエロ', floor: 1 },
    { name: '沙華', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'たくのみ１', floor: 1 },
    { name: 'Asyl', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ガルシア', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '一歩', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '愛鷹', floor: 1 },
    { name: '無銘喫茶', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '深夜+1', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'たくのみ２', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ナベサン', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'どこ', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ねこ娘', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'jun&co', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Buoy', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ハーメルン', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'DEATH MATCH！', floor: 1 },
    { name: 'Hamoon-d', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BARるつぼ', floor: 1 },
    { name: 'スクエア', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'シャドウ', floor: 1 },
    { name: '珍呑', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'サーヤ', floor: 1 },
    { name: 'ロンリー', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BAR COO', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '新栄', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '待夢', floor: 2 },
  ]},

  // ===== まねき通り (left side, running north-south) =====
  { street: 'maneki', bars: [
    { name: 'Bar K', floor: 1 },
    { name: '新栄', floor: 2 },  // duplicate with hanazono-3
  ]},
  { street: 'maneki', bars: [
    { name: 'キャロット', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'ゴッサム', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: '何となく', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: '88p', floor: 2 },
  ]},
  { street: 'maneki', bars: [
    { name: '紀久子', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'ひまわり', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: '中ちゃん', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: '美香', floor: 1 },
  ]},

  // ===== あかるい花園8番街 (top section) =====
  // まねき通り side (left)
  { street: 'hanazono-8', bars: [
    { name: 'バーバスター', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'BAR WOODS', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'BAR Pho', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'こっこめ', floor: 2 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'Bar ジュール', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'Smile', floor: 2 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'Pink Roro', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '肉人', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'グリゼット', floor: 1 },
  ]},
  // Main area
  { street: 'hanazono-8', bars: [
    { name: '流民', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'シーホース', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'FUJISAN', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'あび庵', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'CREMASTER', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'ダーリン', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'ハニー', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'DINER 5GALLONS', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '如月', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'SASUKE', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'suzy-Q', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'if', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'nagune', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '琥珀', floor: 1 },
    { name: 'AZITO', floor: 2 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'ビッグリバー', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '現在地', floor: 1 },
    { name: 'プラージュ', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '翁', floor: 1 },
    { name: "ADIEU L'AMI", floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'red.', floor: 1 },
    { name: 'れもんの木', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '紅孔雀', floor: 1 },
    { name: 'やどかり', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '百千鳥', floor: 1 },
    { name: 'add+', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '西瓜糖', floor: 1 },
    { name: 'Buti', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '92蜜', floor: 1 },
    { name: '真湖', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'Calimero', floor: 1 },
    { name: 'マチュカバー', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'ぱいんつりー', floor: 1 },
    { name: 'レカン', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'カンガルーコート', floor: 1 },
    { name: '夏の扉', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: '二都物語', floor: 1 },
    { name: '雨樋', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'HIP', floor: 1 },
    { name: 'ルマタン', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'The Open Book', floor: 1 },
    { name: 'SKAVLA', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'ミロク倶楽部', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'BARブラン別館', floor: 1 },
  ]},
  // Right side
  { street: 'hanazono-8', bars: [
    { name: 'ビストロ パボ', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'HHHH', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'QT', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'SPADE', floor: 1 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'クリシュナ', floor: 2 },
  ]},
  { street: 'hanazono-8', bars: [
    { name: 'BtoB', floor: 3 },
    { name: '3rd Room', floor: 4 },
  ]},

  // ===== More まねき通り bars (between streets) =====
  // These are along the vertical まねき通り
  { street: 'maneki', bars: [
    { name: 'ところ処', floor: 1 },
    { name: 'トミー', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'ロベリヤ', floor: 2 },
  ]},
  { street: 'maneki', bars: [
    { name: '居酒屋ぺぺ', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'UKA TSU', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'そんなかんじ', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'K-st.', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'パノラマの夜', floor: 2 },
  ]},
  { street: 'maneki', bars: [
    { name: 'ソワレ', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'BLUE DRAGON', floor: 2 },
  ]},
  { street: 'maneki', bars: [
    { name: 'べるじゅらっく', floor: 2 },
  ]},
  { street: 'maneki', bars: [
    { name: 'オレンジ王子', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: 'Bali', floor: 1 },
  ]},
  { street: 'maneki', bars: [
    { name: '強飲', floor: 1 },
  ]},

  // ===== Right side of map (between hanazono-3 and hanazono-8) =====
  { street: 'hanazono-3', bars: [
    { name: '鳥立ち', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BAR ALBATROSS', floor: 1 },
    { name: 'モンゴリアンドランク', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Sea&Sun', floor: 1 },
    { name: 'Grey', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'ぺんぎん村', floor: 1 },
    { name: 'ビアンカ', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Pitou', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BAR時', floor: 1 },
    { name: '追い風', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '銀河系', floor: 1 },
    { name: 'シネストーク', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '蛾王', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Happy', floor: 1 },
    { name: '松鐘亭', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '初回盤B', floor: 1 },
    { name: 'Heavy Gauge', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'URACUE', floor: 3 },
    { name: 'dragon-i', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Chilly chili nine', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'かおり・・', floor: 2 },
  ]},

  // Bars near O2/ラッキー area
  { street: 'hanazono-3', bars: [
    { name: 'O2', floor: 1 },
    { name: 'ラッキー', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '東京BOOTH', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: "KENZO'S BAR", floor: 2 },
    { name: 'bar 髙宗', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Shampoo', floor: 1 },
    { name: 'Cabochard', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'マワシゲリ', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '祖界', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'スエズ', floor: 1 },
    { name: '裏窓', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'すず', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'JAN JUNE', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '生ハム＆バー エポカ', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'YOURS', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'clarisse', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'BARウラメン', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: '談SINGシネマ', floor: 1 },
    { name: 'ガルガンチュア', floor: 2 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'Cambiare', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'un LIMITED', floor: 1 },
  ]},
  { street: 'hanazono-3', bars: [
    { name: 'あの時の女', floor: 2 },
  ]},
  // Baltimore is its own building, north side of hanazono-3 near 原子心母
  { street: 'hanazono-3', bars: [
    { name: 'Baltimore', floor: 1 },
  ]},

  // ===== Landmarks / edge-of-map (not in alley grid but on the PDF) =====
  { street: 'landmark', bars: [
    { name: '百済', floor: 1 },            // 韓国会席百済, top-left
  ]},
  { street: 'landmark', bars: [
    { name: '天然温泉テルマー湯', floor: 1 }, // テルマー湯, top-center
  ]},
  { street: 'landmark', bars: [
    { name: 'モンシリ', floor: 1 },         // 焼肉モンシリ, top-right
  ]},
  { street: 'landmark', bars: [
    { name: 'FamilyMart新宿ゴールデン街店', floor: 1 },
  ]},
]

// Count totals
const totalBars = buildingGroups.reduce((sum, g) => sum + g.bars.length, 0)
console.log(`Extracted ${buildingGroups.length} building groups with ${totalBars} total bar slots`)

// Count by street
const byStreet = {}
for (const g of buildingGroups) {
  byStreet[g.street] = (byStreet[g.street] || 0) + g.bars.length
}
console.log('By street:', byStreet)
