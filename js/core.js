/* ============================================================
 * GALACTIC INVADERS - DIAMOND EDITION (bản web / HTML5)
 * File: core.js - hằng số, dữ liệu, 6 MAP, 10 LOẠI GÀ, 8 MÁY BAY, 6 BOSS
 * ============================================================ */

// ------------------------------------------------------------
// Kích thước màn hình logic (không đổi - canvas scale để fit)
// ------------------------------------------------------------
const WIDTH = 900;
const HEIGHT = 700;
const FPS = 60;

// ------------------------------------------------------------
// Bảng màu (retro arcade & modern vibrant)
// ------------------------------------------------------------
const BLACK = [0, 0, 0];
const DARK_BG = [5, 8, 22];
const STAR_COL = [60, 80, 110];
const WHITE = [255, 255, 255];
const GREEN = [70, 230, 90];
const GREEN_DK = [30, 130, 50];
const PINK = [255, 90, 200];
const CYAN = [80, 240, 255];
const YELLOW = [255, 220, 60];
const RED = [255, 60, 60];
const ORANGE = [255, 150, 40];
const GREY = [130, 130, 150];
const HUD_BG = [12, 18, 38];
const HUD_LINE = [50, 90, 130];
const PURPLE = [150, 80, 255];
const VIOLET = [115, 75, 205];
const GOLD = [255, 215, 0];

// Kim cương
const DIAMOND_COL = [70, 215, 255];
const DIAMOND_LIGHT = [185, 245, 255];
const DIAMOND_DARK = [25, 120, 200];

// ------------------------------------------------------------
// Trạng thái game
// ------------------------------------------------------------
const ST = {
    MENU: "MENU",
    MAP_SELECT: "MAP_SELECT",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    GAME_OVER: "GAME_OVER",
    VICTORY_MAP: "VICTORY_MAP",
    SHOP: "SHOP",
    HOW_TO: "HOW_TO",
    UPGRADES: "UPGRADES",
    SETTINGS: "SETTINGS",
    BYE: "BYE",
};

// Vật phẩm hỗ trợ
const PU_RAPID = "RAPID";
const PU_DOUBLE = "DOUBLE";
const PU_SHIELD = "SHIELD";
const PU_HEAL = "HEAL";

// ------------------------------------------------------------
// 10 LOẠI ĐỊCH (GÀ THƯỜNG, GÀ MẠNH, GÀ ĐẶC BIỆT)
// ------------------------------------------------------------
const E_TYPE_1 = 1;   // Gà con vàng cơ bản (Chick)
const E_TYPE_2 = 2;   // Gà hồng do thám (Scout - nhanh)
const E_TYPE_3 = 3;   // Gà cyan chiến binh (Warrior - trâu)
const E_TYPE_4 = 4;   // Gà cam quý tộc (Elite - bắn nhanh)
const E_TYPE_5 = 5;   // Gà bọc thép titan (Armored - giảm 50% damage)
const E_TYPE_6 = 6;   // Gà cảm tử bốc lửa (Kamikaze - lao xuống tấn công)
const E_TYPE_7 = 7;   // Gà ném trứng bom (Bomber - thả trứng bom nổ)
const E_TYPE_8 = 8;   // Gà phân thân ngọc bích (Splitter - khi chết tách 2 con nhỏ)
const E_TYPE_9 = 9;   // Gà xạ thủ laser (Laser Hen - bắn tia nguy hiểm)
const E_TYPE_10 = 10; // Gà tạo khiên hộ vệ (Shield Hen - bảo vệ đồng đội)

