let board = null;
let game = new Chess();
let currentReport = null;
let currentPlyIndex = 0; // 0 = initial position
let currentPlatform = "chesscom";
let boardOrientation = "white"; // follows the user's color
let lastArrow = null; // {from, to} for redraws (e.g. after flipping)
let lastAnalyzedPgn = null; // to reload the same game when language changes
let lastAnalyzedUser = "";

const audioPlayer = document.getElementById("coachAudio");
const playAudioBtn = document.getElementById("playAudioBtn");
const playAudioIcon = document.getElementById("playAudioIcon");
const autoPlayToggle = document.getElementById("autoPlayToggle");
let isAudioPlaying = false;
let currentSpeechText = "";

// Classification mapping for styling (labels switch with language)
const clsMapEN = {
    "brilliant": { label: "Brilliant!", colorClass: "bg-brilliant", icon: "fa-gem" },
    "great": { label: "Great", colorClass: "bg-great", icon: "fa-star" },
    "best": { label: "Best", colorClass: "bg-best", icon: "fa-check" },
    "excellent": { label: "Excellent", colorClass: "bg-excellent", icon: "fa-thumbs-up" },
    "good": { label: "Good", colorClass: "bg-good", icon: "fa-thumbs-up" },
    "book": { label: "Book", colorClass: "bg-book", icon: "fa-book" },
    "inaccuracy": { label: "Inaccuracy", colorClass: "bg-inaccuracy", icon: "fa-question" },
    "mistake": { label: "Mistake", colorClass: "bg-mistake", icon: "fa-exclamation" },
    "blunder": { label: "Blunder", colorClass: "bg-blunder", icon: "fa-times" },
    "missed_win": { label: "Missed win", colorClass: "bg-missed_win", icon: "fa-minus-circle" }
};
const clsMapES = {
    "brilliant": { label: "¡Brillante!", colorClass: "bg-brilliant", icon: "fa-gem" },
    "great": { label: "Gran Jugada", colorClass: "bg-great", icon: "fa-star" },
    "best": { label: "Mejor Jugada", colorClass: "bg-best", icon: "fa-check" },
    "excellent": { label: "Excelente", colorClass: "bg-excellent", icon: "fa-thumbs-up" },
    "good": { label: "Buena", colorClass: "bg-good", icon: "fa-thumbs-up" },
    "book": { label: "Libro", colorClass: "bg-book", icon: "fa-book" },
    "inaccuracy": { label: "Imprecisión", colorClass: "bg-inaccuracy", icon: "fa-question" },
    "mistake": { label: "Error", colorClass: "bg-mistake", icon: "fa-exclamation" },
    "blunder": { label: "Grave Error", colorClass: "bg-blunder", icon: "fa-times" },
    "missed_win": { label: "Victoria Perdida", colorClass: "bg-missed_win", icon: "fa-minus-circle" }
};
const clsMap = clsMapEN;

function getLang() {
    const v = ($("#langSelect").val() || "en").toLowerCase();
    return v.startsWith("es") ? "es" : "en";
}

// Per-browser settings. The server settings endpoint is read-only in prod,
// so each visitor keeps their own preferences locally.
const LS_SETTINGS_KEY = "deuthe_chessai_settings";

function loadLocalSettings() {
    try {
        return JSON.parse(localStorage.getItem(LS_SETTINGS_KEY) || "{}") || {};
    } catch (e) {
        return {};
    }
}

function saveLocalSettings(obj) {
    try {
        const cur = loadLocalSettings();
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(Object.assign(cur, obj)));
    } catch (e) { /* ignore */ }
}

