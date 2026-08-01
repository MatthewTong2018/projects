/**
 * Spider-Man: Brand New Day - Player Controller & State Machine (v2 Overhaul)
 * Handles player states (IDLE, RUNNING, SWINGING, FREE_FALL, DASH, DEAD),
 * true angular velocity transitions for pendulum swinging, and peak/max speed tracking.
 */

class PlayerController {
  constructor() {
    this.x = 0;
    this.y = 650;
    this.vx = 520;
    this.vy = 0;
    this.radius = 22;

    // Angular pendulum state
    this.theta = 0;
    this.omega = 0;

    this.state = 'FREE_FALL'; // IDLE, RUNNING, SWINGING, FREE_FALL, DASH, DEAD
    this.activeAnchor = null;
    this.ropeLength = 0;

    this.dashCooldown = 0;
    this.combo = 1.0;
    this.distance = 0;
    this.photosCount = 0;

    // Peak Speed Tracking (km/h)
    this.maxSpeedReached = 0;

    // Animation frame counter for rooftop running pixel art
    this.animFrame = 0;

    // Keyboard & mouse input state
    this.keys = {
      Space: false,
      KeyA: false,
      KeyD: false,
      KeyW: false,
      KeyS: false,
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false,
      ShiftLeft: false,
      ShiftRight: false
    };

    this.initEvents();
  }

  initEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
      }
      // Spacebar web shoot trigger
      if (e.code === 'Space' && this.state !== 'DEAD' && this.state !== 'SWINGING') {
        this.tryShootWeb();
      }
      // Dash trigger
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.dashCooldown <= 0 && this.state !== 'DEAD') {
        this.spiderDash();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
      if (e.code === 'Space' && this.state === 'SWINGING') {
        this.releaseWeb();
      }
    });
  }

  reset(startX = 0, startY = 650) {
    this.x = startX;
    this.y = startY;
    this.vx = 580;
    this.vy = -120;
    this.theta = 0;
    this.omega = 0;
    this.state = 'FREE_FALL';
    this.activeAnchor = null;
    this.ropeLength = 0;
    this.dashCooldown = 0;
    this.combo = 1.0;
    this.distance = 0;
    this.photosCount = 0;
    this.maxSpeedReached = 0;
    this.animFrame = 0;
  }

  tryShootWeb(customAnchor = null) {
    if (this.state === 'DEAD') return;
    const anchor = customAnchor || window.worldManager.getBestAnchor(this.x, this.y);
    if (anchor) {
      this.state = 'SWINGING';
      this.activeAnchor = anchor;

      // Seamless angular state transition
      const dx = this.x - anchor.x;
      const dy = this.y - anchor.y;
      this.ropeLength = Math.hypot(dx, dy) || 1;

      // Polar angle theta (0 = straight below anchor)
      this.theta = Math.atan2(dx, dy);

      // Project Cartesian velocity onto tangent vector (cos(theta), -sin(theta))
      const vTangent = this.vx * Math.cos(this.theta) - this.vy * Math.sin(this.theta);
      this.omega = vTangent / this.ropeLength;

      window.soundManager.playThwip();
      if (window.renderer) {
        window.renderer.spawnThwipSparks(anchor.x, anchor.y);
      }
    }
  }

  releaseWeb() {
    if (this.state === 'SWINGING') {
      this.state = 'FREE_FALL';
      this.activeAnchor = null;
      // Extra vertical kick if releasing on an upward swing
      if (this.vy < -80) {
        this.vy *= 1.15;
      }
    }
  }

  spiderDash() {
    if (this.dashCooldown > 0 || this.state === 'DEAD') return;
    this.dashCooldown = 2.2; // seconds
    window.soundManager.playDash();

    // Dash forward and slightly upward
    this.vx += 420;
    this.vy = Math.min(this.vy, -380);
    if (window.renderer) {
      window.renderer.spawnDashTrail(this.x, this.y);
    }
  }

  update(dt, world) {
    if (this.state === 'DEAD') return;

    if (this.dashCooldown > 0) {
      this.dashCooldown -= dt;
    }

    // Input torque & climbing
    let torqueInput = 0;
    if (this.keys.KeyA || this.keys.ArrowLeft) torqueInput -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) torqueInput += 1;

    let climbRate = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) climbRate = 320; // climb rope faster
    if (this.keys.KeyS || this.keys.ArrowDown) climbRate = -320; // extend rope

    // 1. Physics Integration
    if (this.state === 'SWINGING' && this.activeAnchor) {
      if (climbRate !== 0) {
        this.ropeLength = Math.max(70, Math.min(680, this.ropeLength - climbRate * dt));
      }
      window.physicsEngine.updateSwinging(this, this.activeAnchor, this.ropeLength, torqueInput, 0, dt);
    } else {
      window.physicsEngine.updateFreeFall(this, dt);
      if (torqueInput !== 0) {
        this.vx += torqueInput * 650 * dt;
      }
    }

    // 2. Rooftop Collisions (Buildings)
    let onGround = false;
    for (const b of world.buildings) {
      if (this.x + this.radius > b.x && this.x - this.radius < b.x + b.width) {
        // Falling onto roof
        if (this.vy >= 0 && this.y + this.radius >= b.y && this.y - this.radius < b.y + 45) {
          this.y = b.y - this.radius;
          this.vy = 0;
          onGround = true;
          if (this.state === 'SWINGING') {
            if (window.renderer && Math.random() > 0.6) {
              window.renderer.spawnRoofSparks(this.x, this.y + this.radius);
            }
          } else {
            this.state = 'RUNNING';
            this.vx = Math.max(480, this.vx * 0.998);
            this.animFrame += dt * 12;
          }
        }
      }
    }

    if (!onGround && this.state === 'RUNNING') {
      this.state = 'FREE_FALL';
    }

    // 3. Collectibles (Daily Bugle Photos & Spider Emblems)
    for (const token of world.tokens) {
      if (!token.collected) {
        const dist = Math.hypot(this.x - token.x, this.y - token.y);
        if (dist < this.radius + token.radius) {
          token.collected = true;
          if (token.type === 'BUGLE_PHOTO') {
            this.photosCount += 1;
            this.combo = Math.min(10.0, +(this.combo + 0.5).toFixed(1));
            window.soundManager.playCollect(false);
          } else {
            this.combo = Math.min(10.0, +(this.combo + 1.0).toFixed(1));
            this.vx += 300; // speed burst
            window.soundManager.playCollect(true);
          }
          if (window.renderer) {
            window.renderer.spawnCollectParticles(token.x, token.y, token.type);
          }
        }
      }
    }

    // 4. Hazards
    for (const haz of world.hazards) {
      if (haz.type === 'STEAM_VENT') {
        if (this.x > haz.x && this.x < haz.x + haz.width &&
            this.y < haz.y && this.y > haz.y - haz.height) {
          this.vy = -1250;
          if (window.renderer) {
            window.renderer.spawnSteamParticles(this.x, this.y);
          }
        }
      } else if (haz.type === 'DRONE') {
        const dist = Math.hypot(this.x - haz.x, this.y - haz.y);
        if (dist < this.radius + haz.radius) {
          this.combo = 1.0;
          this.vx *= 0.5;
          this.vy = -380;
          if (window.renderer) {
            window.renderer.spawnDroneExplosion(haz.x, haz.y);
          }
        }
      }
    }

    // 5. Check Pit Fall / Game Over
    if (this.y > world.groundY) {
      this.die();
    }

    // 6. Distance & Max Speed Tracking
    if (this.x > this.distance) {
      this.distance = Math.floor(this.x / 10);
    }

    const currentKmH = this.getCurrentSpeedKmH();
    if (currentKmH > this.maxSpeedReached) {
      this.maxSpeedReached = currentKmH;
    }

    // Update audio wind whoosh
    const currentSpeedNorm = Math.hypot(this.vx, this.vy) / 1100;
    window.soundManager.updateWindSpeed(currentSpeedNorm);
  }

  die() {
    if (this.state === 'DEAD') return;
    this.state = 'DEAD';
    this.vx = 0;
    this.vy = 0;
    window.soundManager.playSnap();
    if (window.gameController) {
      window.gameController.triggerGameOver();
    }
  }

  getCurrentSpeedKmH() {
    const pxPerSec = Math.hypot(this.vx, this.vy);
    return Math.round((pxPerSec / 45) * 3.6);
  }
}

window.playerController = new PlayerController();
