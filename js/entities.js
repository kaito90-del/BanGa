/* ============================================================
 * File: entities.js - Các thực thể game
 * Particle, Feather, Shockwave, ScorePopup, Diamond, PowerUp,
 * Explosion, Player, Bullet, EnemyBullet, EggBomb, Enemy, Boss
 * ============================================================ */

// ============================================================
// PARTICLE (Hạt vệt đuôi, khói, lửa, lấp lánh)
// ============================================================
class Particle {
    constructor(x, y, vx, vy, life, color, size, gravity) {
        this.x = +x; this.y = +y;
        this.vx = +vx; this.vy = +vy;
        this.life = +life; this.maxLife = +life;
        this.color = color;
        this.size = (size === undefined) ? 3 : size;
        this.gravity = gravity || 0.0;
        this.alive = true;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) { this.alive = false; return; }
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw(g) {
        const alpha = Math.max(0, this.life / this.maxLife);
        const size = Math.max(1, Math.trunc(this.size * alpha));
        let col = this.color;
        if (alpha < 0.65) {
            const f = alpha / 0.65;
            col = lerpColor(DARK_BG, this.color, f);
        }
        g.fillStyle = rgb(col, alpha);
        g.fillRect(Math.trunc(this.x), Math.trunc(this.y), size, size);
    }
}

// ============================================================
// FEATHER PARTICLE (Lông gà bay rụng khi bắn trúng gà)
// ============================================================
class FeatherParticle {
    constructor(x, y, color) {
        this.x = +x; this.y = +y;
        this.vx = randf(-70, 70);
        this.vy = randf(-90, 20);
        this.life = randf(0.8, 1.4);
        this.maxLife = this.life;
        this.rot = randf(0, Math.PI * 2);
        this.rotSpeed = randf(-4, 4);
        this.color = color || WHITE;
        this.alive = true;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) { this.alive = false; return; }
        this.vy += 120 * dt;
        this.vx += Math.sin(this.life * 8) * 40 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rot += this.rotSpeed * dt;
    }

    draw(g) {
        const img = ASSETS.images.feather;
        const alpha = Math.max(0, this.life / this.maxLife);
        g.save();
        g.translate(Math.trunc(this.x), Math.trunc(this.y));
        g.rotate(this.rot);
        g.globalAlpha = alpha;
        if (img && img.width) {
            g.drawImage(img, -8, -8, 16, 16);
        } else {
            g.fillStyle = rgb(this.color);
            g.beginPath();
            g.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
    }
}

// ============================================================
// SHOCKWAVE (Vòng sóng xung kích mở rộng khi kỹ năng / nổ lớn)
// ============================================================
class Shockwave {
    constructor(x, y, color, maxRadius, duration, width) {
        this.x = +x; this.y = +y;
        this.color = color || CYAN;
        this.radius = 4;
        this.maxRadius = maxRadius || 120;
        this.duration = duration || 0.45;
        this.life = this.duration;
        this.width = width || 3;
        this.alive = true;
    }

    update(dt) {
        this.life -= dt;
        if (this.life <= 0) { this.alive = false; return; }
        const frac = 1.0 - (this.life / this.duration);
        this.radius = 4 + frac * this.maxRadius;
    }

    draw(g) {
        const alpha = Math.max(0, this.life / this.duration);
        g.strokeStyle = rgb(this.color, alpha * 0.9);
        g.lineWidth = Math.max(1, this.width * alpha);
        g.beginPath();
        g.arc(Math.trunc(this.x), Math.trunc(this.y), this.radius, 0, Math.PI * 2);
        g.stroke();
    }
}

// ============================================================
// SCORE POPUP (Chữ cộng điểm / thông báo nổi lên)
// ============================================================
class ScorePopup {
    constructor(x, y, text, color, big, icon) {
        this.x = +x; this.y = +y;
        this.text = text;
        this.color = color || WHITE;
        this.life = 0.95;
        this.maxLife = 0.95;
        this.alive = true;
        this.icon = !!icon;
        this.size = big ? 28 : 20;
    }

    update(dt) {
        this.life -= dt;
        this.y -= 46.0 * dt;
        if (this.life <= 0) this.alive = false;
    }

    draw(g) {
        const alpha = Math.max(0.0, this.life / this.maxLife);
        const f = Math.min(1.0, alpha / 0.5);
        const col = lerpColor(DARK_BG, this.color, f);
        drawTextTo(g, this.text, this.size, true, col,
            Math.trunc(this.x), Math.trunc(this.y),
            { align: "center", baseline: "middle" });
        if (this.icon) {
            const icon = getDiamondIcon(12);
            const tw = textWidthOf(g, this.text, this.size, true);
            g.drawImage(icon, Math.trunc(this.x + tw / 2 + 4), Math.trunc(this.y - 7));
        }
    }
}

// ============================================================
// DIAMOND (Kim cương - Rơi và bay về HUD)
// ============================================================
const DIAMOND_FALLING = 0;
const DIAMOND_FLYING = 1;

class Diamond {
    constructor(x, y, value, fromBoss) {
        this.x = +x; this.y = +y;
        this.value = Math.trunc(value);
        this.fromBoss = !!fromBoss;
        this.vx = randf(-30.0, 30.0);
        this.vy = randf(65.0, 95.0);
        if (fromBoss) {
            const ang = randf(0, 2 * Math.PI);
            const spd = randf(70.0, 180.0);
            this.vx = Math.cos(ang) * spd;
            this.vy = randf(-80.0, 60.0) + Math.sin(ang) * spd * 0.4;
        }
        this.spin = randf(0, 2 * Math.PI);
        this.spinSpeed = randf(2.8, 5.0);
        this.phase = randf(0, 2 * Math.PI);
        this.life = 16.0;
        this.state = DIAMOND_FALLING;
        this.flySpeed = 320.0;
        this.alive = true;
    }

