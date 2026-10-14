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

function analyzeImageContent(filePath) {
    const { width, height, pixels } = decodePNG(filePath);
    console.log(`\n========================================`);
    console.log(`FILE: ${filePath} (${width}x${height})`);

    // Find bounding box of non-transparent content
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let transparentCount = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = pixels[(y * width + x) * 4 + 3];
            if (alpha > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            } else {
                transparentCount++;
            }
        }
    }
    console.log(`Content Bounding Box: [${minX}, ${minY}] to [${maxX}, ${maxY}] (size: ${maxX - minX + 1}x${maxY - minY + 1})`);
    console.log(`Total pixels: ${width * height}, Transparent: ${transparentCount} (${Math.round(transparentCount / (width * height) * 100)}%)`);

    // Check if it's partitioned in a 64px or 32px or other grid
    // For example, WoodTable: 448x448 = 7 x 64px cells!
    console.log(`Grid divisions (64x64): ${width / 64} cols x ${height / 64} rows`);

    // Let's sample a 7x7 grid of 64x64 cells
    const cellW = 64, cellH = 64;
    const numCols = Math.floor(width / cellW);
    const numRows = Math.floor(height / cellH);
    for (let r = 0; r < numRows; r++) {
        let rowStr = `Row ${r}: `;
        for (let c = 0; c < numCols; c++) {
            let cellOpaque = 0;
            for (let cy = 0; cy < cellH; cy++) {
                for (let cx = 0; cx < cellW; cx++) {
                    const px = c * cellW + cx;
                    const py = r * cellH + cy;
                    if (px < width && py < height) {
                        if (pixels[(py * width + px) * 4 + 3] > 50) cellOpaque++;
                    }
                }
            }
            rowStr += `[${cellOpaque > 100 ? (cellOpaque > 3500 ? 'FULL' : 'PART') : 'EMP '}] `;
        }
        console.log(rowStr);
    }
}

const files = [
    'public/assets/tiny-swords/UI Elements/UI Elements/Wood Table/WoodTable.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Wood Table/WoodTable_Slots.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Papers/RegularPaper.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Papers/SpecialPaper.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Banners/Banner.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Buttons/BigBlueButton_Regular.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Buttons/BigBlueButton_Pressed.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Buttons/SmallBlueSquareButton_Regular.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Bars/BigBar_Base.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Bars/BigBar_Fill.png',
    'public/assets/tiny-swords/UI Elements/UI Elements/Ribbons/BigRibbons.png'
];

for (const f of files) {
    if (fs.existsSync(f)) {
        analyzeImageContent(f);
    }
}
