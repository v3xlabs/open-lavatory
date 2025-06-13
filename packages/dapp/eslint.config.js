// ESLint v9 flat configuration file
import js from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    // Ignore patterns
    {
        ignores: ['dist/**', 'node_modules/**', '**/*.gen.ts'],
    },

    // Base configs
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended,

    // React config
    {
        files: ['**/*.{jsx,tsx}'],
        plugins: {
            react: eslintPluginReact,
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            ...eslintPluginReact.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
        },
    },

    // Common config for all JS/TS files
    {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        plugins: {
            import: eslintPluginImport,
            'simple-import-sort': eslintPluginSimpleImportSort,
            'unused-imports': eslintPluginUnusedImports,
        },
        rules: {
            // Basic style rules
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'linebreak-style': ['error', 'unix'],
            'object-curly-spacing': ['error', 'always'],
            'no-multiple-empty-lines': ['warn', { max: 2 }],
            'prefer-destructuring': 'warn',
            'prefer-arrow-callback': 'warn',

            // 'no-duplicate-imports': ['error', { includeExports: true }],
            'import/no-duplicates': 'error',

            // Import sorting and cleanup
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',

            // TypeScript rules
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',

            // Padding lines for readability
            'padding-line-between-statements': [
                'error',
                {
                    blankLine: 'always',
                    prev: '*',
                    next: ['return', 'if', 'switch', 'try', 'for'],
                },
                {
                    blankLine: 'always',
                    prev: ['if', 'switch', 'try', 'const', 'let'],
                    next: '*',
                },
                {
                    blankLine: 'any',
                    prev: ['const', 'let'],
                    next: ['const', 'let'],
                },
            ],
        },
    },
];
