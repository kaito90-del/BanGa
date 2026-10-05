/* ============================================================
 * File: sprites.js - Nạp và quản lý toàn bộ Sprite PNG chất lượng cao
 * Hỗ trợ 8 máy bay, 10 loại gà, 6 Boss, các loại đạn và hiệu ứng
 * Có bộ nhớ đệm (Cache) tối ưu, không giật lag
 * ============================================================ */

const _SPR = {
    player: {},        // key: skinId -> canvas / img
    playerBig: {},     // key: skinId -> canvas (x2 cho cửa hàng)
    enemy: {},         // key: type|frame|flash -> canvas
    boss: {},          // key: bossIndex|variant -> canvas
    bullet: {},        // key: assetKey -> canvas / img
    diamondFrames: null,
    diamondIcons: {},
    glow: {},
    rectGlow: {},
    livesIcon: null,
};

// ------------------------------------------------------------
// ASSETS - Tải toàn bộ ảnh PNG chất lượng cao
// ------------------------------------------------------------
const ASSETS = {
    images: {},
    ready: false,
    readyPromise: null,
};

(function () {
    const list = [
        // 8 Máy bay
        ["plane_default", "assets/plane_default.png"],
        ["plane_blue_falcon", "assets/plane_blue_falcon.png"],
        ["plane_red_viper", "assets/plane_red_viper.png"],
        ["plane_golden_hawk", "assets/plane_golden_hawk.png"],
        ["plane_shadow", "assets/plane_shadow.png"],
        ["plane_plasma", "assets/plane_plasma.png"],
        ["plane_galaxy", "assets/plane_galaxy.png"],
        ["plane_legendary", "assets/plane_legendary.png"],
        ["plane", "assets/plane.png"],

        // 10 Loại gà (hoạt ảnh 2 frame & đặc biệt)
        ["chick_a", "assets/chick_a.png"],
        ["chick_b", "assets/chick_b.png"],
        ["chick_scout_a", "assets/chick_scout_a.png"],
        ["chick_scout_b", "assets/chick_scout_b.png"],
        ["hen_warrior_a", "assets/hen_warrior_a.png"],
        ["hen_warrior_b", "assets/hen_warrior_b.png"],
        ["rooster_elite_a", "assets/rooster_elite_a.png"],
        ["rooster_elite_b", "assets/rooster_elite_b.png"],
        ["chicken_armored", "assets/chicken_armored.png"],
        ["chicken_kamikaze", "assets/chicken_kamikaze.png"],
        ["chicken_bomber", "assets/chicken_bomber.png"],
        ["chicken_splitter", "assets/chicken_splitter.png"],
        ["chicken_laser", "assets/chicken_laser.png"],
        ["chicken_shield", "assets/chicken_shield.png"],

        // 6 Gà Boss khổng lồ
        ["boss_1", "assets/boss_1.png"],
        ["boss_2", "assets/boss_2.png"],
        ["boss_3", "assets/boss_3.png"],
        ["boss_4", "assets/boss_4.png"],
        ["boss_5", "assets/boss_5.png"],
        ["boss_6", "assets/boss_6.png"],
        ["family", "assets/family.png"],
        ["hen", "assets/hen.png"],

        // Đạn các loại
        ["bullet_green_laser", "assets/bullet_green_laser.png"],
        ["bullet_blue_laser", "assets/bullet_blue_laser.png"],
        ["bullet_red_missile", "assets/bullet_red_missile.png"],
        ["bullet_golden_bolt", "assets/bullet_golden_bolt.png"],
        ["bullet_shadow_dart", "assets/bullet_shadow_dart.png"],
        ["bullet_plasma_ball", "assets/bullet_plasma_ball.png"],
        ["bullet_galaxy_shard", "assets/bullet_galaxy_shard.png"],
        ["bullet_god_beam", "assets/bullet_god_beam.png"],
        ["bullet_piercing", "assets/bullet_piercing.png"],
        ["bullet_enemy_egg", "assets/bullet_enemy_egg.png"],
        ["bullet_enemy_laser", "assets/bullet_enemy_laser.png"],
        ["bullet_boss_orb", "assets/bullet_boss_orb.png"],

        // Extras
        ["feather", "assets/feather.png"],
        ["egg_bomb", "assets/egg_bomb.png"],
        ["icon_skill", "assets/icon_skill.png"],
    ];

    let pending = list.length;
    let settled = false;
    let resolveReady = null;
    ASSETS.readyPromise = new Promise(r => { resolveReady = r; });

    function finish() {
        if (settled) return;
        settled = true;
        ASSETS.ready = true;
        if (resolveReady) resolveReady();
    }

    function invalidateCaches() {
        _SPR.player = {};
        _SPR.playerBig = {};
        _SPR.enemy = {};
        _SPR.boss = {};
        _SPR.bullet = {};
    }

    for (const [key, src] of list) {
        const img = new Image();
        img.onload = () => {
            ASSETS.images[key] = img;
            invalidateCaches();
            if (--pending <= 0) finish();
        };
        img.onerror = () => {
            if (--pending <= 0) finish();
        };
        img.src = src;
    }
    setTimeout(finish, 3500);
})();

