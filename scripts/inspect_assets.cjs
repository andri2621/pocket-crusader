const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, fileList);
        } else if (file.endsWith('.png') || file.endsWith('.json')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

function getPngSize(filePath) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(24);
        fs.readSync(fd, buffer, 0, 24, 0);
        fs.closeSync(fd);
        if (buffer.toString('ascii', 1, 4) === 'PNG') {
            return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
        }
    } catch (e) {
        return null;
    }
    return null;
}

const root = path.join(__dirname, '..', 'public', 'assets', 'tiny-swords');
const all = getFiles(root);
const results = [];
for (const f of all) {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    const size = getPngSize(f);
    results.push({ path: rel, width: size ? size.width : 0, height: size ? size.height : 0 });
}

results.sort((a, b) => a.path.localeCompare(b.path));
for (const r of results) {
    console.log(`${r.path} | ${r.width}x${r.height}`);
}
