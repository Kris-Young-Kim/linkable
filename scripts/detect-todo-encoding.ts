
import fs from 'fs';
import iconv from 'iconv-lite';

const file = 'docs/TODO.md';
const buffer = fs.readFileSync(file);

const encodings = ['utf-8', 'euc-kr', 'cp949', 'utf-16le', 'utf-16be'];

for (const encoding of encodings) {
    try {
        const decoded = iconv.decode(buffer, encoding);
        if (decoded.includes('개월') || decoded.includes('제휴몰')) {
            console.log(`Detected: ${encoding}`);
            process.exit(0);
        }
    } catch (e) { }
}

console.log('Encoding not detected');