// Dữ liệu chi tiết từng loại gà
const ENEMY_DATA = {
    [E_TYPE_1]: { name: "GÀ CON", color: YELLOW, hp: 1, score: 10, dropChance: 0.03, dropRange: [1, 1], asset: "chick", speedMult: 1.0 },
    [E_TYPE_2]: { name: "GÀ DO THÁM", color: PINK, hp: 1, score: 20, dropChance: 0.04, dropRange: [1, 2], asset: "chick_scout", speedMult: 1.35 },
    [E_TYPE_3]: { name: "GÀ CHIẾN BINH", color: CYAN, hp: 2.5, score: 35, dropChance: 0.06, dropRange: [2, 3], asset: "hen_warrior", speedMult: 1.05 },
    [E_TYPE_4]: { name: "GÀ QUÝ TỘC", color: ORANGE, hp: 4, score: 60, dropChance: 0.12, dropRange: [3, 5], asset: "rooster_elite", speedMult: 1.15 },
    [E_TYPE_5]: { name: "GÀ BỌC THÉP", color: [170, 185, 200], hp: 6, score: 85, dropChance: 0.16, dropRange: [4, 7], asset: "chicken_armored", armor: 0.5, speedMult: 0.85 },
    [E_TYPE_6]: { name: "GÀ CẢM TỬ", color: [255, 75, 45], hp: 2, score: 70, dropChance: 0.10, dropRange: [2, 4], asset: "chicken_kamikaze", diveSpeed: 320, speedMult: 1.25 },
    [E_TYPE_7]: { name: "GÀ NÉM BOM", color: [170, 90, 240], hp: 5, score: 90, dropChance: 0.18, dropRange: [4, 8], asset: "chicken_bomber", speedMult: 0.95 },
    [E_TYPE_8]: { name: "GÀ PHÂN THÂN", color: [40, 230, 160], hp: 3.5, score: 80, dropChance: 0.14, dropRange: [3, 6], asset: "chicken_splitter", split: true, speedMult: 1.1 },
    [E_TYPE_9]: { name: "GÀ XẠ THỦ LASER", color: [100, 140, 255], hp: 4.5, score: 100, dropChance: 0.20, dropRange: [5, 9], asset: "chicken_laser", laser: true, speedMult: 1.0 },
    [E_TYPE_10]: { name: "GÀ HỘ VỆ", color: [80, 240, 255], hp: 7, score: 120, dropChance: 0.25, dropRange: [6, 12], asset: "chicken_shield", shieldRadius: 110, speedMult: 0.9 },
};

// ------------------------------------------------------------
// HỆ THỐNG 6 MAP (MỖI MAP 5 LEVEL, MỖI LEVEL 5 WAVE)
// ------------------------------------------------------------
const MAPS = [
    {
        id: 1,
        name: "NGÂN HÀ YÊN BÌNH",
        subtitle: "Solar Frontier",
        desc: "Vùng rìa Thái Dương Hệ, nơi phi đội Gà bắt đầu mở màn cuộc xâm lăng.",
        bgTheme: "solar",
        color: [70, 160, 255],
        starsColor: [100, 170, 255],
        bgDark: [5, 8, 26],
        enemyPool: [E_TYPE_1, E_TYPE_2, E_TYPE_3],
        bossIndex: 0,
        levelsCount: 5,
        wavesPerLevel: 5,
        unlockReward: 100,
    },
    {
        id: 2,
        name: "VÀNH ĐAI THIÊN THẠCH",
        subtitle: "Asteroid Belt",
        desc: "Mê cung thiên thạch hiểm trở, xuất hiện Gà Bọc Thép và Gà Cảm Tử bốc lửa.",
        bgTheme: "asteroid",
        color: [255, 150, 50],
        starsColor: [255, 180, 100],
        bgDark: [24, 12, 8],
        enemyPool: [E_TYPE_1, E_TYPE_2, E_TYPE_3, E_TYPE_5, E_TYPE_6],
        bossIndex: 1,
        levelsCount: 5,
        wavesPerLevel: 5,
        unlockReward: 200,
    },
    {
        id: 3,
        name: "TINH VÂN RỰC LỬA",
        subtitle: "Nebula Inferno",
        desc: "Biển dung nham vũ trụ cuộn sóng, tàn lửa bay lượn cùng đàn Gà Ném Bom.",
        bgTheme: "inferno",
        color: [255, 65, 45],
        starsColor: [255, 120, 70],
        bgDark: [28, 8, 8],
        enemyPool: [E_TYPE_2, E_TYPE_3, E_TYPE_4, E_TYPE_6, E_TYPE_7],
        bossIndex: 2,
        levelsCount: 5,
        wavesPerLevel: 5,
        unlockReward: 350,
    },
    {
        id: 4,
        name: "VÙNG CỰC BĂNG GIÁ",
        subtitle: "Cyber Frost",
        desc: "Cực hàn tinh thể băng trôi dạt, đàn Gà Bắn Tỉa Laser công nghệ cao.",
        bgTheme: "frost",
        color: [80, 230, 255],
        starsColor: [160, 245, 255],
        bgDark: [4, 18, 30],
        enemyPool: [E_TYPE_2, E_TYPE_3, E_TYPE_4, E_TYPE_5, E_TYPE_9],
        bossIndex: 3,
        levelsCount: 5,
        wavesPerLevel: 5,
        unlockReward: 500,
    },
    {
        id: 5,
        name: "HƯ KHÔNG SẤM SÉT",
        subtitle: "Thunder Void",
        desc: "Vực thẳm sấm chớp giật liên hồi, Gà Phân Thân và Gà Tạo Khiên bảo vệ tối mật.",
        bgTheme: "thunder",
        color: [180, 90, 255],
        starsColor: [220, 160, 255],
        bgDark: [18, 6, 30],
        enemyPool: [E_TYPE_3, E_TYPE_4, E_TYPE_7, E_TYPE_8, E_TYPE_10],
        bossIndex: 4,
        levelsCount: 5,
        wavesPerLevel: 5,
        unlockReward: 750,
    },
    {
        id: 6,
        name: "TỔ MẸ TỐI THƯỢNG",
        subtitle: "Cosmic Throne",
        desc: "Căn cứ hoàng gia của tộc Gà, đối đầu toàn bộ tinh binh và Mẫu Thần Tối Thượng.",
        bgTheme: "cosmic",
        color: [255, 215, 60],
        starsColor: [255, 240, 180],
        bgDark: [22, 10, 28],
        enemyPool: [E_TYPE_4, E_TYPE_5, E_TYPE_6, E_TYPE_7, E_TYPE_8, E_TYPE_9, E_TYPE_10],
        bossIndex: 5,
        levelsCount: 5,
        wavesPerLevel: 5,
        unlockReward: 1200,
    },
];

