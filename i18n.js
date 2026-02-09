// i18n.js
const translations = {
  en: {
    // მთავარი ენა — ინგლისური
    "title": "GuessView - Guess the location",
    "nickname": "Nickname",
    "play": "Quick Play",
    "find_match": "Find Match",
    "create_private": "Create Private Room",
    "join_private": "Join with Code",
    "room_code": "Room Code",
    "start_game": "Start Game",
    "guess_button": "Submit Guess",
    "waiting_players": "Waiting for players...",
    "round": "Round",
    "timer": "Time left",
    "your_score": "Your score",
    "leaderboard": "Leaderboard",
    "chat": "Chat",
    "send": "Send",
    "final_winner": "🏆 Winner",
    "points": "points",
    "global_leaderboard": "Global Leaderboard",
    "no_scores_yet": "Leaderboard is empty yet.",
    // დაუმატე ყველა ტექსტი რაც გაქვს HTML-ში და JS-ში
    "guess_result": "You scored",
    "fireworks_congrats": "Great guess!",
    // ...
  },
  ka: {
    // ქართული — ისე როგორც ახლა გაქვს
    "title": "გამოცნობიე - მდებარეობის გამოცნობა",
    "nickname": "მოთამაშის სახელი",
    "play": "სწრაფი თამაში",
    "find_match": "მოპოვება",
    "create_private": "პირადი ოთახის შექმნა",
    "join_private": "შესვლა კოდით",
    "room_code": "ოთახის კოდი",
    "start_game": "თამაშის დაწყება",
    "guess_button": "გამოცნობა",
    "waiting_players": "ელოდებით მოთამაშეებს...",
    "round": "რაუნდი",
    "timer": "დარჩენილი დრო",
    "your_score": "შენი ქულა",
    "leaderboard": "ლიდერბორდი",
    "chat": "ჩატი",
    "send": "გაგზავნა",
    "final_winner": "🏆 გამარჯვებული",
    "points": "ქულა",
    "global_leaderboard": "გლობალური რეიტინგი",
    "no_scores_yet": "რეიტინგი ჯერ ცარიელია.",
    // ...
  }
};

let currentLang = localStorage.getItem('lang') || 
  (navigator.language.startsWith('ka') ? 'ka' : 'en');

function t(key) {
  return translations[currentLang][key] || translations.en[key] || key;
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateAllTexts();
  }
}

function updateAllTexts() {
  // ეს ფუნქცია განაახლებს ყველა ელემენტს რომელსაც აქვს data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // თუ გჭირდება დინამიური განახლება (მაგ. round-display)
  if ($('round-display')) {
    $('round-display').innerText = `${t('round')}: ${Math.min(currentRound, 15)} / 15`;
  }
  // შეგიძლია დაუმატო სხვა ელემენტებიც
}

// ექსპორტი (თუ ცალკე ფაილშია)
window.t = t;
window.setLanguage = setLanguage;
window.updateAllTexts = updateAllTexts;
