import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  Simple loading bar
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        //  Loading text
        this.add.text(centerX, centerY - 40, 'Loading...', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#d4a574',
        }).setOrigin(0.5);

        //  Bar outline
        this.add.rectangle(centerX, centerY, 320, 24).setStrokeStyle(2, 0xd4a574);

        //  Fill bar
        const bar = this.add.rectangle(centerX - 156, centerY, 4, 18, 0xd4a574);

        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (312 * progress);
        });
    }

    preload ()
    {
        //  Load game assets — Tiny Swords pack
        this.load.setPath('assets/tiny-swords');

        // ── Terrain ─────────────────────────────────────────
        this.load.spritesheet('grass_tiles', 'Terrain/Tileset/Tilemap_color1.png', {
            frameWidth: 64,
            frameHeight: 64
        });

        // Tree spritesheet (192x256 per frame, 8 frames for idle sway)
        this.load.spritesheet('tree', 'Terrain/Resources/Wood/Trees/Tree1.png', {
            frameWidth: 192,
            frameHeight: 256,
        });

        // ── Worker (Pawn) Spritesheets ──────────────────────
        // Idle: 8 frames (192x192 each)
        this.load.spritesheet('pawn-idle', 'Units/Blue Units/Pawn/Pawn_Idle.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Run: 6 frames (192x192 each)
        this.load.spritesheet('pawn-run', 'Units/Blue Units/Pawn/Pawn_Run.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Chop (Interact Axe): 6 frames (192x192 each)
        this.load.spritesheet('pawn-chop', 'Units/Blue Units/Pawn/Pawn_Interact Axe.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Idle Axe: 8 frames (192x192)
        this.load.spritesheet('pawn-idle-axe', 'Units/Blue Units/Pawn/Pawn_Idle Axe.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Run Axe: 6 frames (192x192)
        this.load.spritesheet('pawn-run-axe', 'Units/Blue Units/Pawn/Pawn_Run Axe.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Idle while carrying wood: 8 frames (192x192)
        this.load.spritesheet('pawn-idle-wood', 'Units/Blue Units/Pawn/Pawn_Idle Wood.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Run while carrying wood: 6 frames (192x192)
        this.load.spritesheet('pawn-run-wood', 'Units/Blue Units/Pawn/Pawn_Run Wood.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // ── Worker Hammer (Construction) Spritesheets ─────
        // Idle with hammer: 8 frames (192x192)
        this.load.spritesheet('pawn-idle-hammer', 'Units/Blue Units/Pawn/Pawn_Idle Hammer.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Run with hammer: 6 frames (192x192)
        this.load.spritesheet('pawn-run-hammer', 'Units/Blue Units/Pawn/Pawn_Run Hammer.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Build (Interact Hammer): 6 frames (192x192)
        this.load.spritesheet('pawn-build', 'Units/Blue Units/Pawn/Pawn_Interact Hammer.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // ── Worker Pickaxe (Mining) Spritesheets ──────────
        // Idle Pickaxe: 8 frames (192x192)
        this.load.spritesheet('pawn-idle-pickaxe', 'Units/Blue Units/Pawn/Pawn_Idle Pickaxe.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Run Pickaxe: 6 frames (192x192)
        this.load.spritesheet('pawn-run-pickaxe', 'Units/Blue Units/Pawn/Pawn_Run Pickaxe.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Mine (Interact Pickaxe): 6 frames (192x192)
        this.load.spritesheet('pawn-mine', 'Units/Blue Units/Pawn/Pawn_Interact Pickaxe.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Idle while carrying gold: 8 frames (192x192)
        this.load.spritesheet('pawn-idle-gold', 'Units/Blue Units/Pawn/Pawn_Idle Gold.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // Run while carrying gold: 6 frames (192x192)
        this.load.spritesheet('pawn-run-gold', 'Units/Blue Units/Pawn/Pawn_Run Gold.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // ── Buildings ───────────────────────────────────────
        this.load.image('house1', 'Buildings/Blue Buildings/House1.png');
        this.load.image('hut', 'Buildings/Blue Buildings/Hut.png');
        this.load.image('castle', 'Buildings/Blue Buildings/Castle.png');
        this.load.image('gold_hut', 'Buildings/Blue Buildings/Gold_Hut.png');
        this.load.image('barracks', 'Buildings/Blue Buildings/Barracks.png');

        // ── Warrior (Sword/Shield) Spritesheets ─────────────
        this.load.spritesheet('warrior-idle', 'Units/Blue Units/Warrior/Warrior_Idle.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        this.load.spritesheet('warrior-run', 'Units/Blue Units/Warrior/Warrior_Run.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        this.load.spritesheet('warrior-attack', 'Units/Blue Units/Warrior/Warrior_Attack1.png', {
            frameWidth: 192,
            frameHeight: 192,
        });

        // ── Terrain Props ───────────────────────────────────
        this.load.image('stump', 'Terrain/Resources/Wood/Trees/Stump 1.png');
        
        // ── Gold Stones ─────────────────────────────────────
        this.load.image('gold_stone_1', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png');
        this.load.image('gold_stone_2', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 2.png');
        this.load.image('gold_stone_3', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 3.png');
        this.load.image('gold_stone_4', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 4.png');
        this.load.image('gold_stone_5', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png');
        this.load.image('gold_stone_6', 'Terrain/Resources/Gold/Gold Stones/Gold Stone 6.png');
    }

    create ()
    {
        //  All assets loaded — start the game
        this.scene.start('GameScene');
    }
}
