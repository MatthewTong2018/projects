/**
 * Spider-Man: Brand New Day - Physics Engine & Trajectory Predictor (v2 Overhaul)
 * Implements true Angular Acceleration Pendulum physics (alpha = -g/L * sin(theta)),
 * weighty projectile motion, air torque control, and forward time-step predictive trajectory.
 */

class PhysicsEngine {
  constructor() {
    this.gravity = 1450; // px/s^2 (natural comic-book gravity)
    this.airResistance = 0.999;
    this.maxSpeed = 1150; // px/s realistic max swing velocity
    this.swingDamping = 0.9995;
  }

  /**
   * Updates a body in free fall / projectile motion
   */
  updateFreeFall(body, dt) {
    // Apply weighty gravity
    body.vy += this.gravity * dt;

    // Apply minimal air resistance to maintain momentum
    body.vx *= Math.pow(this.airResistance, dt * 60);
    body.vy *= Math.pow(this.airResistance, dt * 60);

    // Clamp max velocity
    const speed = Math.hypot(body.vx, body.vy);
    if (speed > this.maxSpeed) {
      body.vx = (body.vx / speed) * this.maxSpeed;
      body.vy = (body.vy / speed) * this.maxSpeed;
    }

    // Integrate position
    body.x += body.vx * dt;
    body.y += body.vy * dt;
  }

  /**
   * Updates a body attached to a web anchor point using true Angular Acceleration Pendulum physics
   */
  updateSwinging(body, anchor, ropeLength, torqueInput, climbInput, dt) {
    const L = Math.max(70, ropeLength);

    // Calculate angular acceleration: alpha = -(g/L) * sin(theta) + torque/L
    const alpha = -(this.gravity / L) * Math.sin(body.theta) + (torqueInput * 1600) / L;

    // Integrate angular velocity & apply subtle swing damping
    body.omega += alpha * dt;
    body.omega *= Math.pow(this.swingDamping, dt * 60);

    // Integrate angle
    body.theta += body.omega * dt;

    // Convert polar angle back to Cartesian world coordinates
    body.x = anchor.x + L * Math.sin(body.theta);
    body.y = anchor.y + L * Math.cos(body.theta);

    // Recompute instantaneous Cartesian velocities (v_tangent = L * omega)
    body.vx = (L * body.omega) * Math.cos(body.theta);
    body.vy = -(L * body.omega) * Math.sin(body.theta);
  }

  /**
   * Calculates predictive trajectory arc for Spider-Sense visual HUD.
   * Simulates future frames in real time so the glowing arc shows where Spider-Man will fly.
   */
  calculateTrajectory(startX, startY, startVx, startVy, steps = 32, dtStep = 0.04) {
    const points = [];
    let simX = startX;
    let simY = startY;
    let simVx = startVx;
    let simVy = startVy;

    for (let i = 0; i < steps; i++) {
      points.push({ x: simX, y: simY });

      // Projectile motion step
      simVy += this.gravity * dtStep;
      simVx *= Math.pow(this.airResistance, dtStep * 60);
      simVy *= Math.pow(this.airResistance, dtStep * 60);

      simX += simVx * dtStep;
      simY += simVy * dtStep;

      // Stop if simulation falls deep below street level
      if (simY > 1300) break;
    }

    return points;
  }
}

window.physicsEngine = new PhysicsEngine();
