/**
 * Spider-Man: Brand New Day - Main Game Controller & Loop
 * Handles game state transitions (MENU, PLAYING, PAUSED, GAMEOVER),
 * Endless Rush vs. Daily Bugle modes, high-score tracking, and UI modal events.
 */

class GameController {
  constructor() {
    this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
    this.mode = 'endless'; // 'endless' or 'photo'
    this.lastTime = 0;
    this.highScores = {
      distance: parseInt(localStorage.getItem('spiderman_hs_distance') || '0', 10),
      photos: parseInt(localStorage.getItem('spiderman_hs_photos') || '0', 10)
    };

    this.initUI();
    this.initCanvasAiming();

    // Initialize renderer after DOM load
    window.addEventListener('DOMContentLoaded', () => {
      window.renderer = new window.GameRenderer('gameCanvas');
      this.updateHighScoreDisplay();
      requestAnimationFrame((t) => this.loop(t));
    });
  }

  initUI() {
    // 1. Title Screen Mode Selection
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.mode = card.dataset.mode;
      });
    });

    // 2. Start Game Button
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => this.startGame());
    }

    // 3. Pause & Resume Buttons
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => this.togglePause());
    }
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
      btnResume.addEventListener('click', () => this.togglePause());
    }

    // 4. Restart Buttons
    const btnRestartPause = document.getElementById('btn-restart-pause');
    if (btnRestartPause) {
      btnRestartPause.addEventListener('click', () => {
        this.closeModals();
        this.startGame();
      });
    }
    const btnRestartGO = document.getElementById('btn-restart-go');
    if (btnRestartGO) {
      btnRestartGO.addEventListener('click', () => {
        this.closeModals();
        this.startGame();
      });
    }

    // 5. Return to Menu Buttons
    const btnQuitMenu = document.getElementById('btn-quit-menu');
    if (btnQuitMenu) {
      btnQuitMenu.addEventListener('click', () => this.returnToTitle());
    }
    const btnMenuGO = document.getElementById('btn-menu-go');
    if (btnMenuGO) {
      btnMenuGO.addEventListener('click', () => this.returnToTitle());
    }

    // 6. Toggle Trajectory Predictor
    const btnToggleTraj = document.getElementById('btn-toggle-trajectory');
    const statusTraj = document.getElementById('status-trajectory');
    if (btnToggleTraj && statusTraj) {
      btnToggleTraj.addEventListener('click', () => {
        if (window.renderer) {
          window.renderer.showTrajectory = !window.renderer.showTrajectory;
          statusTraj.textContent = window.renderer.showTrajectory ? 'ON' : 'OFF';
          statusTraj.className = 'toggle-status ' + (window.renderer.showTrajectory ? 'on' : 'off');
        }
      });
    }

    // 7. Toggle Sound
    const btnSound = document.getElementById('btn-toggle-sound');
    const btnAudioMenu = document.getElementById('btn-toggle-audio-menu');
    const statusAudio = document.getElementById('status-audio');
    const toggleSoundAction = () => {
      const muted = window.soundManager.toggleMute();
      if (btnSound) {
        btnSound.innerHTML = muted ? '<span>🔇</span>' : '<span>🔊</span>';
      }
      if (statusAudio) {
        statusAudio.textContent = muted ? 'OFF' : 'ON';
        statusAudio.className = 'toggle-status ' + (muted ? 'off' : 'on');
      }
    };
    if (btnSound) btnSound.addEventListener('click', toggleSoundAction);
    if (btnAudioMenu) btnAudioMenu.addEventListener('click', toggleSoundAction);

    // 8. Keyboard Shortcut P and R
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.togglePause();
      }
      if (e.code === 'KeyR' && (this.state === 'GAMEOVER' || this.state === 'PAUSED')) {
        this.closeModals();
        this.startGame();
      }
    });
  }

  initCanvasAiming() {
    // Allow Mouse Click / Touch on canvas to shoot web to nearest anchor node
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const handlePointerDown = (e) => {
      if (this.state !== 'PLAYING') return;
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Convert viewport coords to world coords
      if (window.renderer && window.playerController) {
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;

        // Invert camera translate and zoom
        const worldX = (screenX - window.renderer.width * 0.3) / window.renderer.zoom + window.renderer.cameraX;
        const worldY = (screenY - window.renderer.height * 0.6) / window.renderer.zoom + window.renderer.cameraY;

        const anchor = window.worldManager.getAnchorNearPoint(worldX, worldY, 200);
        if (anchor) {
          window.playerController.tryShootWeb(anchor);
        } else {
          // If no anchor nearby, default to best automatic anchor
          window.playerController.tryShootWeb();
        }
      }
    };

    const handlePointerUp = (e) => {
      if (this.state !== 'PLAYING') return;
      e.preventDefault();
      if (window.playerController && window.playerController.state === 'SWINGING') {
        window.playerController.releaseWeb();
      }
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mouseup', handlePointerUp);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    canvas.addEventListener('touchend', handlePointerUp, { passive: false });
  }

  updateHighScoreDisplay() {
    const hsDist = document.getElementById('hs-distance');
    const hsPhoto = document.getElementById('hs-photo');
    if (hsDist) hsDist.textContent = `${this.highScores.distance} m`;
    if (hsPhoto) hsPhoto.textContent = `${this.highScores.photos}`;
  }

  startGame() {
    this.closeModals();
    this.state = 'PLAYING';

    // Show HUD
    const hud = document.getElementById('hud-overlay');
    if (hud) hud.classList.remove('hidden');

    const modeBadge = document.getElementById('mode-badge');
    const photoBox = document.getElementById('photo-stat-box');
    if (this.mode === 'photo') {
      if (modeBadge) modeBadge.textContent = 'BUGLE CHALLENGE';
      if (photoBox) photoBox.classList.remove('hidden');
    } else {
      if (modeBadge) modeBadge.textContent = 'ENDLESS RUSH';
      if (photoBox) photoBox.classList.add('hidden');
    }

    // Reset game entities
    window.worldManager.reset();
    window.playerController.reset(0, 700);

    // Audio init
    window.soundManager.ensureContext();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      const backdrop = document.getElementById('modal-backdrop');
      if (backdrop) backdrop.classList.remove('hidden');
      const pauseModal = document.getElementById('modal-pause');
      if (pauseModal) {
        pauseModal.classList.remove('hidden');
        pauseModal.classList.add('active');
      }
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.closeModals();
    }
  }

  triggerGameOver() {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';

    const player = window.playerController;
    const isNewDistanceRecord = player.distance > this.highScores.distance;
    const isNewPhotoRecord = player.photosCount > this.highScores.photos;

    if (isNewDistanceRecord) {
      this.highScores.distance = player.distance;
      localStorage.setItem('spiderman_hs_distance', this.highScores.distance.toString());
    }
    if (isNewPhotoRecord) {
      this.highScores.photos = player.photosCount;
      localStorage.setItem('spiderman_hs_photos', this.highScores.photos.toString());
    }

    // Populate Game Over Modal Stats
    const goDist = document.getElementById('go-distance');
    const goSpeed = document.getElementById('go-speed');
    const goCombo = document.getElementById('go-combo');
    const goPhotos = document.getElementById('go-photos');
    const hsBadge = document.getElementById('new-highscore-badge');

    if (goDist) goDist.textContent = `${player.distance} m`;
    if (goSpeed) goSpeed.textContent = `${player.maxSpeedReached} km/h`;
    if (goCombo) goCombo.textContent = `x${player.combo.toFixed(1)}`;
    if (goPhotos) goPhotos.textContent = `${player.photosCount}`;

    if (hsBadge) {
      if (isNewDistanceRecord || isNewPhotoRecord) {
        hsBadge.classList.remove('hidden');
      } else {
        hsBadge.classList.add('hidden');
      }
    }

    // Open Game Over modal
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('hidden');
    const goModal = document.getElementById('modal-gameover');
    if (goModal) {
      goModal.classList.remove('hidden');
      goModal.classList.add('active');
    }
  }

  returnToTitle() {
    this.closeModals();
    this.state = 'MENU';
    const hud = document.getElementById('hud-overlay');
    if (hud) hud.classList.add('hidden');

    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.remove('hidden');
    const titleModal = document.getElementById('modal-title');
    if (titleModal) {
      titleModal.classList.remove('hidden');
      titleModal.classList.add('active');
    }

    this.updateHighScoreDisplay();
  }

  closeModals() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
    const modals = document.querySelectorAll('.glass-modal');
    modals.forEach(m => {
      m.classList.remove('active');
      m.classList.add('hidden');
    });
  }

  updateHUD(player) {
    const statDist = document.getElementById('stat-distance');
    const statPhotos = document.getElementById('stat-photos');
    const statSpeed = document.getElementById('stat-speed');
    const statMaxSpeed = document.getElementById('stat-max-speed');
    const comboMult = document.getElementById('combo-multiplier');
    const comboBar = document.getElementById('combo-bar');
    const speedFill = document.getElementById('speed-fill');

    if (statDist) statDist.textContent = player.distance;
    if (statPhotos) statPhotos.textContent = player.photosCount;
    
    const speedKmH = player.getCurrentSpeedKmH();
    if (statSpeed) statSpeed.textContent = speedKmH;
    if (statMaxSpeed) statMaxSpeed.textContent = player.maxSpeedReached;
    if (speedFill) {
      const pct = Math.min(100, (speedKmH / 95) * 100);
      speedFill.style.width = pct + '%';
    }
    if (comboMult) comboMult.textContent = `x${player.combo.toFixed(1)}`;
    if (comboBar) {
      const comboPct = Math.min(100, (player.combo / 10.0) * 100);
      comboBar.style.width = comboPct + '%';
    }
  }

  /**
   * Main 60FPS Game Loop
   */
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    // Cap dt to prevent spiral of death on tab unfocus
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    const player = window.playerController;
    const world = window.worldManager;
    const renderer = window.renderer;

    if (this.state === 'PLAYING') {
      // Step game world & physics
      player.update(dt, world);
      world.update(renderer.cameraX, dt);
      renderer.updateCamera(player, dt);
      this.updateHUD(player);
    }

    // Always render viewport frame
    if (renderer) {
      renderer.render(player, world, dt);
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.gameController = new GameController();