// Vị trí "địch chạm đất = thua" (chân màn hình)
const ENEMY_DEATH_Y = HEIGHT - 82; // 618

// Vị trí icon kim cương trên HUD (đích bay về khi nhặt)
const DIAMOND_HUD_CENTER = [770, 24];

// Chỉ số vũ khí cơ bản
const BASE_FIRE_DELAY = 0.28;
const BASE_BULLET_SPEED = 620.0;
const BASE_BULLET_DAMAGE = 1.0;

// Đạn chụm: (lệch x so với tâm tàu, góc theo độ)
const BULLET_SPREADS = {
    1: [[-2.0, 0.0]],
    2: [[-8.0, -6.0], [8.0, 6.0]],
    3: [[-12.0, -11.0], [0.0, 0.0], [12.0, 11.0]],
    4: [[-15.0, -15.0], [-5.0, -5.0], [5.0, 5.0], [15.0, 15.0]],
};

// Giới hạn hạt hiệu ứng
const MAX_PARTICLES_HIGH = 500;
const MAX_PARTICLES_LOW = 160;

// Font hệ thống
const FONT_STACK = "'Segoe UI', Tahoma, Arial, 'Helvetica Neue', Verdana, 'DejaVu Sans', sans-serif";

const PLAYER_W = 44;
const PLAYER_H = 50;
const ENEMY_W = 42;
const ENEMY_H = 42;

