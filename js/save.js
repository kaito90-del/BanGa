/* ============================================================
 * File: save.js - Quản lý lưu game & tiến độ 6 Map
 * Dữ liệu lưu trong localStorage của trình duyệt
 * Tương thích 100% với file save.json cũ và bản Python
 * ============================================================ */

const SAVE_KEY = "galactic_invaders_save_v1";

class SaveManager {
    constructor() {
        this.data = {};
        this._dirty = false;
        this._flushTimer = 0.0;
        this._load();
    }

    // ---------------- Nạp mặc định ----------------
    _defaults() {
        return {
            diamonds: 50,
            owned_skins: ["DEFAULT"],
            equipped_skin: "DEFAULT",
            high_score: 0,
            highest_wave: 1,
            unlocked_map: 1,
            current_map: 1,
            current_level: 1,
            map_stars: { "1": [0, 0, 0, 0, 0] },
            settings: { sound: true, shake: true, particles: "high" },
        };
    }

    _sanitize(raw) {
        const data = this._defaults();
        if (typeof raw !== "object" || raw === null) return data;

        if (Number.isFinite(+raw.diamonds)) data.diamonds = Math.max(0, Math.trunc(+raw.diamonds));
        if (Number.isFinite(+raw.high_score)) data.high_score = Math.max(0, Math.trunc(+raw.high_score));
        if (Number.isFinite(+raw.highest_wave)) data.highest_wave = Math.max(1, Math.trunc(+raw.highest_wave));

        if (Number.isFinite(+raw.unlocked_map)) data.unlocked_map = Math.max(1, Math.min(6, Math.trunc(+raw.unlocked_map)));
        if (Number.isFinite(+raw.current_map)) data.current_map = Math.max(1, Math.min(6, Math.trunc(+raw.current_map)));
        if (Number.isFinite(+raw.current_level)) data.current_level = Math.max(1, Math.min(5, Math.trunc(+raw.current_level)));

        if (typeof raw.map_stars === "object" && raw.map_stars !== null) {
            data.map_stars = raw.map_stars;
        }

        let owned = Array.isArray(raw.owned_skins) ? raw.owned_skins : [];
        const valid = owned.filter(s => typeof s === "string" && SKINS[s]);
        if (!valid.includes("DEFAULT")) valid.unshift("DEFAULT");
        data.owned_skins = valid;

        if (!(data.owned_skins.includes(raw.equipped_skin))) data.equipped_skin = "DEFAULT";
        else data.equipped_skin = raw.equipped_skin;

        const rs = (typeof raw.settings === "object" && raw.settings) ? raw.settings : {};
        if (typeof rs.sound === "boolean") data.settings.sound = rs.sound;
        if (typeof rs.shake === "boolean") data.settings.shake = rs.shake;
        if (rs.particles === "high" || rs.particles === "low") data.settings.particles = rs.particles;

        return data;
    }

    _load() {
        let raw = null;
        try {
            const txt = localStorage.getItem(SAVE_KEY);
            if (txt) raw = JSON.parse(txt);
        } catch (e) { raw = null; }
        const existed = raw !== null;
        this.data = this._sanitize(raw);
        if (!existed) this.saveNow();
    }

    // ---------------- Ghi dữ liệu ----------------
    saveNow() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) { /* Bỏ qua nếu bộ nhớ đầy */ }
        this._dirty = false;
        this._flushTimer = 0.0;
    }

    markDirty() {
        this._dirty = true;
        this._flushTimer = 0.0;
    }

    flush(dt) {
        if (!this._dirty) return;
        this._flushTimer += dt;
        if (this._flushTimer >= 0.8) this.saveNow();
    }

    // ---------------- Truy cập & Tiến độ Map ----------------
    get diamonds() { return Math.trunc(this.data.diamonds); }

    get unlockedMap() { return Math.trunc(this.data.unlocked_map || 1); }
    get currentMap() { return Math.trunc(this.data.current_map || 1); }
    get currentLevel() { return Math.trunc(this.data.current_level || 1); }

    setCurrentMap(mapId) {
        this.data.current_map = Math.max(1, Math.min(this.unlockedMap, Math.trunc(mapId)));
        this.data.current_level = 1;
        this.markDirty();
    }

    setCurrentLevel(levelId) {
        this.data.current_level = Math.max(1, Math.min(5, Math.trunc(levelId)));
        this.markDirty();
    }

    unlockNextMap(currentMapId) {
        const next = Math.min(6, Math.trunc(currentMapId) + 1);
        if (next > this.data.unlocked_map) {
            this.data.unlocked_map = next;
            this.markDirty();
            this.saveNow();
            return true;
        }
        return false;
    }

    completeLevel(mapId, levelId, stars) {
        const mKey = String(mapId);
        if (!this.data.map_stars[mKey]) {
            this.data.map_stars[mKey] = [0, 0, 0, 0, 0];
        }
        const idx = Math.max(0, Math.min(4, levelId - 1));
        const currentStars = this.data.map_stars[mKey][idx] || 0;
        this.data.map_stars[mKey][idx] = Math.max(currentStars, Math.min(3, stars || 1));
        this.markDirty();
    }

    getStars(mapId, levelId) {
        const mKey = String(mapId);
        if (!this.data.map_stars[mKey]) return 0;
        return this.data.map_stars[mKey][levelId - 1] || 0;
    }

    addDiamonds(amount) {
        this.data.diamonds = Math.trunc(this.data.diamonds) + Math.trunc(amount);
        this.markDirty();
    }

    spendDiamonds(amount) {
        if (this.diamonds >= amount) {
            this.data.diamonds = Math.trunc(this.data.diamonds) - Math.trunc(amount);
            this.markDirty();
            return true;
        }
        return false;
    }

    recordHighScore(score) {
        if (Math.trunc(score) > Math.trunc(this.data.high_score)) {
            this.data.high_score = Math.trunc(score);
            this.markDirty();
        }
    }

    recordWave(wave) {
        if (Math.trunc(wave) > Math.trunc(this.data.highest_wave)) {
            this.data.highest_wave = Math.trunc(wave);
            this.markDirty();
        }
    }

    reset() {
        this.data = this._defaults();
        this.saveNow();
    }

    // ---------------- Nhập / Xuất JSON ----------------
    importFromJSONText(text) {
        try {
            const raw = JSON.parse(text);
            this.data = this._sanitize(raw);
            this.saveNow();
            return true;
        } catch (e) {
            return false;
        }
    }

    exportJSON() {
        return JSON.stringify(this.data, null, 4);
    }

    downloadSave() {
        try {
            const blob = new Blob([this.exportJSON()], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "save.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (e) { /* Bỏ qua */ }
    }
}
