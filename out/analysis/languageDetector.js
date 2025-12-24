"use strict";
/**
 * Language and Framework Detector
 * Detects programming languages, frameworks, and tools used in the project.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguages = detectLanguages;
exports.detectFrameworks = detectFrameworks;
exports.detectPackageManager = detectPackageManager;
exports.detectBuildTools = detectBuildTools;
exports.detectTestFrameworks = detectTestFrameworks;
exports.detectAll = detectAll;
// Language mapping by extension
const LANGUAGE_MAP = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.mjs': 'JavaScript (ESM)',
    '.cjs': 'JavaScript (CommonJS)',
    '.py': 'Python',
    '.pyw': 'Python',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.go': 'Go',
    '.rs': 'Rust',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.cs': 'C#',
    '.fs': 'F#',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C/C++ Header',
    '.hpp': 'C++ Header',
    '.swift': 'Swift',
    '.dart': 'Dart',
    '.vue': 'Vue.js',
    '.svelte': 'Svelte',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less'
};
const FRAMEWORK_RULES = [
    // JavaScript/TypeScript Frameworks
    {
        name: 'React',
        category: 'Frontend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.react)
                return 1;
            if (info.packageJson?.devDependencies?.react)
                return 1;
            return 0;
        }
    },
    {
        name: 'Next.js',
        category: 'Full-Stack Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.next)
                return 1;
            if (info.configFiles.some(f => f.includes('next.config')))
                return 1;
            return 0;
        }
    },
    {
        name: 'Vue.js',
        category: 'Frontend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.vue)
                return 1;
            if (info.files.some(f => f.extension === '.vue'))
                return 0.9;
            return 0;
        }
    },
    {
        name: 'Nuxt.js',
        category: 'Full-Stack Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.nuxt)
                return 1;
            if (info.configFiles.some(f => f.includes('nuxt.config')))
                return 1;
            return 0;
        }
    },
    {
        name: 'Angular',
        category: 'Frontend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.['@angular/core'])
                return 1;
            if (info.configFiles.includes('angular.json'))
                return 1;
            return 0;
        }
    },
    {
        name: 'Svelte',
        category: 'Frontend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.svelte)
                return 1;
            if (info.files.some(f => f.extension === '.svelte'))
                return 0.9;
            return 0;
        }
    },
    {
        name: 'Express.js',
        category: 'Backend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.express)
                return 1;
            return 0;
        }
    },
    {
        name: 'Fastify',
        category: 'Backend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.fastify)
                return 1;
            return 0;
        }
    },
    {
        name: 'NestJS',
        category: 'Backend Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.['@nestjs/core'])
                return 1;
            return 0;
        }
    },
    {
        name: 'Electron',
        category: 'Desktop Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.electron)
                return 1;
            if (info.packageJson?.devDependencies?.electron)
                return 1;
            return 0;
        }
    },
    {
        name: 'React Native',
        category: 'Mobile Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.['react-native'])
                return 1;
            return 0;
        }
    },
    // Python Frameworks
    {
        name: 'Django',
        category: 'Backend Framework',
        detect: (info) => {
            if (info.configFiles.includes('manage.py'))
                return 0.9;
            if (info.files.some(f => f.name === 'settings.py'))
                return 0.7;
            return 0;
        }
    },
    {
        name: 'Flask',
        category: 'Backend Framework',
        detect: (info) => {
            // Check requirements.txt or similar
            const hasFlask = info.files.some(f => f.name === 'requirements.txt' || f.name === 'Pipfile');
            return hasFlask ? 0.5 : 0;
        }
    },
    {
        name: 'FastAPI',
        category: 'Backend Framework',
        detect: (info) => {
            return 0; // Would need to read requirements.txt content
        }
    },
    // Other Frameworks
    {
        name: 'Flutter',
        category: 'Mobile Framework',
        detect: (info) => {
            if (info.files.some(f => f.name === 'pubspec.yaml'))
                return 1;
            return 0;
        }
    },
    {
        name: 'Spring Boot',
        category: 'Backend Framework',
        detect: (info) => {
            if (info.configFiles.includes('pom.xml') || info.configFiles.includes('build.gradle')) {
                return 0.5;
            }
            return 0;
        }
    },
    // Build Tools as Frameworks
    {
        name: 'Vite',
        category: 'Build Tool',
        detect: (info) => {
            if (info.packageJson?.devDependencies?.vite)
                return 1;
            if (info.configFiles.some(f => f.includes('vite.config')))
                return 1;
            return 0;
        }
    },
    {
        name: 'Webpack',
        category: 'Build Tool',
        detect: (info) => {
            if (info.packageJson?.devDependencies?.webpack)
                return 1;
            if (info.configFiles.some(f => f.includes('webpack.config')))
                return 1;
            return 0;
        }
    },
    {
        name: 'Tailwind CSS',
        category: 'CSS Framework',
        detect: (info) => {
            if (info.packageJson?.dependencies?.tailwindcss)
                return 1;
            if (info.packageJson?.devDependencies?.tailwindcss)
                return 1;
            if (info.files.some(f => f.name === 'tailwind.config.js' || f.name === 'tailwind.config.ts'))
                return 1;
            return 0;
        }
    }
];
/**
 * Detect languages used in the project
 */
