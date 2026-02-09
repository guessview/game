// i18n.js

const translations = {
  en: {
    "app_name": "GuessView",
    "app_subtitle": "Street View Multiplayer — 1 minute to guess the location",
    "select_avatar": "Select your avatar",
    "login_google": "Sign in with Google",
    "nickname_label": "Player nickname",
    "nickname_placeholder": "e.g. Alex",
    "quick_play": "Quick Play",
    "find_match": "Find a Match (Join)",
    "private_room": "Private Room",
    "room_code_placeholder": "Code from friend (e.g. A2K9XZ)",
    "join_code": "Join with code",
    "logout": "Log out",
    "like_game": "Like the game? ❤️",
    "support_donate": "Support / Donate",
    "global_top": "🏆 GLOBAL TOP 10",
    "loading": "Loading...",
    "how_to_play": "📖 How to play",
    "how_to_play_desc": "1) Explore the environment and mark the location on the map.<br>2) Points depend on the accuracy of your guess.<br>3) Compete with others in real-time using Matchmaking.<br>4) Collect the maximum score over 15 rounds.",
    "status": "Status",
    "start_game": "🚀 Start Game",
    "submit_guess": "Submit Guess",
    "waiting": "Waiting for others...",
    "exit": "Exit",
    "players": "Players",
    "chat": "Chat",
    "type_message": "Type a message...",
    "location_found": "Location found!",
    "close": "Close",
    "game_finished": "🏁 Game Finished!",
    "winner": "Winner",
    "new_game": "🔄 New Game",
    "main_menu": "🏠 Main Menu",
    // შეგიძლია მერე დაამატო მეტი
  },
  ka: {
    "app_name": "გამოცნობიე",
    "app_subtitle": "Street View Multiplayer — 1 წუთი გაქვს რუქაზე გამოსაცნობად",
    "select_avatar": "აირჩიე ავატარი",
    "login_google": "Google-ით შესვლა",
    "nickname_label": "მოთამაშის სახელი",
    "nickname_placeholder": "მაგ: Ivane",
    "quick_play": "სწრაფი თამაში",
    "find_match": "მოპოვება (შესვლა)",
    "private_room": "პირადი ოთახი",
    "room_code_placeholder": "კოდი მეგობრისგან (მაგ: A2K9XZ)",
    "join_code": "შესვლა კოდით",
    "logout": "გამოსვლა",
    "like_game": "მოგწონს თამაში? ❤️",
    "support_donate": "მხარდაჭერა / დონაცია",
    "global_top": "🏆 GLOBAL TOP 10",
    "loading": "ჩაიტვირთება...",
    "how_to_play": "📖 როგორ მუშაობს",
    "how_to_play_desc": "1) დაათვალიერე გარემო და მონიშნე ლოკაცია რუქაზე.<br>2) ქულა დამოკიდებულია მონიშვნის სიზუსტეზე.<br>3) შეეჯიბრე სხვებს რეალურ დროში Matchmaking-ით.<br>4) დააგროვე მაქსიმალური ქულა 15 რაუნდის განმავლობაში.",
    "status": "⏱️ სტატუსი",
    "start_game": "🚀 თამაშის დაწყება",
    "submit_guess": "გამოცნობა",
    "waiting": "⏳ ველოდებით...",
    "exit": "გასვლა",
    "players": "🏆 მოთამაშეები",
    "chat": "💬 ჩატი",
    "type_message": "დაწერე...",
    "location_found": "ლოკაცია ნაპოვნია!",
    "close": "დახურვა",
    "game_finished": "🏁 თამაში დასრულდა!",
    "winner": "გამარჯვებული",
    "new_game": "🔄 ახალი თამაში",
    "main_menu": "🏠 მთავარი მენიუ",
  }
};

let currentLang = localStorage.getItem('lang') || 
  (navigator.language.startsWith('ka') ? 'ka' : 'en');

function t(key) {
  return translations[currentLang][key] || translations['en'][key] || key;
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateAllTexts();
    // განვაახლოთ active კლასი ღილაკებზე
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }
}

function updateAllTexts() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });

  // რაუნდის დინამიური განახლება (თუ გჭირდება)
  if ($('round-display')) {
    $('round-display').innerText = `${t('round')}: ${Math.min(currentRound || 1, 15)} / 15`;
  }
}

// ინიციალიზაცია
window.addEventListener('load', () => {
  updateAllTexts();
});
en: {
  "your_party": "YOUR PARTY",
  "start_game": "Start Game",
  "edit_options": "Edit Options",
  "copy": "Copy",
  "no_move": "No moving, panning, zooming"
},

ka: {
  "your_party": "YOUR PARTY",
  "start_game": "თამაშის დაწყება",
  "edit_options": "Edit Options",
  "copy": "კოპირება",
  "no_move": "არა მოძრაობა, პანინგი, ზუმი"
}