// ------------------------------------------------------------
// CANVAS TIỆN ÍCH
// ------------------------------------------------------------
function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
}

function _smooth(g) {
    g.imageSmoothingEnabled = true;
    if (g.imageSmoothingQuality !== undefined) g.imageSmoothingQuality = "high";
}

function _filmColor(g, w, h, color, alpha) {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = rgb(color, alpha);
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
}

// ------------------------------------------------------------
// 1. SPRITE MÁY BAY NGƯỜI CHƠI
// ------------------------------------------------------------
function getPlayerSprite(skinId) {
    let spr = _SPR.player[skinId];
    if (spr) return spr;

    const skin = SKINS[skinId] || SKINS.DEFAULT;
    const key = skin.asset || "plane_default";
    let img = ASSETS.images[key] || ASSETS.images.plane;

    if (img && img.width) {
        const targetH = PLAYER_H;
        const targetW = Math.round(targetH * img.width / img.height);
        spr = makeCanvas(targetW, targetH);
        const g = spr.getContext("2d");
        _smooth(g);
        g.drawImage(img, 0, 0, targetW, targetH);
    } else {
        // Fallback procedural canvas
        spr = makeCanvas(PLAYER_W, PLAYER_H);
        const g = spr.getContext("2d");
        g.fillStyle = rgb(skin.glowColor || GREEN);
        g.beginPath();
        g.moveTo(PLAYER_W / 2, 2);
        g.lineTo(PLAYER_W - 4, PLAYER_H - 4);
        g.lineTo(PLAYER_W / 2, PLAYER_H - 12);
        g.lineTo(4, PLAYER_H - 4);
        g.closePath();
        g.fill();
    }

    _SPR.player[skinId] = spr;
    return spr;
}

function getPlayerSpriteBig(skinId) {
    let spr = _SPR.playerBig[skinId];
    if (spr) return spr;
    const base = getPlayerSprite(skinId);
    spr = makeCanvas(base.width * 2, base.height * 2);
    const g = spr.getContext("2d");
    _smooth(g);
    g.drawImage(base, 0, 0, spr.width, spr.height);
    _SPR.playerBig[skinId] = spr;
    return spr;
}

// ------------------------------------------------------------
// 2. SPRITE ĐỊCH (10 LOẠI GÀ)
// ------------------------------------------------------------
function getEnemySprite(enemyType, frame, flash) {
    const key = enemyType + "|" + (frame % 2) + "|" + (flash ? 1 : 0);
    let spr = _SPR.enemy[key];
    if (spr) return spr;

    const def = ENEMY_DATA[enemyType] || ENEMY_DATA[E_TYPE_1];
    let assetKey;
    const fIdx = frame % 2;

    switch (enemyType) {
        case E_TYPE_1: assetKey = fIdx === 0 ? "chick_a" : "chick_b"; break;
        case E_TYPE_2: assetKey = fIdx === 0 ? "chick_scout_a" : "chick_scout_b"; break;
        case E_TYPE_3: assetKey = fIdx === 0 ? "hen_warrior_a" : "hen_warrior_b"; break;
        case E_TYPE_4: assetKey = fIdx === 0 ? "rooster_elite_a" : "rooster_elite_b"; break;
        case E_TYPE_5: assetKey = "chicken_armored"; break;
        case E_TYPE_6: assetKey = "chicken_kamikaze"; break;
        case E_TYPE_7: assetKey = "chicken_bomber"; break;
        case E_TYPE_8: assetKey = "chicken_splitter"; break;
        case E_TYPE_9: assetKey = "chicken_laser"; break;
        case E_TYPE_10: assetKey = "chicken_shield"; break;
        default: assetKey = "chick_a"; break;
    }

    let img = ASSETS.images[assetKey] || ASSETS.images.chick_a;
    spr = makeCanvas(ENEMY_W, ENEMY_H);
    const g = spr.getContext("2d");
    _smooth(g);

    if (img && img.width) {
        const s = Math.min(ENEMY_W / img.width, ENEMY_H / img.height);
        const dw = Math.round(img.width * s);
        const dh = Math.round(img.height * s);
        const dx = Math.trunc((ENEMY_W - dw) / 2);
        const dy = Math.trunc((ENEMY_H - dh) / 2);
        g.drawImage(img, dx, dy, dw, dh);
    } else {
        g.fillStyle = rgb(def.color || YELLOW);
        g.beginPath();
        g.arc(ENEMY_W / 2, ENEMY_H / 2, ENEMY_W / 2 - 2, 0, Math.PI * 2);
        g.fill();
    }

    if (flash) {
        _filmColor(g, ENEMY_W, ENEMY_H, [255, 75, 60], 0.85);
    }

    _SPR.enemy[key] = spr;
    return spr;
}

