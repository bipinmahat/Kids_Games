/* Pip's Quiz Party: a kids' quiz game with a cheering mascot.
   Questions come from questions.json; progress is saved in localStorage. */

(() => {
  "use strict";

  const SAVE_KEY = "pip-quiz-v1";
  const MAX_HEARTS = 3;
  const THINK_DELAY = 7000; // ms without a tap before Pip starts "thinking"

  // ---------- phrases (picked without repeating the last one) ----------
  const PHRASES = {
    right: ["Yayyy! 🎉", "You got it!", "Super job!", "Wow, so smart!", "Hooray!", "Amazing!",
            "That's right!", "High five! ✋", "Woo-hoo!", "Brilliant!", "You're a star! ⭐", "Yes, yes, yes!"],
    oops: ["Oops, try again!", "Almost! Try another one.", "Good try! Pick again.",
           "Not that one. You can do it!", "So close! One more try.", "That's okay! Try again."],
    streak: ["Three in a row! 🔥", "You're on fire! 🔥", "Wow, what a streak!", "Unstoppable! 🚀"],
    think: ["Hmm... take your time!", "Look carefully!", "Which one could it be?", "I believe in you!"],
    start: ["Let's play!", "Ready? Let's go!", "Here we go!", "This will be fun!"],
    noHearts: ["No more hearts, but keep going! You're doing great!"],
    greet: ["Hi! I'm Pip! Pick a game!", "Let's learn together!", "What should we play?", "Pick a game, friend!"],
    done: ["You did it!", "Great job!", "Fantastic!", "You're amazing!"]
  };
  const lastPick = {};
  function pick(kind) {
    const list = PHRASES[kind];
    let p;
    do { p = list[Math.floor(Math.random() * list.length)]; }
    while (list.length > 1 && p === lastPick[kind]);
    lastPick[kind] = p;
    return p;
  }

  // ---------- saved progress ----------
  const save = loadSave();
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === "object") return { best: s.best || {}, sound: s.sound !== false };
    } catch (e) { /* ignore broken saves */ }
    return { best: {}, sound: true };
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage may be blocked */ }
  }

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- sound (synthesized, no files needed) ----------
  let audio = null;
  function ctx() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function tone(freq, start, dur, type = "sine", vol = 0.18, endFreq) {
    const ac = ctx();
    if (!ac || !save.sound) return;
    const t = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  const sfx = {
    tap() { tone(660, 0, 0.08, "sine", 0.08); },
    right() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.22, "triangle", 0.16)); },
    bonk() { tone(260, 0, 0.28, "sine", 0.2, 120); },
    star(i) { tone(880 + i * 220, 0, 0.3, "triangle", 0.15); tone(1760 + i * 440, 0.05, 0.25, "sine", 0.05); },
    fanfare() {
      [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.25, "triangle", 0.15));
      [523, 659, 784].forEach((f) => tone(f, 0.55, 0.7, "triangle", 0.1));
    }
  };

  // ---------- read aloud (Web Speech API) ----------
  const synth = window.speechSynthesis;
  let voice = null;
  function chooseVoice() {
    if (!synth) return;
    const voices = synth.getVoices().filter((v) => /^en/i.test(v.lang));
    voice = voices.find((v) => /female|samantha|zira|google us english|aria|jenny/i.test(v.name)) || voices[0] || null;
  }
  if (synth) { chooseVoice(); synth.onvoiceschanged = chooseVoice; }

  function say(text) {
    if (!synth || !save.sound) return;
    const clean = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\.\.\./g, ",").trim();
    if (!clean) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.pitch = 1.25;
    synth.speak(u);
  }

  // ---------- mascot (original character "Pip") ----------
  const INK = "#3b3358";
  const MASCOT_SVG = `
<svg class="mascot mood-idle" viewBox="0 0 200 210" role="img" aria-label="Pip the mascot">
  <ellipse cx="100" cy="198" rx="54" ry="8" fill="rgba(74,63,107,.12)"/>
  <g class="m-part p-celebrate">
    <g transform="translate(22 46)"><path class="sparkle" d="M0-12L3.5-3.5L12 0L3.5 3.5L0 12L-3.5 3.5L-12 0L-3.5-3.5Z" fill="#ffd45c"/></g>
    <g transform="translate(180 60)"><path class="sparkle" d="M0-10L3-3L10 0L3 3L0 10L-3 3L-10 0L-3-3Z" fill="#ff9fc0"/></g>
    <g transform="translate(176 150)"><path class="sparkle" d="M0-9L2.5-2.5L9 0L2.5 2.5L0 9L-2.5 2.5L-9 0L-2.5-2.5Z" fill="#7cc4ff"/></g>
  </g>
  <g class="m-body">
    <line x1="100" y1="50" x2="100" y2="24" stroke="#5fc4ab" stroke-width="6" stroke-linecap="round"/>
    <circle class="m-antenna-tip" cx="100" cy="18" r="10" fill="#ffd45c"/>
    <ellipse class="m-arm left" cx="40" cy="132" rx="13" ry="24" fill="#6fd2b9"/>
    <ellipse class="m-arm right" cx="160" cy="132" rx="13" ry="24" fill="#6fd2b9"/>
    <ellipse cx="78" cy="188" rx="17" ry="9" fill="#5fc4ab"/>
    <ellipse cx="122" cy="188" rx="17" ry="9" fill="#5fc4ab"/>
    <rect x="46" y="46" width="108" height="142" rx="52" fill="#8fe3cf"/>
    <ellipse cx="100" cy="154" rx="34" ry="24" fill="#c9f5ea"/>
    <circle cx="64" cy="118" r="9" fill="#ffb3c7" opacity=".85"/>
    <circle cx="136" cy="118" r="9" fill="#ffb3c7" opacity=".85"/>

    <g class="m-part m-eyes p-idle p-oops">
      <ellipse cx="80" cy="98" rx="9" ry="12" fill="${INK}"/><circle cx="83" cy="93" r="3.5" fill="#fff"/>
      <ellipse cx="120" cy="98" rx="9" ry="12" fill="${INK}"/><circle cx="123" cy="93" r="3.5" fill="#fff"/>
    </g>
    <g class="m-part p-think">
      <ellipse cx="84" cy="94" rx="9" ry="12" fill="${INK}"/><circle cx="87" cy="89" r="3.5" fill="#fff"/>
      <ellipse cx="124" cy="94" rx="9" ry="12" fill="${INK}"/><circle cx="127" cy="89" r="3.5" fill="#fff"/>
    </g>
    <g class="m-part p-happy p-celebrate" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round">
      <path d="M70 101 Q80 86 90 101"/><path d="M110 101 Q120 86 130 101"/>
    </g>
    <g class="m-part p-oops" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round">
      <path d="M70 82 L88 77"/><path d="M130 82 L112 77"/>
    </g>

    <path class="m-part p-idle" d="M88 121 Q100 133 112 121" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <g class="m-part p-happy p-celebrate">
      <path d="M83 118 Q100 146 117 118 Z" fill="${INK}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="100" cy="132" rx="8" ry="5" fill="#ff8fab"/>
    </g>
    <ellipse class="m-part p-oops" cx="100" cy="127" rx="7" ry="8" fill="${INK}"/>
    <path class="m-part p-think" d="M88 126 Q94 121 100 126 T112 125" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>

    <path class="m-part p-oops" d="M148 62 Q157 77 148 82 Q139 77 148 62 Z" fill="#9bd4ff"/>
  </g>
  <g class="m-part p-think" fill="#fff" stroke="#d9cdee" stroke-width="2">
    <circle cx="160" cy="42" r="4"/><circle cx="171" cy="29" r="6"/><circle cx="185" cy="13" r="8"/>
  </g>
</svg>`;

  function makeMascot(slotId) {
    const slot = $(slotId);
    slot.innerHTML = MASCOT_SVG;
    return slot.querySelector("svg");
  }
  function setMood(svg, mood) {
    // Re-adding the class restarts the animation even if the mood is unchanged.
    svg.setAttribute("class", "mascot");
    void svg.getBoundingClientRect();
    svg.setAttribute("class", "mascot mood-" + mood);
  }
  function setBubble(el, text) {
    el.textContent = text;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  const mascots = {
    home: makeMascot("homeMascot"),
    play: makeMascot("playMascot"),
    done: makeMascot("doneMascot")
  };

  // ---------- shapes for the Shapes lesson ----------
  function shapeSVG(name, color) {
    const s = `fill="${color}" stroke="rgba(0,0,0,.12)" stroke-width="4" stroke-linejoin="round"`;
    const shapes = {
      circle: `<circle cx="50" cy="50" r="40" ${s}/>`,
      square: `<rect x="12" y="12" width="76" height="76" rx="8" ${s}/>`,
      triangle: `<path d="M50 10 L92 86 L8 86 Z" ${s}/>`,
      star: `<path d="M50 6 L62 37 L95 38 L69 58 L78 91 L50 72 L22 91 L31 58 L5 38 L38 37 Z" ${s}/>`,
      heart: `<path d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z" ${s}/>`,
      diamond: `<path d="M50 6 L90 50 L50 94 L10 50 Z" ${s}/>`
    };
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${shapes[name] || shapes.circle}</svg>`;
  }

  // ---------- confetti ----------
  function confetti(count = 70) {
    const box = $("confetti");
    const colors = ["#ff9fc0", "#ffd45c", "#7cc4ff", "#8fe3cf", "#b9a3ff", "#ffae7a"];
    for (let i = 0; i < count; i++) {
      const bit = document.createElement("span");
      bit.className = "confetti-bit";
      bit.style.left = Math.random() * 100 + "vw";
      bit.style.background = colors[i % colors.length];
      bit.style.setProperty("--dur", 2 + Math.random() * 2 + "s");
      bit.style.setProperty("--drift", (Math.random() * 200 - 100) + "px");
      bit.style.setProperty("--spin", (Math.random() * 900 - 450) + "deg");
      bit.style.animationDelay = Math.random() * 0.6 + "s";
      if (Math.random() < 0.4) bit.style.borderRadius = "50%";
      box.appendChild(bit);
      setTimeout(() => bit.remove(), 5000);
    }
  }

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
  }

  // ---------- home ----------
  let lessons = [];

  function renderHome() {
    const list = $("lessons");
    list.innerHTML = "";
    let total = 0;
    lessons.forEach((lesson) => {
      const best = save.best[lesson.id] || 0;
      total += best;
      const btn = document.createElement("button");
      btn.className = "lesson";
      btn.style.background = lesson.color || "#fff";
      btn.setAttribute("aria-label", `${lesson.title}, ${best} of 3 stars`);

      const icon = document.createElement("span");
      icon.className = "l-icon";
      icon.textContent = lesson.icon || "⭐";

      const text = document.createElement("span");
      const title = document.createElement("div");
      title.className = "l-title";
      title.textContent = lesson.title;
      const stars = document.createElement("div");
      stars.className = "l-stars";
      for (let i = 0; i < 3; i++) {
        const st = document.createElement("span");
        st.textContent = "⭐";
        if (i >= best) st.className = "off";
        stars.appendChild(st);
      }
      text.append(title, stars);
      btn.append(icon, text);
      btn.addEventListener("click", () => { sfx.tap(); startLesson(lesson); });
      list.appendChild(btn);
    });
    $("totalStars").textContent = total;
    $("soundToggle").textContent = save.sound ? "🔊" : "🔇";
    setMood(mascots.home, "idle");
    setBubble($("homeBubble"), pick("greet"));
  }

  $("soundToggle").addEventListener("click", () => {
    save.sound = !save.sound;
    writeSave();
    if (!save.sound && synth) synth.cancel();
    $("soundToggle").textContent = save.sound ? "🔊" : "🔇";
    sfx.tap();
  });

  // ---------- play ----------
  const game = {
    lesson: null, questions: [], index: 0,
    hearts: MAX_HEARTS, streak: 0, bestStreak: 0,
    wrongThisQ: 0, locked: false, thinkTimer: null, token: 0
  };

  function startLesson(lesson) {
    game.lesson = lesson;
    game.questions = shuffle(lesson.questions);
    game.index = 0;
    game.hearts = MAX_HEARTS;
    game.streak = 0;
    game.bestStreak = 0;
    game.token++;
    show("play");
    renderHearts();
    renderStreak(false);
    updateProgress();
    setMood(mascots.play, "happy");
    setBubble($("playBubble"), pick("start"));
    showQuestion();
  }

  function renderHearts(breakIndex = -1) {
    const box = $("hearts");
    box.innerHTML = "";
    for (let i = 0; i < MAX_HEARTS; i++) {
      const h = document.createElement("span");
      h.textContent = "❤️";
      if (i >= game.hearts) h.className = "lost";
      if (i === breakIndex) h.classList.add("breaking");
      box.appendChild(h);
    }
    box.setAttribute("aria-label", `${game.hearts} hearts left`);
  }

  function renderStreak(bump) {
    const el = $("streak");
    $("streakNum").textContent = game.streak;
    el.classList.remove("hot");
    if (bump) { void el.offsetWidth; el.classList.add("hot"); }
  }

  function updateProgress() {
    const pct = Math.round((game.index / game.questions.length) * 100);
    $("progressFill").style.width = pct + "%";
    document.querySelector(".progress").setAttribute("aria-valuenow", pct);
  }

  function renderChoiceContent(btn, c) {
    if (c.pic) {
      const s = document.createElement("span");
      s.className = "pic";
      s.textContent = c.pic;
      btn.appendChild(s);
    } else if (c.swatch) {
      const s = document.createElement("span");
      s.className = "swatch";
      s.style.background = c.swatch;
      btn.appendChild(s);
    } else if (c.shape) {
      btn.innerHTML = shapeSVG(c.shape, c.color || "#7cc4ff");
    } else if (c.num) {
      const s = document.createElement("span");
      s.className = "num";
      s.textContent = c.num;
      btn.appendChild(s);
    }
    btn.setAttribute("aria-label", c.label || c.num || "answer");
  }

  function showQuestion() {
    const q = game.questions[game.index];
    game.wrongThisQ = 0;
    game.locked = false;

    $("prompt").textContent = q.prompt;
    const showBox = $("show");
    if (q.show) { showBox.textContent = q.show; showBox.hidden = false; }
    else { showBox.hidden = true; }

    const box = $("choices");
    box.innerHTML = "";
    const choices = shuffle(q.choices.map((c, i) => ({ ...c, correct: i === q.answer })));
    choices.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.dataset.correct = c.correct ? "1" : "0";
      renderChoiceContent(btn, c);
      btn.addEventListener("click", () => answer(btn, c.correct));
      box.appendChild(btn);
    });

    // Read the question aloud after Pip's intro bubble has had a moment.
    const token = game.token;
    setTimeout(() => { if (token === game.token) say(q.prompt); }, game.index === 0 ? 900 : 250);
    armThinking();
  }

  function armThinking() {
    clearTimeout(game.thinkTimer);
    const token = game.token;
    game.thinkTimer = setTimeout(() => {
      if (token !== game.token || game.locked) return;
      setMood(mascots.play, "think");
      setBubble($("playBubble"), pick("think"));
    }, THINK_DELAY);
  }

  async function answer(btn, correct) {
    if (game.locked) return;
    const bubble = $("playBubble");

    if (correct) {
      game.locked = true;
      clearTimeout(game.thinkTimer);
      if (game.wrongThisQ === 0) {
        game.streak++;
        game.bestStreak = Math.max(game.bestStreak, game.streak);
      }
      btn.classList.add("right");
      document.querySelectorAll(".choice").forEach((b) => { if (b !== btn) b.classList.add("faded"); });
      sfx.right();

      const onStreak = game.wrongThisQ === 0 && game.streak >= 3 && game.streak % 3 === 0;
      const line = onStreak ? pick("streak") : pick("right");
      setMood(mascots.play, onStreak ? "celebrate" : "happy");
      setBubble(bubble, line);
      renderStreak(game.wrongThisQ === 0);
      say(line);
      if (onStreak) confetti(30);

      game.index++;
      updateProgress();
      const token = game.token;
      await wait(1700);
      if (token !== game.token) return;
      if (game.index >= game.questions.length) finishLesson();
      else { setMood(mascots.play, "idle"); showQuestion(); }
    } else {
      game.wrongThisQ++;
      btn.classList.add("wrong");
      sfx.bonk();
      game.streak = 0;
      renderStreak(false);

      // Only the first miss on a question costs a heart, and hearts never end the game.
      let line = pick("oops");
      if (game.wrongThisQ === 1 && game.hearts > 0) {
        game.hearts--;
        renderHearts(game.hearts);
        if (game.hearts === 0) line = pick("noHearts");
      }
      setMood(mascots.play, "oops");
      setBubble(bubble, line);
      say(line);

      // After two misses, gently point at the right answer.
      if (game.wrongThisQ >= 2) {
        const right = document.querySelector('.choice[data-correct="1"]');
        if (right) right.classList.add("hint");
      }
      armThinking();
    }
  }

  function starsFor(hearts) {
    if (hearts >= MAX_HEARTS) return 3;
    if (hearts >= 1) return 2;
    return 1; // finishing always earns at least one star
  }

  async function finishLesson() {
    const stars = starsFor(game.hearts);
    const id = game.lesson.id;
    if (stars > (save.best[id] || 0)) { save.best[id] = stars; writeSave(); }

    show("done");
    const title = pick("done");
    $("doneTitle").textContent = title;
    $("doneText").textContent = game.bestStreak >= 2
      ? `You finished ${game.lesson.title}! Best streak: ${game.bestStreak} 🔥`
      : `You finished ${game.lesson.title}!`;
    setMood(mascots.done, "celebrate");
    sfx.fanfare();
    confetti(90);
    say(title);

    const starEls = $("doneStars").querySelectorAll(".star");
    starEls.forEach((s) => (s.className = "star"));
    const token = game.token;
    for (let i = 0; i < starEls.length; i++) {
      await wait(450);
      if (token !== game.token) return;
      starEls[i].classList.add("in");
      if (i < stars) { starEls[i].classList.add("earned"); sfx.star(i); }
    }
  }

  function quitToHome() {
    game.token++;
    clearTimeout(game.thinkTimer);
    if (synth) synth.cancel();
    show("home");
    renderHome();
  }

  $("speakBtn").addEventListener("click", () => {
    const q = game.questions[game.index];
    if (q) say(q.prompt);
  });
  $("quitBtn").addEventListener("click", () => { sfx.tap(); quitToHome(); });
  $("againBtn").addEventListener("click", () => { sfx.tap(); startLesson(game.lesson); });
  $("homeBtn").addEventListener("click", () => { sfx.tap(); quitToHome(); });

  // ---------- load questions ----------
  fetch("questions.json")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      lessons = Array.isArray(data.lessons) ? data.lessons : [];
      renderHome();
    })
    .catch(() => {
      $("loadError").hidden = false;
      setMood(mascots.home, "oops");
      setBubble($("homeBubble"), "Uh oh!");
    });
})();