// Static UI strings (chrome only; coach content comes from the backend report).
const I18N = {
    en: {
        search_ph: "Username...", search_btn: "Search",
        recent_games: "Recent games",
        moves_empty: "Moves will appear here after analysis...",
        loader_text: "Analyzing the game with Stockfish...",
        loader_sub: "This can take a couple of minutes depending on depth",
        match_select: "Select a game",
        coach_default: "Analyzing the position...",
        audio_hint: "Listen to commentary", auto_voice: "Auto-voice",
        listen_summary: "Listen to game recap",
        qa_title: "Ask the coach", qa_ph: "Why is this move bad?",
        pgn_title: "Analyze manual PGN", pgn_ph: "Paste the game PGN here...",
        btn_cancel: "Cancel", btn_analyze: "Analyze game",
        depth_8: "Depth 8 · fast", depth_12: "Depth 12",
        depth_14: "Depth 14", depth_16: "Depth 16 · slow",
        about_title: "Why ChessAI Coach",
        about_p1: "Free game review for club players: no account, no subscription.",
        about_li1: "Engine truth from <strong>Stockfish</strong>, the open source engine (GPLv3).",
        about_li2: "Coach explains every move in <strong>English and Spanish</strong>, including why bad moves are bad.",
        about_li3: "Spoken commentary with <strong>karaoke subtitles</strong> and selectable voices.",
        about_li4: "Ask-the-coach Q&A over your analyzed game, plus accuracy tracking.",
        about_li5: "Adjustable engine depth, Chess.com and Lichess import, board preview arrows.",
        about_fine: "Evaluations by Stockfish (GPLv3, official-stockfish/Stockfish on GitHub). Analysis engine <code>python-chess</code> (GPLv3). This app is free software, see LICENSE. Spoken audio uses the Microsoft Edge TTS service.",
        about_close: "Got it"
    },
    es: {
        search_ph: "Usuario...", search_btn: "Buscar",
        recent_games: "Partidas recientes",
        moves_empty: "Las jugadas apareceran aqui tras el analisis...",
        loader_text: "Analizando la partida con Stockfish...",
        loader_sub: "Esto puede tardar un par de minutos segun la profundidad",
        match_select: "Selecciona una partida",
        coach_default: "Analizando la posicion...",
        audio_hint: "Escuchar comentario", auto_voice: "Auto-voz",
        listen_summary: "Escuchar resumen de la partida",
        qa_title: "Pregunta al entrenador", qa_ph: "Por que es mala esta jugada?",
        pgn_title: "Analizar PGN manual", pgn_ph: "Pega aqui el PGN de la partida...",
        btn_cancel: "Cancelar", btn_analyze: "Analizar partida",
        depth_8: "Prof. 8 · rapido", depth_12: "Prof. 12",
        depth_14: "Prof. 14", depth_16: "Prof. 16 · lento",
        about_title: "Por que ChessAI Coach",
        about_p1: "Revision gratuita para jugadores de club: sin cuenta ni suscripcion.",
        about_li1: "Verdad del motor <strong>Stockfish</strong>, de codigo abierto (GPLv3).",
        about_li2: "El entrenador explica cada jugada en <strong>ingles y espanol</strong>, incluido por que una jugada es mala.",
        about_li3: "Comentario hablado con <strong>subtitulos tipo karaoke</strong> y voces seleccionables.",
        about_li4: "Preguntas al entrenador sobre tu partida analizada y seguimiento de precision.",
        about_li5: "Profundidad ajustable, importacion de Chess.com y Lichess, flechas de vista previa.",
        about_fine: "Evaluaciones por Stockfish (GPLv3, official-stockfish/Stockfish en GitHub). Motor de analisis <code>python-chess</code> (GPLv3). Este programa es software libre, ver LICENSE. El audio usa el servicio TTS de Microsoft Edge.",
        about_close: "Entendido"
    }
};

function applyI18n() {
    const t = I18N[getLang()] || I18N.en;
    $("[data-i18n]").each(function () {
        const k = $(this).data("i18n");
        if (t[k] != null) $(this).text(t[k]);
    });
    $("[data-i18n-html]").each(function () {
        const k = $(this).data("i18n-html");
        if (t[k] != null) $(this).html(t[k]);
    });
    $("[data-i18n-ph]").each(function () {
        const k = $(this).data("i18n-ph");
        if (t[k] != null) $(this).attr("placeholder", t[k]);
    });
}

function clsFor(c) {
    const table = getLang() === "es" ? clsMapES : clsMapEN;
    return table[c] || table["good"];
}

function sanFor(m) {
    if (!m) return "";
    if (getLang() === "es") return m.san_es || m.san || "";
    return m.san_en || m.san || "";
}

function bestFor(m) {
    if (!m) return "";
    if (getLang() === "es") return m.best_move_san_es || m.best_move_san || "";
    return m.best_move_san_en || m.best_move_san || "";
}

function lineFor(m) {
    if (!m) return [];
    if (getLang() === "es") return m.best_line_san_es || m.best_line_san || [];
    return m.best_line_san_en || m.best_line_san || [];
}

function showLoader(text) {
    if (text) $("#loaderText").text(text);
    const ov = $("#loaderOverlay");
    ov.removeClass("hidden");
    ov.addClass("flex");
}

function hideLoader() {
    const ov = $("#loaderOverlay");
    ov.addClass("hidden");
    ov.removeClass("flex");
}

function showSidebar() {
    const sb = $("#sidebarGames");
    sb.removeClass("hidden");
    sb.css("display", "flex");
}

// decodeURIComponent is only safe on actually-encoded strings.
// Game list stores raw PGN in closures now, but history/manual flows may
// pass encoded strings: try to decode, fall back to raw on failure.
function safeDecodePgn(pgnRaw) {
    if (pgnRaw === null || pgnRaw === undefined) return "";
    const s = String(pgnRaw);
    if (!s.includes("%")) return s;
    try {
        return decodeURIComponent(s);
    } catch (e) {
        return s;
    }
}

function normalizeAudioUrl(url) {
    if (!url) return url;
    // Backward compat: reports saved with v1.0.1 used /static/audio_cache/...
    // which is still served via legacy mount, but normalize to the new path.
    url = url.replace("/static/audio_cache/", "/audio_cache/");
    // Split hosting (Pages frontend, NUC backend): make relative URLs absolute.
    if (url.startsWith("/") && BACKEND_URL) return BACKEND_URL + url;
    return url;
}

// Split-hosting config: empty means same origin (local run.py).
// For GitHub Pages, index.html sets window.CHESSAI_BACKEND before app.js loads.
const BACKEND_URL = (window.CHESSAI_BACKEND || "").replace(/\/$/, "");
function api(path) {
    return BACKEND_URL + path;
}