// ------------------------------------------------------------
// 8 MÁY BAY NGƯỜI CHƠI (NGOẠI HÌNH, ĐẠN, KỸ NĂNG RIÊNG)
// ------------------------------------------------------------
const SKINS = {
    DEFAULT: {
        id: "DEFAULT", name: "TÂN BINH", price: 0,
        damageMult: 1.0, bulletCount: 1, fireRateMult: 1.0,
        asset: "plane_default",
        bulletAsset: "bullet_green_laser",
        bulletColor: [70, 230, 90],
        glowColor: [60, 230, 120],
        flame: [YELLOW, [80, 255, 160]],
        trail: [90, 255, 120],
        bulletType: "laser",
        skill: {
            name: "TĂNG ÁP & KHIÊN",
            desc: "Bật khiên bảo vệ 6s + Tăng 50% tốc độ di chuyển và tốc bắn.",
            energyCost: 100,
            duration: 6.0,
        },
    },
    BLUE_FALCON: {
        id: "BLUE_FALCON", name: "ƯNG XANH", price: 150,
        damageMult: 1.25, bulletCount: 1, fireRateMult: 1.15,
        asset: "plane_blue_falcon",
        bulletAsset: "bullet_blue_laser",
        bulletColor: [100, 190, 255],
        glowColor: [60, 150, 255],
        flame: [[120, 200, 255], [210, 240, 255]],
        trail: [110, 180, 255],
        bulletType: "frost_laser",
        skill: {
            name: "BÃO BĂNG PHI ĐẠN",
            desc: "Phóng 14 tia laser băng giá siêu tốc xuyên thấu toàn màn hình.",
            energyCost: 100,
            duration: 0.5,
        },
    },
    RED_VIPER: {
        id: "RED_VIPER", name: "HỔ MANG ĐỎ", price: 300,
        damageMult: 1.45, bulletCount: 2, fireRateMult: 1.10,
        asset: "plane_red_viper",
        bulletAsset: "bullet_red_missile",
        bulletColor: [255, 100, 80],
        glowColor: [255, 60, 60],
        flame: [[255, 90, 70], [255, 210, 120]],
        trail: [255, 90, 80],
        bulletType: "missile",
        skill: {
            name: "MƯA TÊN LỬA TẦM NHIỆT",
            desc: "Phóng 10 quả tên lửa đuổi tự tìm mục tiêu và phát nổ diện rộng.",
            energyCost: 100,
            duration: 1.0,
        },
    },
    GOLDEN_HAWK: {
        id: "GOLDEN_HAWK", name: "ƯNG VÀNG", price: 500,
        damageMult: 1.65, bulletCount: 2, fireRateMult: 1.20,
        asset: "plane_golden_hawk",
        bulletAsset: "bullet_golden_bolt",
        bulletColor: [255, 220, 70],
        glowColor: [255, 205, 50],
        flame: [[255, 220, 90], [255, 250, 200]],
        trail: [255, 220, 90],
        bulletType: "golden_bolt",
        skill: {
            name: "TỪ TÍNH HOÀNG KIM",
            desc: "Hút toàn bộ kim cương tức thì + Khiên hoàng kim phản đạn 5s.",
            energyCost: 100,
            duration: 5.0,
        },
    },
    SHADOW: {
        id: "SHADOW", name: "BÓNG ĐÊM", price: 800,
        damageMult: 1.90, bulletCount: 2, fireRateMult: 1.25,
        asset: "plane_shadow",
        bulletAsset: "bullet_shadow_dart",
        bulletColor: [175, 80, 255],
        glowColor: [140, 60, 240],
        flame: [[160, 80, 255], [100, 45, 180]],
        trail: [140, 70, 230],
        bulletType: "shadow_dart",
        skill: {
            name: "ĐỘT KÍCH HẮC ÁM",
            desc: "Tàng hình bất tử 4s + Phát xung kích bóng tối quét sạch đạn địch.",
            energyCost: 100,
            duration: 4.0,
        },
    },
    PLASMA: {
        id: "PLASMA", name: "PLASMA", price: 1200,
        damageMult: 2.20, bulletCount: 3, fireRateMult: 1.25,
        asset: "plane_plasma",
        bulletAsset: "bullet_plasma_ball",
        bulletColor: [30, 255, 200],
        glowColor: [0, 255, 180],
        flame: [[0, 255, 180], [210, 255, 240]],
        trail: [0, 255, 190],
        bulletType: "plasma_ball",
        skill: {
            name: "SIÊU CẦU PLASMA",
            desc: "Phóng quả cầu năng lượng khổng lồ càn quét và nổ tung diện rộng.",
            energyCost: 100,
            duration: 1.5,
        },
    },
    GALAXY: {
        id: "GALAXY", name: "NGÂN HÀ", price: 1800,
        damageMult: 2.70, bulletCount: 3, fireRateMult: 1.35,
        asset: "plane_galaxy",
        bulletAsset: "bullet_galaxy_shard",
        bulletColor: [180, 130, 255],
        glowColor: [150, 90, 255],
        flame: [[170, 110, 255], [240, 220, 255]],
        trail: [160, 110, 255],
        bulletType: "galaxy_shard",
        aura: true,
        skill: {
            name: "HỐ ĐEN TINH VÂN",
            desc: "Tạo hố đen hút sạch quái nhỏ và nghiền nát Boss với sát thương lớn.",
            energyCost: 100,
            duration: 3.5,
        },
    },
    LEGENDARY: {
        id: "LEGENDARY", name: "HUYỀN THOẠI", price: 2800,
        damageMult: 3.50, bulletCount: 4, fireRateMult: 1.45,
        asset: "plane_legendary",
        bulletAsset: "bullet_god_beam",
        bulletColor: [255, 235, 150],
        glowColor: [255, 215, 90],
        flame: [[255, 210, 90], [140, 240, 255]],
        trail: [255, 225, 120],
        bulletType: "god_beam",
        aura: true, rainbow: true,
        skill: {
            name: "OVERDRIVE THẦN THÁNH",
            desc: "Bung 8 cánh photon bắn tia cực đại 360 độ, bất tử và hủy diệt tất cả.",
            energyCost: 100,
            duration: 4.5,
        },
    },
};

const SKIN_ORDER = [
    "DEFAULT", "BLUE_FALCON", "RED_VIPER", "GOLDEN_HAWK",
    "SHADOW", "PLASMA", "GALAXY", "LEGENDARY",
];

