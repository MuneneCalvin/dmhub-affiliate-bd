import fs from 'fs';
import path from 'path';

class TranslationExtractor {
    constructor(config = {}) {
        this.rootDir = config.rootDir || './resources/js';
        this.ignoreFolders = config.ignoreFolders || [
            'node_modules',
            'dist',
            'build',
        ];
        this.supportedLocales = config.supportedLocales || ['en', 'nl', 'de'];
        this.localesDir = config.localesDir || './public/locales/';
        this.extractedTexts = new Set();
    }

    extractFromFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const regex = /__\(['"`]([^'"`]+)['"`]\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            this.extractedTexts.add(match[1]);
        }
    }

    walkDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (
                entry.isDirectory() &&
                !entry.name.startsWith('.') &&
                !this.ignoreFolders.includes(entry.name)
            ) {
                this.walkDir(fullPath);
            } else if (
                entry.isFile() &&
                (fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx'))
            ) {
                this.extractFromFile(fullPath);
            }
        }
    }

    ensureLocaleFilesExist() {
        if (!fs.existsSync(this.localesDir)) {
            fs.mkdirSync(this.localesDir, { recursive: true });
        }

        for (const locale of this.supportedLocales) {
            const filePath = path.join(this.localesDir, `${locale}.json`);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '{}', 'utf8');
                // console.log(`Created ${filePath}`);
            }
        }
    }

    saveToLocaleFiles() {
        for (const locale of this.supportedLocales) {
            const filePath = path.join(this.localesDir, `${locale}.json`);
            const existing = JSON.parse(
                fs.readFileSync(filePath, 'utf8') || '{}',
            );

            let updated = false;

            for (const text of this.extractedTexts) {
                if (!(text in existing)) {
                    existing[text] = text;
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(
                    filePath,
                    JSON.stringify(existing, null, 2),
                    'utf8',
                );
                // console.log(`Updated ${filePath}`);
            } else {
                // console.log(`No changes to ${filePath}`);
            }
        }
    }

    run() {
        this.walkDir(this.rootDir);
        this.ensureLocaleFilesExist();
        this.saveToLocaleFiles();
        return Array.from(this.extractedTexts);
    }
}

// export default TranslationExtractor;

const extractor = new TranslationExtractor();
extractor.run();

// console.log(`Found ${result.length} keys.`);