async function apiErrorMessage(res, fallback) {
    try {
        const data = await res.json();
        if (data && data.detail) return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch (e) {
        try {
            const t = await res.text();
            if (t) return t.slice(0, 300);
        } catch (e2) { /* ignore */ }
    }
    return fallback || ("Error HTTP " + res.status);
}

function escapeHtml(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ---- Subtitles (karaoke captions for coach narration) ----
let subsCache = {};   // subs json url -> {text, words} | null
let subsTimed = null; // {words, idx} when word timings are available
let subsPlain = null; // {map:[{s,e}], idx} for Web Speech fallback

async function showSubtitles(audioUrl, text) {
    const bar = $("#subtitleBar"), p = $("#subtitleText");
    subsTimed = null;
    subsPlain = null;
    bar.removeClass("hidden");
    let words = null;
    if (audioUrl && audioUrl.endsWith(".mp3")) {
        const jurl = audioUrl.replace(/\.mp3$/, ".json");
        try {
            if (!Object.prototype.hasOwnProperty.call(subsCache, jurl)) {
                const r = await fetch(jurl);
                subsCache[jurl] = r.ok ? await r.json() : null;
            }
            const data = subsCache[jurl];
            if (data && data.words && data.words.length) words = data.words;
        } catch (e) { /* plain-text fallback below */ }
    }
    p.empty();
    if (words) {
        words.forEach((w, i) => {
            p.append($("<span>").addClass("sub-word").attr("data-i", i).text((w.w || "") + " "));
        });
        subsTimed = { words: words, idx: -1 };
    } else {
        buildPlainSubs(p, text || "");
    }
}

function buildPlainSubs(p, text) {
    const map = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        map.push({ s: m.index, e: m.index + m[0].length });
        p.append($("<span>").addClass("sub-word").text(m[0] + " "));
    }
    subsPlain = { map: map, idx: -1 };
}

function hideSubtitles() {
    $("#subtitleBar").addClass("hidden");
    $("#subtitleText").empty();
    subsTimed = null;
    subsPlain = null;
}

function subsHighlight(i) {
    const spans = $("#subtitleText .sub-word");
    if (!spans.length) return;
    spans.removeClass("active");
    if (i >= 0 && i < spans.length) {
        const el = $(spans[i]).addClass("active");
        const bar = $("#subtitleBar");
        try { bar.scrollTop(el[0].offsetTop - bar.innerHeight() / 2); } catch (e) { /* ignore */ }
    }
}

function subsHighlightTimed(t) {
    if (!subsTimed) return;
    const words = subsTimed.words;
    let i = subsTimed.idx;
    if (i >= 0 && i < words.length && t < words[i].start - 0.05) {
        // seeked backwards: binary search
        let lo = 0, hi = words.length - 1, ans = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (words[mid].start <= t) { ans = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        i = ans;
    } else {
        while (i + 1 < words.length && words[i + 1].start <= t) i++;
    }
    if (i !== subsTimed.idx) {
        subsTimed.idx = i;
        subsHighlight(i);
    }
}

function subsHighlightChar(charIndex) {
    if (!subsPlain || charIndex === undefined || charIndex === null) return;
    const map = subsPlain.map;
    let i = subsPlain.idx;
    if (i >= 0 && i < map.length && charIndex < map[i].s) i = 0;
    if (i < 0) i = 0;
    while (i + 1 < map.length && map[i + 1].s <= charIndex) i++;
    while (i > 0 && map[i].s > charIndex) i--;
    if (i !== subsPlain.idx && charIndex >= map[i].s && charIndex < map[i].e + 1) {
        subsPlain.idx = i;
        subsHighlight(i);
    }
}

// Piece sprites are vendored locally (no CDN dependency). If the local
// files are ever missing, fall back to the chessboardjs.com CDN at runtime.
const LOCAL_PIECE_THEME = 'img/chesspieces/wikipedia/{piece}.png';
const REMOTE_PIECE_THEME = 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png';
let pieceTheme = LOCAL_PIECE_THEME;

function initBoard() {
    board = Chessboard('board', {
        pieceTheme: pieceTheme,
        position: 'start',
        showNotation: true,
        orientation: boardOrientation
    });
}

$(document).ready(function() {
    // Wrap the board so the best-move arrow overlay aligns with it.
    if (!$("#boardWrap").length) {
        $("#board").wrap('<div id="boardWrap"></div>');
        $("#boardWrap").append('<svg id="arrowLayer" viewBox="0 0 800 800" preserveAspectRatio="none"></svg>');
    }
    // Probe the local sprite; fall back to CDN if missing.
    const probe = new Image();
    probe.onload = () => { initBoard(); };
    probe.onerror = () => { pieceTheme = REMOTE_PIECE_THEME; initBoard(); };
    probe.src = 'img/chesspieces/wikipedia/wK.png';

    $(window).resize(() => { if (board) board.resize(); });

    // Event Listeners
    $("#fetchGamesBtn").click(fetchGames);
    $("#usernameInput").keypress(function(e) { if(e.which === 13) fetchGames(); });

    $("#platformChesscom").click(() => setPlatform("chesscom"));
    $("#platformLichess").click(() => setPlatform("lichess"));

    $("#importPgnBtn").click(() => $("#pgnModal").removeClass("hidden"));
    $("#cancelPgnBtn").click(() => $("#pgnModal").addClass("hidden"));
    $("#showAboutBtn").click(() => $("#aboutModal").removeClass("hidden"));
    $("#closeAboutBtn").click(() => $("#aboutModal").addClass("hidden"));
    $("#analyzePgnBtn").click(analyzeManualPgn);
    $("#showHistoryBtn").click(fetchHistory);

    $("#voiceSelect").change(saveSettingsFromUI);
    $("#langSelect").change(async () => {
        // Switch default voice with language, then save.
        const lang = getLang();
        const v = $("#voiceSelect").val() || "";
        const esVoices = ["alvaro", "elvira", "jorge", "tomas", "gonzalo"];
        const enVoices = ["aria", "guy", "jenny"];
        if (lang === "es" && enVoices.includes(v)) $("#voiceSelect").val("alvaro");
        if (lang === "en" && esVoices.includes(v)) $("#voiceSelect").val("aria");
        saveSettingsFromUI();
        applyI18n();
        // Refresh labels/notation now, then reload the report in the new language.
        if (currentReport) {
            setupUIForReport(currentReport);
            goToMove(currentPlyIndex);
        }
        if (lastAnalyzedPgn) {
            await analyzeGame(lastAnalyzedPgn, lastAnalyzedUser, true);
        }
    });
    $("#depthSelect").change(saveSettingsFromUI);
    autoPlayToggle.addEventListener("change", saveSettingsFromUI);

    $("#qaSendBtn").click(sendQuestion);
    $("#qaInput").keypress(function(e) { if(e.which === 13) sendQuestion(); });

    $("#flipBoardBtn").click(() => {
        if (!board) return;
        boardOrientation = boardOrientation === "white" ? "black" : "white";
        board.orientation(boardOrientation);
        if (lastArrow) drawBestArrow(lastArrow.from, lastArrow.to);
    });

    // Navigation
    $("#btnStart").click(() => goToMove(0));
    $("#btnPrev").click(() => goToMove(currentPlyIndex - 1));
    $("#btnNext").click(() => goToMove(currentPlyIndex + 1));
    $("#btnEnd").click(() => {
        if(currentReport) goToMove(currentReport.moves.length);
    });

    // Click on a move in the move list jumps there
    $("#moveList").on("click", ".move-token", function() {
        const ply = parseInt($(this).data("ply"), 10);
        if (!isNaN(ply)) goToMove(ply);
    });

    // Keyboard navigation (Left / Right arrows)
    $(document).keydown(function(e) {
        if(!currentReport) return;
        // Don't hijack arrows while typing in inputs
        if ($(e.target).is("input, textarea, select")) return;
        if(e.which === 37) {
            goToMove(currentPlyIndex - 1);
            e.preventDefault();
        } else if(e.which === 39) {
            goToMove(currentPlyIndex + 1);
            e.preventDefault();
        }
    });

    // Audio controls
    playAudioBtn.addEventListener("click", () => {
        if (isAudioPlaying) {
            stopAudio();
        } else {
            playCurrentCommentary();
        }
    });

    audioPlayer.addEventListener("ended", () => {
        isAudioPlaying = false;
        playAudioIcon.className = "fas fa-play";
        hideSubtitles();
    });

    audioPlayer.addEventListener("timeupdate", () => {
        subsHighlightTimed(audioPlayer.currentTime);
    });

    $("#playSummaryBtn").click(() => {
        if (!currentReport || !currentReport.summary) return;
        const s = currentReport.summary;
        if (s.audio_url) {
            playAudioUrl(normalizeAudioUrl(s.audio_url), s.voice_script);
        } else if (s.voice_script) {
            currentSpeechText = s.voice_script;
            speakText(s.voice_script);
        }
    });

    // Load settings + voices, then initial fetch
    applyI18n();
    initSettings().finally(fetchGames);
});

function setPlatform(p) {
    currentPlatform = p;
    const on = ["bg-green-600", "text-white"];
    const off = ["text-gray-300"];
    if (p === "chesscom") {
        $("#platformChesscom").addClass(on.join(" ")).removeClass(off.join(" "));
        $("#platformLichess").removeClass(on.join(" ")).addClass(off.join(" "));
    } else {
        $("#platformLichess").addClass(on.join(" ")).removeClass(off.join(" "));
        $("#platformChesscom").removeClass(on.join(" ")).addClass(off.join(" "));
    }
    // Reload the game list right away when a username is already set.
    const u = $("#usernameInput").val().trim();
    if (u) fetchGames();
}

async function initSettings() {
    try {
        const [voicesRes, settingsRes] = await Promise.all([
            fetch(api("/api/voices")).catch(() => null),
            fetch(api("/api/settings")).catch(() => null)
        ]);
        let voices = null;
        if (voicesRes && voicesRes.ok) voices = await voicesRes.json();
        let settings = null;
        if (settingsRes && settingsRes.ok) settings = await settingsRes.json();

        const sel = $("#voiceSelect");
        sel.empty();
        if (voices) {
            Object.keys(voices).forEach(key => {
                const v = voices[key];
                sel.append(`<option value="${escapeHtml(key)}">${escapeHtml(v.name)}</option>`);
            });
        } else {
            sel.append(`<option value="alvaro">Álvaro</option>`);
        }
        if (settings) {
            if (settings.username) $("#usernameInput").val(settings.username);
            if (settings.voice) sel.val(settings.voice);
            if (settings.depth) $("#depthSelect").val(String(settings.depth));
            if (settings.lang) $("#langSelect").val(settings.lang);
            if (typeof settings.auto_play_audio === "boolean") autoPlayToggle.checked = settings.auto_play_audio;
        }
        // Local (per-browser) settings win over server defaults.
        const local = loadLocalSettings();
        if (local.username) $("#usernameInput").val(local.username);
        if (local.voice) sel.val(local.voice);
        if (local.depth) $("#depthSelect").val(String(local.depth));
        if (local.lang) $("#langSelect").val(local.lang);
        if (typeof local.auto_play_audio === "boolean") autoPlayToggle.checked = local.auto_play_audio;
        if (!sel.val()) sel.val(getLang() === "es" ? "alvaro" : "aria");
        applyI18n();
    } catch (e) {
        console.log("No se pudieron cargar los ajustes:", e);
    }
}

let settingsSaveTimer = null;
function saveSettingsFromUI() {
    clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(async () => {
        const payload = {
            username: $("#usernameInput").val().trim(),
            voice: $("#voiceSelect").val(),
            depth: parseInt($("#depthSelect").val(), 10),
            auto_play_audio: autoPlayToggle.checked,
            lang: getLang()
        };
        // Always persist locally (works on the read-only public deployment).
        saveLocalSettings(payload);
        try {
            await fetch(api("/api/settings"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            // Server settings are read-only in prod; local storage already saved.
            console.log("Ajustes guardados localmente:", e);
        }
    }, 300);
}

async function fetchGames() {
    const username = $("#usernameInput").val().trim();
    if (!username) return;
    saveSettingsFromUI();

    const btn = $("#fetchGamesBtn");
    btn.text("...").prop("disabled", true);

    try {
        const endpoint = currentPlatform === "lichess"
            ? api(`/api/games/lichess/${encodeURIComponent(username)}?limit=15`)
            : api(`/api/games/chesscom/${encodeURIComponent(username)}?limit=15`);
        const res = await fetch(endpoint);
        if(!res.ok) throw new Error(await apiErrorMessage(res, "Error al obtener partidas"));
        const data = await res.json();

        showSidebar();
        const list = $("#gamesList");
        list.empty();

        if (!data.games || data.games.length === 0) {
            list.append("<div class='p-3 text-sm text-gray-400'>No se encontraron partidas recientes.</div>");
            $("#gameCountLabel").text("");
            return;
        }

        $("#gameCountLabel").text(data.games.length + " partidas");

        data.games.forEach(g => {
            const resultColor = g.status === 'win' ? 'text-green-500' : (g.status === 'loss' ? 'text-red-500' : 'text-gray-400');
            const resultText = g.status === 'win' ? 'Victoria' : (g.status === 'loss' ? 'Derrota' : 'Tablas');
            const oppName = g.opponent_name || 'Rival';
            const dateStr = g.end_time ? new Date(g.end_time * 1000).toLocaleDateString() : '';

            const el = $(`
                <div class="p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors game-item">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-bold text-gray-300">vs ${escapeHtml(oppName)} (${escapeHtml(String(g.opponent_rating || "?"))})</span>
                        <span class="text-[10px] uppercase font-bold bg-gray-600 px-1 rounded">${escapeHtml(g.time_class || "")}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold ${resultColor}">${resultText}</span>
                        <span class="text-xs text-gray-500">${escapeHtml(dateStr)}</span>
                    </div>
                </div>
            `);
            // NOTE: use closure for PGN (no data-pgn attribute: PGNs are large
            // and break HTML attributes / need double encoding).
            el.click(() => analyzeGame(g.pgn, username));
            list.append(el);
        });

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.text("Buscar").prop("disabled", false);
    }
}

async function analyzeManualPgn() {
    const pgn = $("#pgnInput").val();
    if(!pgn || !pgn.trim()) return;
    $("#pgnModal").addClass("hidden");
    await analyzeGame(pgn, $("#usernameInput").val().trim());
}

async function analyzeGame(pgnRaw, username, keepPly = false) {
    const pgn = safeDecodePgn(pgnRaw);
    if(!pgn || !pgn.trim()) { alert("PGN vacío."); return; }

    const prevPly = keepPly ? currentPlyIndex : 0;
    // Remember the game so a language switch can reload it translated.
    lastAnalyzedPgn = pgn;
    lastAnalyzedUser = username || "";

    // Show Loader
    showLoader("Analizando la partida con Stockfish...");
    $("#accuracyContainer").addClass("hidden");
    $("#matchTitle").text("Analizando con Stockfish...");
    stopAudio();
    currentReport = null;

    try {
        const res = await fetch(api("/api/analyze"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pgn: pgn,
                user_name: username,
                depth: parseInt($("#depthSelect").val(), 10) || 12,
                voice: $("#voiceSelect").val() || (getLang() === "es" ? "alvaro" : "aria"),
                generate_all_audio: false,
                lang: getLang()
            })
        });

        if(!res.ok) throw new Error(await apiErrorMessage(res, "Error en el análisis"));
        const report = await res.json();

        // Normalize audio URLs (backward compat with old cached reports)
        if (report.moves) report.moves.forEach(m => { if (m.audio_url) m.audio_url = normalizeAudioUrl(m.audio_url); });
        if (report.summary && report.summary.audio_url) report.summary.audio_url = normalizeAudioUrl(report.summary.audio_url);

        currentReport = report;
        setupUIForReport(report);
        goToMove(Math.min(prevPly, report.moves.length));

    } catch(e) {
        alert("Error en análisis: " + e.message);
    } finally {
        hideLoader();
    }
}

function setupUIForReport(report) {
    const meta = report.meta;
    // Header shows colors explicitly + marks the user's side with a TÚ tag.
    const you = meta.user_color === "black" ? "black" : "white";
    $("#matchTitle").html(
        `<span class="dot dot-w"></span> ${escapeHtml(meta.white)}${you === "white" ? ' <span class="you-tag">TÚ</span>' : ""} ` +
        `<span class="vs">vs</span> ` +
        `<span class="dot dot-b"></span> ${escapeHtml(meta.black)}${you === "black" ? ' <span class="you-tag">TÚ</span>' : ""}`
    );

    // Orient the board to the user's color (Black players see Black at bottom).
    boardOrientation = meta.user_color === "black" ? "black" : "white";
    if (board) board.orientation(boardOrientation);

    applyAccuracy(meta);

    $("#playSummaryBtn").removeClass("hidden");
    renderMoveList();
}

// Accuracy rings: fill reflects the %, border shows who is ahead
// (green = higher, red = lower, gold = tied).
function applyAccuracy(meta) {
    $("#accuracyContainer").removeClass("hidden");
    const w = meta.white_accuracy || 0;
    const b = meta.black_accuracy || 0;
    $("#whiteAccuracy").text(`${w}%`);
    $("#blackAccuracy").text(`${b}%`);
    $("#whiteNameLabel").html(`${escapeHtml(meta.white)}${meta.user_color === "white" ? ' <span class="you-tag">TÚ</span>' : ""}`);
    $("#blackNameLabel").html(`${escapeHtml(meta.black)}${meta.user_color === "black" ? ' <span class="you-tag">TÚ</span>' : ""}`);
    const paint = (el, pct, cmp) => {
        const color = cmp > 0 ? "#22c55e" : (cmp < 0 ? "#ef4444" : "#facc15");
        el.css("background", `conic-gradient(${color} 0 ${pct}%, rgba(255,255,255,0.08) ${pct}% 100%)`);
        el.css("border-color", color);
    };
    paint($("#whiteAccuracy"), Math.max(0, Math.min(100, w)), Math.sign(w - b));
    paint($("#blackAccuracy"), Math.max(0, Math.min(100, b)), Math.sign(b - w));
}

function renderMoveList() {
    const box = $("#moveList");
    box.empty();
    if (!currentReport || !currentReport.moves || currentReport.moves.length === 0) {
        box.append('<span class="text-gray-500 text-xs font-sans">Sin jugadas.</span>');
        return;
    }
    currentReport.moves.forEach((m) => {
        if (m.color === "white") {
            box.append(`<span class="text-gray-500 mr-1">${m.move_number}.</span>`);
        }
        const cls = clsFor(m.classification);
        const bestSan = bestFor(m);
        box.append(`<span class="move-token tok-${m.classification} hover:bg-gray-600 rounded px-1 cursor-pointer" data-ply="${m.ply}" data-cls="${m.classification}" title="${escapeHtml(m.label || cls.label)} · Best: ${escapeHtml(bestSan)}">${escapeHtml(sanFor(m))}</span> `);
    });
}

function markMoveListActive() {
    $("#moveList .move-token").each(function() {
        const ply = parseInt($(this).data("ply"), 10);
        if (ply === currentPlyIndex) {
            $(this).addClass("bg-green-700 text-white");
        } else {
            $(this).removeClass("bg-green-700 text-white");
        }
    });
    const active = $("#moveList .move-token.bg-green-700");
    if (active.length) active[0].scrollIntoView({ block: "nearest", inline: "nearest" });
}

function clearBoardHighlights() {
    $("#board .square-55d63").css("background", "");
}

function clearArrow() {
    $("#arrowLayer").empty();
}

// Best move only. The coach text already explains the point in words,
// and the board arrow shows the squares, so no move list is needed.
function fmtBestLine(line, moveNumber, color) {
    if (!line || !line.length) return "";
    const m = line[0];
    if (color === "black") return `${moveNumber}... ${m}`;
    return `${moveNumber}. ${m}`;
}

// Board is white-oriented by default; formulas below flip when the user
// plays Black (orientation is set from report.meta.user_color).
function squareCenter(sq) {
    const f = sq.charCodeAt(0) - 97; // a -> 0
    const r = parseInt(sq[1], 10);   // 1..8
    if (boardOrientation === "black") {
        return { x: (7 - f + 0.5) * 100, y: (r - 0.5) * 100 };
    }
    return { x: (f + 0.5) * 100, y: (8 - r + 0.5) * 100 };
}

function drawBestArrow(fromSq, toSq) {
    clearArrow();
    if (!fromSq || !toSq || fromSq === toSq) return;
    const a = squareCenter(fromSq), b = squareCenter(toSq);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (!(len > 1)) return;
    const ux = dx / len, uy = dy / len;
    const tipX = b.x - ux * 26, tipY = b.y - uy * 26;
    const tailX = a.x + ux * 22, tailY = a.y + uy * 22;
    const headLen = 36, headW = 24;
    const baseX = tipX - ux * headLen, baseY = tipY - uy * headLen;
    const px = -uy, py = ux;
    const f1 = (v) => Math.round(v * 10) / 10;
    $("#arrowLayer").html(
        `<line x1="${f1(tailX)}" y1="${f1(tailY)}" x2="${f1(baseX)}" y2="${f1(baseY)}" stroke="#22c55e" stroke-width="15" stroke-linecap="round" opacity="0.7"/>` +
        `<polygon points="${f1(tipX)},${f1(tipY)} ${f1(baseX + px * headW / 2)},${f1(baseY + py * headW / 2)} ${f1(baseX - px * headW / 2)},${f1(baseY - py * headW / 2)}" fill="#22c55e" opacity="0.85"/>`
    );
}

function highlightSquares(fromSq, toSq, bestFrom, bestTo) {
    clearBoardHighlights();
    if (fromSq) $(`#board .square-${fromSq}`).css("background", "rgba(129, 182, 76, 0.6)");
    if (toSq) $(`#board .square-${toSq}`).css("background", "rgba(129, 182, 76, 0.6)");
    // Best-move hint: subtle outline on origin square
    if (bestFrom && bestFrom !== fromSq) $(`#board .square-${bestFrom}`).css("background", "rgba(243, 194, 91, 0.45)");
}

function updateEvalBar(cp) {
    if(cp === null || cp === undefined) return;

    let text = "";
    if (Math.abs(cp) > 5000) {
        const mate = Math.ceil((10000 - Math.abs(cp)) / 10.0);
        text = cp > 0 ? `M${mate}` : `-M${mate}`;
    } else {
        const v = cp / 100.0;
        text = v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
    }

    $("#evalText").text(text);

    let percent = 50 + 50 * (2.0 / (1.0 + Math.exp(-0.00368208 * cp)) - 1.0);
    percent = Math.max(0, Math.min(100, percent));

    $("#evalBarFill").css("height", `${percent}%`);
}

function goToMove(plyIndex) {
    if(!currentReport || !board) return;
    if(plyIndex < 0) plyIndex = 0;
    if(plyIndex > currentReport.moves.length) plyIndex = currentReport.moves.length;

    currentPlyIndex = plyIndex;

    $("#moveCounter").text(`${plyIndex} / ${currentReport.moves.length}`);

    // Disable/Enable navigation buttons
    $("#btnStart, #btnPrev").prop("disabled", plyIndex === 0);
    $("#btnEnd, #btnNext").prop("disabled", plyIndex === currentReport.moves.length);

    stopAudio();
    markMoveListActive();

    // Initial board state
    if(plyIndex === 0) {
        board.position('start');
        const eval_val = currentReport.eval_history[0].eval_cp;
        updateEvalBar(eval_val);
        clearBoardHighlights();
        clearArrow();
        lastArrow = null;

        $("#moveHeader").addClass("hidden");
        $("#coachMessageContainer").addClass("hidden");
        return;
    }

    const moveData = currentReport.moves[plyIndex - 1];

    // Update Board position
    board.position(moveData.fen_after);
    updateEvalBar(moveData.eval_cp);
    highlightSquares(moveData.from_sq, moveData.to_sq, moveData.best_move_from, moveData.best_move_to);
    // Green arrow = where the engine preferred, but ONLY on real errors.
    // Book/best moves show no arrow: in the opening several theory moves are
    // valid and an engine micro-preference would contradict the "book" label.
    if (["inaccuracy", "mistake", "blunder", "missed_win"].includes(moveData.classification)
        && moveData.best_move_uci && moveData.best_move_uci !== moveData.uci) {
        lastArrow = { from: moveData.best_move_from, to: moveData.best_move_to };
        drawBestArrow(lastArrow.from, lastArrow.to);
    } else {
        lastArrow = null;
        clearArrow();
    }

    // Update Coach Panel
    $("#moveHeader").removeClass("hidden");
    $("#coachMessageContainer").removeClass("hidden");

    const cls = clsFor(moveData.classification);

    const badge = $("#moveClassificationLabel");
    badge.attr("class", `px-3 py-1 rounded-full text-xs font-bold ${cls.colorClass} shadow`);
    badge.html(`<i class="fas ${cls.icon} mr-1"></i> ${escapeHtml(moveData.label || cls.label)}`);

    $("#moveSanDisplay").text(sanFor(moveData));
    $("#coachText").text(moveData.commentary.detailed);

    // Best-move chip (move only, the point is in the coach text).
    const lineTxt = fmtBestLine(lineFor(moveData), moveData.move_number, moveData.color);
    if (lineTxt && ["inaccuracy", "mistake", "blunder", "missed_win"].includes(moveData.classification)) {
        $("#bestLineMoves").text(lineTxt);
        $("#bestLineTag").text(getLang() === "es" ? "La buena" : "Best");
        $("#bestLineRow").removeClass("hidden");
    } else {
        $("#bestLineRow").addClass("hidden");
    }

    currentSpeechText = moveData.commentary.voice || moveData.commentary.detailed;

    // Audio execution
    $("#playAudioBtn").prop("disabled", false);

    if(autoPlayToggle.checked) {
        playCurrentCommentary();
    }
}

async function playCurrentCommentary() {
    if(!currentReport || currentPlyIndex === 0) return;
    const moveData = currentReport.moves[currentPlyIndex - 1];

    if (moveData.audio_url) {
        playAudioUrl(normalizeAudioUrl(moveData.audio_url));
    } else {
        // Request on-demand TTS from backend or fallback to Web Speech
        try {
            playAudioIcon.className = "fas fa-spinner fa-spin";
            const res = await fetch(api("/api/tts"), {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ text: currentSpeechText, voice: $("#voiceSelect").val() || (getLang() === "es" ? "alvaro" : "aria"), lang: getLang() })
            });
            if (res.ok) {
                const data = await res.json();
                moveData.audio_url = normalizeAudioUrl(data.audio_url);
                playAudioUrl(moveData.audio_url);
            } else {
                speakText(currentSpeechText);
            }
        } catch (e) {
            speakText(currentSpeechText);
        }
    }
}

