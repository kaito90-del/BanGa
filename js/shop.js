/* ============================================================
 * File: shop.js - Cửa hàng máy bay (SkinManager + Shop)
 * Hỗ trợ bàn phím, chuột và CẢM ỨNG
 * ============================================================ */

class SkinManager {
    constructor(saveManager) {
        this.save = saveManager;
    }

    get owned() { return this.save.data.owned_skins; }
    get equippedId() { return this.save.data.equipped_skin; }

    getSkin(skinId) { return SKINS[skinId] || SKINS.DEFAULT; }
    equippedSkin() { return this.getSkin(this.equippedId); }
    isOwned(skinId) { return this.owned.includes(skinId); }
    isEquipped(skinId) { return skinId === this.equippedId; }

    tryBuy(skinId) {
        const skin = this.getSkin(skinId);
        if (!(skinId in SKINS)) return [false, "MÁY BAY KHÔNG TỒN TẠI"];
        if (this.isOwned(skinId)) return [false, "ĐÃ SỞ HỮU"];
        const price = skin.price;
        if (price <= 0) {
            this.owned.push(skinId);
            this.save.saveNow();
            return [true, "MUA THÀNH CÔNG!"];
        }
        if (!this.save.spendDiamonds(price)) return [false, "KHÔNG ĐỦ KIM CƯƠNG"];
        this.owned.push(skinId);
        this.save.saveNow();
        return [true, "MUA THÀNH CÔNG!"];
    }

    equip(skinId) {
        if (!this.isOwned(skinId)) return [false, "CHƯA SỞ HỮU"];
        if (this.isEquipped(skinId)) return [false, "ĐANG ĐƯỢC TRANG BỊ"];
        this.save.data.equipped_skin = skinId;
        this.save.saveNow();
        return [true, "ĐÃ TRANG BỊ: " + this.getSkin(skinId).name];
    }
}

class Shop {
    constructor(game) {
        this.game = game;
        this.PAGE_SIZE = 4;
        this.CARD_W = 380;
        this.CARD_H = 224;
        this.pageCount = Math.ceil(SKIN_ORDER.length / this.PAGE_SIZE);
        this.cardRects = [
            [60, 140], [460, 140],
            [60, 376], [460, 376],
        ];
        this.navPrevRect = [330, 108, 90, 28];
        this.navNextRect = [480, 108, 90, 28];
        this.backRect = [24, 660, 150, 28];
        this._cardCache = {};
        this.open();
    }

    open() {
        this.page = 0;
        this.selected = 0;
        this.message = "";
        this.messageColor = WHITE;
        this.messageTimer = 0.0;
        this.denyTimer = 0.0;
        this.animT = 0.0;
    }

    setMessage(text, color) {
        this.message = text;
        this.messageColor = color;
        this.messageTimer = 1.8;
    }

    skinIdsOnPage() {
        const out = [];
        const start = this.page * this.PAGE_SIZE;
        for (let i = 0; i < this.PAGE_SIZE; i++) {
            const id = SKIN_ORDER[start + i];
            if (id) out.push(id);
        }
        return out;
    }

    action() {
        const ids = this.skinIdsOnPage();
        if (!ids.length) return;
        const skinId = ids[this.selected];
        const game = this.game;
        const sm = game.skinManager;

        if (!sm.isOwned(skinId)) {
            const [ok, msg] = sm.tryBuy(skinId);
            if (ok) {
                this.setMessage("MUA THÀNH CÔNG! BẤM LẦN NỮA ĐỂ TRANG BỊ", GREEN);
                game.flash(60, 0.18, WHITE);
                game.play("buy");
            } else {
                this.setMessage(msg, RED);
                this.denyTimer = 0.35;
                game.play("deny");
            }
        } else if (!sm.isEquipped(skinId)) {
            const [ok, msg] = sm.equip(skinId);
            this.setMessage(msg, CYAN);
            if (ok) {
                game.play("equip");
                if (game.player) game.player.applySkin(sm.getSkin(skinId));
            }
        } else {
            this.setMessage("ĐANG ĐƯỢC TRANG BỊ", GREY);
        }
    }

