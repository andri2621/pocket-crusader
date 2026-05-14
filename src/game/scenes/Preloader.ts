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
        this.load.image('grass', 'terrain/grass.png');

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
    }

    create ()
    {
        //  All assets loaded — start the game
        this.scene.start('GameScene');
    }
}