// ------------------------------------------------------------
// 3. SPRITE BOSS (6 GÀ BOSS KHỔNG LỒ)
// ------------------------------------------------------------
function getBossSprite(bossIndex, variant) {
    const key = bossIndex + "|" + variant;
    let spr = _SPR.boss[key];
    if (spr) return spr;

    const bIdx = Math.max(0, Math.min(5, bossIndex | 0));
    const def = BOSS_DEFS[bIdx] || BOSS_DEFS[0];
    const assetKey = `boss_${bIdx + 1}`;
    let img = ASSETS.images[assetKey] || ASSETS.images.hen || ASSETS.images.family;

    const bw = def.width || 180;
    const bh = def.height || 130;
    spr = makeCanvas(bw, bh);
    const g = spr.getContext("2d");
    _smooth(g);

    if (img && img.width) {
        const s = Math.min(bw / img.width, bh / img.height);
        const dw = Math.round(img.width * s);
        const dh = Math.round(img.height * s);
        const dx = Math.trunc((bw - dw) / 2);
        const dy = Math.trunc((bh - dh) / 2);
        g.drawImage(img, dx, dy, dw, dh);
    } else {
        g.fillStyle = rgb(def.bulletColor || RED);
        g.beginPath();
        g.ellipse(bw / 2, bh / 2, bw / 2 - 4, bh / 2 - 4, 0, 0, Math.PI * 2);
        g.fill();
    }

    // variant: 0 = thường, 1 = trúng đạn (lóe đỏ/trắng), 2 = giận dữ (đỏ thẫm)
    if (variant === 1) {
        _filmColor(g, bw, bh, [255, 255, 255], 0.8);
    } else if (variant === 2) {
        _filmColor(g, bw, bh, [255, 50, 50], 0.45);
    }

    _SPR.boss[key] = spr;
    return spr;
}

// ------------------------------------------------------------
// 4. SPRITE ĐẠN PNG
// ------------------------------------------------------------
function getBulletSprite(assetKey) {
    let spr = _SPR.bullet[assetKey];
    if (spr) return spr;

    const img = ASSETS.images[assetKey];
    if (img && img.width) {
        spr = img;
    } else {
        // Fallback procedural bullet
        spr = makeCanvas(12, 24);
        const g = spr.getContext("2d");
        g.fillStyle = "rgb(80, 240, 255)";
        g.beginPath();
        g.roundRect ? g.roundRect(2, 2, 8, 20, 4) : g.rect(2, 2, 8, 20);
        g.fill();
    }
    _SPR.bullet[assetKey] = spr;
    return spr;
}

// ------------------------------------------------------------
// 5. KIM CƯƠNG VÀ ICON
// ------------------------------------------------------------
function getDiamondFrames() {
    if (_SPR.diamondFrames) return _SPR.diamondFrames;
    const base = makeCanvas(24, 24);
    const g = base.getContext("2d");
    const poly = (color, pts) => {
        g.fillStyle = rgb(color);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        g.fill();
    };
    const pts = [[12, 2], [22, 12], [12, 22], [2, 12]];
    poly(DIAMOND_COL, pts);
    poly(DIAMOND_LIGHT, [[12, 2], [22, 12], [12, 12]]);
    poly(DIAMOND_DARK, [[12, 22], [2, 12], [12, 12]]);
    poly(DIAMOND_LIGHT, [[12, 2], [14, 6], [12, 9], [10, 6]]);
    g.strokeStyle = "rgb(230, 250, 255)";
    g.lineWidth = 1.5;
    g.stroke();

    const frames = [base];
    for (let i = 1; i < 16; i++) {
        const c = makeCanvas(34, 34);
        const cg = c.getContext("2d");
        cg.translate(17, 17);
        cg.rotate(i * 22.5 * Math.PI / 180);
        cg.drawImage(base, -12, -12);
        frames.push(c);
    }
    _SPR.diamondFrames = frames;
    return frames;
}