// ------------------------------------------------------------
// 6 GÀ BOSS KHỔNG LỒ (ĐẶC TRƯNG CHO 6 MAP)
// ------------------------------------------------------------
const BOSS_DEFS = [
    {
        id: "COCKATRICE",
        name: "CHÚA GÀ THIÊN HÀ",
        title: "Trùm Map 1 - Solar Frontier",
        hp: 180, score: 4000,
        width: 170, height: 120,
        asset: "boss_1",
        bulletColor: [255, 140, 80],
        bulletSpeed: 240,
        attackDelay: 1.3,
        phaseAttacks: {
            1: ["aimed", "threeway", "aimed"],
            2: ["spread", "circular", "aimed"],
            3: ["circular", "spread", "burst"],
        },
        drop: [40, 70], dropCount: [10, 16],
    },
    {
        id: "IRON_METEOR",
        name: "THIÊN THẠCH CHIẾN THẦN",
        title: "Trùm Map 2 - Asteroid Belt",
        hp: 320, score: 7500,
        width: 175, height: 125,
        asset: "boss_2",
        bulletColor: [255, 120, 40],
        bulletSpeed: 255,
        attackDelay: 1.25,
        phaseAttacks: {
            1: ["spread", "aimed", "spread"],
            2: ["burst", "circular", "aimed"],
            3: ["circular", "burst", "spread", "meteor"],
        },
        drop: [60, 110], dropCount: [12, 18],
    },
    {
        id: "INFERNO_PHOENIX",
        name: "PHƯỢNG HOÀNG LỬA",
        title: "Trùm Map 3 - Nebula Inferno",
        hp: 480, score: 11000,
        width: 180, height: 130,
        asset: "boss_3",
        bulletColor: [255, 60, 30],
        bulletSpeed: 270,
        attackDelay: 1.15,
        phaseAttacks: {
            1: ["spread", "burst", "aimed"],
            2: ["circular", "spread", "homing"],
            3: ["circular", "firestorm", "homing", "burst"],
        },
        drop: [90, 160], dropCount: [14, 22],
    },
    {
        id: "FROST_EMPRESS",
        name: "NỮ HOÀNG BĂNG GIÁ",
        title: "Trùm Map 4 - Cyber Frost",
        hp: 680, score: 16000,
        width: 180, height: 130,
        asset: "boss_4",
        bulletColor: [70, 220, 255],
        bulletSpeed: 285,
        attackDelay: 1.1,
        phaseAttacks: {
            1: ["aimed", "circular", "spread"],
            2: ["freeze_beam", "spread", "circular"],
            3: ["freeze_beam", "circular", "homing", "burst"],
        },
        drop: [130, 220], dropCount: [16, 26],
    },
    {
        id: "STORM_VOID",
        name: "LÔI ĐIỆN VỰC THẲM",
        title: "Trùm Map 5 - Thunder Void",
        hp: 920, score: 23000,
        width: 185, height: 135,
        asset: "boss_5",
        bulletColor: [190, 90, 255],
        bulletSpeed: 300,
        attackDelay: 1.0,
        phaseAttacks: {
            1: ["spread", "homing", "aimed"],
            2: ["lightning", "circular", "burst"],
            3: ["lightning", "circular", "homing", "spread"],
        },
        drop: [180, 300], dropCount: [20, 30],
    },
    {
        id: "COSMIC_MOTHER",
        name: "MẪU THẦN TỐI THƯỢNG",
        title: "Trùm Cuối Map 6 - Cosmic Throne",
        hp: 1350, score: 35000,
        width: 195, height: 140,
        asset: "boss_6",
        bulletColor: [255, 220, 90],
        bulletSpeed: 320,
        attackDelay: 0.9,
        phaseAttacks: {
            1: ["spread", "circular", "aimed", "burst"],
            2: ["cosmic_rain", "lightning", "homing", "circular"],
            3: ["cosmic_rain", "firestorm", "freeze_beam", "circular", "burst"],
        },
        drop: [300, 500], dropCount: [25, 40],
    },
];

// ------------------------------------------------------------
// TIỆN ÍCH DÙNG CHUNG
// ------------------------------------------------------------
function rgb(c, a) {
    if (!c) return "rgb(255,255,255)";
    if (a === undefined) return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
}

function lerpColor(c1, c2, t) {
    return [
        Math.trunc(c1[0] + (c2[0] - c1[0]) * t),
        Math.trunc(c1[1] + (c2[1] - c1[1]) * t),
        Math.trunc(c1[2] + (c2[2] - c1[2]) * t),
    ];
}

function randf(a, b) { return a + Math.random() * (b - a); }
function randi(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
