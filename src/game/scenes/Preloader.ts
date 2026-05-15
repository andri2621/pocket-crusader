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

        // ── Buildings ───────────────────────────────────────
        this.load.image('house3', 'Buildings/Blue Buildings/House3.png');

        // ── Terrain Props ───────────────────────────────────
        this.load.image('stump', 'Terrain/Resources/Wood/Trees/Stump 1.png');
    }

    create ()
    {
        //  All assets loaded — start the game
        this.scene.start('GameScene');
    }
}