function playAudioUrl(url, text) {
    if(!url) return;
    showSubtitles(url, text !== undefined ? text : currentSpeechText);
    try {
        audioPlayer.src = url;
        const p = audioPlayer.play();
        if (p && p.then) {
            p.then(() => {
                isAudioPlaying = true;
                playAudioIcon.className = "fas fa-pause";
            }).catch(e => {
                console.log("Audio autoplay prevented or error:", e);
                speakText(currentSpeechText);
            });
        }
    } catch (e) {
        speakText(currentSpeechText);
    }
}

function stopAudio() {
    if(audioPlayer) {
        try { audioPlayer.pause(); } catch (e) { /* ignore */ }
    }
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
    isAudioPlaying = false;
    if (playAudioIcon) playAudioIcon.className = "fas fa-play";
    hideSubtitles();
}

function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getLang() === "es" ? "es-ES" : "en-US";
        utterance.rate = 1.05;
        utterance.onstart = () => {
            isAudioPlaying = true;
            playAudioIcon.className = "fas fa-pause";
            $("#subtitleBar").removeClass("hidden");
            subsTimed = null;
            buildPlainSubs($("#subtitleText").empty(), text);
        };
        utterance.onboundary = (e) => {
            try { subsHighlightChar(e.charIndex); } catch (err) { /* ignore */ }
        };
        utterance.onend = () => {
            isAudioPlaying = false;
            playAudioIcon.className = "fas fa-play";
            hideSubtitles();
        };
        utterance.onerror = () => {
            isAudioPlaying = false;
            playAudioIcon.className = "fas fa-play";
        };
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        isAudioPlaying = false;
        playAudioIcon.className = "fas fa-play";
    }
}