    update(dt, game) {
        this.spin += this.spinSpeed * dt;
        this.phase += dt * 3.2;

        if (this.state === DIAMOND_FLYING) {
            const tx = DIAMOND_HUD_CENTER[0], ty = DIAMOND_HUD_CENTER[1];
            const dx = tx - this.x, dy = ty - this.y;
            const dist = Math.hypot(dx, dy);
            this.flySpeed += 2800.0 * dt;
            const step = this.flySpeed * dt;
            if (dist <= step + 14) {
                this.alive = false;
                game._diamondArrived(this);
                return;
            }
            this.x += dx / dist * step;
            this.y += dy / dist * step;
            return;
        }

        this.life -= dt;
        if (this.life <= 0) { this.alive = false; return; }

        if (this.fromBoss) {
            this.vx *= Math.max(0.0, 1.0 - 2.2 * dt);
            this.vy += (76.0 - this.vy) * Math.min(1.0, 2.0 * dt);
        } else {
            this.x += Math.sin(this.phase) * 16.0 * dt;
        }

        // Từ tính hút về người chơi khi ở gần
        const player = game.player;
        if (player && player.alive) {
            const dx = player.centerX - this.x;
            const dy = player.centerY - this.y;
            const dist = Math.hypot(dx, dy);
            // Nếu có từ tính toàn màn hình từ skill Ưng Vàng
            const pullRadius = player.magnetAll ? 1200 : 110;
            if (dist < pullRadius && dist > 1.0) {
                const pull = (player.magnetAll ? 650.0 : 200.0) * dt;
                this.x += dx / dist * pull;
                this.y += dy / dist * pull;
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.x < 10) this.x = 10;
        else if (this.x > WIDTH - 10) this.x = WIDTH - 10;
        if (this.y > HEIGHT + 24) this.alive = false;
    }

    collect(game) {
        this.state = DIAMOND_FLYING;
        this.flySpeed = 340.0;
        for (let i = 0; i < 7; i++) {
            game.addParticle(this.x, this.y, randf(-90, 90), randf(-90, 90), 0.5, DIAMOND_LIGHT, 3);
        }
        game.addPopup(this.x, this.y - 14, "+" + this.value, DIAMOND_LIGHT, false, true);
        game.save.addDiamonds(this.value);
        game.hudPulse = 0.4;
        game.play("diamond");
    }

    draw(g) {
        if (this.state === DIAMOND_FALLING && this.life < 2.5) {
            if (Math.trunc(this.life * 8) % 2 === 0) return;
        }
        const frames = getDiamondFrames();
        const idx = Math.trunc(this.spin * 2.5) % 16;
        const spr = frames[idx];
        const pulse = (Math.sin(this.phase * 1.8) + 1.0) * 0.5;
        const glow = getCircleGlow(16, DIAMOND_COL, 40 + 60 * pulse);
        const cx = Math.trunc(this.x), cy = Math.trunc(this.y);
        g.drawImage(glow, cx - glow.width / 2, cy - glow.height / 2);
        g.drawImage(spr, cx - spr.width / 2, cy - spr.height / 2);
    }

    drawOnScreen(g) {
        const frames = getDiamondFrames();
        const idx = Math.trunc(this.spin * 2.5) % 16;
        const spr = frames[idx];
        const cx = Math.trunc(this.x), cy = Math.trunc(this.y);
        g.drawImage(spr, cx - spr.width / 2, cy - spr.height / 2);
    }
}

// ============================================================
// POWER-UP (Vật phẩm nâng cấp vũ khí & khiên & hồi máu)
// ============================================================
class PowerUp {
    constructor(x, y, kind) {
        this.x = +x; this.y = +y;
        this.width = 24;
        this.height = 24;
        this.kind = kind;
        this.speed = 115.0;
        this.alive = true;
        this.phase = 0.0;
    }

    get color() {
        if (this.kind === PU_RAPID) return YELLOW;
        if (this.kind === PU_DOUBLE) return ORANGE;
        if (this.kind === PU_SHIELD) return CYAN;
        if (this.kind === PU_HEAL) return GREEN;
        return WHITE;
    }

    get letter() {
        if (this.kind === PU_RAPID) return "R";
        if (this.kind === PU_DOUBLE) return "D";
        if (this.kind === PU_SHIELD) return "S";
        if (this.kind === PU_HEAL) return "+";
        return "?";
    }

    update(dt) {
        this.y += this.speed * dt;
        this.phase += dt * 6.0;
        if (this.y > HEIGHT) this.alive = false;
    }

