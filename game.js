// game.js - აბსოლუტურად სრული ვერსია (არაფერია ამოჭრილი)
const firebaseConfig = {
  apiKey: "AIzaSyCtaqmlhkj414tmdchbZQv2GOlLB74HsZQ",
  authDomain: "gamocnobie.firebaseapp.com",
  databaseURL: "https://gamocnobie-default-rtdb.firebaseio.com",
  projectId: "gamocnobie",
  storageBucket: "gamocnobie.appspot.com",
  messagingSenderId: "457780218677",
  appId: "1:457780218677:web:df2fa58265d59cae155a7c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let roundMarkers = []; // აქ შევინახავთ ყველა მოთამაშის მარკერს და ხაზს
const avatars = ['🐱','🐶','🦊','🐻','🐼','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦄','🐉','🦒','🐯','🐱‍👤','🐺','🦓','🐘'];
let selectedAvatar = localStorage.getItem('gamocnobie_avatar') || avatars[0];
let userData, roomId, nickname, map, panorama, svService, selectedLatLng, userMarker, correctMarker, polyline;
let phase, currentRound, deadline, correct, submittedRound = 0, mapsReady = false, lastTickSecond = -1;
const $ = id => document.getElementById(id);
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTickSound() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

// 1. ავატარების ლოგიკა
const avatarSelector = $('avatar-selector');
if(avatarSelector) {
    avatars.forEach(av => {
        const el = document.createElement('div');
        el.className = 'avatar-option' + (av === selectedAvatar ? ' selected' : '');
        el.innerText = av;
        el.onclick = () => {
            document.querySelectorAll('.avatar-option').forEach(x => x.classList.remove('selected'));
            el.classList.add('selected'); selectedAvatar = av;
            localStorage.setItem('gamocnobie_avatar', av);
        }; avatarSelector.appendChild(el);
    });
}

function onGoogleMapsLoaded(){
  mapsReady = true;
  svService = new google.maps.StreetViewService();
  loadGlobalBoard();
}

function toggleMinimize(id) { $(id).classList.toggle('minimized'); }
function toggleEmojiPicker(){ $('emoji-picker').style.display = $('emoji-picker').style.display==='grid'?'none':'grid'; }

function makeDraggable(el) {
  const header = el.querySelector('.panel-header');
  if(!header) return;
  header.onmousedown = (e) => {
    let p3 = e.clientX, p4 = e.clientY;
    document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
    document.onmousemove = (e) => {
      let p1 = p3 - e.clientX, p2 = p4 - e.clientY;
      p3 = e.clientX; p4 = e.clientY;
      el.style.top = (el.offsetTop - p2) + "px"; el.style.left = (el.offsetLeft - p1) + "px";
      el.style.right = "auto"; el.style.bottom = "auto";
    };
  };
}

function createFireworks() {
  for (let i = 0; i < 25; i++) {
    const f = document.createElement('div'); f.className = 'firework';
    f.style.left = Math.random() * 100 + 'vw'; f.style.top = Math.random() * 100 + 'vh';
    f.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 60%)`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
  }
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    userData = user; $("auth-block").style.display = "none"; $("post-auth").style.display = "block";
    $("nickname").value = localStorage.getItem("gamocnobie_nick_" + user.uid) || user.displayName || "";
  }
});

function loginWithGoogle(){ firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout(){ firebase.auth().signOut(); location.reload(); }

async function quickPlay(){
  if(!mapsReady || !userData) return;
  nickname = $("nickname").value || "Player";
  localStorage.setItem("gamocnobie_nick_" + userData.uid, nickname);
  const newRoomId = "QUICK_" + Math.random().toString(36).substring(2,10).toUpperCase();
  roomId = newRoomId;
  await db.ref(`rooms/${roomId}/meta`).set({ matchmaking: true, createdAt: Date.now(), phase: "idle" });
  joinRoom(roomId);
}

async function findMatch() {
  if(!mapsReady || !userData) return;
  nickname = $("nickname").value || "Player";
  localStorage.setItem("gamocnobie_nick_" + userData.uid, nickname);
  const snap = await db.ref("rooms").once("value");
  const rooms = snap.val() || {};
  const now = Date.now();
  let target = Object.keys(rooms).find(id => {
      const r = rooms[id];
      return r.meta?.matchmaking && Object.keys(r.players || {}).length < 6 && r.meta?.phase !== "finished" && (now - (r.meta?.createdAt || 0)) < 600000;
  });
  if (!target) {
    target = "MATCH_" + Math.random().toString(36).substring(2,8).toUpperCase();
    await db.ref(`rooms/${target}/meta`).set({ matchmaking: true, createdAt: now, phase: "idle" });
  }
  joinRoom(target);
}

// განახლებული createPrivateRoom
async function createPrivateRoom(){
  if(!userData) return;
  nickname = $("nickname").value || "Player";
  localStorage.setItem("gamocnobie_nick_" + userData.uid, nickname);

  const selectedRounds = parseInt(document.getElementById('private-rounds-select')?.value) || 15;

  const target = Math.random().toString(36).substring(2,8).toUpperCase();
  
  await db.ref(`rooms/${target}/meta`).set({ 
    matchmaking: false, 
    createdAt: Date.now(), 
    phase: "idle",
    rounds: selectedRounds,
    currentRound: 0,
    createdBy: userData.uid  // ვინ შექმნა (host)
  });

  // Host-ად მონიშვნა
  await db.ref(`rooms/${target}/players/${userData.uid}`).set({ 
    name: nickname, 
    avatar: selectedAvatar, 
    points: 0, 
    uid: userData.uid,
    isHost: true 
  });

  joinRoom(target);
}

function joinPrivateRoom(){ const code = $("room-code-input").value.toUpperCase(); if(code) joinRoom(code); }

// განახლებული joinRoom — აქ ჩნდება private lobby
async function joinRoom(id){
  roomId = id; nickname = $("nickname").value || "Player";
  $("chat-messages").innerHTML = "";
  await db.ref(`rooms/${roomId}/players/${userData.uid}`).set({ 
    name: nickname, 
    avatar: selectedAvatar, 
    points: 0, 
    uid: userData.uid,
    isHost: false 
  });
  db.ref(`rooms/${roomId}/players/${userData.uid}`).onDisconnect().remove();

  const roomMeta = await db.ref(`rooms/${roomId}/meta`).once('value');
  const meta = roomMeta.val() || {};

  if (meta.matchmaking === false) {
    // Private room → ვაჩვენებთ ლობის პანელს
    $('overlay').style.display = 'none';
    $('private-lobby').style.display = 'flex';
    $('lobby-code').innerText = roomId;

    // თუ შენ ხარ host
    if (meta.createdBy === userData.uid) {
      db.ref(`rooms/${roomId}/players/${userData.uid}`).update({ isHost: true });
    }

    updateLobbyUI(meta);
  } else {
    // Quick/Matchmaking → ჩვეულებრივი თამაში
    $('overlay').style.display = 'none';
    $('container').style.display = 'block';
    $('ui').style.display = 'flex';
    $('scoreboard').style.display = 'flex';
    $('chat-panel').style.display = 'flex';
  }

  makeDraggable($('ui')); makeDraggable($('scoreboard')); makeDraggable($('chat-panel'));
  initMaps(); bindListeners(); ensureGame();
}

function initMaps(){
  if (panorama) return;
  panorama = new google.maps.StreetViewPanorama($("street-view"), { addressControl: false, showRoadLabels: false, visible: false });
  map = new google.maps.Map($("map"), { center: {lat:20, lng:0}, zoom:2, disableDefaultUI: true });
  new ResizeObserver(() => google.maps.event.trigger(map, 'resize')).observe($("map-wrapper"));
  map.addListener("click", e => {
    if (phase !== "guess" || submittedRound === currentRound) return;
    selectedLatLng = e.latLng;
    if (userMarker) userMarker.setMap(null);
    userMarker = new google.maps.Marker({ position: selectedLatLng, map: map });
    $("guess-btn").disabled = false;
  });
}

function bindListeners(){
  db.ref(`rooms/${roomId}/players`).on("value", snap => {
    const p = snap.val() || {};
    const arr = Object.values(p).sort((a,b) => b.points - a.points);
    $("score-list").innerHTML = arr.map(i => `<div class="player-row"><div class="player-info"><span>${i.avatar || '👤'}</span><span>${i.name}</span></div><b>${i.points}</b></div>`).join("");
  });
  db.ref(`rooms/${roomId}/game`).on("value", snap => {
    const data = snap.val() || {};
    const newPhase = data.meta?.phase || "idle";
    currentRound = data.meta?.currentRound || 1;
    deadline = data.meta?.deadline || 0; correct = data.state;
  
    db.ref(`rooms/${roomId}/meta`).once('value').then(m => {
        const meta = m.val() || {};
        const maxRounds = meta.rounds || 15;
        
        $("round-display").innerText = `რაუნდი: ${currentRound} / ${maxRounds}`;
        
        if(newPhase === "idle" && meta.matchmaking === false) {
            $('manual-start-btn').style.display = 'block';
        } else {
            $('manual-start-btn').style.display = 'none';
        }
    });
    if (newPhase !== phase) { phase = newPhase; handlePhaseChange(); }
  });
  db.ref(`rooms/${roomId}/chat`).on("child_added", snap => {
      const m = snap.val();
      $("chat-messages").innerHTML += `<div class="chat-msg"><span>${m.avatar || ''}</span> <b>${m.user}:</b> ${m.text}</div>`;
      $("chat-messages").scrollTop = $("chat-messages").scrollHeight;
  });
  db.ref(`rooms/${roomId}/game/guesses`).on("value", async (snap) => {
    if (phase !== "guess") return;
    const guesses = snap.val() || {};
    const pSnap = await db.ref(`rooms/${roomId}/players`).once("value");
    const players = pSnap.val() || {};
    if (Object.keys(guesses).length >= Object.keys(players).length && Object.keys(players).length > 0) {
      if (Object.keys(players)[0] === userData.uid) {
        db.ref(`rooms/${roomId}/game/meta`).update({ phase: "reveal", deadline: Date.now() + 6000 });
      }
    }
  });
}

function sendChatMessage(){
    const txt = $("chat-input").value.trim(); if(!txt) return;
    db.ref(`rooms/${roomId}/chat`).push({ user: nickname, avatar: selectedAvatar, text: txt });
    $("chat-input").value = "";
}

function addEmoji(emoji) {
    $("chat-input").value += emoji;
    toggleEmojiPicker();
    $("chat-input").focus();
}

function handlePhaseChange(){
  if (phase === "guess") {
    roundMarkers.forEach(m => m.setMap(null));
    roundMarkers = [];
    submittedRound = 0; selectedLatLng = null; $("guess-btn").disabled = true; $("guess-btn").style.display = "block"; $("waiting-msg").style.display = "none";
    if(userMarker) userMarker.setMap(null); if(correctMarker) correctMarker.setMap(null); if(polyline) polyline.setMap(null);
    if (correct) {
      panorama.setVisible(false);
      setTimeout(() => {
          google.maps.event.trigger(panorama, 'resize');
          panorama.setPosition({lat: correct.lat, lng: correct.lng});
          panorama.setVisible(true);
      }, 800);
    }
  } else if (phase === "reveal") {
    if (submittedRound < currentRound) userSubmit(true);
    showReveal();
    setTimeout(async () => {
      const metaSnap = await db.ref(`rooms/${roomId}/meta`).once('value');
      const meta = metaSnap.val() || {};
      const maxRounds = meta.rounds || 15;

      if(currentRound < maxRounds) {
          db.ref(`rooms/${roomId}/players`).limitToFirst(1).once("value", s => {
            if(Object.keys(s.val())[0] === userData.uid) startRound(currentRound + 1);
          });
      } else {
          db.ref(`rooms/${roomId}/game/meta/phase`).set("finished");
      }
    }, 6000);
  } else if (phase === "finished") {
      finishGame();
  } else if (phase === "idle") {
      $("final-screen").style.display = "none";
  }
}

setInterval(() => {
  if (!deadline || phase !== "guess") { $("timer").style.color = "var(--accent-amber)"; return; }
  const diff = Math.max(0, Math.ceil((deadline - Date.now())/1000));
  $("timer").innerText = `00:${diff < 10 ? '0' : ''}${diff}`;
  if (diff <= 10 && diff > 0) {
      $("timer").style.color = "var(--accent-red)";
      if (diff !== lastTickSecond) { playTickSound(); lastTickSecond = diff; }
  } else { $("timer").style.color = "var(--accent-amber)"; }
  if (diff <= 0 && submittedRound < currentRound) userSubmit(true);
}, 100);

async function ensureGame() {
  const snap = await db.ref(`rooms/${roomId}/game/meta`).once("value");
  const roomMeta = await db.ref(`rooms/${roomId}/meta`).once("value");
  const data = snap.val() || {};
  if (!snap.exists() || data.phase === "finished") {
      setTimeout(async () => {
          await restartGame();
          if (roomMeta.val() && roomMeta.val().matchmaking === true) startRound(1);
      }, 1000);
  }
}

async function manualGameStart() {
    await db.ref(`rooms/${roomId}/game/meta`).update({ phase: "idle", currentRound: 1 });
    startRound(1);
}

const populatedLocations = [
  { lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 }, { lat: 52.5200, lng: 13.4050 },
  { lat: 41.9028, lng: 12.4964 }, { lat: 41.3851, lng: 2.1734 }, { lat: 55.7558, lng: 37.6173 },
  { lat: 59.3293, lng: 18.0686 }, { lat: 52.2297, lng: 21.0122 }, { lat: 50.0755, lng: 14.4378 },
  { lat: 48.2082, lng: 16.3738 }, { lat: 35.6895, lng: 139.6917 }, { lat: 37.5665, lng: 126.9780 },
  { lat: 39.9042, lng: 116.4074 }, { lat: 31.2304, lng: 121.4737 }, { lat: 13.7563, lng: 100.5018 },
  { lat: 1.3521, lng: 103.8198 }, { lat: 19.0760, lng: 72.8777 }, { lat: 28.6139, lng: 77.2090 },
  { lat: 40.7128, lng: -74.0060 }, { lat: 34.0522, lng: -118.2437 }, { lat: 37.7749, lng: -122.4194 },
  { lat: 41.8781, lng: -87.6298 }, { lat: 43.6532, lng: -79.3832 }, { lat: 19.4326, lng: -99.1332 },
  { lat: -23.5505, lng: -46.6333 }, { lat: -34.6037, lng: -58.3816 }, { lat: -33.8688, lng: 151.2093 },
  { lat: -37.8136, lng: 144.9631 }, { lat: 25.2048, lng: 55.2708 }, { lat: 30.0444, lng: 31.2357 },
  { lat: -26.2041, lng: 28.0473 }, { lat: 41.7151, lng: 44.8271 }, { lat: 41.6500, lng: 44.7833 },
  { lat: 42.2710, lng: 42.7010 }, { lat: 41.6539, lng: 41.6418 }, { lat: 40.1872, lng: 44.5152 },
  { lat: 43.2389, lng: 76.8897 }, { lat: 41.0082, lng: 28.9784 }, { lat: 25.7617, lng: -80.1918 },
  { lat: 22.3193, lng: 114.1694 }, { lat: 14.5995, lng: 120.9842 }, { lat: 36.2048, lng: 138.2529 }
];

function startRound(num){
  if(!svService) return setTimeout(() => startRound(num), 1000);
  const isPopulated = Math.random() < 0.8;
  let pos;
  if (isPopulated) {
    const city = populatedLocations[Math.floor(Math.random() * populatedLocations.length)];
    const offsetLat = (Math.random() * 0.5) - 0.25;
    const offsetLng = (Math.random() * 0.5) - 0.25;
    pos = { lat: city.lat + offsetLat, lng: city.lng + offsetLng };
  } else {
    pos = { lat: (Math.random()*140)-70, lng: (Math.random()*360)-180 };
  }
  svService.getPanorama({location: pos, radius: 100000, source: google.maps.StreetViewSource.OUTDOOR}, async (d, s) => {
    if (s === "OK") {
      db.ref(`rooms/${roomId}/game`).update({
        state: { lat: d.location.latLng.lat(), lng: d.location.latLng.lng() },
        meta: { phase: "guess", currentRound: num, deadline: Date.now() + 60000 },
        guesses: null
      });
    } else startRound(num);
  });
}

function userSubmit(auto){
  if (submittedRound === currentRound) return;
  submittedRound = currentRound;
  $("guess-btn").style.display = "none"; $("waiting-msg").style.display = "block";
  let score = 0; let lat = null, lng = null;
  if (selectedLatLng && correct) {
    lat = selectedLatLng.lat(); lng = selectedLatLng.lng();
    const d = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(correct.lat, correct.lng), selectedLatLng);
    score = Math.floor(5000 * Math.exp(-(d/1000)/1800));
    if (score >= 4000) createFireworks();
  }
  db.ref(`rooms/${roomId}/players/${userData.uid}/points`).transaction(c => (c||0) + score);
  const guessData = {score: score, lat: lat, lng: lng};
  db.ref(`rooms/${roomId}/game/guesses/${userData.uid}`).set(guessData);
  db.ref(`rooms/${roomId}/history/round_${currentRound}/${userData.uid}`).set(guessData);
  db.ref(`rooms/${roomId}/history/round_${currentRound}/correct`).set({lat: correct.lat, lng: correct.lng});
}

async function showReveal(){
  const [gSnap, pSnap] = await Promise.all([db.ref(`rooms/${roomId}/game/guesses`).once("value"), db.ref(`rooms/${roomId}/players`).once("value")]);
  const guesses = gSnap.val() || {}, players = pSnap.val() || {};
  const cLoc = {lat: correct.lat, lng: correct.lng};
  correctMarker = new google.maps.Marker({ position: cLoc, map: map, zIndex: 1000, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#22c55e", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 } });
  roundMarkers.push(correctMarker);
  const bounds = new google.maps.LatLngBounds(); bounds.extend(cLoc);
  Object.keys(guesses).forEach(uid => {
    const g = guesses[uid], p = players[uid];
    if (g.lat && g.lng) {
      const pLoc = {lat: g.lat, lng: g.lng}; bounds.extend(pLoc);
      const m = new google.maps.Marker({
        position: pLoc,
        map: map,
        label: { text: `${p.avatar || '👤'} ${p.name}`, className: "player-map-label" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 }
      });
      roundMarkers.push(m);
      const line = new google.maps.Polyline({ path: [cLoc, pLoc], map: map, strokeColor: "#ef4444", strokeOpacity: 0.5, strokeWeight: 2 });
      roundMarkers.push(line);
    }
    if (uid === userData.uid) { $("res-score").innerText = `+${g.score || 0} ქულა`; $("result-popup").style.display = "block"; }
  });
  map.fitBounds(bounds);
}

async function finishGame() {
    $("final-screen").style.display = "flex";
    const snap = await db.ref(`rooms/${roomId}/players`).once("value");
    const players = Object.values(snap.val() || {}).sort((a,b) => b.points - a.points);
    $("winner-name").innerText = "🏆 გამარჯვებული: " + (players[0]?.name || "---");
    $("final-stats").innerHTML = players.map(p => `<div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:700;"><span>${p.avatar || '👤'} ${p.name}</span><span style="color:var(--accent-green)">${p.points} ქულა</span></div>`).join("");
    updateGlobalLeaderboard();
    showFinalHistoryMap();
}

async function updateGlobalLeaderboard() {
  const playersSnap = await db.ref(`rooms/${roomId}/players`).once("value");
  const players = playersSnap.val() || {};
  for (let uid in players) {
    const p = players[uid];
    const leaderRef = db.ref(`global_leaderboard/${uid}`);
    const existingSnap = await leaderRef.once("value");
    const existingData = existingSnap.val();
    if (!existingData || p.points > (existingData.score || 0)) {
      await leaderRef.set({ name: p.name, score: p.points, avatar: p.avatar || '👤' });
    }
  }
}

function loadGlobalBoard() {
  db.ref("global_leaderboard").orderByChild("score").limitToLast(10).on("value", snap => {
    const listDiv = $("global-list");
    if (!snap.exists()) { listDiv.innerHTML = '<div style="color:gray; text-align:center; padding:20px;">რეიტინგი ცარიელია.</div>'; return; }
    let items = []; snap.forEach(c => { const val = c.val(); items.push({ avatar: val.avatar || '👤', name: val.name || c.key, score: val.score || 0 }); });
    items.reverse();
    listDiv.className = "global-list-container";
    listDiv.innerHTML = items.map((i, idx) => `<div class="global-rank" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; background:rgba(255,255,255,0.03); padding:8px; border-radius:8px;"><span class="rank-text" style="color:var(--accent-amber); font-weight:900;">#${idx + 1}</span><span style="font-size:20px;">${i.avatar}</span><span class="rank-text" style="flex:1;">${i.name}</span><span class="score-text" style="color:var(--accent-green); font-weight:900;">${i.score}</span></div>`).join("");
  });
}

async function restartGame() {
    const updates = {};
    const snap = await db.ref(`rooms/${roomId}/players`).once("value");
    if (snap.exists()) {
        Object.keys(snap.val()).forEach(uid => { updates[`rooms/${roomId}/players/${uid}/points`] = 0; });
    }
    updates[`rooms/${roomId}/game`] = { meta: { phase: "idle", currentRound: 1, createdAt: Date.now() }, guesses: null, state: null };
    updates[`rooms/${roomId}/chat`] = null;
    updates[`rooms/${roomId}/history`] = null;
    await db.ref().update(updates);
    if($("final-screen")) $("final-screen").style.display = "none";
}

function exitGame(){ location.reload(); }

async function showFinalHistoryMap() {
    const historySnap = await db.ref(`rooms/${roomId}/history`).once("value");
    if (!historySnap.exists()) return;
 
    const history = historySnap.val();
    const playersSnap = await db.ref(`rooms/${roomId}/players`).once("value");
    const players = playersSnap.val() || {};
 
    const bounds = new google.maps.LatLngBounds();
 
    Object.keys(history).forEach(roundKey => {
        const roundData = history[roundKey];
        const cLoc = roundData.correct;
        if (!cLoc) return;
        bounds.extend(new google.maps.LatLng(cLoc.lat, cLoc.lng));
        new google.maps.Marker({
            position: cLoc,
            map: map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 4, fillColor: "#22c55e", fillOpacity: 0.8, strokeColor: "white", strokeWeight: 1 }
        });
        Object.keys(roundData).forEach(uid => {
            if (uid === 'correct') return;
            const g = roundData[uid];
            const p = players[uid];
            if (g.lat && g.lng) {
                const pLoc = {lat: g.lat, lng: g.lng};
                bounds.extend(new google.maps.LatLng(g.lat, g.lng));
                new google.maps.Marker({
                    position: pLoc,
                    map: map,
                    title: `${p.name} (რაუნდი ${roundKey.split('_')[1]})`,
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 3, fillColor: "#ef4444", fillOpacity: 0.6, strokeColor: "white", strokeWeight: 1 }
                });
                new google.maps.Polyline({
                    path: [cLoc, pLoc],
                    map: map,
                    strokeColor: "#ef4444",
                    strokeOpacity: 0.2,
                    strokeWeight: 1
                });
            }
        });
    });
 
    map.fitBounds(bounds);
}

