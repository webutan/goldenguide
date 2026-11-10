import { computed } from 'vue'

const translations = {
  // TagFilter
  'filters': { en: 'Filters', jp: 'フィルター' },
  'status': { en: 'Status', jp: 'ステータス' },
  'all': { en: 'All', jp: 'すべて' },
  'openNow': { en: 'Open Now', jp: '営業中' },
  'floor': { en: 'Floor', jp: '階' },
  'priceRange': { en: 'Price Range', jp: '価格帯' },
  'cover': { en: 'Cover', jp: 'チャージ' },
  'drinks': { en: 'Drinks', jp: 'ドリンク' },
  'priceUnconfirmed': { en: 'Price unconfirmed', jp: '料金未確認' },
  'tags': { en: 'Tags', jp: 'タグ' },

  // BarPopup
  'maleCharge': { en: 'Male charge', jp: '男性料金' },
  'payment': { en: 'Payment', jp: '支払い' },
  'cashOnly': { en: 'Cash only', jp: '現金のみ' },
  'seats': { en: 'Seats', jp: '席数' },
  'hours': { en: 'Hours', jp: '営業時間' },
  'open': { en: 'Open', jp: '営業中' },
  'closed': { en: 'Closed', jp: '閉店' },
  'closedDays': { en: 'Closed', jp: '定休日' },
  'phone': { en: 'Phone', jp: '電話' },
  'address': { en: 'Address', jp: '住所' },
  'googleMaps': { en: 'Google Maps', jp: 'Google Maps' },
  'markVisited': { en: 'Mark as Visited', jp: '訪問済みにする' },
  'visited': { en: 'Visited', jp: '訪問済み' },
  'markFavorite': { en: 'Mark as Favorite', jp: 'お気に入りに追加' },
  'favorited': { en: 'Favorited', jp: 'お気に入り済み' },
  'favorites': { en: 'Favorites', jp: 'お気に入り' },
  'close': { en: 'Close', jp: '閉じる' },

  // Search
  'search':     { en: 'Search',         jp: '検索' },
  'searchBars': { en: 'Search bars...', jp: 'バーを検索...' },
  'searchMore': { en: '+{n} more…', jp: 'ほか{n}件…' },

  // Directory
  'allTags': { en: 'All Tags', jp: 'すべてのタグ' },
  'noBarsFound': { en: 'No bars found', jp: 'バーが見つかりません' },

  // Taskbar
  'desktop': { en: 'Desktop', jp: 'デスクトップ' },
  'directory': { en: 'Directory', jp: 'ディレクトリ' },
  'map': { en: 'Map', jp: 'マップ' },
  'adminMode': { en: 'Admin Mode', jp: '管理モード' },
  'goldenGai': { en: 'Golden Gai', jp: 'ゴールデン街' },

  // Desktop icons
  'iconMap': { en: 'Map', jp: 'マップ' },
  'iconDirectory': { en: 'Directory', jp: 'ディレクトリ' },
  'iconFeed': { en: 'Feed', jp: 'フィード' },
  'iconChatroom': { en: 'Chatroom', jp: 'チャット' },
  'iconAbout': { en: 'About', jp: 'について' },
  'iconContact': { en: 'Contact', jp: '連絡先' },

  // LangDialog
  'langQuestion': { en: 'What language do you speak?', jp: '言語を選んでください' },

  // Window titles
  'explorer': { en: 'Explorer', jp: 'エクスプローラー' },

  // Placeholder
  'comingSoon': { en: 'Coming soon', jp: '準備中' },

  // Reviews
  'leaveReview': { en: 'Do you want to leave a review?', jp: 'レビューを書きますか？' },
  'reviewPromptYes': { en: 'Yes', jp: 'はい' },
  'reviewPromptNo': { en: 'No', jp: 'いいえ' },
  'reviews': { en: 'Reviews', jp: 'レビュー' },
  'noReviews': { en: 'No reviews yet. Be the first!', jp: 'まだレビューがありません。最初のレビューを書きましょう！' },
  'submitReview': { en: 'Submit', jp: '投稿する' },
  'reviewPlaceholder': { en: 'Write your review... (max 500 chars)', jp: 'レビューを書いてください... (最大500文字)' },
  'reviewError': { en: 'Your review could not be posted. Please try again.', jp: 'レビューを投稿できませんでした。もう一度お試しください。' },
  'iconReviews': { en: 'Reviews', jp: 'レビュー' },

  // Check-in
  'checkIn': { en: 'Check In', jp: 'チェックイン' },
  'checkedIn': { en: 'Checked In ✓', jp: 'チェックイン済み ✓' },
  'whoIsHere': { en: "Who's Here", jp: '今どこにいる' },

  // Taskbar clock
  'clockTokyo': { en: 'Tokyo', jp: '東京' },
  'clockYourTime': { en: 'Your time', jp: '現地時間' },

  // Lazy-loaded window placeholder
  'loading': { en: 'Loading…', jp: '読み込み中…' },

  // Dialogs (useDialog / WinDialog) + admin dialogs
  'dialogTitle': { en: 'Golden Gai Map', jp: 'ゴールデン街マップ' },
  'dialogOk': { en: 'OK', jp: 'OK' },
  'dialogCancel': { en: 'Cancel', jp: 'キャンセル' },
  'dialogYes': { en: 'Yes', jp: 'はい' },
  'dialogNo': { en: 'No', jp: 'いいえ' },
  'adminLoginTitle': { en: 'Admin Login', jp: '管理者ログイン' },
  'adminPasswordPrompt': { en: 'Enter the admin password:', jp: '管理者パスワードを入力してください：' },
  'adminWrongPassword': { en: 'Incorrect password.', jp: 'パスワードが違います。' },
  'adminServerError': { en: 'Server error — check ADMIN_PASSWORD is configured.', jp: 'サーバーエラー — ADMIN_PASSWORD の設定を確認してください。' },
  'adminConfirmDeleteTitle': { en: 'Confirm Delete', jp: '削除の確認' },
  'adminConfirmDeleteBar': { en: 'Delete "{name}"? This cannot be undone.', jp: '「{name}」を削除しますか？元に戻せません。' },
  'adminConfirmDeleteTag': { en: 'Delete tag "{name}"?', jp: 'タグ「{name}」を削除しますか？' },
  // Gap fill: strings that previously bypassed t()
  'adminConsole': { en: 'Admin Console', jp: '管理コンソール' },
  'database': { en: 'Database', jp: 'データベース' },
  'clear': { en: 'Clear', jp: 'クリア' },
  'errorPrefix': { en: 'Error:', jp: 'エラー：' },
  'unplaced': { en: 'Unplaced', jp: '未配置' },
  'building': { en: 'Building', jp: '建物' },
  'unknownStreet': { en: 'Unknown', jp: '不明' },
  'barCountOne': { en: '{n} bar', jp: '{n}軒' },
  'barCount': { en: '{n} bars', jp: '{n}軒' },
  'searchResults': { en: 'Search Results', jp: '検索結果' },
  'directoryCount': { en: '{shown} / {total} bar(s)', jp: '{shown} / {total}軒' },
  'allBars': { en: 'All bars', jp: 'すべてのバー' },
  'noBarsMatchFilter': { en: 'No bars match the current filter.', jp: '条件に合うバーがありません。' },
  'twitterX': { en: 'Twitter/X', jp: 'Twitter/X' },
  'noRecentTweets': { en: 'No recent tweets.', jp: '最近のツイートはありません。' },
  'viewOnX': { en: 'View @{handle} on X/Twitter ↗', jp: 'X/Twitterで@{handle}を見る ↗' },
  'noTwitterAccounts': { en: 'No Twitter/X accounts found in database.', jp: 'Twitter/Xアカウントが登録されていません。' },
  'tagModeOr': { en: 'Or', jp: 'OR' },
  'tagModeAnd': { en: 'And', jp: 'AND' },
  'tagModeOrTitle': { en: 'Match any selected tag', jp: '選択したタグのいずれかに一致' },
  'tagModeAndTitle': { en: 'Match all selected tags', jp: '選択したタグすべてに一致' },
  'visitedTooltip': { en: '{visited} of {total} bars visited', jp: '{total}軒中{visited}軒訪問済み' },
  'zoomIn': { en: 'Zoom in', jp: '拡大' },
  'zoomOut': { en: 'Zoom out', jp: '縮小' },
  'fitToView': { en: 'Fit to view', jp: '全体を表示' },
  'resetView': { en: 'Reset rotation and zoom', jp: '回転とズームをリセット' },
  'showLocation': { en: 'Show my location', jp: '現在地を表示' },
  'stopLocation': { en: 'Stop location tracking', jp: '現在地の追跡を停止' },
  'locationCalibrated': { en: '{n} bars calibrated', jp: '{n}軒で補正済み' }, // TODO(jp-review)
  'locationNeedsCalibration': { en: 'need 3+ bars with plus codes or lat/lng set on the map', jp: '地図上でPlus Codeまたは緯度経度が設定されたバーが3軒以上必要です' }, // TODO(jp-review)
  'geoUnsupported': { en: 'Geolocation not supported by your browser', jp: 'お使いのブラウザは位置情報に対応していません' },
  'chatSignInTitle': { en: 'Enter Your Screen Name', jp: 'スクリーンネームを入力' },
  'chatScreenName': { en: 'Screen Name:', jp: 'スクリーンネーム：' },
  'chatSignIn': { en: 'Sign In', jp: 'サインイン' },
  'chatTitle': { en: 'Golden Gai Chat', jp: 'ゴールデン街チャット' },
  'chatEmpty': { en: 'No messages yet. Say hi!', jp: 'まだメッセージがありません。あいさつしてみよう！' },
  'chatPlaceholder': { en: 'Type a message...', jp: 'メッセージを入力...' },
  'chatSend': { en: 'Send', jp: '送信' },
  'chatChangeName': { en: 'Click to change screen name', jp: 'クリックしてスクリーンネームを変更' },
  'ok': { en: 'OK', jp: 'OK' },
  'checkedInAt': { en: 'Checked in: {bar}', jp: 'チェックイン中：{bar}' },
  'onlineCount': { en: '{n} online', jp: '{n}人オンライン' },
  'reviewDrawOptional': { en: 'Draw? (optional)', jp: '絵を描く？（任意）' },
  'reviewEraser': { en: 'Eraser', jp: '消しゴム' },
  'reviewSkip': { en: 'Skip', jp: 'スキップ' },
  'reviewDrawing': { en: 'Drawing', jp: '絵' },
  'reviewDiscardTitle': { en: 'Discard review?', jp: 'レビューを破棄しますか？' },
  'reviewDiscardText': { en: 'Your review has not been posted. Close and discard it?', jp: 'レビューはまだ投稿されていません。閉じて破棄しますか？' },
  'reviewDiscard': { en: 'Discard', jp: '破棄する' },
  'reviewKeepEditing': { en: 'Keep editing', jp: '編集を続ける' },
  'timeJustNow': { en: 'just now', jp: 'たった今' },
  'timeMinutesAgo': { en: '{n}m ago', jp: '{n}分前' },
  'timeHoursAgo': { en: '{n}h ago', jp: '{n}時間前' },
  'timeDaysAgo': { en: '{n}d ago', jp: '{n}日前' },
  'partUnassignedTitle': { en: 'Unassigned in this building', jp: 'この建物で未割り当て' },
  'partUnassignedHint': { en: 'Not in any slot yet. Still shown on the map until you place it.', jp: 'まだどのスロットにも入っていません。配置するまでマップには仮表示されます。' },
  'partAddSlot': { en: 'Add slot', jp: 'スロット追加' },
  'partStaleTitle': { en: 'Stale slot references', jp: '無効なスロット参照' },
  'partStaleHint': { en: 'Ignored on the map.', jp: 'マップでは無視されます。' },
  'partStaleMissing': { en: 'Slot {n}: bar {name} no longer exists', jp: 'スロット{n}：バー {name} は存在しません' },
  'partStaleMoved': { en: 'Slot {n}: {name} is no longer in this building', jp: 'スロット{n}：{name} はこの建物にありません' },
  'partStaleRemove': { en: 'Remove', jp: '削除' },
}

export function useI18n(lang) {
  // t(key, params?) — params replace `{name}` placeholders in the string.
  function t(key, params) {
    const entry = translations[key]
    if (!entry) {
      if (import.meta.env?.DEV) console.warn(`[i18n] missing key: "${key}"`)
      return key
    }
    const l = typeof lang === 'object' && lang.value !== undefined ? lang.value : lang
    let str = entry[l] || entry.en || key
    if (params) {
      str = str.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m))
    }
    return str
  }

  return { t }
}