    draw(g) {
        const pulse = (Math.sin(this.phase) + 1) * 0.5;
        const glowSize = Math.trunc(6 + pulse * 5);
        const glow = getRectGlow(this.width + glowSize * 2, this.height + glowSize * 2,
            this.color, 70 + 60 * pulse);
        g.drawImage(glow, Math.trunc(this.x - glowSize), Math.trunc(this.y - glowSize));

        const x = Math.trunc(this.x), y = Math.trunc(this.y);
        g.fillStyle = rgb(this.color);
        g.beginPath();
        g.roundRect ? g.roundRect(x, y, this.width, this.height, 4) : g.rect(x, y, this.width, this.height);
        g.fill();
        g.strokeStyle = rgb(WHITE);
        g.lineWidth = 2;
        g.stroke();

        drawTextTo(g, this.letter, 18, true, BLACK,
            x + this.width / 2, y + this.height / 2,
            { align: "center", baseline: "middle" });
    }
}

// ============================================================
// EXPLOSION (Vụ nổ sinh động)
// ============================================================
class Explosion {
    constructor(x, y, color, small) {
        this.x = +x; this.y = +y;
        this.color = color || ORANGE;
        this.life = small ? 0.20 : 0.45;
        this.maxLife = this.life;
        this.flash = 1.0;
        this.alive = true;
        this.particles = [];
        const n = small ? 10 : 28;
        const palette = [WHITE, YELLOW, ORANGE, RED, color];
        for (let i = 0; i < n; i++) {
            const angle = randf(0, 2 * Math.PI);
            const speed = randf(50, 220);
            this.particles.push({
                x: +x, y: +y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: randi(2, 6),
                color: choice(palette),
            });
        }
    }

    update(dt) {
        this.life -= dt;
        this.flash = Math.max(0.0, this.flash - dt * 4.0);
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.93;
            p.vy *= 0.93;
        }
        if (this.life <= 0) this.alive = false;
    }

    draw(g) {
        if (this.flash > 0) {
            const r = Math.trunc(32 * this.flash);
            if (r > 1) {
                g.fillStyle = "rgba(255,255,255," + (180 / 255).toFixed(3) + ")";
                g.beginPath();
                g.arc(Math.trunc(this.x), Math.trunc(this.y), r, 0, Math.PI * 2);
                g.fill();
            }
        }
        const alpha = Math.max(0.0, this.life / this.maxLife);
        for (const p of this.particles) {
            const size = Math.max(1, Math.trunc(p.size * alpha));
            g.fillStyle = rgb(p.color, alpha);
            g.fillRect(Math.trunc(p.x), Math.trunc(p.y), size, size);
        }
    }
}

// ============================================================
// PLAYER (Máy bay người chơi & Kỹ năng đặc biệt riêng)
// ============================================================
class Player {
    constructor(x, y, skinDef, game) {
        this.game = game;
        this.x = +x; this.y = +y;
        this.startX = +x; this.startY = +y;
        this.width = PLAYER_W;
        this.height = PLAYER_H;
        this.speed = 360.0;
        this.fireDelay = BASE_FIRE_DELAY;
        this.fireCooldown = 0.0;
        this.lives = 3;
        this.alive = true;
        this.respawnTimer = 0.0;
        this.invulnTimer = 0.0;
        this.rapidTimer = 0.0;
        this.doubleTimer = 0.0;
        this.shieldActive = false;
        this.thrusterPhase = 0.0;

        // Kỹ năng năng lượng (Energy gauge 0 -> 100)
        this.energy = 50.0;
        this.maxEnergy = 100.0;
        this.skillActiveTimer = 0.0;
        this.stealthActive = false;
        this.magnetAll = false;
        this.overdriveActive = false;

        this.applySkin(skinDef);

        this.muzzleTimer = 0.0;
        this.barrels = [];
        this.trailTimer = 0.0;
        this.rainbowPhase = 0.0;
        this.touchTarget = null;
    }

