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
        const factions = [
            { color: 'Blue', prefix: 'pawn' },
            { color: 'Red', prefix: 'pawn-red' }
        ];

        factions.forEach(({ color, prefix }) => {
            // Idle: 8 frames (192x192 each)
            this.load.spritesheet(`${prefix}-idle`, `Units/${color} Units/Pawn/Pawn_Idle.png`, { frameWidth: 192, frameHeight: 192 });
            // Run: 6 frames
            this.load.spritesheet(`${prefix}-run`, `Units/${color} Units/Pawn/Pawn_Run.png`, { frameWidth: 192, frameHeight: 192 });
            // Chop (Interact Axe): 6 frames
            this.load.spritesheet(`${prefix}-chop`, `Units/${color} Units/Pawn/Pawn_Interact Axe.png`, { frameWidth: 192, frameHeight: 192 });
            // Idle Axe: 8 frames
            this.load.spritesheet(`${prefix}-idle-axe`, `Units/${color} Units/Pawn/Pawn_Idle Axe.png`, { frameWidth: 192, frameHeight: 192 });
            // Run Axe: 6 frames
            this.load.spritesheet(`${prefix}-run-axe`, `Units/${color} Units/Pawn/Pawn_Run Axe.png`, { frameWidth: 192, frameHeight: 192 });
            // Idle Wood: 8 frames
            this.load.spritesheet(`${prefix}-idle-wood`, `Units/${color} Units/Pawn/Pawn_Idle Wood.png`, { frameWidth: 192, frameHeight: 192 });
            // Run Wood: 6 frames
            this.load.spritesheet(`${prefix}-run-wood`, `Units/${color} Units/Pawn/Pawn_Run Wood.png`, { frameWidth: 192, frameHeight: 192 });
            
            // ── Worker Hammer (Construction) ─────
            this.load.spritesheet(`${prefix}-idle-hammer`, `Units/${color} Units/Pawn/Pawn_Idle Hammer.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-run-hammer`, `Units/${color} Units/Pawn/Pawn_Run Hammer.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-build`, `Units/${color} Units/Pawn/Pawn_Interact Hammer.png`, { frameWidth: 192, frameHeight: 192 });
            
            // ── Worker Pickaxe (Mining) ──────────
            this.load.spritesheet(`${prefix}-idle-pickaxe`, `Units/${color} Units/Pawn/Pawn_Idle Pickaxe.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-run-pickaxe`, `Units/${color} Units/Pawn/Pawn_Run Pickaxe.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-mine`, `Units/${color} Units/Pawn/Pawn_Interact Pickaxe.png`, { frameWidth: 192, frameHeight: 192 });
            
            // ── Worker Gold ──────────
            this.load.spritesheet(`${prefix}-idle-gold`, `Units/${color} Units/Pawn/Pawn_Idle Gold.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-run-gold`, `Units/${color} Units/Pawn/Pawn_Run Gold.png`, { frameWidth: 192, frameHeight: 192 });
        });

        // ── Buildings ───────────────────────────────────────
        this.load.image('house_construction', 'Buildings/Blue Buildings/House_Construction.png');
        this.load.image('house1', 'Buildings/Blue Buildings/House1.png');
        this.load.image('hut', 'Buildings/Blue Buildings/Hut.png');
        this.load.image('castle', 'Buildings/Blue Buildings/Castle.png');
        this.load.image('gold_hut', 'Buildings/Blue Buildings/Gold_Hut.png');
        this.load.image('barracks', 'Buildings/Blue Buildings/Barracks.png');

        // ── Warrior (Sword/Shield) Spritesheets ─────────────
        const warriorFactions = [
            { color: 'Blue', prefix: 'warrior' },
            { color: 'Red', prefix: 'warrior-red' }
        ];

        warriorFactions.forEach(({ color, prefix }) => {
            this.load.spritesheet(`${prefix}-idle`, `Units/${color} Units/Warrior/Warrior_Idle.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-run`, `Units/${color} Units/Warrior/Warrior_Run.png`, { frameWidth: 192, frameHeight: 192 });
            this.load.spritesheet(`${prefix}-attack`, `Units/${color} Units/Warrior/Warrior_Attack1.png`, { frameWidth: 192, frameHeight: 192 });
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

        // ── UI Elements ─────────────────────────────────────
        this.load.image('avatar_warrior_blue', 'UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png');
        this.load.image('avatar_pawn_blue', 'UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png');
        
        // ── Icons ───────────────────────────────────────────
        this.load.image('icon_coin', 'UI Elements/UI Elements/Icons/coin.png');
        this.load.image('icon_log', 'UI Elements/UI Elements/Icons/log.png');
        this.load.image('icon_sword', 'UI Elements/UI Elements/Icons/sword.png');
        this.load.image('icon_hammer', 'UI Elements/UI Elements/Icons/hammer.png');
        this.load.image('icon_meat', 'UI Elements/UI Elements/Icons/meat.png');
    }

    create ()
    {
        //  All assets loaded — start the game
        this.scene.start('GameScene');
    }
}