// Private Lobby-ის განახლების ფუნქცია
function updateLobbyUI(meta) {
  $('lobby-rounds').innerText = meta.rounds || 15;
  $('lobby-map').innerText = meta.mapType || "World";

  db.ref(`rooms/${roomId}/players`).on('value', snap => {
    const players = snap.val() || {};
    const playerList = $('lobby-players');
    playerList.innerHTML = '';

    let playerCount = 0;
    Object.values(players).forEach(p => {
      playerCount++;
      const div = document.createElement('div');
      div.className = 'player' + (p.isHost ? ' host' : '');
      div.innerHTML = `<span style="font-size:24px;">${p.avatar}</span> <span>${p.name}${p.isHost ? ' (Host)' : ''}</span>`;
      playerList.appendChild(div);
    });

    const needed = 2;
    if (playerCount < needed) {
      $('lobby-status').innerText = `${needed - playerCount} more player${needed - playerCount > 1 ? 's' : ''} needed to start`;
      $('lobby-start-btn').disabled = true;
      $('lobby-start-btn').style.cursor = 'not-allowed';
    } else {
      $('lobby-status').innerText = 'Ready to start!';
      $('lobby-start-btn').disabled = false;
      $('lobby-start-btn').style.cursor = 'pointer';
    }
  });
}

