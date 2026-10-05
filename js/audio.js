/* ============================================================
 * File: audio.js - âm thanh tổng hợp bằng Web Audio API
 * (tương đương make_beep / make_noise / make_tone_seq trong Pygame)
 * Không cần file âm thanh ngoài - mọi hiệu ứng được sinh bằng toán.
 * ============================================================ */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.buffers = {};
        this.enabled = true; // game sẽ đồng bộ với settings.sound
        this._unlocked = false;
    }

    // Phải gọi sau 1 thao tác chạm/phím của người dùng (trình duyệt
    // yêu cầu user-gesture trước khi cho phát âm thanh).
    unlock() {
        this._initCtx();
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
        this._unlocked = true;
    }

    _initCtx() {
        if (this.ctx) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.55;
            this.master.connect(this.ctx.destination);
            this._buildAll();
        } catch (e) {
            this.ctx = null;
        }
    }

    // ---------------- bộ sinh âm (22050 Hz như bản Python) ----------------
    _beep(freq, dur, vol, sweep) {
        sweep = sweep || 0;
        const sr = 22050;
        const n = Math.max(1, Math.floor(sr * dur));
        const buf = this.ctx.createBuffer(1, n, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
            const t = i / sr;
            const f = freq + sweep * t;
            const env = Math.max(0, 1 - t / dur);
            d[i] = vol * env * Math.sin(2 * Math.PI * f * t);
        }
        return buf;
    }

    _noise(dur, vol) {
        const sr = 22050;
        const n = Math.max(1, Math.floor(sr * dur));
        const buf = this.ctx.createBuffer(1, n, sr);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
            const t = i / sr;
            const env = Math.max(0, 1 - t / dur);
            d[i] = vol * env * (Math.random() * 2 - 1);
        }
        return buf;
    }

    // segments: [[freq, dur, sweep], ...]
    _seq(segments, vol) {
        const sr = 22050;
        let total = 0;
        for (const s of segments) total += Math.max(1, Math.floor(sr * s[1]));
        const buf = this.ctx.createBuffer(1, total, sr);
        const d = buf.getChannelData(0);
        let idx = 0;
        for (const [freq, dur, sweep] of segments) {
            const n = Math.max(1, Math.floor(sr * dur));
            for (let i = 0; i < n; i++, idx++) {
                const t = i / sr;
                const f = freq + (sweep || 0) * t;
                const env = Math.min(1, t * 120) * Math.max(0, 1 - t / dur);
                d[idx] = vol * env * Math.sin(2 * Math.PI * f * t);
            }
        }
        return buf;
    }

    _buildAll() {
        const B = this.buffers;
        // Bắn
        B.shoot = this._beep(880, 0.06, 0.15, -4000);
        // Địch nổ
        B.enemy_die = this._noise(0.25, 0.25);
        // Người chơi nổ
        B.player_die = this._beep(220, 0.6, 0.35, -200);
        // Nhặt vật phẩm
        B.powerup = this._beep(660, 0.18, 0.25, 2000);
        // Nhặt kim cương
        B.diamond = this._seq([[990, 0.06, 0], [1480, 0.11, 0]], 0.22);
        // Kim cương bay về HUD
        B.diamond_tick = this._beep(1650, 0.04, 0.10, 0);
        // Cảnh báo trùm
        B.boss_warn = this._seq([
            [330, 0.20, -40], [240, 0.20, -30],
            [330, 0.20, -40], [240, 0.20, -30],
        ], 0.30);
        // Đạn trúng trùm
        B.boss_hit = this._noise(0.07, 0.12);
        // Trùm nổ
        B.boss_die = this._noise(0.75, 0.42);
        // Trùm đổi pha
        B.boss_phase = this._seq([[200, 0.14, 0], [420, 0.14, 0], [200, 0.14, 0]], 0.28);
        // Mua skin
        B.buy = this._seq([[520, 0.07, 0], [660, 0.07, 0], [880, 0.12, 0]], 0.25);
        // Trang bị skin
        B.equip = this._seq([[700, 0.08, 0], [1050, 0.14, 0]], 0.22);
        // Kích hoạt kỹ năng
        B.skill_use = this._seq([[440, 0.08, 200], [660, 0.08, 300], [990, 0.16, 500]], 0.35);
        // Chiến thắng Map
        B.map_win = this._seq([[523, 0.12, 0], [659, 0.12, 0], [784, 0.14, 0], [1046, 0.35, 0]], 0.40);
        // Không đủ kim cương
        B.deny = this._beep(150, 0.25, 0.30, -40);
    }

    play(name) {
        if (!this.enabled || !this.ctx || !this._unlocked) return;
        if (this.ctx.state !== "running") return;
        const buf = this.buffers[name];
        if (!buf) return;
        try {
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.master);
            src.start();
        } catch (e) { /* bỏ qua */ }
    }
}

// Một thể hiện dùng chung toàn game
const AUDIO = new AudioManager();
