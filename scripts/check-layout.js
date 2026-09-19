const fs = require('fs');
const path = require('path');

// Find the main app layout wrapper (where the sidebar offset lives)
const searchDirs = ['frontend/src/pages', 'frontend/src/components/dashboard'];
const hits = [];

const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.isFile() && f.name.endsWith('.jsx')) {
            const c = fs.readFileSync(p, 'utf8');
            if (c.includes('md:ml-64') || c.includes('ml-64')) {
                hits.push(p);
            }
        }
    }
};

for (const d of searchDirs) walk(d);
console.log('Files containing md:ml-64 (sidebar offset):');
console.log(hits.join('\n') || '(none found)');