/**
 * LOGPILE — Museum-Grade Web Experience
 * Principal Creative Technologist & Interaction Choreographer
 */

document.addEventListener('DOMContentLoaded', () => {
  initAmbientCanvas();
  initTiltCards();
  initThemeEngine();
  initSanctuaryWheelTheater();
  initBenchmarkGauges();
  initFaqAccordions();
  initNavScrollspy();
  initClipboardUtils();
  initLucideIcons();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* =========================================================================
   1. AMBIENT 3D PARTICLES CANVAS (OBSIDIAN VAULT AMBIENCE)
   ========================================================================= */
function initAmbientCanvas() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width, height;
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const particles = [];
  const PARTICLE_COUNT = 60;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX - width / 2) * 0.04;
    mouse.targetY = (e.clientY - height / 2) * 0.04;
  });

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.z = Math.random() * 2 + 0.6;
      this.vx = (Math.random() - 0.5) * 0.28;
      this.vy = (Math.random() - 0.5) * 0.28;
      this.radius = Math.random() * 1.6 + 0.8;
      this.alpha = Math.random() * 0.45 + 0.15;
      this.emerald = Math.random() > 0.55;
    }
    update() {
      this.x += this.vx + (mouse.x * 0.02 * this.z);
      this.y += this.vy + (mouse.y * 0.02 * this.z);

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * this.z, 0, Math.PI * 2);
      ctx.fillStyle = this.emerald 
        ? `rgba(52, 211, 153, ${this.alpha * 0.85})` 
        : `rgba(226, 232, 240, ${this.alpha * 0.45})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function render() {
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    ctx.clearRect(0, 0, width, height);

    // Warm radial lighting wash
    const grad = ctx.createRadialGradient(
      width / 2 + mouse.x * 3, height / 3 + mouse.y * 3, 80,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.045)');
    grad.addColorStop(0.5, 'rgba(7, 9, 13, 0.01)');
    grad.addColorStop(1, 'rgba(2, 3, 5, 0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.035 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(render);
  }
  render();
}

/* =========================================================================
   2. 3D CARD PERSPECTIVE TILT
   ========================================================================= */
function initTiltCards() {
  const cards = document.querySelectorAll('.tilt-card');
  cards.forEach(card => {
    const inner = card.querySelector('.tilt-inner') || card;
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -5.5;
      const rotateY = ((x - centerX) / centerX) * 5.5;

      inner.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
    });

    card.addEventListener('mouseleave', () => {
      inner.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  });
}

/* =========================================================================
   3. DYNAMIC THEME ENGINE (WITH CHROMATIC LIGHTING SHIFTS)
   ========================================================================= */
const THEMES_DATA = {
  kinetic: {
    name: "Kinetic",
    game: "Marvel's Spider-Man Remastered",
    publisher: "Insomniac Games • PlayStation Publishing LLC • 2022",
    scheme: "The Brutalist Sanctuary",
    accent: "#e11d48",
    glow: "rgba(225, 29, 72, 0.35)",
    bg: "rgba(225, 29, 72, 0.08)",
    image: "assets/theme-kinetic-spiderman.png",
    statusBadge: "PLAYING",
    actionText: "PLAY NOW",
    metaBadges: ["STEAM", "66.0 GB", "3H 59M PLAYED"],
    description: "High-octane scarlet pulse with kinetic accent geometries. Engineered for high-speed action and dynamic player engagement."
  },
  cinematic: {
    name: "Cinematic",
    game: "Ghost of Tsushima Director's Cut",
    publisher: "Sucker Punch Productions • Nixxes Software • PlayStation • 2024",
    scheme: "The Ash & Ember",
    accent: "#d97706",
    glow: "rgba(217, 119, 6, 0.35)",
    bg: "rgba(217, 119, 6, 0.08)",
    image: "assets/theme-cinematic-tsushima.png",
    statusBadge: "PLAYING",
    actionText: "PLAY NOW",
    metaBadges: ["STEAM", "INSTALLED", "PLAYING"],
    description: "Monochrome sumi-e ink craftsmanship fused with warm gold-leaf motifs. Celebrates single-player grandeur and photographic framing."
  },
  atmospheric: {
    name: "Atmospheric",
    game: "The Witcher 3: Wild Hunt — Game of the Year",
    publisher: "CD PROJEKT RED • 2026 • Epic Games / GOG",
    scheme: "The Brutalist Sanctuary",
    accent: "#ef4444",
    glow: "rgba(239, 68, 68, 0.32)",
    bg: "rgba(239, 68, 68, 0.08)",
    image: "assets/theme-atmospheric-witcher.png",
    statusBadge: "UNPLAYED",
    actionText: "PLAY",
    metaBadges: ["EPIC GAMES", "GOG", "INSTALLED"],
    description: "Silver moonlight and deep obsidian gradients. High-contrast dark fantasy palette tuned for immersive RPG chronicles."
  },
  playful: {
    name: "Playful",
    game: "Stray",
    publisher: "BlueTwelve Studio • Annapurna Interactive • 2022",
    scheme: "The Ash & Ember",
    accent: "#f97316",
    glow: "rgba(249, 115, 22, 0.35)",
    bg: "rgba(249, 115, 22, 0.08)",
    image: "assets/theme-playful-stray.png",
    statusBadge: "UNPLAYED",
    actionText: "PRESS START",
    metaBadges: ["STEAM", "INSTALLED", "UNPLAYED"],
    description: "Warm cyberpunk neon accents and softened tactile curves. Designed for indie gems, narrative journeys, and whimsical adventures."
  },
  competitive: {
    name: "Competitive",
    game: "VALORANT",
    publisher: "Riot Games • Epic Games Store • 2020",
    scheme: "The Brutalist Sanctuary",
    accent: "#e11d48",
    glow: "rgba(225, 29, 72, 0.32)",
    bg: "rgba(225, 29, 72, 0.08)",
    image: "assets/theme-competitive-valorant.png",
    statusBadge: "UNPLAYED",
    actionText: "PRE-LOAD",
    metaBadges: ["EPIC GAMES", "SYNCED", "LOGGED: 0H"],
    description: "Ultra-low visual latency, precision tactical HUD framing, and instant status triggers for competitive team shooters."
  }
};

function initThemeEngine() {
  const buttons = document.querySelectorAll('.theme-pill-btn');
  const previewImage = document.getElementById('theme-preview-img');
  const themeTitle = document.getElementById('theme-active-title');
  const themeGame = document.getElementById('theme-active-game');
  const themePublisher = document.getElementById('theme-active-publisher');
  const themeScheme = document.getElementById('theme-active-scheme');
  const themeDesc = document.getElementById('theme-active-desc');
  const themeBadges = document.getElementById('theme-active-badges');
  const themeActionBtn = document.getElementById('theme-active-action');
  
  if (!buttons.length || !previewImage) return;

  function switchTheme(key) {
    const data = THEMES_DATA[key];
    if (!data) return;

    buttons.forEach(b => {
      b.classList.toggle('active', b.dataset.theme === key);
    });

    // Morph the dynamic theme lighting variables
    document.documentElement.style.setProperty('--theme-accent', data.accent);
    document.documentElement.style.setProperty('--theme-glow', data.glow);
    document.documentElement.style.setProperty('--theme-bg', data.bg);

    previewImage.style.opacity = '0.35';
    previewImage.style.transform = 'scale(0.985)';

    setTimeout(() => {
      previewImage.src = data.image;
      previewImage.alt = `${data.name} Theme — ${data.game}`;

      if (themeTitle) themeTitle.textContent = data.name;
      if (themeGame) themeGame.textContent = data.game;
      if (themePublisher) themePublisher.textContent = data.publisher;
      if (themeScheme) themeScheme.textContent = data.scheme;
      if (themeDesc) themeDesc.textContent = data.description;
      
      if (themeBadges) {
        themeBadges.innerHTML = data.metaBadges.map(b => 
          `<span class="px-2.5 py-1 rounded-md text-xs font-mono tracking-wider font-semibold" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1;">${b}</span>`
        ).join('');
      }

      if (themeActionBtn) {
        themeActionBtn.textContent = data.actionText;
        themeActionBtn.style.background = data.accent;
        themeActionBtn.style.color = '#ffffff';
      }

      previewImage.style.opacity = '1';
      previewImage.style.transform = 'scale(1)';
    }, 180);
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTheme(btn.dataset.theme);
    });
  });

  // Set default initial variables
  switchTheme('kinetic');
}