function getDiamondIcon(size) {
    let icon = _SPR.diamondIcons[size];
    if (icon) return icon;

    icon = makeCanvas(size + 2, size + 2);
    const g = icon.getContext("2d");
    const c = Math.floor((size + 2) / 2);
    const poly = (color, pts) => {
        g.fillStyle = rgb(color);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        g.fill();
    };
    const pts = [[c, 1], [size, c], [c, size], [1, c]];
    poly(DIAMOND_COL, pts);
    poly(DIAMOND_LIGHT, [[c, 1], [size, c], [c, c]]);
    poly(DIAMOND_DARK, [[c, size], [1, c], [c, c]]);
    g.strokeStyle = "rgb(230, 250, 255)";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.stroke();

    _SPR.diamondIcons[size] = icon;
    return icon;
}

// ------------------------------------------------------------
// 6. HÀO QUANG VÀ HIỆU ỨNG
// ------------------------------------------------------------
function _qalpha(a) {
    a = Math.trunc(a);
    return Math.max(24, Math.min(255, Math.trunc(a / 24) * 24));
}

function getCircleGlow(radius, color, alpha) {
    alpha = _qalpha(alpha);
    const key = "c|" + radius + "|" + color.join(",") + "|" + alpha;
    let surf = _SPR.glow[key];
    if (!surf) {
        const d = radius * 2;
        surf = makeCanvas(d, d);
        const g = surf.getContext("2d");
        const [r, gg, b] = color;
        g.fillStyle = rgb([r, gg, b], alpha / 3 / 255);
        g.beginPath(); g.arc(radius, radius, radius, 0, Math.PI * 2); g.fill();
        g.fillStyle = rgb([r, gg, b], (alpha * 2 / 3) / 255);
        g.beginPath(); g.arc(radius, radius, Math.max(1, Math.trunc(radius * 0.66)), 0, Math.PI * 2); g.fill();
        g.fillStyle = rgb([r, gg, b], alpha / 255);
        g.beginPath(); g.arc(radius, radius, Math.max(1, Math.trunc(radius * 0.33)), 0, Math.PI * 2); g.fill();
        _SPR.glow[key] = surf;
    }
    return surf;
}

function getRectGlow(w, h, color, alpha) {
    alpha = _qalpha(alpha);
    const key = "r|" + w + "|" + h + "|" + color.join(",") + "|" + alpha;
    let surf = _SPR.rectGlow[key];
    if (!surf) {
        surf = makeCanvas(w, h);
        const g = surf.getContext("2d");
        g.fillStyle = rgb(color, alpha / 255);
        g.fillRect(0, 0, w, h);
        _SPR.rectGlow[key] = surf;
    }
    return surf;
}

function getLivesIcon() {
    if (!_SPR.livesIcon) {
        const c = makeCanvas(22, 22);
        const g = c.getContext("2d");
        g.fillStyle = "rgb(70, 230, 90)";
        g.beginPath();
        g.moveTo(11, 2);
        g.lineTo(20, 20);
        g.lineTo(11, 15);
        g.lineTo(2, 20);
        g.closePath();
        g.fill();
        _SPR.livesIcon = c;
    }
    return _SPR.livesIcon;
}

// ------------------------------------------------------------
// 7. VẼ CHỮ
// ------------------------------------------------------------
function drawTextTo(g, text, size, bold, color, x, y, opts) {
    opts = opts || {};
    g.font = (bold ? "bold " : "") + size + "px " + FONT_STACK;
    g.textAlign = opts.align || "left";
    g.textBaseline = opts.baseline || "top";
    g.fillStyle = rgb(color);
    g.fillText(text, x, y);
}

function textWidthOf(g, text, size, bold) {
    g.font = (bold ? "bold " : "") + size + "px " + FONT_STACK;
    return g.measureText(text).width;
}
