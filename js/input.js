/* ============================================================
 * File: input.js - điều khiển
 * - Bàn phím: WASD / mũi tên + SPACE (giữ để bắn) + ESC + R
 * - CẢM ỨNG (mobile): kéo ngón tay để bay (tàu theo tay, ngón
 *   không che tàu), TỰ ĐỘNG BẮN khi đang chạm, chạm ngón thứ 2
 *   hoặc nút tạm dừng để PAUSE.
 * - Chuột: kéo chuột cũng điều khiển tàu + tự bắn (thử trên desktop)
 * ============================================================ */

class Input {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.keys = new Set();          // mã phím đang giữ (e.code)
        this.pointerId = null;          // ngón/chuột chính đang điều khiển tàu
        this.dragStartPointer = null;   // vị trí ngón khi bắt đầu kéo (toạ độ logic)
        this.dragStartShip = null;      // tâm tàu khi bắt đầu kéo
        this.pointerNow = null;         // vị trí ngón hiện tại
        this.downPos = null;            // vị trí chạm ban đầu (để nhận diện TAP)
        this.downPointerId = null;
        this.isTouch = false;           // thiết bị cảm ứng?
        try {
            this.isTouch = ("ontouchstart" in window) ||
                (navigator.maxTouchPoints > 0) ||
                (window.matchMedia && matchMedia("(pointer:coarse)").matches);
        } catch (e) { this.isTouch = false; }
        this._attach();
    }

    _attach() {
        // ---------------- BÀN PHÍM ----------------
        window.addEventListener("keydown", (e) => {
            AUDIO.unlock();
            // chống cuộn trang khi chơi bằng phím mũi tên / space
            if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
                e.preventDefault();
            }
            if (!e.repeat) {
                this.keys.add(e.code);
                this.game.onKeyDown(e);
            }
        });
        window.addEventListener("keyup", (e) => {
            this.keys.delete(e.code);
        });
        window.addEventListener("blur", () => {
            this.keys.clear();
            this.cancelDrag();
        });

        // ---------------- CON TRỎ (chuột + cảm ứng) ----------------
        this.canvas.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            AUDIO.unlock();
            const p = this._toLogical(e);

            // đang chơi: điều khiển tàu, nút pause hoặc nút kỹ năng
            if (this.game.state === ST.PLAYING) {
                if (this.game.hitPauseButton(p.x, p.y)) {
                    this.game.state = ST.PAUSED;
                    return;
                }
                if (this.game.hitSkillButton && this.game.hitSkillButton(p.x, p.y)) {
                    if (this.game.player) this.game.player.activateSkill();
                    return;
                }
                if (this.pointerId === null) {
                    this.pointerId = e.pointerId;
                    this.dragStartPointer = { x: p.x, y: p.y };
                    const player = this.game.player;
                    this.dragStartShip = (player && player.alive)
                        ? { x: player.centerX, y: player.centerY }
                        : null;
                    this.pointerNow = { x: p.x, y: p.y };
                    this._applyDragTarget();
                } else {
                    // ngón thứ 2 -> tạm dừng
                    this.game.state = ST.PAUSED;
                }
                return;
            }

            // các màn hình khác: ghi nhận để nhận diện TAP khi thả tay
            this.downPos = { x: p.x, y: p.y };
            this.downPointerId = e.pointerId;
            // hover chọn ngay khi chạm (menu/cửa hàng/cài đặt)
            this.game.onPointerMove(p.x, p.y);
        });

        this.canvas.addEventListener("pointermove", (e) => {
            if (e.pointerType === "mouse" && e.buttons === 0) {
                // di chuột không bấm -> chỉ hover
                if (this.game.state !== ST.PLAYING) {
                    const p = this._toLogical(e);
                    this.game.onPointerMove(p.x, p.y);
                }
                return;
            }
            if (e.pointerId === this.pointerId) {
                const p = this._toLogical(e);
                this.pointerNow = { x: p.x, y: p.y };
                this._applyDragTarget();
            } else if (this.game.state !== ST.PLAYING) {
                const p = this._toLogical(e);
                this.game.onPointerMove(p.x, p.y);
            }
        });

        const endPointer = (e) => {
            if (e.pointerId === this.pointerId) {
                this.cancelDrag();
                return;
            }
            if (this.downPointerId === e.pointerId && this.downPos) {
                const p = this._toLogical(e);
                const dx = p.x - this.downPos.x;
                const dy = p.y - this.downPos.y;
                // ngón không di chuyển nhiều -> là TAP (chọn / kích hoạt)
                if (Math.hypot(dx, dy) < 18) {
                    this.game.onPointerTap(p.x, p.y);
                }
                this.downPos = null;
                this.downPointerId = null;
            }
        };
        this.canvas.addEventListener("pointerup", endPointer);
        this.canvas.addEventListener("pointercancel", (e) => {
            if (e.pointerId === this.pointerId) this.cancelDrag();
            this.downPos = null;
            this.downPointerId = null;
        });

        // chống menu chuột phải / chọn chữ / double-tap zoom
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        document.addEventListener("gesturestart", (e) => e.preventDefault());

        // ẩn trang -> tự tạm dừng (mobile: chuyển app / khoá màn hình)
        document.addEventListener("visibilitychange", () => {
            if (document.hidden && this.game.state === ST.PLAYING) {
                this.game.state = ST.PAUSED;
            }
            if (document.hidden) this.cancelDrag();
        });
    }

    // Đang giữ phím?
    isDown(code) { return this.keys.has(code); }

    // Ngón/chuột đang chạm (để tự bắn)?
    get dragActive() { return this.pointerId !== null; }

    cancelDrag() {
        this.pointerId = null;
        this.dragStartPointer = null;
        this.dragStartShip = null;
        this.pointerNow = null;
        if (this.game.player) this.game.player.touchTarget = null;
    }

    _applyDragTarget() {
        const player = this.game.player;
        if (!player || !player.alive || !this.dragStartPointer ||
            !this.dragStartShip || !this.pointerNow) return;
        // kéo tương đối: tàu dịch đúng khoảng ngón tay dịch
        const dx = this.pointerNow.x - this.dragStartPointer.x;
        const dy = this.pointerNow.y - this.dragStartPointer.y;
        player.touchTarget = {
            x: this.dragStartShip.x + dx,
            y: this.dragStartShip.y + dy,
        };
    }

    _toLogical(e) {
        const r = this.canvas.getBoundingClientRect();
        const sx = (r.width > 0) ? WIDTH / r.width : 1;
        const sy = (r.height > 0) ? HEIGHT / r.height : 1;
        return {
            x: (e.clientX - r.left) * sx,
            y: (e.clientY - r.top) * sy,
        };
    }
}