    applySkin(skinDef) {
        this.currentSkin = skinDef || SKINS.DEFAULT;
        this.skinId = this.currentSkin.id;
        this.damageMult = this.currentSkin.damageMult;
        this.bulletCount = this.currentSkin.bulletCount;
        this.fireRateMult = this.currentSkin.fireRateMult;
    }

    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }

    addEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
    }

    // ---------- KÍCH HOẠT KỸ NĂNG ĐẶC BIỆT ----------
    activateSkill() {
        if (!this.alive || this.energy < this.maxEnergy) return false;
        const game = this.game;
        const skin = this.currentSkin;
        this.energy = 0;
        this.skillActiveTimer = skin.skill.duration || 3.0;

        game.flash(160, 0.35, WHITE);
        game.shake(6, 0.4);
        game.play("powerup");
        game.addPopup(this.centerX, this.centerY - 25, "SKILL: " + skin.skill.name, YELLOW, true);

        // Kỹ năng riêng biệt theo 8 máy bay:
        switch (skin.id) {
            case "DEFAULT":
                // Tân Binh: Khiên 6s + Tăng tốc
                this.shieldActive = true;
                this.rapidTimer = 6.0;
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, GREEN, 160));
                break;

            case "BLUE_FALCON":
                // Ưng Xanh: Bão Băng Phi Đạn (14 tia laser băng xuyên thấu cực mạnh)
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, CYAN, 220));
                for (let a = -45; a <= 45; a += 7) {
                    const b = new Bullet(this.centerX, this.y, a, BASE_BULLET_DAMAGE * this.damageMult * 2.2,
                        [120, 220, 255], "bullet_blue_laser", true);
                    game.bullets.push(b);
                }
                break;

            case "RED_VIPER":
                // Hổ Mang Đỏ: Mưa Tên Lửa Tầm Nhiệt (10 tên lửa tự tìm địch)
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, RED, 180));
                for (let i = 0; i < 10; i++) {
                    const ang = -60 + i * 13;
                    const b = new Bullet(this.centerX + randf(-15, 15), this.y, ang,
                        BASE_BULLET_DAMAGE * this.damageMult * 2.5, [255, 90, 60], "bullet_red_missile", false, true);
                    game.bullets.push(b);
                }
                break;

            case "GOLDEN_HAWK":
                // Ưng Vàng: Từ tính hoàng kim hút toàn bộ kim cương + khiên bất tử 5s
                this.shieldActive = true;
                this.invulnTimer = 5.0;
                this.magnetAll = true;
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, GOLD, 300));
                // Kéo tức thì mọi viên kim cương
                for (const d of game.diamonds) d.collect(game);
                break;

            case "SHADOW":
                // Bóng Đêm: Tàng hình bất tử 4s + quét sạch đạn địch
                this.stealthActive = true;
                this.invulnTimer = 4.0;
                game.enemyBullets.length = 0; // Hủy toàn bộ đạn địch trên màn hình
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, PURPLE, 350, 0.6, 5));
                break;

            case "PLASMA":
                // Plasma: Siêu cầu plasma càn quét nổ diện rộng
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, [40, 255, 200], 200));
                const plasmaOrb = new Bullet(this.centerX, this.y - 20, 0,
                    BASE_BULLET_DAMAGE * this.damageMult * 8.0, [40, 255, 200], "bullet_plasma_ball", true, false, true);
                plasmaOrb.vx = 0; plasmaOrb.vy = -380;
                game.bullets.push(plasmaOrb);
                break;

            case "GALAXY":
                // Ngân Hà: Hố đen tinh vân hút quái & gây sát thương khủng
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, [180, 100, 255], 320, 0.8, 6));
                for (let a = -70; a <= 70; a += 14) {
                    const b = new Bullet(this.centerX, this.y, a,
                        BASE_BULLET_DAMAGE * this.damageMult * 3.0, [200, 140, 255], "bullet_galaxy_shard", true);
                    game.bullets.push(b);
                }
                // Hủy 50% quái thường ngẫu nhiên
                if (game.enemies.length > 0) {
                    const victims = game.enemies.slice(0, Math.ceil(game.enemies.length / 2));
                    for (const v of victims) {
                        v.hit(999);
                        game.explosions.push(new Explosion(v.x + v.width / 2, v.y + v.height / 2, PURPLE));
                    }
                }
                break;

            case "LEGENDARY":
                // Huyền Thoại: OVERDRIVE THẦN THÁNH
                this.overdriveActive = true;
                this.invulnTimer = 4.5;
                game.enemyBullets.length = 0;
                game.shockwaves.push(new Shockwave(this.centerX, this.centerY, GOLD, 450, 1.0, 8));
                // Bắn 36 đạn tỏa 360 độ
                for (let deg = 0; deg < 360; deg += 10) {
                    const rad = deg * Math.PI / 180;
                    const b = new Bullet(this.centerX, this.centerY, deg,
                        BASE_BULLET_DAMAGE * this.damageMult * 3.5, [255, 240, 140], "bullet_god_beam", true);
                    b.vx = 650 * Math.sin(rad);
                    b.vy = -650 * Math.cos(rad);
                    game.bullets.push(b);
                }
                break;
        }
        return true;
    }

    update(dt, input) {
        this.thrusterPhase += dt * 18.0;
        if (this.muzzleTimer > 0) this.muzzleTimer -= dt;
        this.rainbowPhase += dt;

        // Nạp năng lượng kỹ năng từ từ (khoảng 30 giây đầy tự nhiên, tiêu diệt địch nạp thêm)
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + dt * 3.3);
        }

        if (this.skillActiveTimer > 0) {
            this.skillActiveTimer -= dt;
            if (this.skillActiveTimer <= 0) {
                this.stealthActive = false;
                this.magnetAll = false;
                this.overdriveActive = false;
            }
        }

        if (!this.alive) {
            if (this.lives > 0) {
                this.respawnTimer -= dt;
                if (this.respawnTimer <= 0) this.respawn();
            }
            return;
        }

        if (this.invulnTimer > 0) this.invulnTimer -= dt;
        if (this.fireCooldown > 0) this.fireCooldown -= dt;
        if (this.rapidTimer > 0) this.rapidTimer -= dt;
        if (this.doubleTimer > 0) this.doubleTimer -= dt;

        // ---------- DI CHUYỂN ----------
        if (this.touchTarget) {
            const dx = this.touchTarget.x - this.centerX;
            const dy = this.touchTarget.y - this.centerY;
            const TOUCH_SPEED = 660.0;
            const maxStep = TOUCH_SPEED * dt;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.5) {
                const step = Math.min(dist, maxStep);
                this.x += dx / dist * step;
                this.y += dy / dist * step;
            }
        }

        if (input) {
            const moveLeft = input.isDown("ArrowLeft") || input.isDown("KeyA");
            const moveRight = input.isDown("ArrowRight") || input.isDown("KeyD");
            const moveUp = input.isDown("ArrowUp") || input.isDown("KeyW");
            const moveDown = input.isDown("ArrowDown") || input.isDown("KeyS");
            let spd = this.speed;
            if (this.skillActiveTimer > 0 && this.skinId === "DEFAULT") spd *= 1.45;

            if (moveLeft) this.x -= spd * dt;
            if (moveRight) this.x += spd * dt;
            if (moveUp) this.y -= spd * dt;
            if (moveDown) this.y += spd * dt;
        }

        if (this.x < 12) this.x = 12;
        if (this.x > WIDTH - this.width - 12) this.x = WIDTH - this.width - 12;
        if (this.y < 58) this.y = 58;
        if (this.y > HEIGHT - this.height - 30) this.y = HEIGHT - this.height - 30;

        this._emitSkinParticles(dt);
    }

    _emitSkinParticles(dt) {
        const game = this.game;
        const skin = this.currentSkin;
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
            this.trailTimer = 0.04;
            const ex = this.centerX + randf(-3, 3);
            const ey = this.y + this.height - 2;
            const trailCol = skin.trail || [90, 255, 120];
            game.addParticle(ex, ey, randf(-12, 12), 70.0, 0.35, trailCol, 3.5);
        }
    }

    tryFire(game) {
        if (!this.alive) return;
        if (this.fireCooldown > 0) return;

        let delay = this.fireDelay / this.fireRateMult;
        if (this.rapidTimer > 0) delay *= 0.45;

        const cx = this.centerX;
        const y = this.y + 4;
        const damage = BASE_BULLET_DAMAGE * this.damageMult;
        const color = this.currentSkin.bulletColor;
        const asset = this.currentSkin.bulletAsset || "bullet_green_laser";

        this.barrels = [];
        const spread = BULLET_SPREADS[this.bulletCount] || BULLET_SPREADS[1];
        for (const [dx, angleDeg] of spread) {
            const bx = cx + dx;
            this.barrels.push([bx, y]);
            game.bullets.push(new Bullet(bx, y, angleDeg, damage, color, asset));
        }

        // Vật phẩm bắn đôi
        if (this.doubleTimer > 0) {
            for (const ex of [-14, 14]) {
                this.barrels.push([cx + ex, y + 4]);
                game.bullets.push(new Bullet(cx + ex, y + 4, 0.0, damage, color, asset));
            }
        }

        this.muzzleTimer = 0.06;
        this.fireCooldown = delay;
        game.play("shoot");
    }

    hit() {
        if (this.invulnTimer > 0) return false;
        if (this.shieldActive) {
            this.shieldActive = false;
            this.invulnTimer = 0.8;
            this.game.shockwaves.push(new Shockwave(this.centerX, this.centerY, CYAN, 90));
            return false;
        }
        this.alive = false;
        this.lives -= 1;
        this.respawnTimer = 1.2;
        this.invulnTimer = 2.2;
        this.game.shockwaves.push(new Shockwave(this.centerX, this.centerY, RED, 140));
        return true;
    }

    respawn() {
        this.alive = true;
        this.x = this.startX;
        this.y = this.startY;
        this.rapidTimer = 0.0;
        this.doubleTimer = 0.0;
        this.shieldActive = false;
        this.fireCooldown = 0.0;
        this.touchTarget = null;
    }

    activatePowerup(kind) {
        if (kind === PU_RAPID) this.rapidTimer = 9.0;
        else if (kind === PU_DOUBLE) this.doubleTimer = 9.0;
        else if (kind === PU_SHIELD) this.shieldActive = true;
        else if (kind === PU_HEAL) this.lives = Math.min(5, this.lives + 1);
        this.addEnergy(20);
    }

    draw(g) {
        if (!this.alive) return;
        if (this.invulnTimer > 0 && Math.trunc(this.invulnTimer * 12) % 2 === 0) return;

        const cx = Math.trunc(this.centerX);
        const cy = Math.trunc(this.centerY);
        const skin = this.currentSkin;

        // Vòng hào quang nếu có
        if (skin.aura || this.overdriveActive) {
            const radius = 32 + (Math.sin(this.thrusterPhase * 0.7) + 1) * 4;
            g.strokeStyle = rgb(skin.glowColor || GOLD, 0.7);
            g.lineWidth = 2;
            g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
        }

        // Lửa động cơ phản lực
        const flameH = 6 + (Math.sin(this.thrusterPhase) + 1) * 5;
        const fy = Math.trunc(this.y + this.height - 4);
        const [outer, inner] = skin.flame || [YELLOW, ORANGE];
        g.fillStyle = rgb(outer);
        g.beginPath();
        g.moveTo(cx - 5, fy); g.lineTo(cx + 5, fy); g.lineTo(cx, fy + flameH);
        g.closePath(); g.fill();
        g.fillStyle = rgb(inner);
        g.beginPath();
        g.moveTo(cx - 2, fy); g.lineTo(cx + 2, fy); g.lineTo(cx, fy + flameH * 0.6);
        g.closePath(); g.fill();

        // Thân máy bay PNG
        const spr = getPlayerSprite(this.skinId);
        g.save();
        if (this.stealthActive) g.globalAlpha = 0.35; // Tàng hình mờ ảo
        g.drawImage(spr,
            Math.trunc(this.centerX - spr.width / 2),
            Math.trunc(this.centerY - spr.height / 2));
        g.restore();

        // Chớp nòng súng khi bắn
        if (this.muzzleTimer > 0 && this.barrels.length) {
            const r = 5;
            for (const [bx, by] of this.barrels) {
                g.fillStyle = rgb(YELLOW);
                g.beginPath(); g.arc(Math.trunc(bx), Math.trunc(by), r, 0, Math.PI * 2); g.fill();
                g.fillStyle = rgb(WHITE);
                g.beginPath(); g.arc(Math.trunc(bx), Math.trunc(by), 2, 0, Math.PI * 2); g.fill();
            }
        }

        // Bong bóng khiên bảo vệ
        if (this.shieldActive) {
            const radius = Math.max(this.width, this.height) / 2 + 10;
            g.fillStyle = "rgba(80, 240, 255, 0.22)";
            g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.fill();
            g.strokeStyle = "rgba(180, 250, 255, 0.85)";
            g.lineWidth = 2.5;
            g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
        }
    }
}

