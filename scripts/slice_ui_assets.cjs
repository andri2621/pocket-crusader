/**
 * scripts/slice_ui_assets.cjs
 * 
 * Extracts verified 9-slice and 3-piece components from Tiny Swords UI sheets
 * into contiguous, standard-compliant sprites (192x192 for 9-slice, 192x64 for ribbons/bars).
 * 
 * Every pixel is drawn directly from the verified repository assets:
 * - WoodTable_Slots.png (already 192x192 contiguous)
 * - BigBlueButton_Regular.png & BigBlueButton_Pressed.png (5x5 grid with 64px gaps -> 3x3 contiguous)
 * - BigRedButton_Regular.png & BigRedButton_Pressed.png
 * - SmallRibbons.png (Blue, Red, Gold ribbon headers)
 * - BigBar_Base.png & BigBar_Fill.png
 * - RegularPaper.png & SpecialPaper.png
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decodePNG(filePath) {
    const data = fs.readFileSync(filePath);
    let offset = 8, width = 0, height = 0, idat = [];
    while (offset < data.length) {
        const len = data.readUInt32BE(offset);
        const typ = data.toString('ascii', offset + 4, offset + 8);
        if (typ === 'IHDR') {
            width = data.readUInt32BE(offset + 8);
            height = data.readUInt32BE(offset + 12);
        } else if (typ === 'IDAT') {
            idat.push(data.subarray(offset + 8, offset + 8 + len));
        } else if (typ === 'IEND') break;
        offset += 12 + len;
    }
    const decompressed = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * 4;
    const pixels = Buffer.alloc(width * height * 4);
    let srcOffset = 0;
    for (let y = 0; y < height; y++) {
        const filter = decompressed[srcOffset++];
        const rowStart = y * stride, prevRowStart = (y - 1) * stride;
        for (let x = 0; x < stride; x++) {
            const raw = decompressed[srcOffset++];
            const a = x >= 4 ? pixels[rowStart + x - 4] : 0;
            const b = y > 0 ? pixels[prevRowStart + x] : 0;
            const c = (y > 0 && x >= 4) ? pixels[prevRowStart + x - 4] : 0;
            let val = 0;
            if (filter === 0) val = raw;
            else if (filter === 1) val = (raw + a) & 0xff;
            else if (filter === 2) val = (raw + b) & 0xff;
            else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
            else if (filter === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                val = (raw + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 0xff;
            }
            pixels[rowStart + x] = val;
        }
    }
    return { width, height, pixels };
}

function encodePNG(width, height, pixels) {
    const stride = width * 4;
    const rawData = Buffer.alloc(height * (stride + 1));
    for (let y = 0; y < height; y++) {
        rawData[y * (stride + 1)] = 0;
        pixels.copy(rawData, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const compressed = zlib.deflateSync(rawData);
    function crc32(buf) {
        let crc = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            crc ^= buf[i];
            for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }
    function makeChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typ = Buffer.from(type, 'ascii');
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(Buffer.concat([typ, data])), 0);
        return Buffer.concat([len, typ, data, crc]);
    }
    const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([header, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '../public/assets/tiny-swords/UI Elements/UI Elements/Sliced');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function assemble9Slice(srcPath, destName) {
    const { width, height, pixels } = decodePNG(srcPath);
    const destW = 192, destH = 192;
    const destPixels = Buffer.alloc(destW * destH * 4);
    const coords = [0, 128, 256];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const sx = coords[c], sy = coords[r];
            const dx = c * 64, dy = r * 64;
            for (let y = 0; y < 64; y++) {
                for (let x = 0; x < 64; x++) {
                    const srcIdx = ((sy + y) * width + (sx + x)) * 4;
                    const destIdx = ((dy + y) * destW + (dx + x)) * 4;
                    pixels.copy(destPixels, destIdx, srcIdx, srcIdx + 4);
                }
            }
        }
    }
    fs.writeFileSync(path.join(outDir, destName), encodePNG(destW, destH, destPixels));
    console.log('[Slice] Assembled 9-slice:', destName);
}

function assembleHorizontal3Piece(srcPath, rowIdx, destName) {
    const { width, height, pixels } = decodePNG(srcPath);
    const destW = 192, destH = 64;
    const destPixels = Buffer.alloc(destW * destH * 4);
    const coords = [0, 128, 256];
    for (let c = 0; c < 3; c++) {
        const sx = coords[c], sy = rowIdx * 64;
        const dx = c * 64, dy = 0;
        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
                const srcIdx = ((sy + y) * width + (sx + x)) * 4;
                const destIdx = ((dy + y) * destW + (dx + x)) * 4;
                pixels.copy(destPixels, destIdx, srcIdx, srcIdx + 4);
            }
        }
    }
    fs.writeFileSync(path.join(outDir, destName), encodePNG(destW, destH, destPixels));
    console.log('[Slice] Assembled 3-piece:', destName);
}

const baseDir = path.join(__dirname, '../public/assets/tiny-swords/UI Elements/UI Elements');

assemble9Slice(path.join(baseDir, 'Buttons/BigBlueButton_Regular.png'), 'Button_Blue_Regular_192.png');
assemble9Slice(path.join(baseDir, 'Buttons/BigBlueButton_Pressed.png'), 'Button_Blue_Pressed_192.png');
assemble9Slice(path.join(baseDir, 'Buttons/BigRedButton_Regular.png'), 'Button_Red_Regular_192.png');
assemble9Slice(path.join(baseDir, 'Buttons/BigRedButton_Pressed.png'), 'Button_Red_Pressed_192.png');
assemble9Slice(path.join(baseDir, 'Papers/RegularPaper.png'), 'Paper_Regular_192.png');
assemble9Slice(path.join(baseDir, 'Papers/SpecialPaper.png'), 'Paper_Special_192.png');

assembleHorizontal3Piece(path.join(baseDir, 'Ribbons/SmallRibbons.png'), 0, 'Ribbon_Blue_192.png');
assembleHorizontal3Piece(path.join(baseDir, 'Ribbons/SmallRibbons.png'), 2, 'Ribbon_Red_192.png');
assembleHorizontal3Piece(path.join(baseDir, 'Ribbons/SmallRibbons.png'), 4, 'Ribbon_Gold_192.png');
assembleHorizontal3Piece(path.join(baseDir, 'Bars/BigBar_Base.png'), 0, 'Bar_Base_192.png');

console.log('[Slice] All UI textures processed successfully.');