async function sendQuestion() {
    const q = $("#qaInput").val().trim();
    if (!currentReport) { alert("Analiza una partida primero."); return; }
    if (!q) return;
    const box = $("#qaAnswer");
    box.removeClass("hidden").text("Pensando...");
    try {
        const res = await fetch(api("/api/ask"), {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                game_id: currentReport.meta.game_id,
                ply: currentPlyIndex,
                question: q,
                voice: $("#voiceSelect").val() || (getLang() === "es" ? "alvaro" : "aria"),
                lang: getLang()
            })
        });
        if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo responder"));
        const data = await res.json();
        box.text(data.answer);
        if (data.audio_url) playAudioUrl(normalizeAudioUrl(data.audio_url), data.answer);
    } catch (e) {
        box.text("Error: " + e.message);
    }
}

async function fetchHistory() {
    try {
        const res = await fetch(api("/api/history"));
        if (!res.ok) throw new Error(await apiErrorMessage(res, "Error cargando historial"));
        const data = await res.json();

        showSidebar();
        const list = $("#gamesList");
        list.empty();

        if (!data || data.length === 0) {
            list.append("<div class='p-3 text-sm text-gray-400'>No hay partidas en el historial.</div>");
            $("#gameCountLabel").text("");
            return;
        }

        $("#gameCountLabel").text(data.length + " guardadas");

        data.forEach(h => {
            const meta = h.meta;
            if(!meta) return;
            const resultColor = meta.user_status === 'win' ? 'text-green-500' : (meta.user_status === 'loss' ? 'text-red-500' : 'text-gray-400');
            const resultText = meta.user_status === 'win' ? 'Victoria' : (meta.user_status === 'loss' ? 'Derrota' : 'Tablas');

            const el = $(`
                <div class="p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors game-item bg-gray-800">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-bold text-gray-300">vs ${escapeHtml(meta.opponent_name || "Rival")}</span>
                        <span class="text-[10px] uppercase font-bold bg-blue-900 text-blue-200 px-1 rounded"><i class="fas fa-save mr-1"></i> GUARDADA</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-bold ${resultColor}">${resultText}</span>
                        <span class="text-xs text-gray-500">${escapeHtml(String(meta.white_accuracy || 0))}% - ${escapeHtml(String(meta.black_accuracy || 0))}%</span>
                    </div>
                </div>
            `);
            el.click(() => loadFromHistory(meta.game_id));
            list.append(el);
        });
    } catch (e) {
        alert("Error cargando historial: " + e.message);
    }
}

async function loadFromHistory(gameId) {
    showLoader("Cargando desde el historial...");
    $("#accuracyContainer").addClass("hidden");
    $("#matchTitle").text("Cargando desde el historial...");
    stopAudio();
    currentReport = null;

    try {
        const res = await fetch(api(`/api/history/${encodeURIComponent(gameId)}`));
        if(!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo cargar la partida"));
        const report = await res.json();

        if (report.moves) report.moves.forEach(m => { if (m.audio_url) m.audio_url = normalizeAudioUrl(m.audio_url); });
        if (report.summary && report.summary.audio_url) report.summary.audio_url = normalizeAudioUrl(report.summary.audio_url);

        // Keep the PGN (if stored) so a language switch can re-translate it.
        lastAnalyzedPgn = (report.meta && report.meta.pgn) || null;
        lastAnalyzedUser = (report.meta && report.meta.user_name) || "";

        currentReport = report;
        setupUIForReport(report);
        goToMove(0);

    } catch(e) {
        alert("Error cargando partida: " + e.message);
    } finally {
        hideLoader();
    }
}
