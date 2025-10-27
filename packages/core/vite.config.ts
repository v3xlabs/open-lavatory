import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
    build: {
        lib: {
            entry: {
                icons: 'src/icons/index.ts',
                encryption: 'src/encryption/index.ts',
                errors: 'src/errors/index.ts',
                index: 'src/index.ts',
            },
            formats: ['es'],
            fileName(format, entryName) {
                if (entryName === 'index') {
                    return 'index.js';
                }

                return `${entryName}/index.js`;
            },
        },
    },
    plugins: [dts()],
});
