/* ============================================================
 * File: game.js - Class Game: Vòng lặp chính, 6 Map, HUD, Kỹ năng
 * ============================================================ */

const MENU_LABELS = ["CHƠI TIẾP", "CHỌN BẢN ĐỒ", "CỬA HÀNG", "HƯỚNG DẪN", "CÀI ĐẶT", "THOÁT GAME"];
const SETTING_LABELS = ["ÂM THANH", "RUNG MÀN HÌNH", "HIỆU ỨNG HẠT",
    "XÓA DỮ LIỆU", "NHẬP DỮ LIỆU", "XUẤT DỮ LIỆU", "QUAY LẠI"];

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // ---------------- Lưu / Cửa hàng ----------------
        this.save = new SaveManager();
        this.settings = this.save.data.settings;
        this.skinManager = new SkinManager(this.save);
        this.highScore = this.save.data.high_score;

        // ---------------- Tiến trình 6 Map ----------------
        this.map = this.save.currentMap;
        this.level = this.save.currentLevel;
        this.wave = 1;
        this.state = ST.MENU;
        this.score = 0;

        // Địch & Đội hình
        this.enemies = [];
        this.enemyDirection = 1;
        this.enemySpeed = 40.0;
        this.enemyStepDown = 18;
        this.enemyFireTimer = 0.0;
        this.enemyFireDelay = 1.4;
        this.animTimer = 0.0;
        this.animFrame = 0;
        this.animInterval = 0.45;
        this.waveInitialCount = 24;

        // Thực thể
        this.player = null;
        this.bullets = [];
        this.enemyBullets = [];
        this.eggBombs = [];
        this.powerups = [];
        this.explosions = [];
        this.particles = [];
        this.feathers = [];
        this.shockwaves = [];
        this.popups = [];
        this.diamonds = [];

        this.blinkTimer = 0;

        // Hiệu ứng
        this.bannerTimer = 0;
        this.bannerText = "";
        this.hudPulse = 0;
        this.shakeTime = 0;
        this.shakeDur = 1.0;
        this.shakeMag = 0.0;
        this.flashTimer = 0;
        this.flashDur = 1.0;
        this.flashAlpha = 0.0;
        this.flashColor = WHITE;

        // Menu / Cài đặt / Chọn Map
        this.menuIndex = 0;
        this.settingsIndex = 0;
        this.mapSelectIndex = this.map - 1;
        this.levelSelectIndex = this.level - 1;
        this.resetConfirm = false;
        this.settingsMsg = "";
        this.settingsMsgColor = RED;
        this.settingsMsgTimer = 0.0;

        // Nền Parallax động cho từng Map
        this.stars = [];
        for (let i = 0; i < 90; i++) {
            this.stars.push([randi(0, WIDTH - 1), randi(0, HEIGHT - 1), randf(0.15, 0.6)]);
        }
        // Thiên thạch Map 2
        this.mapAsteroids = [];
        for (let i = 0; i < 8; i++) {
            this.mapAsteroids.push({
                x: randf(0, WIDTH), y: randf(0, HEIGHT),
                size: randf(15, 45), speed: randf(15, 40), rot: randf(0, Math.PI * 2), rotSpd: randf(-0.5, 0.5)
            });
        }
        // Tàn lửa Map 3
        this.mapEmbers = [];
        for (let i = 0; i < 25; i++) {
            this.mapEmbers.push({
                x: randf(0, WIDTH), y: randf(0, HEIGHT),
                size: randf(2, 5), vy: randf(-30, -70), vx: randf(-15, 15), alpha: randf(0.3, 0.9)
            });
        }
        // Băng tuyết Map 4
        this.mapSnow = [];
        for (let i = 0; i < 30; i++) {
            this.mapSnow.push({
                x: randf(0, WIDTH), y: randf(0, HEIGHT),
                size: randf(2, 4.5), vy: randf(25, 60), vx: randf(-10, 10), alpha: randf(0.4, 0.8)
            });
        }
        // Sấm sét Map 5
        this.lightningTimer = randf(2.0, 5.0);
        this.lightningFlash = 0.0;
        // Cổng vũ trụ Map 6
        this.portalPhase = 0.0;

        // Hệ thống
        this.shop = new Shop(this);
        this.bossManager = new BossManager(this);

        // Nút điều khiển UI
        this.pauseRect = [824, 642, 64, 50];
        this.skillRect = [810, 545, 74, 74];
        this.fullscreenRect = [846, 14, 46, 46];

        // Input
        this.input = new Input(canvas, this);
        this.isTouch = this.input.isTouch;

        // Nhập save.json
        this._fileInput = document.createElement("input");
        this._fileInput.type = "file";
        this._fileInput.accept = ".json,application/json";
        this._fileInput.style.display = "none";
        document.body.appendChild(this._fileInput);

        this._warmupSprites();

        this._onResize = () => this.resize();
        window.addEventListener("resize", this._onResize);
        window.addEventListener("orientationchange", () => setTimeout(this._onResize, 120));
        document.addEventListener("fullscreenchange", this._onResize);
        this.resize();

        this._wakeLock = null;
    }

    // ============================================================
    // TIỆN ÍCH & HIỆU ỨNG
    // ============================================================
    play(name) {
        AUDIO.enabled = !!this.settings.sound;
        AUDIO.play(name);
    }

    addScore(amount) {
        this.score += amount;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.save.recordHighScore(this.score);
        }
    }

    addParticle(x, y, vx, vy, life, color, size, gravity) {
        const cap = this.settings.particles === "low" ? MAX_PARTICLES_LOW : MAX_PARTICLES_HIGH;
        if (this.particles.length >= cap) return;
        if (this.settings.particles === "low" && Math.random() < 0.5) return;
        this.particles.push(new Particle(x, y, vx, vy, life, color, size, gravity));
    }

    addFeather(x, y, color) {
        if (this.feathers.length >= 40) return;
        this.feathers.push(new FeatherParticle(x, y, color));
    }

    addPopup(x, y, text, color, big, icon) {
        this.popups.push(new ScorePopup(x, y, text, color, big, icon));
    }

    shake(mag, dur) {
        if (!this.settings.shake) return;
        if (mag >= this.shakeMag * (this.shakeDur > 0 ? this.shakeTime / this.shakeDur : 0)) {
            this.shakeMag = mag;
            this.shakeTime = dur;
            this.shakeDur = Math.max(0.01, dur);
        }
    }

    flash(alpha, dur, color) {
        if (alpha >= this.flashAlpha * (this.flashDur > 0 ? this.flashTimer / this.flashDur : 0)) {
            this.flashAlpha = alpha;
            this.flashTimer = dur;
            this.flashDur = Math.max(0.01, dur);
            this.flashColor = color || WHITE;
        }
    }

    _warmupSprites() {
        try {
            for (let t = 1; t <= 10; t++) {
                getEnemySprite(t, 0, false);
                getEnemySprite(t, 1, false);
            }
            for (const id of SKIN_ORDER) {
                getPlayerSprite(id);
                getPlayerSpriteBig(id);
            }
            for (let b = 0; b < 6; b++) {
                getBossSprite(b, 0);
            }
            getDiamondFrames();
            getDiamondIcon(16);
            getLivesIcon();
        } catch (e) { /* Bỏ qua */ }
    }

    resize() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const scale = Math.min(vw / WIDTH, vh / HEIGHT);
        const cssW = Math.max(1, Math.floor(WIDTH * scale));
        const cssH = Math.max(1, Math.floor(HEIGHT * scale));
        this.canvas.style.width = cssW + "px";
        this.canvas.style.height = cssH + "px";
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(cssW * dpr);
        this.canvas.height = Math.round(cssH * dpr);
        this.ctx.setTransform(this.canvas.width / WIDTH, 0, 0, this.canvas.height / HEIGHT, 0, 0);
        this.ctx.imageSmoothingEnabled = false;

        const hint = document.getElementById("rotateHint");
        if (hint) {
            const portrait = vh > vw && vw < 720 && this.isTouch;
            hint.style.display = portrait ? "block" : "none";
        }
    }

    toggleFullscreen() {
        try {
            const el = document.documentElement;
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
            }
        } catch (e) { /* Bỏ qua */ }
    }

    _updateWakeLock() {
        try {
            if (navigator.wakeLock) {
                if (this.state === ST.PLAYING && !this._wakeLock) {
                    navigator.wakeLock.request("screen")
                        .then(l => { this._wakeLock = l; })
                        .catch(() => { });
                } else if (this.state !== ST.PLAYING && this._wakeLock) {
                    this._wakeLock.release().then(() => { this._wakeLock = null; }).catch(() => { });
                    this._wakeLock = null;
                }
            }
        } catch (e) { /* Bỏ qua */ }
    }

    // ============================================================
    // VÒNG LẶP CHÍNH
    // ============================================================
    update(dt) {
        this.blinkTimer += dt;
        if (this.bannerTimer > 0) this.bannerTimer -= dt;
        if (this.hudPulse > 0) this.hudPulse -= dt;
        if (this.flashTimer > 0) this.flashTimer = Math.max(0.0, this.flashTimer - dt);
        if (this.shakeTime > 0) this.shakeTime = Math.max(0.0, this.shakeTime - dt);
        if (this.settingsMsgTimer > 0) this.settingsMsgTimer -= dt;
        this.save.flush(dt);

        // Hiệu ứng nền riêng cho Map
        this._updateBackgroundEffects(dt);

        if (this.state === ST.SHOP) {
            this.shop.update(dt);
            return;
        }

        if (this.state !== ST.PLAYING) {
            this._updateWakeLock();
            return;
        }

        this._updateWakeLock();

        const input = this.input;
        const player = this.player;
        if (player) {
            player.update(dt, input);
            if (input.isDown("Space") || input.dragActive) {
                player.tryFire(this);
            }
        }

        for (const b of this.bullets) b.update(dt);
        this.bullets = this.bullets.filter(b => b.alive);
        for (const b of this.enemyBullets) b.update(dt, this);
        this.enemyBullets = this.enemyBullets.filter(b => b.alive);
        for (const eb of this.eggBombs) eb.update(dt, this);
        this.eggBombs = this.eggBombs.filter(eb => eb.alive);

        // Lưới địch chỉ chạy khi không có chuỗi trùm
        const bossSeq = this.bossManager.warningActive ||
            this.bossManager.bossActive || this.bossManager.defeatActive;
        if (!bossSeq) {
            this._updateEnemies(dt);
            this.animTimer += dt;
            if (this.animTimer >= this.animInterval) {
                this.animTimer = 0.0;
                this.animFrame = 1 - this.animFrame;
            }
            this.enemyFireTimer += dt;
            if (this.enemyFireTimer >= this.enemyFireDelay) {
                this.enemyFireTimer = 0.0;
                this._enemyFire();
            }
        }
        this.bossManager.update(dt);

        for (const p of this.powerups) p.update(dt);
        this.powerups = this.powerups.filter(p => p.alive);
        for (const e of this.explosions) e.update(dt);
        this.explosions = this.explosions.filter(e => e.alive);
        for (const p of this.particles) p.update(dt);
        this.particles = this.particles.filter(p => p.alive);
        for (const f of this.feathers) f.update(dt);
        this.feathers = this.feathers.filter(f => f.alive);
        for (const sw of this.shockwaves) sw.update(dt);
        this.shockwaves = this.shockwaves.filter(sw => sw.alive);
        for (const p of this.popups) p.update(dt);
        this.popups = this.popups.filter(p => p.alive);
        for (const d of this.diamonds) d.update(dt, this);
        this.diamonds = this.diamonds.filter(d => d.alive);

        this._checkCollisions();
        this._checkWaveClear();

        // Kẻ địch chạm đáy
        if (this.state === ST.PLAYING && this.enemies.length) {
            for (const e of this.enemies) {
                if (e.y + e.height >= ENEMY_DEATH_Y) {
                    if (this.player) {
                        this.player.lives = 0;
                        this.explosions.push(new Explosion(
                            this.player.centerX, this.player.centerY, GREEN));
                    }
                    this._triggerGameOver();
                    break;
                }
            }
        }

        if (this.player && this.player.lives <= 0 && !this.player.alive) {
            this._triggerGameOver();
        }
    }

    _updateBackgroundEffects(dt) {
        // Sao chạy ở mọi màn hình
        for (const s of this.stars) {
            s[1] += s[2] * 32.0 * dt;
            if (s[1] > HEIGHT) {
                s[1] = 0;
                s[0] = randi(0, WIDTH - 1);
            }
        }

        // Thiên thạch Map 2
        for (const a of this.mapAsteroids) {
            a.y += a.speed * dt;
            a.rot += a.rotSpd * dt;
            if (a.y > HEIGHT + 50) {
                a.y = -50;
                a.x = randf(0, WIDTH);
            }
        }

        // Tàn lửa Map 3
        for (const em of this.mapEmbers) {
            em.y += em.vy * dt;
            em.x += em.vx * dt;
            if (em.y < -10) {
                em.y = HEIGHT + 10;
                em.x = randf(0, WIDTH);
            }
        }

        // Tuyết Map 4
        for (const sn of this.mapSnow) {
            sn.y += sn.vy * dt;
            sn.x += Math.sin(sn.y * 0.05) * 12 * dt;
            if (sn.y > HEIGHT + 10) {
                sn.y = -10;
                sn.x = randf(0, WIDTH);
            }
        }

        // Sấm sét Map 5
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
            this.lightningTimer = randf(3.0, 7.0);
            this.lightningFlash = 0.15;
            this.play("shoot");
        }
        if (this.lightningFlash > 0) this.lightningFlash -= dt;

        // Cổng vũ trụ Map 6
        this.portalPhase += dt * 0.8;
    }

    // ============================================================
    // VẼ TOÀN BỘ MÀN HÌNH
    // ============================================================
    draw() {
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = false;

        // Nền chủ đề theo Map hiện tại
        const mapDef = MAPS[this.map - 1] || MAPS[0];
        ctx.fillStyle = rgb(mapDef.bgDark || DARK_BG);
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const [ox, oy] = this._shakeOffset();
        ctx.save();
        ctx.translate(ox, oy);

        // Vẽ nền thiên thạch / tinh vân / sấm sét theo Map
        this._drawMapEnvironment(ctx, mapDef);

        if (this.state === ST.PLAYING || this.state === ST.PAUSED || this.state === ST.GAME_OVER) {
            this._drawGame(ctx);
        }
        ctx.restore();

        // Lớp màn hình HUD & Giao diện
        switch (this.state) {
            case ST.MENU: this._drawMenu(ctx); break;
            case ST.MAP_SELECT: this._drawMapSelect(ctx); break;
            case ST.SHOP: this.shop.draw(ctx); break;
            case ST.HOW_TO: this._drawHowto(ctx); break;
            case ST.SETTINGS: this._drawSettings(ctx); break;
            case ST.VICTORY_MAP: this._drawVictoryMap(ctx); break;
            case ST.BYE: this._drawBye(ctx); break;
            default: {
                this._drawUI(ctx);
                for (const d of this.diamonds) {
                    if (d.state === DIAMOND_FLYING) d.drawOnScreen(ctx);
                }
                if (this.state === ST.PLAYING) {
                    this._drawPauseButton(ctx);
                    this._drawSkillButton(ctx);
                }
                if (this.state === ST.PAUSED) this._drawPauseOverlay(ctx);
                if (this.state === ST.GAME_OVER) this._drawGameOverOverlay(ctx);
            }
        }

        this._drawFlash(ctx);
    }

    _drawMapEnvironment(g, mapDef) {
        // Sao nền
        g.fillStyle = rgb(mapDef.starsColor || STAR_COL);
        for (const s of this.stars) {
            g.fillRect(Math.trunc(s[0]), Math.trunc(s[1]), 2, 2);
        }

        // Map 2: Thiên thạch lơ lửng
        if (this.map === 2) {
            for (const a of this.mapAsteroids) {
                g.save();
                g.translate(a.x, a.y);
                g.rotate(a.rot);
                g.fillStyle = "rgba(100, 75, 55, 0.45)";
                g.beginPath();
                g.arc(0, 0, a.size / 2, 0, Math.PI * 2);
                g.fill();
                g.restore();
            }
        }
        // Map 3: Tàn lửa bốc lên
        else if (this.map === 3) {
            for (const em of this.mapEmbers) {
                g.fillStyle = "rgba(255, 100, 30, " + em.alpha + ")";
                g.fillRect(Math.trunc(em.x), Math.trunc(em.y), em.size, em.size);
            }
        }
        // Map 4: Tuyết băng lơ lửng
        else if (this.map === 4) {
            for (const sn of this.mapSnow) {
                g.fillStyle = "rgba(160, 240, 255, " + sn.alpha + ")";
                g.beginPath();
                g.arc(sn.x, sn.y, sn.size, 0, Math.PI * 2);
                g.fill();
            }
        }
        // Map 5: Sấm sét chớp tím
        else if (this.map === 5 && this.lightningFlash > 0) {
            g.fillStyle = "rgba(220, 160, 255, 0.25)";
            g.fillRect(0, 0, WIDTH, HEIGHT);
        }
        // Map 6: Vòng tròn hào quang vũ trụ
        else if (this.map === 6) {
            g.save();
            g.translate(WIDTH / 2, 280);
            g.rotate(this.portalPhase);
            g.strokeStyle = "rgba(255, 215, 60, 0.12)";
            g.lineWidth = 4;
            g.strokeRect(-120, -120, 240, 240);
            g.restore();
        }
    }

    _shakeOffset() {
        if (this.shakeTime > 0 && this.shakeMag > 0) {
            const frac = this.shakeTime / Math.max(0.01, this.shakeDur);
            const amp = Math.trunc(this.shakeMag * frac);
            if (amp > 0) return [randi(-amp, amp), randi(-amp, amp)];
        }
        return [0, 0];
    }

    // ============================================================
    // KHỞI ĐỘNG VÀ SPAWN WAVE
    // ============================================================
    startMapLevel(mapId, levelId) {
        this.map = Math.max(1, Math.min(6, mapId));
        this.level = Math.max(1, Math.min(5, levelId));
        this.wave = 1;
        this.save.setCurrentMap(this.map);
        this.save.setCurrentLevel(this.level);
        this.resetGame();
    }

    resetGame() {
        this.score = 0;
        this.wave = 1;
        const skin = this.skinManager.equippedSkin();
        this.player = new Player(WIDTH / 2 - 20, HEIGHT - 70, skin, this);
        this.bullets = [];
        this.enemyBullets = [];
        this.eggBombs = [];
        this.powerups = [];
        this.explosions = [];
        this.particles = [];
        this.feathers = [];
        this.shockwaves = [];
        this.popups = [];
        this.diamonds = [];
        this.bossManager.reset();

        this._spawnWave();

        const mapDef = MAPS[this.map - 1] || MAPS[0];
        this.bannerTimer = 1.8;
        this.bannerText = "MAP " + this.map + " - CẤP " + this.level + " (WAVE 1/5)";
        this.input.cancelDrag();
        this.state = ST.PLAYING;
    }

    _spawnWave() {
        this.enemies = [];
        const mapDef = MAPS[this.map - 1] || MAPS[0];

        // Nếu là Wave 5 của Level 5 -> Trùm khổng lồ của Map!
        if (this.wave === 5 && this.level === 5) {
            this.bossManager.startBossWave(mapDef.bossIndex, true);
            this.bannerTimer = 2.5;
            this.bannerText = "⚠️ TRÙM TỐI THƯỢNG CỦA BẢN ĐỒ! ⚠️";
            return;
        }

        // Nếu là Wave 5 của Level 1..4 -> Đợt Mini-Boss / Quái Tinh Anh
        const isMiniBossWave = (this.wave === 5);

        const cols = 8;
        const rows = isMiniBossWave ? 4 : 3;
        const spacingX = 84, spacingY = 54;
        const startX = Math.trunc((WIDTH - (cols - 1) * spacingX) / 2) - ENEMY_W / 2;
        const startY = 85;

        const pool = mapDef.enemyPool;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let etype;
                if (isMiniBossWave) {
                    etype = pool[randi(Math.max(0, pool.length - 3), pool.length - 1)];
                } else {
                    if (r === 0) etype = pool[Math.min(pool.length - 1, randi(1, pool.length - 1))];
                    else if (r === 1) etype = pool[Math.min(pool.length - 1, 1)];
                    else etype = pool[0];
                }
                this.enemies.push(new Enemy(startX + c * spacingX, startY + r * spacingY, etype, this.wave));
            }
        }

        this.waveInitialCount = this.enemies.length;
        const difficultyScale = (this.map - 1) * 0.2 + (this.level - 1) * 0.15 + (this.wave - 1) * 0.08;
        this.enemySpeed = 42.0 + difficultyScale * 35.0;
        this.enemyDirection = 1;
        this.enemyFireDelay = Math.max(0.40, 1.45 - difficultyScale * 0.4);
        this.animInterval = Math.max(0.18, 0.45 - difficultyScale * 0.05);
        this.animTimer = 0.0;
        this.animFrame = 0;
    }

    _updateEnemies(dt) {
        if (!this.enemies.length) return;
        const aliveCount = this.enemies.length;
        const speedMult = 1.0 + (this.waveInitialCount - aliveCount) / Math.max(1, this.waveInitialCount) * 1.6;
        const move = this.enemySpeed * speedMult * dt * this.enemyDirection;

        let hitEdge = false;
        for (const e of this.enemies) {
            e.update(dt, this);
            if (!e.diving) {
                e.x += move;
                if (e.x < 10 || e.x + e.width > WIDTH - 10) hitEdge = true;
            }
        }
        if (hitEdge) {
            for (const e of this.enemies) {
                if (!e.diving) e.x -= move;
            }
            this.enemyDirection *= -1;
            for (const e of this.enemies) {
                if (!e.diving) e.y += this.enemyStepDown;
            }
        }
    }

    _enemyFire() {
        if (!this.enemies.length) return;
        const bottom = {};
        for (const e of this.enemies) {
            const k = Math.trunc(e.x / 45);
            if (!bottom[k] || e.y > bottom[k].y) bottom[k] = e;
        }
        const shooters = Object.values(bottom);
        if (!shooters.length) return;

        const n = randi(1, Math.min(3, shooters.length));
        for (let i = 0; i < n; i++) {
            const s = choice(shooters);
            // Gà ném bom thả EggBomb
            if (s.enemyType === E_TYPE_7) {
                this.eggBombs.push(new EggBomb(s.x + s.width / 2, s.y + s.height));
            } else if (s.enemyType === E_TYPE_9) {
                // Xạ thủ bắn laser đỏ cực nhanh
                this.enemyBullets.push(new EnemyBullet(
                    Math.trunc(s.x + s.width / 2), Math.trunc(s.y + s.height), 0, 420, RED, 4, false, "rect", "bullet_enemy_laser"));
            } else {
                // Đạn thường
                this.enemyBullets.push(new EnemyBullet(
                    Math.trunc(s.x + s.width / 2), Math.trunc(s.y + s.height),
                    randf(-25, 25), randf(270, 340), s.color, 4, false, "circle", "bullet_enemy_egg"));
            }
        }
    }

    _checkWaveClear() {
        if (this.state !== ST.PLAYING) return;
        if (!this.player || !this.player.alive) return;
        const bm = this.bossManager;

        // Nếu đang đấu trùm
        if (this.wave === 5 && this.level === 5) {
            if (!bm.activeOrPending && bm.diamondsSpawned) {
                // Tiêu diệt thành công Boss Map
                this.onMapCompleted();
            }
            return;
        }

        // Nếu quái đã bị quét sạch
        if (this.enemies.length === 0 && !bm.activeOrPending) {
            if (this.wave < 5) {
                this.wave += 1;
                this.bannerTimer = 1.6;
                this.bannerText = "MAP " + this.map + " - CẤP " + this.level + " (WAVE " + this.wave + "/5)";
                this._spawnWave();
            } else {
                // Hoàn thành Level hiện tại!
                this.onLevelCompleted();
            }
        }
    }

    onLevelCompleted() {
        const stars = Math.min(3, Math.max(1, this.player ? this.player.lives : 1));
        this.save.completeLevel(this.map, this.level, stars);
        this.play("powerup");

        if (this.level < 5) {
            this.level += 1;
            this.wave = 1;
            this.save.setCurrentLevel(this.level);
            this.bannerTimer = 2.2;
            this.bannerText = "CHIẾN THẮNG CẤP " + (this.level - 1) + "! LÊN CẤP " + this.level;
            this._spawnWave();
        } else {
            // Level 5 hoàn tất
            this.onMapCompleted();
        }
    }

    onMapCompleted() {
        const mapDef = MAPS[this.map - 1] || MAPS[0];
        const reward = mapDef.unlockReward || 150;
        this.save.addDiamonds(reward);
        this.save.completeLevel(this.map, 5, 3);
        const unlockedNext = this.save.unlockNextMap(this.map);

        this.play("map_win");
        this.flash(200, 0.7, GOLD);
        this.state = ST.VICTORY_MAP;
    }

    // ============================================================
    // VA CHẠM
    // ============================================================
    _checkCollisions() {
        const player = this.player;
        const boss = this.bossManager.boss;

        // --- Đạn người chơi vs Trùm ---
        for (const b of this.bullets) {
            if (!b.alive) continue;
            if (boss && boss.alive &&
                rectsOverlap(Math.trunc(b.x) - 4, Math.trunc(b.y) - 6, 8, 14,
                    Math.trunc(boss.x), Math.trunc(boss.y), boss.width, boss.height)) {

                if (!b.piercing) b.alive = false;
                else {
                    b.pierceCount--;
                    if (b.pierceCount <= 0) b.alive = false;
                }

                const died = boss.hit(b.damage);
                for (let i = 0; i < 3; i++) {
                    this.addParticle(b.x, b.y, randf(-60, 60), randf(-60, 60), 0.3, YELLOW, 2);
                }
                this.explosions.push(new Explosion(b.x, b.y, boss.defn.bulletColor, true));
                if (boss.hitSoundTimer <= 0) {
                    boss.hitSoundTimer = 0.08;
                    this.play("boss_hit");
                }
                if (died) this.bossManager.onBossDefeated();
                continue;
            }

            // --- Đạn người chơi vs Quái thường ---
            for (const e of this.enemies) {
                if (!e.alive) continue;
                if (rectsOverlap(Math.trunc(b.x) - 4, Math.trunc(b.y) - 6, 8, 14,
                    Math.trunc(e.x), Math.trunc(e.y), e.width, e.height)) {

                    if (!b.piercing) b.alive = false;
                    else {
                        b.pierceCount--;
                        if (b.pierceCount <= 0) b.alive = false;
                    }

                    const killed = e.hit(b.damage);
                    // Rụng lông gà
                    this.addFeather(e.x + e.width / 2, e.y + e.height / 2, e.color);

                    if (killed) {
                        this.addScore(e.score);
                        if (player) player.addEnergy(8.0); // Nạp năng lượng tuyệt chiêu

                        this.explosions.push(new Explosion(e.x + e.width / 2, e.y + e.height / 2, e.color));
                        this.addPopup(e.x + e.width / 2, e.y - 4, "+" + e.score, WHITE);
                        this.play("enemy_die");

                        // Quái phân thân (Splitter) sinh 2 gà nhỏ
                        if (e.data.split) {
                            const c1 = new Enemy(e.x - 14, e.y, E_TYPE_2, this.wave);
                            const c2 = new Enemy(e.x + 14, e.y, E_TYPE_2, this.wave);
                            this.enemies.push(c1, c2);
                        }

                        // Rơi vật phẩm hỗ trợ
                        if (Math.random() < 0.12) {
                            this.powerups.push(new PowerUp(
                                e.x + e.width / 2 - 12, e.y + e.height / 2,
                                choice([PU_RAPID, PU_DOUBLE, PU_SHIELD, PU_HEAL])));
                        }

                        // Rơi kim cương
                        const data = e.data;
                        if (Math.random() < data.dropChance) {
                            this._spawnEnemyDiamonds(
                                e.x + e.width / 2, e.y + e.height / 2,
                                randi(data.dropRange[0], data.dropRange[1]));
                        }
                    } else {
                        this.explosions.push(new Explosion(e.x + e.width / 2, e.y + e.height / 2, WHITE, true));
                    }
                    break;
                }
            }
        }
        this.enemies = this.enemies.filter(e => e.alive);

        // --- Đạn địch vs Người chơi ---
        if (player && player.alive && player.invulnTimer <= 0) {
            for (const b of this.enemyBullets) {
                if (!b.alive) continue;
                if (rectsOverlap(Math.trunc(b.x) - 4, Math.trunc(b.y) - 4, 8, 8,
                    Math.trunc(player.x), Math.trunc(player.y), player.width, player.height)) {
                    b.alive = false;
                    this._playerWasHit();
                    break;
                }
            }
            // Trứng bom va chạm người chơi
            for (const eb of this.eggBombs) {
                if (!eb.alive) continue;
                if (rectsOverlap(Math.trunc(eb.x) - 10, Math.trunc(eb.y) - 12, 20, 24,
                    Math.trunc(player.x), Math.trunc(player.y), player.width, player.height)) {
                    eb.explode(this);
                    this._playerWasHit();
                    break;
                }
            }
        }

        // --- Thân địch vs Người chơi ---
        if (player && player.alive && player.invulnTimer <= 0) {
            for (const e of this.enemies) {
                if (e.alive && rectsOverlap(Math.trunc(e.x), Math.trunc(e.y), e.width, e.height,
                    Math.trunc(player.x), Math.trunc(player.y), player.width, player.height)) {
                    e.alive = false;
                    this.explosions.push(new Explosion(e.x + e.width / 2, e.y + e.height / 2, e.color));
                    this._playerWasHit();
                    this.enemies = this.enemies.filter(en => en.alive);
                    break;
                }
            }
        }

        // --- Vật phẩm vs Người chơi ---
        if (player && player.alive) {
            for (const p of this.powerups) {
                if (p.alive && rectsOverlap(Math.trunc(p.x), Math.trunc(p.y), p.width, p.height,
                    Math.trunc(player.x), Math.trunc(player.y), player.width, player.height)) {
                    p.alive = false;
                    player.activatePowerup(p.kind);
                    this.play("powerup");
                }
            }
        }

        // --- Kim cương vs Người chơi ---
        if (player && player.alive) {
            for (const d of this.diamonds) {
                if (d.alive && d.state === DIAMOND_FALLING &&
                    rectsOverlap(Math.trunc(d.x) - 10, Math.trunc(d.y) - 10, 20, 20,
                        Math.trunc(player.x), Math.trunc(player.y), player.width, player.height)) {
                    d.collect(this);
                }
            }
        }
    }

    _playerWasHit() {
        const player = this.player;
        if (!player) return;
        const actuallyKilled = player.hit();
        if (actuallyKilled) {
            this.explosions.push(new Explosion(player.centerX, player.centerY, player.currentSkin.glowColor));
            this.play("player_die");
            this.input.cancelDrag();
        } else {
            this.explosions.push(new Explosion(player.centerX, player.centerY, CYAN, true));
        }
    }

    _spawnEnemyDiamonds(x, y, count) {
        for (let i = 0; i < count; i++) {
            this.diamonds.push(new Diamond(x + randf(-14, 14), y + randf(-10, 10), 1, false));
        }
    }

    _spawnBossDiamonds(x, y, total, count) {
        count = Math.max(1, Math.trunc(count || randi(8, 18)));
        const base = Math.trunc(total / count);
        const remainder = total - base * count;
        for (let i = 0; i < count; i++) {
            const value = base + (i < remainder ? 1 : 0);
            this.diamonds.push(new Diamond(x + randf(-50, 50), y + randf(-25, 25), value, true));
        }
    }

    _diamondArrived(d) {
        this.hudPulse = 0.4;
        this.play("diamond_tick");
    }

    _triggerGameOver() {
        if (this.state === ST.GAME_OVER) return;
        if (this.score > this.highScore) this.highScore = this.score;
        this.save.recordHighScore(this.score);
        this.save.saveNow();
        this.play("player_die");
        this.state = ST.GAME_OVER;
    }

    // ============================================================
    // BÀN PHÍM VÀ CON TRỎ
    // ============================================================
    onKeyDown(e) {
        const code = e.code;
        switch (this.state) {
            case ST.MENU:
                if (code === "ArrowUp" || code === "ArrowDown") {
                    this.menuIndex = (this.menuIndex + (code === "ArrowUp" ? -1 : 1) + MENU_LABELS.length) % MENU_LABELS.length;
                } else if (code === "Enter" || code === "NumpadEnter" || code === "Space") {
                    this._menuActivate();
                } else if (code === "Escape") {
                    this._quit();
                }
                break;
            case ST.MAP_SELECT:
                if (code === "ArrowLeft") this.mapSelectIndex = Math.max(0, this.mapSelectIndex - 1);
                else if (code === "ArrowRight") this.mapSelectIndex = Math.min(5, this.mapSelectIndex + 1);
                else if (code === "ArrowUp") this.levelSelectIndex = Math.max(0, this.levelSelectIndex - 1);
                else if (code === "ArrowDown") this.levelSelectIndex = Math.min(4, this.levelSelectIndex + 1);
                else if (code === "Enter" || code === "Space") this._startSelectedMap();
                else if (code === "Escape") this.state = ST.MENU;
                break;
            case ST.PLAYING:
                if (code === "Escape") this.state = ST.PAUSED;
                else if (code === "KeyE" || code === "KeyQ" || code === "ShiftLeft" || code === "ShiftRight") {
                    if (this.player) this.player.activateSkill();
                }
                break;
            case ST.PAUSED:
                if (code === "Escape") this.state = ST.PLAYING;
                else if (code === "KeyR") this.resetGame();
                break;
            case ST.GAME_OVER:
                if (code === "KeyR") this.resetGame();
                else if (code === "Escape") this.state = ST.MENU;
                break;
            case ST.VICTORY_MAP:
                if (code === "Enter" || code === "Space") {
                    const next = Math.min(6, this.map + 1);
                    this.startMapLevel(next, 1);
                } else if (code === "Escape") this.state = ST.MENU;
                break;
            case ST.SHOP:
                this.shop.handleKey(e);
                break;
            case ST.HOW_TO:
            case ST.SETTINGS:
                if (code === "Escape") this.state = ST.MENU;
                else if (code === "ArrowUp" || code === "ArrowDown") {
                    this.settingsIndex = (this.settingsIndex + (code === "ArrowUp" ? -1 : 1) + SETTING_LABELS.length) % SETTING_LABELS.length;
                } else if (code === "Enter" || code === "Space") {
                    this._settingsActivate();
                }
                break;
        }
    }

    _menuActivate() {
        switch (this.menuIndex) {
            case 0: this.resetGame(); break;                          // CHƠI TIẾP
            case 1: this.state = ST.MAP_SELECT; break;                 // CHỌN BẢN ĐỒ
            case 2: this.shop.open(); this.state = ST.SHOP; break;     // CỬA HÀNG
            case 3: this.state = ST.HOW_TO; break;                    // HƯỚNG DẪN
            case 4: this.settingsIndex = 0; this.resetConfirm = false; this.state = ST.SETTINGS; break;
            case 5: this._quit(); break;                              // THOÁT GAME
        }
    }

    _startSelectedMap() {
        const mapId = this.mapSelectIndex + 1;
        if (mapId <= this.save.unlockedMap) {
            this.startMapLevel(mapId, this.levelSelectIndex + 1);
        } else {
            this.play("deny");
        }
    }

    _quit() {
        this.save.saveNow();
        this.state = ST.BYE;
        try { window.close(); } catch (e) { }
    }

    onPointerMove(x, y) {
        if (this.state === ST.MENU) {
            for (let i = 0; i < MENU_LABELS.length; i++) {
                const [rx, ry, rw, rh] = this._menuRect(i);
                if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
                    this.menuIndex = i;
                    break;
                }
            }
        } else if (this.state === ST.SHOP) {
            this.shop.handlePointerMove(x, y);
        } else if (this.state === ST.SETTINGS) {
            for (let i = 0; i < SETTING_LABELS.length; i++) {
                const [rx, ry, rw, rh] = this._settingsRect(i);
                if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
                    this.settingsIndex = i;
                    break;
                }
            }
        }
    }

    onPointerTap(x, y) {
        if (this.state === ST.MENU) {
            for (let i = 0; i < MENU_LABELS.length; i++) {
                const [rx, ry, rw, rh] = this._menuRect(i);
                if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
                    this.menuIndex = i;
                    this._menuActivate();
                    return;
                }
            }
        } else if (this.state === ST.MAP_SELECT) {
            this._handleMapSelectTap(x, y);
        } else if (this.state === ST.SHOP) {
            this.shop.handlePointerTap(x, y);
        } else if (this.state === ST.HOW_TO) {
            this.state = ST.MENU;
        } else if (this.state === ST.SETTINGS) {
            for (let i = 0; i < SETTING_LABELS.length; i++) {
                const [rx, ry, rw, rh] = this._settingsRect(i);
                if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
                    this.settingsIndex = i;
                    this._settingsActivate();
                    return;
                }
            }
        } else if (this.state === ST.PAUSED) {
            if (y >= 350 && y <= 396) { this.state = ST.PLAYING; return; }
            if (y >= 400 && y <= 444) { this.resetGame(); return; }
        } else if (this.state === ST.GAME_OVER) {
            if (y >= 424 && y <= 468) { this.resetGame(); return; }
            if (y >= 470 && y <= 512) { this.state = ST.MENU; return; }
        } else if (this.state === ST.VICTORY_MAP) {
            if (y >= 480 && y <= 530) {
                const next = Math.min(6, this.map + 1);
                this.startMapLevel(next, 1);
            } else if (y >= 540 && y <= 585) {
                this.state = ST.MENU;
            }
        } else if (this.state === ST.BYE) {
            this.state = ST.MENU;
        }
    }

    hitPauseButton(x, y) {
        const [px, py, pw, ph] = this.pauseRect;
        return x >= px && x <= px + pw && y >= py && y <= py + ph;
    }

    hitSkillButton(x, y) {
        const [sx, sy, sw, sh] = this.skillRect;
        return x >= sx && x <= sx + sw && y >= sy && y <= sy + sh;
    }

    _menuRect(i) { return [310, 220 + 44 * i, 280, 38]; }
    _settingsRect(i) { return [230, 150 + 50 * i, 440, 38]; }

    // ============================================================
    // VẼ: GAMEPLAY & THỰC THỂ
    // ============================================================
    _drawGame(g) {
        // Vạch đáy
        g.strokeStyle = rgb(HUD_LINE);
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, 678); g.lineTo(WIDTH, 678); g.stroke();

        // Kẻ địch
        for (const e of this.enemies) e.draw(g, this.animFrame);

        // Trùm
        this.bossManager.drawWorld(g);

        // Vật phẩm & Trứng bom
        for (const p of this.powerups) p.draw(g);
        for (const eb of this.eggBombs) eb.draw(g);

        // Kim cương
        for (const d of this.diamonds) {
            if (d.state === DIAMOND_FALLING) d.draw(g);
        }

        // Đạn người chơi & Đạn địch
        for (const b of this.bullets) b.draw(g);
        for (const b of this.enemyBullets) b.draw(g);

        // Hiệu ứng nổ, hạt, lông gà, sóng xung kích
        for (const sw of this.shockwaves) sw.draw(g);
        for (const e of this.explosions) e.draw(g);
        for (const p of this.particles) p.draw(g);
        for (const f of this.feathers) f.draw(g);
        for (const p of this.popups) p.draw(g);

        // Người chơi
        if (this.player) this.player.draw(g);
    }

    // ============================================================
    // VẼ: HUD & NÚT KỸ NĂNG
    // ============================================================
    _drawUI(g) {
        // Thanh đỉnh
        g.fillStyle = rgb(HUD_BG);
        g.fillRect(0, 0, WIDTH, 50);
        g.strokeStyle = rgb(HUD_LINE);
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, 50); g.lineTo(WIDTH, 50); g.stroke();

        const pad = (n, w) => String(n).padStart(w, "0");
        drawTextTo(g, "ĐIỂM: " + pad(this.score, 6), 18, true, WHITE, 18, 15);
        drawTextTo(g, "KỶ LỤC: " + pad(this.highScore, 6), 18, true, YELLOW, 185, 15);

        // Thông tin Map & Cấp & Wave
        drawTextTo(g, "MAP " + this.map + " - CẤP " + this.level + " (" + this.wave + "/5)", 18, true, CYAN, 380, 15);

        // Mạng
        drawTextTo(g, "MẠNG:", 18, true, WHITE, 570, 15);
        const livesIcon = getLivesIcon();
        const nLives = this.player ? Math.max(0, this.player.lives) : 0;
        for (let i = 0; i < nLives; i++) {
            g.drawImage(livesIcon, 635 + i * 26, 14);
        }

        // Kim cương
        const diaIcon = getDiamondIcon(16);
        g.drawImage(diaIcon, 762, 16);
        drawTextTo(g, "" + this.save.diamonds, 18, true, DIAMOND_LIGHT, 788, 15);
        drawTextTo(g, "KIM CƯƠNG", 13, false, GREY, 762, 34);

        // Cảnh báo trùm
        this.bossManager.drawWarning(g);

        // Băng rôn thông báo
        if (this.bannerTimer > 0) {
            const alpha = Math.min(1, this.bannerTimer / 0.4);
            const col = lerpColor(DARK_BG, CYAN, alpha);
            drawTextTo(g, this.bannerText, 26, true, col, WIDTH / 2, 140,
                { align: "center", baseline: "middle" });
        }
    }

    _drawPauseButton(g) {
        const [px, py, pw, ph] = this.pauseRect;
        g.fillStyle = "rgba(12,18,38,0.65)";
        g.fillRect(px, py, pw, ph);
        g.strokeStyle = rgb(HUD_LINE);
        g.lineWidth = 2;
        g.strokeRect(px, py, pw, ph);
        g.fillStyle = rgb(WHITE);
        g.fillRect(px + 22, py + 14, 7, 22);
        g.fillRect(px + 35, py + 14, 7, 22);
    }

    _drawSkillButton(g) {
        const player = this.player;
        if (!player) return;
        const [sx, sy, sw, sh] = this.skillRect;
        const cx = sx + sw / 2, cy = sy + sh / 2;
        const frac = Math.min(1.0, player.energy / player.maxEnergy);
        const ready = frac >= 1.0;

        // Vòng nền nút
        g.fillStyle = ready ? "rgba(30, 80, 120, 0.85)" : "rgba(15, 20, 35, 0.7)";
        g.beginPath(); g.arc(cx, cy, sw / 2, 0, Math.PI * 2); g.fill();

        // Viền nạp %
        g.strokeStyle = ready ? rgb(GOLD) : "rgba(70, 215, 255, 0.6)";
        g.lineWidth = ready ? 4 : 3;
        g.beginPath();
        g.arc(cx, cy, sw / 2 - 2, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        g.stroke();

        // Icon tia sét kỹ năng ở giữa
        const skillIcon = ASSETS.images.icon_skill;
        if (skillIcon && skillIcon.width) {
            g.drawImage(skillIcon, cx - 22, cy - 22, 44, 44);
        }

        // Nhãn phím [E] hoặc KỸ NĂNG
        if (ready) {
            const pulse = (Math.sin(this.blinkTimer * 8) + 1) * 0.5;
            g.strokeStyle = "rgba(255, 255, 255, " + pulse + ")";
            g.lineWidth = 2;
            g.beginPath(); g.arc(cx, cy, sw / 2 + 3, 0, Math.PI * 2); g.stroke();
            drawTextTo(g, "KỸ NĂNG [E]", 12, true, GOLD, cx, sy + sh + 2, { align: "center" });
        } else {
            drawTextTo(g, Math.trunc(frac * 100) + "%", 12, true, GREY, cx, sy + sh + 2, { align: "center" });
        }
    }

    // ============================================================
    // MÀN HÌNH CHỌN BẢN ĐỒ (6 MAPS)
    // ============================================================
    _drawMapSelect(g) {
        drawTextTo(g, "CHỌN BẢN ĐỒ & CHIẾN DỊCH", 36, true, CYAN, WIDTH / 2, 45,
            { align: "center", baseline: "middle" });
        drawTextTo(g, "MỖI MAP GỒM 5 CẤP - HOÀN THÀNH CẤP 5 ĐỂ DIỆT TRÙM VÀ MỞ MAP TIẾP THEO", 15, false, GREY,
            WIDTH / 2, 75, { align: "center", baseline: "middle" });

        const unlockedMax = this.save.unlockedMap;

        // 6 Map chia 2 hàng x 3 cột
        const cardW = 260, cardH = 220;
        const startX = 45, startY = 110;
        const gapX = 28, gapY = 24;

        for (let i = 0; i < 6; i++) {
            const m = MAPS[i];
            const col = i % 3;
            const row = Math.trunc(i / 3);
            const rx = startX + col * (cardW + gapX);
            const ry = startY + row * (cardH + gapY);
            const isUnlocked = (m.id <= unlockedMax);
            const isSelected = (i === this.mapSelectIndex);

            // Nền thẻ Map
            g.fillStyle = isUnlocked ? "rgba(16, 26, 52, 0.85)" : "rgba(20, 20, 25, 0.75)";
            g.fillRect(rx, ry, cardW, cardH);
            g.strokeStyle = isSelected ? rgb(WHITE) : (isUnlocked ? rgb(m.color) : "rgb(60, 60, 70)");
            g.lineWidth = isSelected ? 3 : 1.5;
            g.strokeRect(rx, ry, cardW, cardH);

            // Tiêu đề Map
            const titleColor = isUnlocked ? m.color : GREY;
            drawTextTo(g, "MAP " + m.id + ": " + m.name, 15, true, titleColor, rx + 14, ry + 12);
            drawTextTo(g, m.subtitle, 12, false, GREY, rx + 14, ry + 32);

            if (isUnlocked) {
                drawTextTo(g, m.desc, 12, false, [180, 200, 220], rx + 14, ry + 54);

                // 5 Cấp độ với số Sao ⭐
                let ly = ry + 125;
                drawTextTo(g, "CÁC CẤP:", 13, true, WHITE, rx + 14, ly);
                for (let lvl = 1; lvl <= 5; lvl++) {
                    const stars = this.save.getStars(m.id, lvl);
                    const lx = rx + 75 + (lvl - 1) * 34;
                    const isLvlSel = (isSelected && this.levelSelectIndex === lvl - 1);

                    g.fillStyle = isLvlSel ? "rgba(70, 215, 255, 0.5)" : "rgba(30, 45, 75, 0.6)";
                    g.fillRect(lx, ly - 3, 30, 22);
                    g.strokeStyle = isLvlSel ? rgb(CYAN) : "rgba(255,255,255,0.2)";
                    g.lineWidth = 1;
                    g.strokeRect(lx, ly - 3, 30, 22);

                    drawTextTo(g, "" + lvl, 12, true, WHITE, lx + 15, ly + 8, { align: "center", baseline: "middle" });
                }

                // Nút Chơi
                const btnY = ry + 168;
                g.fillStyle = isSelected ? "rgba(40, 160, 100, 0.7)" : "rgba(30, 80, 120, 0.5)";
                g.fillRect(rx + 14, btnY, cardW - 28, 38);
                g.strokeStyle = isSelected ? rgb(GREEN) : rgb(CYAN);
                g.lineWidth = 1.5;
                g.strokeRect(rx + 14, btnY, cardW - 28, 38);
                drawTextTo(g, isSelected ? "▶ BẮT ĐẦU CẤP " + (this.levelSelectIndex + 1) : "CHỌN MAP NÀY", 15, true, WHITE,
                    rx + cardW / 2, btnY + 19, { align: "center", baseline: "middle" });
            } else {
                // Khóa
                drawTextTo(g, "🔒 CHƯA MỞ KHÓA", 18, true, RED, rx + cardW / 2, ry + 100,
                    { align: "center", baseline: "middle" });
                drawTextTo(g, "Vượt qua Map " + (m.id - 1) + " để mở khóa", 13, false, GREY,
                    rx + cardW / 2, ry + 130, { align: "center", baseline: "middle" });
            }
        }

        // Nút quay lại
        g.strokeStyle = "rgb(80, 120, 160)";
        g.strokeRect(24, 660, 150, 28);
        drawTextTo(g, "< QUAY LẠI (ESC)", 16, true, GREY, 99, 674,
            { align: "center", baseline: "middle" });
    }

    _handleMapSelectTap(x, y) {
        if (x >= 24 && x <= 174 && y >= 660 && y <= 688) {
            this.state = ST.MENU;
            return;
        }

        const cardW = 260, cardH = 220;
        const startX = 45, startY = 110;
        const gapX = 28, gapY = 24;

        for (let i = 0; i < 6; i++) {
            const col = i % 3;
            const row = Math.trunc(i / 3);
            const rx = startX + col * (cardW + gapX);
            const ry = startY + row * (cardH + gapY);

            if (x >= rx && x <= rx + cardW && y >= ry && y <= ry + cardH) {
                if (i + 1 <= this.save.unlockedMap) {
                    this.mapSelectIndex = i;
                    // Check if clicked level chips
                    const ly = ry + 125;
                    for (let lvl = 1; lvl <= 5; lvl++) {
                        const lx = rx + 75 + (lvl - 1) * 34;
                        if (x >= lx && x <= lx + 30 && y >= ly - 3 && y <= ly + 19) {
                            this.levelSelectIndex = lvl - 1;
                            return;
                        }
                    }
                    this._startSelectedMap();
                } else {
                    this.play("deny");
                }
                return;
            }
        }
    }

    // ============================================================
    // VẼ: CHIẾN THẮNG MAP (ST.VICTORY_MAP)
    // ============================================================
    _drawVictoryMap(g) {
        const mapDef = MAPS[this.map - 1] || MAPS[0];
        const nextMap = Math.min(6, this.map + 1);

        g.fillStyle = "rgba(10, 15, 30, 0.88)";
        g.fillRect(100, 100, WIDTH - 200, HEIGHT - 200);
        g.strokeStyle = rgb(GOLD);
        g.lineWidth = 3;
        g.strokeRect(100, 100, WIDTH - 200, HEIGHT - 200);

        drawTextTo(g, "🎉 CHIẾN THẮNG BẢN ĐỒ " + this.map + "! 🎉", 38, true, GOLD,
            WIDTH / 2, 160, { align: "center", baseline: "middle" });
        drawTextTo(g, mapDef.name + " (" + mapDef.subtitle + ")", 20, true, CYAN,
            WIDTH / 2, 205, { align: "center", baseline: "middle" });

        drawTextTo(g, "BẠN ĐÃ TIÊU DIỆT THÀNH CÔNG TRÙM KHỔNG LỒ!", 20, false, WHITE,
            WIDTH / 2, 260, { align: "center", baseline: "middle" });

        // Thưởng kim cương
        const reward = mapDef.unlockReward || 150;
        const icon = getDiamondIcon(24);
        g.drawImage(icon, WIDTH / 2 - 90, 310);
        drawTextTo(g, "THƯỞNG: +" + reward + " KIM CƯƠNG", 26, true, DIAMOND_LIGHT,
            WIDTH / 2 - 50, 310);

        if (this.map < 6) {
            drawTextTo(g, "✓ ĐÃ MỞ KHÓA BẢN ĐỒ TIẾP THEO: MAP " + nextMap, 20, true, GREEN,
                WIDTH / 2, 380, { align: "center", baseline: "middle" });
        } else {
            drawTextTo(g, "🏆 BẠN ĐÃ PHÁ ĐẢO TOÀN BỘ 6 BẢN ĐỒ! HUYỀN THOẠI VŨ TRỤ! 🏆", 20, true, YELLOW,
                WIDTH / 2, 380, { align: "center", baseline: "middle" });
        }

        // Nút tiếp tục
        g.fillStyle = "rgba(40, 160, 80, 0.7)";
        g.fillRect(WIDTH / 2 - 160, 480, 320, 46);
        g.strokeStyle = rgb(GREEN);
        g.lineWidth = 2;
        g.strokeRect(WIDTH / 2 - 160, 480, 320, 46);
        drawTextTo(g, "TIẾP TỤC MAP " + nextMap + " (ENTER)", 20, true, WHITE,
            WIDTH / 2, 503, { align: "center", baseline: "middle" });

        // Nút về Menu
        g.strokeStyle = "rgb(120, 140, 170)";
        g.strokeRect(WIDTH / 2 - 120, 545, 240, 38);
        drawTextTo(g, "VỀ MENU CHÍNH (ESC)", 16, true, GREY,
            WIDTH / 2, 564, { align: "center", baseline: "middle" });
    }

    // ============================================================
    // MENU CHÍNH & CÁC MÀN HÌNH KHÁC
    // ============================================================
    _drawMenu(g) {
        const p = (Math.sin(this.blinkTimer * 2) + 1) / 2;
        const titleCol = [Math.trunc(80 + 100 * p), Math.trunc(200 + 55 * p), 255];
        drawTextTo(g, "ĐỘT KÍCH NGÂN HÀ", 52, true, titleCol, 450, 115,
            { align: "center", baseline: "middle" });
        drawTextTo(g, "- ĐẠI CHIẾN BẮN GÀ 6 MAP -", 20, true, YELLOW, 450, 160,
            { align: "center", baseline: "middle" });

        for (let i = 0; i < MENU_LABELS.length; i++) {
            const [rx, ry, rw, rh] = this._menuRect(i);
            const selected = (i === this.menuIndex);
            if (selected) {
                g.fillStyle = "rgb(30,50,90)";
                g.fillRect(rx, ry, rw, rh);
                g.strokeStyle = rgb(CYAN);
                g.lineWidth = 2;
                g.strokeRect(rx, ry, rw, rh);
                drawTextTo(g, MENU_LABELS[i], 22, true, WHITE, rx + rw / 2, ry + rh / 2 + 1,
                    { align: "center", baseline: "middle" });
            } else {
                drawTextTo(g, MENU_LABELS[i], 22, true, GREY, rx + rw / 2, ry + rh / 2 + 1,
                    { align: "center", baseline: "middle" });
            }
        }

        drawTextTo(g, "KỶ LỤC: " + String(this.highScore).padStart(6, "0"),
            22, true, YELLOW, 450, 495, { align: "center", baseline: "middle" });

        const diaIcon = getDiamondIcon(16);
        const diaText = "KIM CƯƠNG: " + this.save.diamonds;
        const diaW = 16 + 8 + textWidthOf(g, diaText, 22, true);
        const x0 = 450 - diaW / 2;
        g.drawImage(diaIcon, Math.trunc(x0), 528);
        drawTextTo(g, diaText, 22, true, DIAMOND_LIGHT, x0 + 24, 526, { align: "left", baseline: "top" });

        const skin = this.skinManager.equippedSkin();
        const spr = getPlayerSprite(skin.id);
        const skinText = "TRANG BỊ: " + skin.name + " (" + skin.skill.name + ")";
        drawTextTo(g, skinText, 17, true, skin.glowColor || GREEN, 450, 565, { align: "center" });

        drawTextTo(g, "MŨI TÊN / CHUỘT: CHỌN    ENTER: VÀO    ESC: THOÁT", 14, false, GREY,
            450, 668, { align: "center", baseline: "top" });
    }

    _drawHowto(g) {
        drawTextTo(g, "HƯỚNG DẪN CHƠI", 44, true, CYAN, 450, 50,
            { align: "center", baseline: "middle" });

        let y = 90;
        const cLine = (text, size, bold, color) => {
            drawTextTo(g, text, size, bold, color, 450, y, { align: "center" });
            y += 26;
        };

        cLine("DI CHUYỂN: WASD / PHÍM MŨI TÊN (CẢM ỨNG: KÉO NGÓN TAY)", 17, true, WHITE);
        cLine("BẮN: SPACE (GIỮ BẮN LIÊN TỤC) / CẢM ỨNG TỰ BẮN KHI CHẠM", 17, true, WHITE);
        cLine("KỸ NĂNG ĐẶC BIỆT: NHẤN [E], [Q] HOẶC CHẠM NÚT TRÒN TRÊN MÀN HÌNH", 17, true, YELLOW);
        cLine("TẠM DỪNG: ESC HOẶC NÚT ⏸ GÓC PHẢI", 17, true, GREY);
        y += 10;
        cLine("--- TIẾN TRÌNH CHIẾN DỊCH 6 MAP ---", 20, true, CYAN);
        cLine("MỖI MAP CÓ 5 LEVEL. MỖI LEVEL GỒM 5 WAVE KẺ ĐỊCH.", 16, true, WHITE);
        cLine("WAVE 5 CỦA LEVEL 1-4 LÀ ĐỘI HÌNH TINH NHUỆ / MINI-BOSS.", 16, true, WHITE);
        cLine("WAVE 5 CỦA LEVEL 5 LÀ TRÙM KHỔNG LỒ ĐẶC BIỆT CỦA MAP.", 16, true, RED);
        cLine("TIÊU DIỆT TRÙM ĐỂ NHẬN HÀNG TRĂM KIM CƯƠNG VÀ MỞ MAP MỚI!", 16, true, GOLD);
        y += 10;
        cLine("VẬT PHẨM: R (BẮN NHANH) | D (BẮN ĐÔI) | S (KHIÊN) | + (HỒI MÁU)", 16, true, GREEN);

        g.strokeStyle = "rgb(80, 120, 160)";
        g.strokeRect(350, 640, 200, 36);
        drawTextTo(g, "QUAY LẠI (ESC)", 16, true, GREY, 450, 658,
            { align: "center", baseline: "middle" });
    }

    _drawSettings(g) {
        drawTextTo(g, "CÀI ĐẶT", 46, true, CYAN, 450, 60,
            { align: "center", baseline: "middle" });

        for (let i = 0; i < SETTING_LABELS.length; i++) {
            const [rx, ry, rw, rh] = this._settingsRect(i);
            const selected = (i === this.settingsIndex);

            g.fillStyle = selected ? "rgb(30,50,90)" : "rgba(15,20,40,0.6)";
            g.fillRect(rx, ry, rw, rh);
            g.strokeStyle = selected ? rgb(CYAN) : "rgb(50,80,120)";
            g.lineWidth = selected ? 2 : 1;
            g.strokeRect(rx, ry, rw, rh);

            let valText = "";
            let valColor = WHITE;
            if (i === 0) { valText = this.settings.sound ? "BẬT" : "TẮT"; valColor = this.settings.sound ? GREEN : RED; }
            else if (i === 1) { valText = this.settings.shake ? "BẬT" : "TẮT"; valColor = this.settings.shake ? GREEN : RED; }
            else if (i === 2) { valText = this.settings.particles === "high" ? "CAO" : "THẤP"; valColor = YELLOW; }

            drawTextTo(g, SETTING_LABELS[i], 18, true, selected ? WHITE : GREY, rx + 16, ry + rh / 2,
                { align: "left", baseline: "middle" });
            if (valText) {
                drawTextTo(g, valText, 18, true, valColor, rx + rw - 16, ry + rh / 2,
                    { align: "right", baseline: "middle" });
            }
        }

        if (this.settingsMsgTimer > 0) {
            drawTextTo(g, this.settingsMsg, 16, true, this.settingsMsgColor, 450, 520,
                { align: "center", baseline: "middle" });
        }

        drawTextTo(g, "ENTER / SPACE ĐỂ THAY ĐỔI    ESC: QUAY LẠI", 14, false, GREY, 450, 650,
            { align: "center", baseline: "middle" });
    }

    _drawPauseOverlay(g) {
        g.fillStyle = "rgba(5, 8, 22, 0.75)";
        g.fillRect(0, 0, WIDTH, HEIGHT);
        drawTextTo(g, "TẠM DỪNG", 52, true, WHITE, 450, 240,
            { align: "center", baseline: "middle" });

        g.fillStyle = "rgba(40, 140, 220, 0.6)";
        g.fillRect(320, 350, 260, 44);
        drawTextTo(g, "TIẾP TỤC (ESC)", 20, true, WHITE, 450, 372,
            { align: "center", baseline: "middle" });

        g.fillStyle = "rgba(180, 50, 50, 0.6)";
        g.fillRect(320, 405, 260, 44);
        drawTextTo(g, "CHƠI LẠI (R)", 20, true, WHITE, 450, 427,
            { align: "center", baseline: "middle" });
    }

    _drawGameOverOverlay(g) {
        g.fillStyle = "rgba(20, 5, 5, 0.85)";
        g.fillRect(0, 0, WIDTH, HEIGHT);
        drawTextTo(g, "GAME OVER", 62, true, RED, 450, 220,
            { align: "center", baseline: "middle" });

        drawTextTo(g, "ĐIỂM ĐẠT ĐƯỢC: " + this.score, 24, true, WHITE, 450, 310,
            { align: "center", baseline: "middle" });
        drawTextTo(g, "DỪNG LẠI TẠI: MAP " + this.map + " - CẤP " + this.level + " (WAVE " + this.wave + ")", 20, true, CYAN,
            450, 355, { align: "center", baseline: "middle" });

        g.fillStyle = "rgba(40, 160, 80, 0.7)";
        g.fillRect(320, 420, 260, 46);
        drawTextTo(g, "CHƠI LẠI (R)", 22, true, WHITE, 450, 443,
            { align: "center", baseline: "middle" });

        g.fillStyle = "rgba(60, 80, 110, 0.7)";
        g.fillRect(320, 475, 260, 40);
        drawTextTo(g, "MENU CHÍNH (ESC)", 18, true, GREY, 450, 495,
            { align: "center", baseline: "middle" });
    }

    _drawBye(g) {
        drawTextTo(g, "CẢM ƠN BẠN ĐÃ CHƠI!", 36, true, CYAN, 450, 320,
            { align: "center", baseline: "middle" });
        drawTextTo(g, "BẤM BẤT KỲ ĐÂU ĐỂ QUAY LẠI", 18, false, GREY, 450, 380,
            { align: "center", baseline: "middle" });
    }

    _drawFlash(g) {
        if (this.flashTimer > 0 && this.flashAlpha > 0) {
            const frac = this.flashTimer / Math.max(0.01, this.flashDur);
            const a = (this.flashAlpha / 255) * frac;
            g.fillStyle = rgb(this.flashColor, a);
            g.fillRect(0, 0, WIDTH, HEIGHT);
        }
    }
}

// Khởi chạy game khi DOM sẵn sàng
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game");
    if (!canvas) return;
    const game = new Game(canvas);
    let lastTime = performance.now();

    function loop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        game.update(dt);
        game.draw();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
});

