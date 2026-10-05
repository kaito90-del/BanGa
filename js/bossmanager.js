/* ============================================================
 * File: bossmanager.js - Quản lý chuỗi Trùm và chiến thắng Map
 * ============================================================ */

class BossManager {
    constructor(game) {
        this.game = game;
        this.reset();
    }

    reset() {
        this.boss = null;
        this.warningTimer = 0.0;
        this.warningTotal = 3.0;
        this.warnSoundTimer = 0.0;
        this.bossIndex = 0;
        this.defeatTimer = 0.0;
        this.defeatTotal = 2.6;
        this.defeatPos = [WIDTH / 2, 150];
        this.defeatSize = [170, 120];
        this.defeatDiamondTotal = 0;
        this.defeatDiamondCount = 0;
        this.diamondsSpawned = false;
        this.explosionTimer = 0.0;
        this.isMapBoss = false;
    }

    get warningActive() { return this.warningTimer > 0; }
    get bossActive() { return this.boss !== null; }
    get defeatActive() { return this.defeatTimer > 0; }

    get pendingDiamonds() {
        const game = this.game;
        let n = 0;
        for (const d of game.diamonds) {
            if (d.fromBoss && d.state === DIAMOND_FALLING) n++;
        }
        return n;
    }

    get activeOrPending() {
        return this.warningActive || this.bossActive ||
            this.defeatActive || this.pendingDiamonds > 0;
    }

    startBossWave(bossIndex, isMapBoss) {
        this.reset();
        this.bossIndex = Math.max(0, Math.min(5, bossIndex | 0));
        this.isMapBoss = !!isMapBoss;
        this.warningTimer = this.warningTotal;
        this.warnSoundTimer = 0.0;
        this.game.play("boss_warn");
        this.game.shake(5, 0.6);
    }

    onBossDefeated() {
        const boss = this.boss;
        if (!boss) return;
        const game = this.game;
        this.defeatPos = [boss.centerX, boss.centerY];
        this.defeatSize = [boss.width, boss.height];

        // Thưởng điểm
        game.addScore(boss.scoreValue);
        game.addPopup(boss.centerX, boss.centerY - 35, "+" + boss.scoreValue, YELLOW, true);

        // Kim cương rơi
        const [lo, hi] = boss.defn.drop;
        const total = randi(lo, hi);
        const [clo, chi] = boss.defn.dropCount;
        const count = randi(clo, chi);
        this.defeatDiamondTotal = total;
        this.defeatDiamondCount = count;
        this.diamondsSpawned = false;

        // Xóa sạch đạn địch
        game.enemyBullets.length = 0;

        // Hiệu ứng bùng nổ
        game.flash(220, 0.6, WHITE);
        game.shake(12, 0.9);
        game.play("boss_die");

        this.defeatTimer = this.defeatTotal;
        this.explosionTimer = 0.0;
        this.boss = null;
    }

    update(dt) {
        const game = this.game;

        // 1) Cảnh báo Boss
        if (this.warningActive) {
            this.warningTimer -= dt;
            game.shake(3, 0.12);
            this.warnSoundTimer -= dt;
            if (this.warnSoundTimer <= 0) {
                this.warnSoundTimer = 0.9;
                game.play("boss_warn");
            }
            if (this.warningTimer <= 0) {
                this.boss = new Boss(this.bossIndex, game.level, game);
            }
            return;
        }

        // 2) Đang đấu Boss
        if (this.bossActive) {
            this.boss.update(dt, game);
            return;
        }

        // 3) Tiêu diệt Boss thành công
        if (this.defeatActive) {
            this.defeatTimer -= dt;
            this.explosionTimer -= dt;
            if (this.explosionTimer <= 0) {
                this.explosionTimer = 0.12;
                const [px, py] = this.defeatPos;
                const [w, h] = this.defeatSize;
                game.explosions.push(new Explosion(
                    px + randf(-w / 2, w / 2),
                    py + randf(-h / 2, h / 2),
                    choice([YELLOW, ORANGE, RED, WHITE])));
            }

            if (!this.diamondsSpawned && this.defeatTimer <= this.defeatTotal - 0.45) {
                this.diamondsSpawned = true;
                const [px, py] = this.defeatPos;
                game._spawnBossDiamonds(px, py, this.defeatDiamondTotal, this.defeatDiamondCount);
            }

            // Kết thúc trận chiến Boss
            if (this.defeatTimer <= 0) {
                if (this.isMapBoss) {
                    game.onMapCompleted();
                } else {
                    game.onLevelCompleted();
                }
            }
        }
    }

    drawWorld(g) {
        if (this.bossActive && this.boss) {
            this.boss.draw(g);
        }
    }

    drawWarning(g) {
        if (!this.warningActive) return;
        const frac = this.warningTimer / this.warningTotal;
        const blink = Math.trunc(this.warningTimer * 4) % 2 === 0;
        if (blink) {
            drawTextTo(g, "⚠️ CẢNH BÁO: TRÙM ĐANG ĐẾN! ⚠️", 28, true, RED,
                WIDTH / 2, 180, { align: "center" });
            const bossDef = BOSS_DEFS[this.bossIndex] || BOSS_DEFS[0];
            drawTextTo(g, bossDef.name, 22, true, YELLOW,
                WIDTH / 2, 220, { align: "center" });
        }
    }
}