    handleKey(e) {
        const game = this.game;
        switch (e.code) {
            case "Escape":
                game.state = ST.MENU;
                break;
            case "Enter":
            case "NumpadEnter":
            case "Space":
                this.action();
                break;
            case "ArrowUp":
            case "ArrowDown": {
                const row = Math.trunc(this.selected / 2);
                const col = this.selected % 2;
                const newRow = (row + 1) % 2;
                this.selected = newRow * 2 + col;
                break;
            }
            case "ArrowLeft": {
                const col = this.selected % 2;
                if (col === 0) this.page = (this.page - 1 + this.pageCount) % this.pageCount;
                else this.selected = Math.trunc(this.selected / 2) * 2;
                break;
            }
            case "ArrowRight": {
                const col = this.selected % 2;
                if (col === 1) this.page = (this.page + 1) % this.pageCount;
                else this.selected = Math.trunc(this.selected / 2) * 2 + 1;
                break;
            }
            case "Digit1": case "Digit2": case "Digit3": case "Digit4":
                this.selected = +e.code.slice(-1) - 1;
                break;
        }
    }

    handlePointerMove(lx, ly) {
        const ids = this.skinIdsOnPage();
        for (let i = 0; i < ids.length && i < this.cardRects.length; i++) {
            const [x, y] = this.cardRects[i];
            if (lx >= x && lx <= x + this.CARD_W && ly >= y && ly <= y + this.CARD_H) {
                this.selected = i;
                return;
            }
        }
    }

    handlePointerTap(lx, ly) {
        const game = this.game;
        const [bx, by, bw, bh] = this.backRect;
        if (lx >= bx && lx <= bx + bw && ly >= by && ly <= by + bh) {
            game.state = ST.MENU;
            return true;
        }
        const [px, py, pw, ph] = this.navPrevRect;
        if (lx >= px && lx <= px + pw && ly >= py && ly <= py + ph) {
            this.page = (this.page - 1 + this.pageCount) % this.pageCount;
            return true;
        }
        const [nx, ny, nw, nh] = this.navNextRect;
        if (lx >= nx && lx <= nx + nw && ly >= ny && ly <= ny + nh) {
            this.page = (this.page + 1) % this.pageCount;
            return true;
        }
        const ids = this.skinIdsOnPage();
        for (let i = 0; i < ids.length && i < this.cardRects.length; i++) {
            const [x, y] = this.cardRects[i];
            if (lx >= x && lx <= x + this.CARD_W && ly >= y && ly <= y + this.CARD_H) {
                this.selected = i;
                this.action();
                return true;
            }
        }
        return false;
    }

    update(dt) {
        this.animT += dt;
        if (this.messageTimer > 0) this.messageTimer -= dt;
        if (this.denyTimer > 0) this.denyTimer -= dt;
    }

    _getCard(skinId) {
        let card = this._cardCache[skinId];
        if (!card) {
            const skin = SKINS[skinId] || SKINS.DEFAULT;
            card = makeCanvas(this.CARD_W, this.CARD_H);
            const g = card.getContext("2d");
            g.fillStyle = "rgb(13,19,40)";
            g.fillRect(0, 0, this.CARD_W, this.CARD_H);
            g.strokeStyle = rgb(skin.glowColor || GREEN);
            g.lineWidth = 2;
            g.strokeRect(1, 1, this.CARD_W - 2, this.CARD_H - 2);

            drawTextTo(g, skin.name, 19, true, WHITE, 190, 10,
                { align: "center", baseline: "top" });

            g.strokeStyle = "rgb(50,90,130)";
            g.lineWidth = 1;
            g.beginPath(); g.moveTo(10, 32); g.lineTo(370, 32); g.stroke();

            const rows = [
                ["SÁT THƯƠNG", "x" + skin.damageMult.toFixed(2), CYAN],
                ["SỐ ĐẠN", "" + skin.bulletCount, YELLOW],
                ["TỐC BẮN", "x" + skin.fireRateMult.toFixed(2), GREEN],
                ["KỸ NĂNG", skin.skill ? skin.skill.name : "TĂNG TỐC", [255, 215, 60]],
            ];
            let ly = 48;
            for (const [label, value, col] of rows) {
                drawTextTo(g, label, 15, true, GREY, 150, ly - 6,
                    { align: "left", baseline: "top" });
                drawTextTo(g, value, 15, true, col, 365, ly - 6,
                    { align: "right", baseline: "top" });
                ly += 24;
            }

            if (skin.skill && skin.skill.desc) {
                drawTextTo(g, skin.skill.desc, 12, false, [180, 200, 220], 150, ly + 2,
                    { align: "left", baseline: "top" });
            }

            if (skin.price <= 0) {
                drawTextTo(g, "MIỄN PHÍ", 14, true, GREEN, this.CARD_W - 80, 8,
                    { align: "left", baseline: "top" });
            }
            this._cardCache[skinId] = card;
        }
        return card;
    }

