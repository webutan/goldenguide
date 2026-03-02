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
  'close': { en: 'Close', jp: '閉じる' },

  // Search
  'search':     { en: 'Search',         jp: '検索' },
  'searchBars': { en: 'Search bars...', jp: 'バーを検索...' },

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
  'search': { en: 'Search', jp: '検索' },
  'explorer': { en: 'Explorer', jp: 'エクスプローラー' },

  // Placeholder
  'comingSoon': { en: 'Coming soon', jp: '準備中' },
}

export function useI18n(lang) {
  function t(key) {
    const entry = translations[key]
    if (!entry) return key
    const l = typeof lang === 'object' && lang.value !== undefined ? lang.value : lang
    return entry[l] || entry.en || key
  }

  return { t }
}
