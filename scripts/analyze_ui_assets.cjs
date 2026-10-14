const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(filePath) {
    const data = fs.readFileSync(filePath);
    let offset = 8;
    let width = 0, height = 0;
    const idatChunks = [];

    while (offset < data.length) {
        const length = data.readUInt32BE(offset);
        const type = data.toString('ascii', offset + 4, offset + 8);
        if (type === 'IHDR') {
            width = data.readUInt32BE(offset + 8);
            height = data.readUInt32BE(offset + 12);
        } else if (type === 'IDAT') {
            idatChunks.push(data.subarray(offset + 8, offset + 8 + length));
        } else if (type === 'IEND') {
            break;
        }
        offset += 12 + length;
    }

    const compressed = Buffer.concat(idatChunks);
    const decompressed = zlib.inflateSync(compressed);

    const bytesPerPixel = 4;
    const stride = width * bytesPerPixel;
    const pixels = Buffer.alloc(width * height * 4);

    let srcOffset = 0;
    for (let y = 0; y < height; y++) {
        const filter = decompressed[srcOffset++];
        const rowStart = y * stride;
        const prevRowStart = (y - 1) * stride;

        for (let x = 0; x < stride; x++) {
            const raw = decompressed[srcOffset++];
            const a = x >= bytesPerPixel ? pixels[rowStart + x - bytesPerPixel] : 0;
            const b = y > 0 ? pixels[prevRowStart + x] : 0;
            const c = (y > 0 && x >= bytesPerPixel) ? pixels[prevRowStart + x - bytesPerPixel] : 0;

            let val = 0;
            if (filter === 0) val = raw;
            else if (filter === 1) val = (raw + a) & 0xff;
            else if (filter === 2) val = (raw + b) & 0xff;
            else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
            else if (filter === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a);
                const pb = Math.abs(p - b);
                const pc = Math.abs(p - c);
                const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                val = (raw + pr) & 0xff;
            }
            pixels[rowStart + x] = val;
        }
    }
    return { width, height, pixels };
}

const uiDir = path.join('public', 'assets', 'tiny-swords', 'UI Elements', 'UI Elements');
function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.png')) {
            const { width, height } = decodePNG(p);
            console.log(`${path.relative(uiDir, p).replace(/\\/g, '/')} | ${width}x${height}`);
        }
    }
}
walk(uiDir);

const bannersDir = path.join('public', 'assets', 'tiny-swords', 'UI Elements', 'UI Banners from the store page');
if (fs.existsSync(bannersDir)) {
    console.log('--- UI Banners store page ---');
    for (const f of fs.readdirSync(bannersDir)) {
        const p = path.join(bannersDir, f);
        if (fs.statSync(p).isDirectory()) {
            for (const sub of fs.readdirSync(p)) {
                if (sub.endsWith('.png')) {
                    const { width, height } = decodePNG(path.join(p, sub));
                    console.log(`${f}/${sub} | ${width}x${height}`);
                }
            }
        }
    }
}
