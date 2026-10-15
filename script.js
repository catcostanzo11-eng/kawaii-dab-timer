// Kawaii Dab Timer
// Counts down the dab duration, then the rest duration, then stops.

(function () {
    "use strict";

    const THEMES = {
        theme1: { name: "Kawaii",           bg: "#fff0f6", surface: "#ffffff", text: "#ff69b4", accent: "#ff69b4", accentText: "#ffffff" },
        theme2: { name: "Strawberry Swirl", bg: "#ffe4ec", surface: "#fff7f9", text: "#c2185b", accent: "#e8436f", accentText: "#ffffff" },
        theme3: { name: "Blueberry Sky",    bg: "#e8f1ff", surface: "#f7faff", text: "#3a56b0", accent: "#5b7fde", accentText: "#ffffff" },
        theme4: { name: "Cherry Blossom",   bg: "#fff5f7", surface: "#ffffff", text: "#ad1457", accent: "#f48fb1", accentText: "#ffffff" },
        theme5: { name: "Sunset Glow",      bg: "#fff3e0", surface: "#fffaf3", text: "#e65100", accent: "#ff7043", accentText: "#ffffff" },
        theme6: { name: "Minty Fresh",      bg: "#e9fbf3", surface: "#f7fffb", text: "#1b8a5a", accent: "#3ccf91", accentText: "#ffffff" }
    };

    const THEME_STORAGE_KEY = "kawaiiDabTimer.theme";
    const PAGE_TITLE = "Kawaii Dab Timer!";

    // Timer state
    let phase = "idle";        // "idle" | "dab" | "rest" | "done"
    let remainingMs = 0;       // time left in the current phase
    let endTime = 0;           // timestamp the current phase ends at (while running)
    let intervalId = null;

    let els = {};

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        els = {
            timer: document.getElementById("timer"),
            start: document.getElementById("startButton"),
            stop: document.getElementById("stopButton"),
            reset: document.getElementById("resetButton"),
            dab: document.getElementById("dabDuration"),
            rest: document.getElementById("restDuration")
        };

        // Small label under the clock showing the current phase.
        els.phase = document.createElement("p");
        els.phase.id = "phaseLabel";
        els.phase.className = "lead mb-3";
        els.timer.insertAdjacentElement("afterend", els.phase);

        els.start.addEventListener("click", start);
        els.stop.addEventListener("click", stop);
        els.reset.addEventListener("click", reset);

        [els.dab, els.rest].forEach(function (input) {
            input.addEventListener("change", function () {
                input.value = readSeconds(input);
                if (phase === "idle") reset();
            });
        });

        Object.keys(THEMES).forEach(function (id) {
            const button = document.getElementById(id);
            if (button) button.addEventListener("click", function () { applyTheme(id); });
        });

        applyTheme(loadSavedTheme());
        reset();
    }

    // ---- Timer controls ----

    function start() {
        if (intervalId !== null) return; // already running

        if (phase === "idle" || phase === "done") {
            beginPhase("dab");
        } else {
            // Resume a paused phase.
            endTime = Date.now() + remainingMs;
        }

        intervalId = setInterval(tick, 100);
        updateButtons();
        render();
    }

    function stop() {
        if (intervalId === null) return;
        clearInterval(intervalId);
        intervalId = null;
        remainingMs = Math.max(0, endTime - Date.now());
        updateButtons();
        render();
    }

    function reset() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        phase = "idle";
        remainingMs = readSeconds(els.dab) * 1000;
        updateButtons();
        render();
    }

    function beginPhase(next) {
        phase = next;
        const input = next === "dab" ? els.dab : els.rest;
        remainingMs = readSeconds(input) * 1000;
        endTime = Date.now() + remainingMs;
    }

    function tick() {
        remainingMs = Math.max(0, endTime - Date.now());

        if (remainingMs === 0) {
            if (phase === "dab") {
                beep(880);
                beginPhase("rest");
            } else {
                beep(660);
                clearInterval(intervalId);
                intervalId = null;
                phase = "done";
                updateButtons();
            }
        }

        render();
    }

    // ---- Display ----

    function render() {
        const time = formatTime(remainingMs);
        els.timer.textContent = time;

        const paused = intervalId === null && (phase === "dab" || phase === "rest");
        let label;
        switch (phase) {
            case "dab":  label = paused ? "Paused (dab) ⏸" : "Dab time! 💨"; break;
            case "rest": label = paused ? "Paused (rest) ⏸" : "Rest & relax ✨"; break;
            case "done": label = "All done! (◕‿◕)♡"; break;
            default:     label = "Ready when you are ♡";
        }
        els.phase.textContent = label;

        document.title = phase === "dab" || phase === "rest"
            ? time + " · " + (phase === "dab" ? "Dab" : "Rest")
            : PAGE_TITLE;
    }

    function updateButtons() {
        const running = intervalId !== null;
        els.start.disabled = running;
        els.stop.disabled = !running;
        els.start.textContent = (phase === "dab" || phase === "rest") && !running ? "Resume" : "Start";
        els.dab.disabled = running;
        els.rest.disabled = running;
    }

    function formatTime(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }

    // Reads a duration input, clamped to its min/max (defaults 1–90).
    function readSeconds(input) {
        const min = Number(input.min) || 1;
        const max = Number(input.max) || 90;
        const value = Math.round(Number(input.value));
        if (!Number.isFinite(value)) return min;
        return Math.min(max, Math.max(min, value));
    }

    // ---- Sound ----

    let audioCtx = null;

    function beep(frequency) {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) {
            // Sound is optional; ignore if the browser doesn't allow it.
        }
    }

    // ---- Themes ----

    function applyTheme(id) {
        const theme = THEMES[id] || THEMES.theme1;
        const root = document.documentElement.style;
        root.setProperty("--bg", theme.bg);
        root.setProperty("--surface", theme.surface);
        root.setProperty("--text", theme.text);
        root.setProperty("--accent", theme.accent);
        root.setProperty("--accent-text", theme.accentText);

        Object.keys(THEMES).forEach(function (key) {
            const button = document.getElementById(key);
            if (button) button.classList.toggle("active", key === id);
        });

        try {
            localStorage.setItem(THEME_STORAGE_KEY, id);
        } catch (e) {
            // Storage may be blocked (private mode); the theme still applies.
        }
    }

    function loadSavedTheme() {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved && THEMES[saved]) return saved;
        } catch (e) {
            // ignore
        }
        return "theme1";
    }
})();