// Start ღილაკის მოვლენა
document.getElementById('lobby-start-btn')?.addEventListener('click', () => {
  db.ref(`rooms/${roomId}/game/meta`).update({ 
    phase: "guess", 
    currentRound: 1, 
    deadline: Date.now() + 60000 
  });
  $('private-lobby').style.display = 'none';
  $('container').style.display = 'block';
  $('ui').style.display = 'flex';
  $('scoreboard').style.display = 'flex';
  $('chat-panel').style.display = 'flex';
});

// Game Code-ის კოპირება
function copyGameCode() {
  const code = $('lobby-code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    alert('Game Code copied: ' + code);
  }).catch(err => {
    alert('Failed to copy: ' + err);
  });
}

// Edit Options (ჯერ მარტივი ალერტი, მერე დავამატებთ პანელს)
function editPrivateOptions() {
  alert('Edit Options: რაუნდები, ტაიმერი, No Move, Map Change - მალე დაემატება სრული პანელი');
}
// Edit Options გახსნა
function editPrivateOptions() {
  $('edit-options-popup').style.display = 'flex';

  // წინა მნიშვნელობების ჩატვირთვა
  db.ref(`rooms/${roomId}/meta`).once('value').then(snap => {
    const meta = snap.val() || {};
    $('options-rounds').value = meta.rounds || 15;
    $('options-time').value = meta.timePerRound || 60;
    $('options-no-move').checked = meta.noMove || false;
    $('options-map').value = meta.mapType || "World";
  });
}

