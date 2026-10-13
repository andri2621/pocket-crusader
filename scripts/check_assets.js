const fs = require('fs');
const http = require('http');

const content = fs.readFileSync('src/game/scenes/Preloader.ts', 'utf8');
const regex = /(?:spritesheet|image)\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g;
let match;
const assets = [];
while ((match = regex.exec(content)) !== null) {
    assets.push('/assets/tiny-swords/' + match[1]);
}

console.log('Total assets to check:', assets.length);
let checked = 0;
let failed = 0;

assets.forEach(url => {
    const encoded = encodeURI(url);
    http.get('http://localhost:3000' + encoded, res => {
        checked++;
        if (res.statusCode !== 200) {
            console.error('FAIL:', res.statusCode, url);
            failed++;
        }
        if (checked === assets.length) {
            console.log('DONE. Total:', checked, 'Failed:', failed);
        }
    }).on('error', err => {
        checked++;
        failed++;
        console.error('ERROR:', err.message, url);
        if (checked === assets.length) {
            console.log('DONE. Total:', checked, 'Failed:', failed);
        }
    });
});