    draw(g) {
        const game = this.game;
        const sm = game.skinManager;

        drawTextTo(g, "CỬA HÀNG MÁY BAY", 28, true, CYAN, 450, 34,
            { align: "center", baseline: "middle" });

        const icon = getDiamondIcon(16);
        g.drawImage(icon, 730, 30);
        drawTextTo(g, "" + game.save.diamonds, 20, true, DIAMOND_LIGHT, 750, 31,
            { align: "left", baseline: "top" });
        drawTextTo(g, "KIM CƯƠNG", 14, false, GREY, 730, 48,
            { align: "left", baseline: "top" });

        drawTextTo(g, "TRANG " + (this.page + 1) + "/" + this.pageCount, 18, true, WHITE,
            450, 108, { align: "center", baseline: "top" });
        drawTextTo(g, "< TRƯỚC", 18, true, CYAN, 375, 108,
            { align: "center", baseline: "top" });
        drawTextTo(g, "SAU >", 18, true, CYAN, 525, 108,
            { align: "center", baseline: "top" });

        const ids = this.skinIdsOnPage();
        for (let i = 0; i < ids.length && i < this.cardRects.length; i++) {
            const skinId = ids[i];
            const skin = SKINS[skinId];
            const [rx, ry] = this.cardRects[i];

            let dx = 0;
            if (i === this.selected && this.denyTimer > 0) {
                dx = Math.sin(this.denyTimer * 60) * 5;
            }

            g.drawImage(this._getCard(skinId), Math.trunc(rx + dx), ry);

            if (i === this.selected) {
                g.strokeStyle = rgb(WHITE);
                g.lineWidth = 3;
                g.strokeRect(rx + dx - 3, ry - 3, this.CARD_W + 6, this.CARD_H + 6);
            }

            const bob = Math.sin(this.animT * 3.0 + i * 1.7) * 4;
            const big = getPlayerSpriteBig(skinId);
            const px = rx + dx + 75 - big.width / 2;
            const py = ry + 115 + bob - big.height / 2;
            const glow = getCircleGlow(20, skin.glowColor, 70);
            g.drawImage(glow, rx + dx + 75 - glow.width / 2, ry + 115 + bob - glow.height / 2);
            g.drawImage(big, Math.trunc(px), Math.trunc(py));

            // Hộp trạng thái mua / trang bị
            const bx = Math.trunc(rx + dx + 150);
            const by = ry + 175;
            const bw = 215, bh = 34;

            if (sm.isEquipped(skinId)) {
                g.fillStyle = "rgba(40,160,80,0.45)";
                g.fillRect(bx, by, bw, bh);
                g.strokeStyle = rgb(GREEN);
                g.lineWidth = 2;
                g.strokeRect(bx, by, bw, bh);
                drawTextTo(g, "✓ ĐANG DÙNG", 16, true, GREEN, bx + bw / 2, by + bh / 2,
                    { align: "center", baseline: "middle" });
            } else if (sm.isOwned(skinId)) {
                g.fillStyle = "rgba(40,120,200,0.35)";
                g.fillRect(bx, by, bw, bh);
                g.strokeStyle = rgb(CYAN);
                g.lineWidth = 1;
                g.strokeRect(bx, by, bw, bh);
                drawTextTo(g, "TRANG BỊ", 16, true, CYAN, bx + bw / 2, by + bh / 2,
                    { align: "center", baseline: "middle" });
            } else {
                g.fillStyle = "rgba(220,160,30,0.35)";
                g.fillRect(bx, by, bw, bh);
                g.strokeStyle = rgb(YELLOW);
                g.lineWidth = 1;
                g.strokeRect(bx, by, bw, bh);
                const dIcon = getDiamondIcon(14);
                const tw = textWidthOf(g, "MUA " + skin.price, 16, true);
                g.drawImage(dIcon, Math.trunc(bx + bw / 2 - tw / 2 - 16), Math.trunc(by + bh / 2 - 7));
                drawTextTo(g, "MUA " + skin.price, 16, true, YELLOW,
                    bx + bw / 2 + 6, by + bh / 2, { align: "center", baseline: "middle" });
            }
        }

        if (this.messageTimer > 0) {
            drawTextTo(g, this.message, 18, true, this.messageColor, 450, 625,
                { align: "center", baseline: "middle" });
        }

        const [bx, by, bw, bh] = this.backRect;
        g.strokeStyle = "rgb(80,120,160)";
        g.strokeRect(bx, by, bw, bh);
        drawTextTo(g, "< QUAY LẠI (ESC)", 16, true, GREY, bx + bw / 2, by + bh / 2,
            { align: "center", baseline: "middle" });
    }
}
