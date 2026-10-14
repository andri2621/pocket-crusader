const fs = require('fs');
const zlib = require('zlib');

function decodePNG(filePath) {
    const data = fs.readFileSync(filePath);
    let offset = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idatChunks = [];

    while (offset < data.length) {
        const length = data.readUInt32BE(offset);
        const type = data.toString('ascii', offset + 4, offset + 8);
        if (type === 'IHDR') {
            width = data.readUInt32BE(offset + 8);
            height = data.readUInt32BE(offset + 12);
            bitDepth = data[offset + 16];
            colorType = data[offset + 17];
        } else if (type === 'IDAT') {
            idatChunks.push(data.subarray(offset + 8, offset + 8 + length));
        } else if (type === 'IEND') {
            break;
        }
        offset += 12 + length;
    }

    const compressed = Buffer.concat(idatChunks);
    const decompressed = zlib.inflateSync(compressed);

    // Color type 6 = RGBA (4 bytes per pixel)
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

const { width, height, pixels } = decodePNG('public/assets/tiny-swords/Terrain/Tileset/Tilemap_color1.png');
console.log(`Decoded Tilemap_color1.png: ${width}x${height}`);

const cols = width / 64;
const rows = height / 64;

// Analyze each 64x64 tile
for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const frameIndex = r * cols + c;
        let opaqueCount = 0;
        let transparentCount = 0;
        let semiCount = 0;
        
        // Sample border alpha (top, bottom, left, right edges)
        let topOpaque = 0, bottomOpaque = 0, leftOpaque = 0, rightOpaque = 0;
        let centerOpaque = 0;

        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
                const px = (c * 64 + x);
                const py = (r * 64 + y);
                const idx = (py * width + px) * 4;
                const alpha = pixels[idx + 3];

                if (alpha === 255) opaqueCount++;
                else if (alpha === 0) transparentCount++;
                else semiCount++;

                if (y < 4 && alpha > 128) topOpaque++;
                if (y >= 60 && alpha > 128) bottomOpaque++;
                if (x < 4 && alpha > 128) leftOpaque++;
                if (x >= 60 && alpha > 128) rightOpaque++;
                if (x >= 24 && x < 40 && y >= 24 && y < 40 && alpha > 128) centerOpaque++;
            }
        }

        const isFullyOpaque = (transparentCount === 0 && semiCount === 0);
        const isEmpty = (opaqueCount === 0 && semiCount === 0);
        
        let desc = 'Unknown';
        if (isEmpty) desc = 'EMPTY';
        else if (isFullyOpaque) desc = 'SOLID GROUND (Full Opaque)';
        else {
            // Edge classification
            const t = topOpaque > 100;
            const b = bottomOpaque > 100;
            const l = leftOpaque > 100;
            const rt = rightOpaque > 100;
            desc = `TRANSITION/EDGE: [T:${t?'Y':'N'} B:${b?'Y':'N'} L:${l?'Y':'N'} R:${rt?'Y':'N'}] (opaque:${opaqueCount})`;
        }

        console.log(`Frame ${frameIndex} (row ${r}, col ${c}): ${desc}`);
    }
}