// ============================================================
// BULLET (Đạn người chơi bằng PNG, xoay góc, vệt sáng)
// ============================================================
class Bullet {
    constructor(x, y, angleDeg, damage, color, asset, piercing, homing, explosive) {
        this.x = +x; this.y = +y;
        this.angleDeg = angleDeg || 0;
        this.damage = +damage;
        this.color = color || CYAN;
        this.asset = asset || "bullet_green_laser";
        this.piercing = !!piercing;
        this.homing = !!homing;
        this.explosive = !!explosive;
        this.pierceCount = this.piercing ? 5 : 1;

        const rad = this.angleDeg * Math.PI / 180;
        this.vx = BASE_BULLET_SPEED * Math.sin(rad);
        this.vy = -BASE_BULLET_SPEED * Math.cos(rad);
        this.alive = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y + 30 < 0 || this.y - 30 > HEIGHT ||
            this.x + 30 < 0 || this.x - 30 > WIDTH) {
            this.alive = false;
        }
    }

    draw(g) {
        const spr = getBulletSprite(this.asset);
        g.save();
        g.translate(Math.trunc(this.x), Math.trunc(this.y));
        if (this.angleDeg !== 0) {
            g.rotate(this.angleDeg * Math.PI / 180);
        }
        if (spr && spr.width) {
            g.drawImage(spr, -spr.width / 2, -spr.height / 2);
        } else {
            g.fillStyle = rgb(this.color);
            g.fillRect(-2, -8, 4, 16);
        }
        g.restore();
    }
}