// Close X
function closeEditOptions() {
  $('edit-options-popup').style.display = 'none';
}

// +/- ღილაკები
function changeOption(type, delta) {
  if (type === 'rounds') {
    const input = $('options-rounds');
    input.value = Math.max(1, parseInt(input.value) + delta);
  } else if (type === 'time') {
    const input = $('options-time');
    input.value = Math.max(10, parseInt(input.value) + delta);
  }
}

// Save
async function savePrivateOptions() {
  await db.ref(`rooms/${roomId}/meta`).update({
    rounds: parseInt($('options-rounds').value),
    timePerRound: parseInt($('options-time').value),
    noMove: $('options-no-move').checked,
    mapType: $('options-map').value
  });
  closeEditOptions();
  // განახლება ლობიში
  db.ref(`rooms/${roomId}/meta`).once('value').then(meta => updateLobbyUI(meta.val()));
}

// Online Users in Main Menu
function showOnlineCount() {
  db.ref('online').on('value', snap => {
    const count = snap.numChildren();
    // დაამატე ელემენტი მენიუში, მაგ. global-top-ის გვერდით
    const onlineDiv = document.createElement('div');
    onlineDiv.innerText = `Online: ${count}`;
    onlineDiv.style = "color: #f5a623; font-size: 14px; margin-top: 10px;";
    $('post-auth').appendChild(onlineDiv);
  });
}

// Presence for Online Count
function setPresence() {
  const presenceRef = db.ref('online/' + userData.uid);
  presenceRef.set(true);
  presenceRef.onDisconnect().remove();
}

// გამოიძახე load-ზე
window.addEventListener('load', () => {
  if (userData) setPresence();
  showOnlineCount();
});