function detectLanguages(projectInfo) {
    const extensionCounts = {};
    let totalFiles = 0;
    for (const file of projectInfo.files) {
        if (!file.isDirectory && LANGUAGE_MAP[file.extension]) {
            extensionCounts[file.extension] = (extensionCounts[file.extension] || 0) + 1;
            totalFiles++;
        }
    }
    if (totalFiles === 0) {
        return [];
    }
    const languages = [];
    for (const [ext, count] of Object.entries(extensionCounts)) {
        languages.push({
            name: LANGUAGE_MAP[ext],
            percentage: Math.round((count / totalFiles) * 100),
            fileCount: count
        });
    }
    // Sort by file count descending
    languages.sort((a, b) => b.fileCount - a.fileCount);
    // Merge similar languages (e.g., JavaScript and JavaScript (React))
    const merged = [];
    const seen = new Set();
    for (const lang of languages) {
        const baseName = lang.name.split(' ')[0];
        if (!seen.has(baseName)) {
            seen.add(baseName);
            merged.push(lang);
        }
        else {
            // Add to existing
            const existing = merged.find(l => l.name.startsWith(baseName));
            if (existing) {
                existing.fileCount += lang.fileCount;
                existing.percentage += lang.percentage;
            }
        }
    }
    return merged.slice(0, 5); // Top 5 languages
}
/**
 * Detect frameworks used in the project
 */
function detectFrameworks(projectInfo) {
    const frameworks = [];
    for (const rule of FRAMEWORK_RULES) {
        const confidence = rule.detect(projectInfo);
        if (confidence > 0) {
            frameworks.push({
                name: rule.name,
                category: rule.category,
                confidence: confidence
            });
        }
    }
    // Sort by confidence descending
    frameworks.sort((a, b) => b.confidence - a.confidence);
    return frameworks;
}
/**
 * Detect package manager
 */
function detectPackageManager(projectInfo) {
    const files = projectInfo.files.map(f => f.name);
    if (files.includes('pnpm-lock.yaml'))
        return 'pnpm';
    if (files.includes('yarn.lock'))
        return 'yarn';
    if (files.includes('package-lock.json'))
        return 'npm';
    if (files.includes('bun.lockb'))
        return 'bun';
    if (files.includes('package.json'))
        return 'npm'; // Default for Node.js
    if (files.includes('requirements.txt') || files.includes('Pipfile'))
        return 'pip';
    if (files.includes('Cargo.toml'))
        return 'cargo';
    if (files.includes('go.mod'))
        return 'go mod';
    if (files.includes('Gemfile'))
        return 'bundler';
    if (files.includes('composer.json'))
        return 'composer';
    if (files.includes('pom.xml'))
        return 'maven';
    if (files.includes('build.gradle'))
        return 'gradle';
    return null;
}
/**
 * Detect build tools
 */
function detectBuildTools(projectInfo) {
    const tools = [];
    const pkg = projectInfo.packageJson;
    if (pkg?.devDependencies?.webpack || projectInfo.configFiles.some(f => f.includes('webpack'))) {
        tools.push('Webpack');
    }
    if (pkg?.devDependencies?.vite || projectInfo.configFiles.some(f => f.includes('vite'))) {
        tools.push('Vite');
    }
    if (pkg?.devDependencies?.rollup || projectInfo.configFiles.some(f => f.includes('rollup'))) {
        tools.push('Rollup');
    }
    if (pkg?.devDependencies?.esbuild) {
        tools.push('esbuild');
    }
    if (pkg?.devDependencies?.parcel) {
        tools.push('Parcel');
    }
    if (projectInfo.configFiles.includes('Makefile')) {
        tools.push('Make');
    }
    if (projectInfo.configFiles.includes('CMakeLists.txt')) {
        tools.push('CMake');
    }
    return tools;
}
/**
 * Detect test frameworks
 */
function detectTestFrameworks(projectInfo) {
    const frameworks = [];
    const pkg = projectInfo.packageJson;
    if (pkg?.devDependencies?.jest)
        frameworks.push('Jest');
    if (pkg?.devDependencies?.mocha)
        frameworks.push('Mocha');
    if (pkg?.devDependencies?.vitest)
        frameworks.push('Vitest');
    if (pkg?.devDependencies?.cypress)
        frameworks.push('Cypress');
    if (pkg?.devDependencies?.playwright || pkg?.devDependencies?.['@playwright/test'])
        frameworks.push('Playwright');
    if (pkg?.devDependencies?.['@testing-library/react'])
        frameworks.push('React Testing Library');
    if (pkg?.devDependencies?.jasmine)
        frameworks.push('Jasmine');
    if (pkg?.devDependencies?.ava)
        frameworks.push('AVA');
    return frameworks;
}
/**
 * Perform full language and framework detection
 */
function detectAll(projectInfo) {
    return {
        languages: detectLanguages(projectInfo),
        frameworks: detectFrameworks(projectInfo),
        packageManager: detectPackageManager(projectInfo),
        buildTools: detectBuildTools(projectInfo),
        testFrameworks: detectTestFrameworks(projectInfo)
    };
}
//# sourceMappingURL=languageDetector.js.map