// ============================================================
// ENEMY BULLET (Đạn kẻ địch & Boss)
// ============================================================
class EnemyBullet {
    constructor(x, y, vx, vy, color, radius, homing, style, asset) {
        this.x = +x; this.y = +y;
        this.vx = (vx === undefined) ? 0.0 : +vx;
        this.vy = (vy === undefined) ? 280.0 : +vy;
        this.color = color || RED;
        this.radius = (radius === undefined) ? 5 : radius;
        this.homing = !!homing;
        this.style = style || "circle";
        this.asset = asset || "bullet_enemy_laser";
        this.speed = Math.hypot(this.vx, this.vy) || 280.0;
        this.life = 6.0;
        this.alive = true;
    }

    update(dt, game) {
        this.life -= dt;
        if (this.life <= 0) { this.alive = false; return; }

        if (this.homing) {
            const player = game.player;
            if (player && player.alive && !player.stealthActive) {
                const dx = player.centerX - this.x;
                const dy = player.centerY - this.y;
                const target = Math.atan2(dy, dx);
                let current = Math.atan2(this.vy, this.vx);
                let diff = target - current;
                while (diff > Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                const maxTurn = 2.4 * dt;
                if (Math.abs(diff) > maxTurn) {
                    diff = diff > 0 ? maxTurn : -maxTurn;
                }
                current += diff;
                this.vx = Math.cos(current) * this.speed;
                this.vy = Math.sin(current) * this.speed;
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y > HEIGHT + 30 || this.y < -150 ||
            this.x < -30 || this.x > WIDTH + 30) {
            this.alive = false;
        }
    }

    draw(g) {
        const x = Math.trunc(this.x), y = Math.trunc(this.y);
        const spr = getBulletSprite(this.asset);
        if (spr && spr.width) {
            g.drawImage(spr, x - spr.width / 2, y - spr.height / 2);
        } else {
            const glow = getCircleGlow(this.radius + 4, this.color, 80);
            g.drawImage(glow, x - glow.width / 2, y - glow.height / 2);
            g.fillStyle = rgb(this.color);
            g.beginPath(); g.arc(x, y, this.radius, 0, Math.PI * 2); g.fill();
            g.fillStyle = rgb(WHITE);
            g.beginPath(); g.arc(x, y, Math.max(1, this.radius - 2), 0, Math.PI * 2); g.fill();
        }
    }
}

// ============================================================
// EGG BOMB (Quả trứng bom rơi chậm rồi phát nổ chùm)
// ============================================================
class EggBomb {
    constructor(x, y) {
        this.x = +x; this.y = +y;
        this.vy = 85.0;
        this.timer = 2.4;
        this.width = 24;
        this.height = 30;
        this.alive = true;
    }

    update(dt, game) {
        this.y += this.vy * dt;
        this.timer -= dt;
        if (this.timer <= 0) {
            this.explode(game);
        }
        if (this.y > HEIGHT + 20) this.alive = false;
    }

    explode(game) {
        this.alive = false;
        game.explosions.push(new Explosion(this.x, this.y, RED));
        game.shockwaves.push(new Shockwave(this.x, this.y, ORANGE, 70));
        // Bung 6 mảnh đạn tỏa đều
        for (let i = 0; i < 6; i++) {
            const ang = i * Math.PI / 3;
            game.enemyBullets.push(new EnemyBullet(
                this.x, this.y, Math.cos(ang) * 190, Math.sin(ang) * 190, RED, 4));
        }
    }

    draw(g) {
        const img = ASSETS.images.egg_bomb;
        const x = Math.trunc(this.x), y = Math.trunc(this.y);
        if (img && img.width) {
            g.drawImage(img, x - 12, y - 15, 24, 30);
        } else {
            g.fillStyle = rgb(RED);
            g.beginPath();
            g.ellipse(x, y, 10, 14, 0, 0, Math.PI * 2);
            g.fill();
        }
    }
}

// ============================================================
// ENEMY (10 Loại gà có ngoại hình PNG, thuộc tính & kỹ năng riêng)
// ============================================================
class Enemy {
    constructor(x, y, enemyType, wave) {
        this.x = +x; this.y = +y;
        this.width = ENEMY_W;
        this.height = ENEMY_H;
        this.enemyType = enemyType;
        const data = ENEMY_DATA[enemyType] || ENEMY_DATA[E_TYPE_1];
        this.data = data;
        this.color = data.color;
        this.hp = +data.hp;
        this.maxHp = this.hp;
        this.score = data.score;
        this.alive = true;
        this.hitFlash = 0.0;

        // Cơ chế riêng
        this.diving = false;
        this.diveVx = 0;
        this.diveVy = 0;
        this.diveTimer = (enemyType === E_TYPE_6) ? randf(3.0, 8.0) : 0;
        this.shieldRadius = data.shieldRadius || 0;
    }

    hit(damage) {
        let finalDamage = +damage;
        // Gà bọc thép giảm 50% sát thương
        if (this.data.armor) {
            finalDamage *= this.data.armor;
        }
        this.hp -= finalDamage;
        this.hitFlash = 0.08;
        if (this.hp <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    update(dt, game) {
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // Gà cảm tử lao xuống
        if (this.enemyType === E_TYPE_6) {
            this.diveTimer -= dt;
            if (this.diveTimer <= 0 && !this.diving) {
                this.diving = true;
                const px = game.player ? game.player.centerX : WIDTH / 2;
                const py = game.player ? game.player.centerY : HEIGHT;
                const dx = px - (this.x + this.width / 2);
                const dy = py - (this.y + this.height / 2);
                const dist = Math.hypot(dx, dy) || 1;
                const spd = this.data.diveSpeed || 320;
                this.diveVx = dx / dist * spd;
                this.diveVy = Math.max(120, dy / dist * spd);
            }
            if (this.diving) {
                this.x += this.diveVx * dt;
                this.y += this.diveVy * dt;
                if (this.y > HEIGHT + 40) {
                    this.alive = false;
                }
            }
        }
    }

    draw(g, frame) {
        const spr = getEnemySprite(this.enemyType, frame, this.hitFlash > 0);
        const x = Math.trunc(this.x);
        const y = Math.trunc(this.y);
        g.drawImage(spr, x, y);

        // Vòng bảo vệ của Gà Tạo Khiên (Shield Hen)
        if (this.enemyType === E_TYPE_10) {
            g.strokeStyle = "rgba(70, 230, 255, 0.4)";
            g.lineWidth = 1.5;
            g.beginPath();
            g.arc(x + this.width / 2, y + this.height / 2, this.shieldRadius, 0, Math.PI * 2);
            g.stroke();
        }
    }
}

// ============================================================
// BOSS (6 GÀ BOSS KHỔNG LỒ THEO 6 MAP)
// ============================================================
class Boss {
    constructor(bossIndex, level, game) {
        this.game = game;
        this.defIndex = Math.max(0, Math.min(5, bossIndex | 0));
        this.defn = BOSS_DEFS[this.defIndex];

        const spr = getBossSprite(this.defIndex, 0);
        this.width = spr.width || this.defn.width;
        this.height = spr.height || this.defn.height;
        this.x = +Math.trunc(WIDTH / 2 - this.width / 2);
        this.y = -this.height - 40;
        this.targetY = 90.0;

        const cycle = Math.max(1, game.save.currentMap);
        this.maxHp = this.defn.hp * (1.0 + (level - 1) * 0.15);
        this.hp = this.maxHp;
        this.scoreValue = this.defn.score;
        this.name = this.defn.name;
        this.title = this.defn.title;

        this.moveT = 0.0;
        this.moveSpeed = 1.0;
        this.sweepDir = 1;

        this.attackDelay = this.defn.attackDelay;
        this.attackTimer = 1.5;
        this.attackIndex = 0;
        this.phase = 1;
        this.enraged = false;
        this.flash = 0.0;
        this.hitSoundTimer = 0.0;
        this.alive = true;
        this.entered = false;
    }

    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }

    _attacks() {
        return this.defn.phaseAttacks[this.phase] || ["aimed", "spread", "circular"];
    }

    hit(damage) {
        if (!this.alive) return false;
        this.hp -= +damage;
        this.flash = 0.08;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            return true;
        }
        this._checkPhase();
        return false;
    }

    _checkPhase() {
        const frac = this.hp / this.maxHp;
        let newPhase = 1;
        if (frac <= 0.33) newPhase = 3;
        else if (frac <= 0.66) newPhase = 2;

        if (newPhase !== this.phase) {
            this.phase = newPhase;
            this.attackIndex = 0;
            this.attackTimer = 0.5;
            const game = this.game;
            game.flash(180, 0.3, RED);
            game.shake(8, 0.5);
            game.play("boss_phase");
            game.shockwaves.push(new Shockwave(this.centerX, this.centerY, RED, 280, 0.6, 6));
            // Tặng vật phẩm hỗ trợ khi chuyển pha
            game.powerups.push(new PowerUp(
                this.centerX - 12, this.y + this.height + 15,
                choice([PU_RAPID, PU_SHIELD, PU_DOUBLE, PU_HEAL])));
        }

        if (!this.enraged && frac <= 0.25) {
            this.enraged = true;
            this.attackTimer = Math.min(this.attackTimer, 0.3);
        }
    }

    _aimVel(speed, angleOff) {
        const game = this.game;
        const cx = this.centerX, cy = this.centerY;
        const px = game.player ? game.player.centerX : WIDTH / 2;
        const py = game.player ? game.player.centerY : HEIGHT;
        const dx = px - cx, dy = py - cy;
        const d = Math.hypot(dx, dy) || 1.0;
        let vx = dx / d * speed;
        let vy = dy / d * speed;
        if (angleOff) {
            const cosA = Math.cos(angleOff);
            const sinA = Math.sin(angleOff);
            const nx = vx * cosA - vy * sinA;
            const ny = vx * sinA + vy * cosA;
            vx = nx; vy = ny;
        }
        return [vx, vy];
    }

    _spawnBullet(vx, vy, color, radius, homing) {
        color = color || this.defn.bulletColor;
        this.game.enemyBullets.push(new EnemyBullet(
            this.centerX, this.centerY, vx, vy, color, radius || 5, homing, "circle", "bullet_boss_orb"));
    }

    _fireRing(count, speed, angleOffset) {
        for (let i = 0; i < count; i++) {
            const ang = 2 * Math.PI * i / count + (angleOffset || 0);
            this._spawnBullet(Math.cos(ang) * speed, Math.sin(ang) * speed);
        }
    }

    _doAttack(name) {
        const game = this.game;
        if (game.enemyBullets.length > 95) return;
        const speed = this.defn.bulletSpeed;

        if (name === "aimed") {
            const [vx, vy] = this._aimVel(speed);
            this._spawnBullet(vx, vy, undefined, 6);
        } else if (name === "threeway") {
            for (const off of [-0.28, 0.0, 0.28]) {
                const [vx, vy] = this._aimVel(speed * 0.95, off);
                this._spawnBullet(vx, vy, undefined, 5);
            }
        } else if (name === "spread") {
            for (const off of [-0.44, -0.22, 0.0, 0.22, 0.44]) {
                const [vx, vy] = this._aimVel(speed * 0.9, off);
                this._spawnBullet(vx, vy, undefined, 5);
            }
        } else if (name === "circular") {
            this._fireRing(14, 160, randf(0, Math.PI));
        } else if (name === "burst") {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    if (this.alive) {
                        const [vx, vy] = this._aimVel(speed * 1.15, randf(-0.1, 0.1));
                        this._spawnBullet(vx, vy, undefined, 5);
                    }
                }, i * 140);
            }
        } else if (name === "homing") {
            for (const off of [-0.35, 0.35]) {
                const [vx, vy] = this._aimVel(185, off);
                this._spawnBullet(vx, vy, PURPLE, 6, true);
            }
        } else if (name === "meteor") {
            // Mưa thiên thạch
            for (let i = 0; i < 5; i++) {
                game.enemyBullets.push(new EnemyBullet(
                    randf(40, WIDTH - 40), 0, randf(-40, 40), randf(240, 340), ORANGE, 7));
            }
        } else if (name === "firestorm") {
            this._fireRing(18, 175, randf(0, Math.PI));
            game.shake(4, 0.3);
        } else if (name === "freeze_beam") {
            for (let off = -0.6; off <= 0.6; off += 0.15) {
                const [vx, vy] = this._aimVel(speed * 1.1, off);
                this._spawnBullet(vx, vy, CYAN, 6);
            }
        } else if (name === "lightning") {
            game.flash(120, 0.15, [220, 160, 255]);
            this._fireRing(16, 210);
        } else if (name === "cosmic_rain") {
            for (let i = 0; i < 8; i++) {
                game.enemyBullets.push(new EnemyBullet(
                    randf(20, WIDTH - 20), 0, randf(-20, 20), randf(260, 360), GOLD, 6));
            }
        }
    }

    update(dt, game) {
        if (!this.alive) return;
        if (this.flash > 0) this.flash -= dt;
        if (this.hitSoundTimer > 0) this.hitSoundTimer -= dt;

        if (!this.entered) {
            this.y += 120.0 * dt;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.entered = true;
            }
            return;
        }

        this.moveT += dt;
        const amp = (WIDTH - this.width) / 2 - 30;
        const cx = (WIDTH - this.width) / 2;
        this.x = cx + Math.sin(this.moveT * this.moveSpeed) * amp;

        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            const attacks = this._attacks();
            const name = attacks[this.attackIndex % attacks.length];
            this.attackIndex += 1;
            this._doAttack(name);
            let delay = this.attackDelay;
            if (this.enraged) delay *= 0.65;
            this.attackTimer = delay;
        }
    }

    draw(g) {
        let variant = 0;
        if (this.flash > 0) variant = 1;
        else if (this.enraged) variant = 2;

        const spr = getBossSprite(this.defIndex, variant);
        const x = Math.trunc(this.x);
        const y = Math.trunc(this.y);
        g.drawImage(spr, x, y);

        // Thanh máu Boss hiện đại trên đầu
        const barW = 280;
        const barH = 10;
        const bx = Math.trunc(this.centerX - barW / 2);
        const by = Math.trunc(this.y - 18);
        const hpFrac = Math.max(0, this.hp / this.maxHp);

        // Khung nền
        g.fillStyle = "rgba(10, 15, 30, 0.85)";
        g.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
        // Máu hiện tại
        const hpCol = hpFrac > 0.5 ? [70, 230, 90] : (hpFrac > 0.25 ? [255, 200, 50] : [255, 50, 50]);
        g.fillStyle = rgb(hpCol);
        g.fillRect(bx, by, Math.trunc(barW * hpFrac), barH);
        g.strokeStyle = "rgba(255, 255, 255, 0.6)";
        g.lineWidth = 1;
        g.strokeRect(bx, by, barW, barH);

        // Tên Boss
        drawTextTo(g, this.name + " (" + Math.ceil(this.hp) + "/" + Math.ceil(this.maxHp) + ")", 12, true, WHITE,
            this.centerX, by - 14, { align: "center" });
    }
}
