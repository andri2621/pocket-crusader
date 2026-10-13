const http = require('http');

const factions = [
    { color: 'Blue', prefix: 'pawn' },
    { color: 'Red', prefix: 'pawn-red' }
];

const paths = [
    'Terrain/Tileset/Tilemap_color1.png',
    'Terrain/Resources/Wood/Trees/Tree1.png',
    'Buildings/Blue Buildings/House_Construction.png',
    'Buildings/Blue Buildings/House1.png',
    'Buildings/Blue Buildings/Hut.png',
    'Buildings/Blue Buildings/Castle.png',
    'Buildings/Blue Buildings/Gold_Hut.png',
    'Buildings/Blue Buildings/Barracks.png',
    'Terrain/Resources/Wood/Trees/Stump 1.png',
    'Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png',
    'Terrain/Resources/Gold/Gold Stones/Gold Stone 2.png',
    'Terrain/Resources/Gold/Gold Stones/Gold Stone 3.png',
    'Terrain/Resources/Gold/Gold Stones/Gold Stone 4.png',
    'Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png',
    'Terrain/Resources/Gold/Gold Stones/Gold Stone 6.png',
    'UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png',
    'UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png',
    'UI Elements/UI Elements/Icons/coin.png',
    'UI Elements/UI Elements/Icons/log.png',
    'UI Elements/UI Elements/Icons/sword.png',
    'UI Elements/UI Elements/Icons/hammer.png',
    'UI Elements/UI Elements/Icons/meat.png'
];

factions.forEach(({ color }) => {
    paths.push(
        `Units/${color} Units/Pawn/Pawn_Idle.png`,
        `Units/${color} Units/Pawn/Pawn_Run.png`,
        `Units/${color} Units/Pawn/Pawn_Interact Axe.png`,
        `Units/${color} Units/Pawn/Pawn_Idle Axe.png`,
        `Units/${color} Units/Pawn/Pawn_Run Axe.png`,
        `Units/${color} Units/Pawn/Pawn_Idle Wood.png`,
        `Units/${color} Units/Pawn/Pawn_Run Wood.png`,
        `Units/${color} Units/Pawn/Pawn_Idle Hammer.png`,
        `Units/${color} Units/Pawn/Pawn_Run Hammer.png`,
        `Units/${color} Units/Pawn/Pawn_Interact Hammer.png`,
        `Units/${color} Units/Pawn/Pawn_Idle Pickaxe.png`,
        `Units/${color} Units/Pawn/Pawn_Run Pickaxe.png`,
        `Units/${color} Units/Pawn/Pawn_Interact Pickaxe.png`,
        `Units/${color} Units/Pawn/Pawn_Idle Gold.png`,
        `Units/${color} Units/Pawn/Pawn_Run Gold.png`,
        `Units/${color} Units/Warrior/Warrior_Idle.png`,
        `Units/${color} Units/Warrior/Warrior_Run.png`,
        `Units/${color} Units/Warrior/Warrior_Attack1.png`
    );
});

console.log('Total URLs to verify:', paths.length);
let checked = 0;
let failed = 0;

paths.forEach(p => {
    const url = 'http://localhost:3000/assets/tiny-swords/' + encodeURI(p);
    http.get(url, res => {
        checked++;
        if (res.statusCode !== 200) {
            console.error('FAIL (' + res.statusCode + '):', p);
            failed++;
        }
        if (checked === paths.length) {
            console.log(`ALL CHECKED: ${checked}. FAILED: ${failed}`);
        }
    }).on('error', err => {
        checked++;
        failed++;
        console.error('NET ERROR:', err.message, p);
        if (checked === paths.length) {
            console.log(`ALL CHECKED: ${checked}. FAILED: ${failed}`);
        }
    });
});