/* =========================================================================
   4. WEB AUDIO MECHANICAL SOUND SYNTHESIZER
   ========================================================================= */
class AudioClickSynthesizer {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playClick(pitch = 900) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch * 1.4, now);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }
  playChime() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + idx * 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + 1.2);
    });
  }
}

/* =========================================================================
   5. EXHIBIT 01: CINEMATIC THEATER VIDEO (SPIN THE SANCTUARY WHEEL)
   ========================================================================= */
function initSanctuaryWheelTheater() {
  const container = document.getElementById('sanctuary-wheel-theater');
  if (!container) return;
  
  const video = container.querySelector('video');
  const playBtn = container.querySelector('.theater-play-btn');
  const progressBar = container.querySelector('.theater-progress-fill');
  const progressTrack = container.querySelector('.theater-progress-track');
  const timeDisplay = container.querySelector('.theater-time-display');
  const spinTriggerBtn = document.getElementById('trigger-wheel-spin-btn');
  const audioSynth = new AudioClickSynthesizer();
  let audioTimer = null;

  if (!video) return;

  function togglePlay() {
    if (video.paused || video.ended) {
      video.play();
      if (playBtn) playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    } else {
      video.pause();
      if (playBtn) playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);

  // Time & Progress Updates
  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const pct = (video.currentTime / video.duration) * 100;
      if (progressBar) progressBar.style.width = `${pct}%`;
      
      if (timeDisplay) {
        const curM = Math.floor(video.currentTime / 60);
        const curS = Math.floor(video.currentTime % 60).toString().padStart(2, '0');
        const durM = Math.floor(video.duration / 60);
        const durS = Math.floor(video.duration % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${curM}:${curS} / ${durM}:${durS}`;
      }
    }
  });

  if (progressTrack) {
    progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = clickX / rect.width;
      if (video.duration) {
        video.currentTime = pct * video.duration;
      }
    });
  }

  // Interactive Spin Trigger: Rewinds video to 0s, plays, and synthesizes audio clicks
  if (spinTriggerBtn) {
    spinTriggerBtn.addEventListener('click', () => {
      audioSynth.init();
      video.currentTime = 0;
      video.play();
      if (playBtn) playBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

      // Generate deceleration click sound sequence matching in-app roulette
      if (audioTimer) clearInterval(audioTimer);
      let clicks = 0;
      let interval = 70;

      function scheduleTick() {
        if (clicks < 35) {
          audioSynth.playClick(800 + Math.random() * 200);
          clicks++;
          interval = Math.min(interval * 1.08, 480);
          audioTimer = setTimeout(scheduleTick, interval);
        } else {
          audioSynth.playChime();
        }
      }
      scheduleTick();
    });
  }
}

/* =========================================================================
   6. ENGINEERING BENCHMARK PROGRESS GAUGES
   ========================================================================= */
function initBenchmarkGauges() {
  const bars = document.querySelectorAll('.benchmark-bar-fill');
  if (!bars.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        bars.forEach(bar => {
          const targetWidth = bar.dataset.width || '100%';
          bar.style.width = targetWidth;
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });

  const table = document.querySelector('#benchmarks');
  if (table) observer.observe(table);
}

/* =========================================================================
   7. INTERACTIVE FAQ ACCORDIONS
   ========================================================================= */
function initFaqAccordions() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');
      items.forEach(other => other.classList.remove('active'));
      if (!isOpen) {
        item.classList.add('active');
      }
    });
  });
}

/* =========================================================================
   8. NAV SCROLLSPY & MOBILE REVEAL
   ========================================================================= */
function initNavScrollspy() {
  const nav = document.getElementById('floating-navbar');
  const links = document.querySelectorAll('.nav-spy-link');
  const sections = document.querySelectorAll('section[id]');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu-overlay');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    if (nav) {
      if (scrollY > 50) {
        nav.classList.add('bg-black/85', 'backdrop-blur-xl', 'shadow-2xl', 'border-white/15');
      } else {
        nav.classList.remove('bg-black/85', 'border-white/15');
      }
    }

    let currentSection = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 140;
      const height = sec.offsetHeight;
      if (scrollY >= top && scrollY < top + height) {
        currentSection = sec.getAttribute('id');
      }
    });

    links.forEach(link => {
      link.classList.remove('text-emerald-400', 'font-semibold');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('text-emerald-400', 'font-semibold');
      }
    });
  });

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      if (isOpen) {
        mobileMenu.classList.add('hidden');
        document.body.style.overflow = '';
      } else {
        mobileMenu.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    });

    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        document.body.style.overflow = '';
      });
    });
  }
}

/* =========================================================================
   9. CLIPBOARD UTILITIES
   ========================================================================= */
function initClipboardUtils() {
  const copyButtons = document.querySelectorAll('.copy-trigger');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<span class="text-emerald-400 font-mono text-xs">Copied!</span>`;
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 1600);
      });
    });
  });
}
