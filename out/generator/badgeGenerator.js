"use strict";
/**
 * Badge Generator
 * Comprehensive shields.io badge generator with auto-detection
 * Based on https://shields.io and https://github.com/alexandresanlim/Badges4-README.md-Profile
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLicenseBadge = generateLicenseBadge;
exports.generateVersionBadge = generateVersionBadge;
exports.generatePRsWelcomeBadge = generatePRsWelcomeBadge;
exports.generateAllBadges = generateAllBadges;
exports.getBadgesMarkdown = getBadgesMarkdown;
exports.getBadgesByCategory = getBadgesByCategory;
exports.createCustomBadge = createCustomBadge;
// ============================================================================
// COMPREHENSIVE BADGE DATABASE (80+ Technologies)
// ============================================================================
const TECH_BADGES = {
    // ═══════════════════════════════════════════════════════════════════════
    // LANGUAGES
    // ═══════════════════════════════════════════════════════════════════════
    'javascript': { name: 'JavaScript', color: 'F7DF1E', logo: 'javascript', logoColor: 'black' },
    'typescript': { name: 'TypeScript', color: '3178C6', logo: 'typescript', logoColor: 'white' },
    'python': { name: 'Python', color: '3776AB', logo: 'python', logoColor: 'white' },
    'java': { name: 'Java', color: 'ED8B00', logo: 'openjdk', logoColor: 'white' },
    'go': { name: 'Go', color: '00ADD8', logo: 'go', logoColor: 'white' },
    'rust': { name: 'Rust', color: '000000', logo: 'rust', logoColor: 'white' },
    'ruby': { name: 'Ruby', color: 'CC342D', logo: 'ruby', logoColor: 'white' },
    'php': { name: 'PHP', color: '777BB4', logo: 'php', logoColor: 'white' },
    'csharp': { name: 'C%23', color: '239120', logo: 'csharp', logoColor: 'white' },
    'cpp': { name: 'C%2B%2B', color: '00599C', logo: 'cplusplus', logoColor: 'white' },
    'c': { name: 'C', color: 'A8B9CC', logo: 'c', logoColor: 'black' },
    'swift': { name: 'Swift', color: 'FA7343', logo: 'swift', logoColor: 'white' },
    'kotlin': { name: 'Kotlin', color: '7F52FF', logo: 'kotlin', logoColor: 'white' },
    'dart': { name: 'Dart', color: '0175C2', logo: 'dart', logoColor: 'white' },
    'html': { name: 'HTML5', color: 'E34F26', logo: 'html5', logoColor: 'white' },
    'css': { name: 'CSS3', color: '1572B6', logo: 'css3', logoColor: 'white' },
    'sass': { name: 'Sass', color: 'CC6699', logo: 'sass', logoColor: 'white' },
    'lua': { name: 'Lua', color: '2C2D72', logo: 'lua', logoColor: 'white' },
    'perl': { name: 'Perl', color: '39457E', logo: 'perl', logoColor: 'white' },
    'r': { name: 'R', color: '276DC3', logo: 'r', logoColor: 'white' },
    'scala': { name: 'Scala', color: 'DC322F', logo: 'scala', logoColor: 'white' },
    'elixir': { name: 'Elixir', color: '4B275F', logo: 'elixir', logoColor: 'white' },
    'haskell': { name: 'Haskell', color: '5D4F85', logo: 'haskell', logoColor: 'white' },
    'clojure': { name: 'Clojure', color: '5881D8', logo: 'clojure', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // FRONTEND FRAMEWORKS
    // ═══════════════════════════════════════════════════════════════════════
    'react': { name: 'React', color: '61DAFB', logo: 'react', logoColor: 'black' },
    'vue': { name: 'Vue.js', color: '4FC08D', logo: 'vuedotjs', logoColor: 'white' },
    'angular': { name: 'Angular', color: 'DD0031', logo: 'angular', logoColor: 'white' },
    'svelte': { name: 'Svelte', color: 'FF3E00', logo: 'svelte', logoColor: 'white' },
    'next': { name: 'Next.js', color: '000000', logo: 'nextdotjs', logoColor: 'white' },
    'nuxt': { name: 'Nuxt.js', color: '00DC82', logo: 'nuxtdotjs', logoColor: 'white' },
    'gatsby': { name: 'Gatsby', color: '663399', logo: 'gatsby', logoColor: 'white' },
    'astro': { name: 'Astro', color: 'FF5D01', logo: 'astro', logoColor: 'white' },
    'solid': { name: 'Solid.js', color: '2C4F7C', logo: 'solid', logoColor: 'white' },
    'remix': { name: 'Remix', color: '000000', logo: 'remix', logoColor: 'white' },
    'preact': { name: 'Preact', color: '673AB8', logo: 'preact', logoColor: 'white' },
    'alpine': { name: 'Alpine.js', color: '8BC0D0', logo: 'alpinedotjs', logoColor: 'black' },
    'htmx': { name: 'HTMX', color: '3D72D7', logo: 'htmx', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // BACKEND FRAMEWORKS
    // ═══════════════════════════════════════════════════════════════════════
    'node': { name: 'Node.js', color: '339933', logo: 'nodedotjs', logoColor: 'white' },
    'express': { name: 'Express', color: '000000', logo: 'express', logoColor: 'white' },
    'nestjs': { name: 'NestJS', color: 'E0234E', logo: 'nestjs', logoColor: 'white' },
    'fastify': { name: 'Fastify', color: '000000', logo: 'fastify', logoColor: 'white' },
    'koa': { name: 'Koa', color: '33333D', logo: 'koa', logoColor: 'white' },
    'django': { name: 'Django', color: '092E20', logo: 'django', logoColor: 'white' },
    'flask': { name: 'Flask', color: '000000', logo: 'flask', logoColor: 'white' },
    'fastapi': { name: 'FastAPI', color: '009688', logo: 'fastapi', logoColor: 'white' },
    'spring': { name: 'Spring', color: '6DB33F', logo: 'spring', logoColor: 'white' },
    'rails': { name: 'Rails', color: 'CC0000', logo: 'rubyonrails', logoColor: 'white' },
    'laravel': { name: 'Laravel', color: 'FF2D20', logo: 'laravel', logoColor: 'white' },
    'gin': { name: 'Gin', color: '00ADD8', logo: 'gin', logoColor: 'white' },
    'fiber': { name: 'Fiber', color: '00ACD7', logo: 'go', logoColor: 'white' },
    'actix': { name: 'Actix', color: '000000', logo: 'rust', logoColor: 'white' },
    'deno': { name: 'Deno', color: '000000', logo: 'deno', logoColor: 'white' },
    'bun': { name: 'Bun', color: '000000', logo: 'bun', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // CSS FRAMEWORKS & UI LIBRARIES
    // ═══════════════════════════════════════════════════════════════════════
    'tailwind': { name: 'Tailwind', color: '06B6D4', logo: 'tailwindcss', logoColor: 'white' },
    'bootstrap': { name: 'Bootstrap', color: '7952B3', logo: 'bootstrap', logoColor: 'white' },
    'mui': { name: 'MUI', color: '007FFF', logo: 'mui', logoColor: 'white' },
    'chakra': { name: 'Chakra%20UI', color: '319795', logo: 'chakraui', logoColor: 'white' },
    'antdesign': { name: 'Ant%20Design', color: '0170FE', logo: 'antdesign', logoColor: 'white' },
    'shadcn': { name: 'shadcn/ui', color: '000000', logo: 'shadcnui', logoColor: 'white' },
    'radix': { name: 'Radix%20UI', color: '161618', logo: 'radixui', logoColor: 'white' },
    'bulma': { name: 'Bulma', color: '00D1B2', logo: 'bulma', logoColor: 'white' },
    'styled': { name: 'Styled%20Components', color: 'DB7093', logo: 'styledcomponents', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // DATABASES
    // ═══════════════════════════════════════════════════════════════════════
    'mongodb': { name: 'MongoDB', color: '47A248', logo: 'mongodb', logoColor: 'white' },
    'postgresql': { name: 'PostgreSQL', color: '4169E1', logo: 'postgresql', logoColor: 'white' },
    'mysql': { name: 'MySQL', color: '4479A1', logo: 'mysql', logoColor: 'white' },
    'sqlite': { name: 'SQLite', color: '003B57', logo: 'sqlite', logoColor: 'white' },
    'redis': { name: 'Redis', color: 'DC382D', logo: 'redis', logoColor: 'white' },
    'supabase': { name: 'Supabase', color: '3FCF8E', logo: 'supabase', logoColor: 'white' },
    'firebase': { name: 'Firebase', color: 'FFCA28', logo: 'firebase', logoColor: 'black' },
    'prisma': { name: 'Prisma', color: '2D3748', logo: 'prisma', logoColor: 'white' },
    'dynamodb': { name: 'DynamoDB', color: '4053D6', logo: 'amazondynamodb', logoColor: 'white' },
    'elasticsearch': { name: 'Elasticsearch', color: '005571', logo: 'elasticsearch', logoColor: 'white' },
    'neo4j': { name: 'Neo4j', color: '4581C3', logo: 'neo4j', logoColor: 'white' },
    'cassandra': { name: 'Cassandra', color: '1287B1', logo: 'apachecassandra', logoColor: 'white' },
    'couchdb': { name: 'CouchDB', color: 'E42528', logo: 'apachecouchdb', logoColor: 'white' },
    'mariadb': { name: 'MariaDB', color: '003545', logo: 'mariadb', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // TESTING
    // ═══════════════════════════════════════════════════════════════════════
    'jest': { name: 'Jest', color: 'C21325', logo: 'jest', logoColor: 'white' },
    'mocha': { name: 'Mocha', color: '8D6748', logo: 'mocha', logoColor: 'white' },
    'cypress': { name: 'Cypress', color: '17202C', logo: 'cypress', logoColor: 'white' },
    'playwright': { name: 'Playwright', color: '2EAD33', logo: 'playwright', logoColor: 'white' },
    'vitest': { name: 'Vitest', color: '6E9F18', logo: 'vitest', logoColor: 'white' },
    'pytest': { name: 'Pytest', color: '0A9EDC', logo: 'pytest', logoColor: 'white' },
    'junit': { name: 'JUnit5', color: '25A162', logo: 'junit5', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // BUILD TOOLS & BUNDLERS
    // ═══════════════════════════════════════════════════════════════════════
    'webpack': { name: 'Webpack', color: '8DD6F9', logo: 'webpack', logoColor: 'black' },
    'vite': { name: 'Vite', color: '646CFF', logo: 'vite', logoColor: 'white' },
    'rollup': { name: 'Rollup', color: 'EC4A3F', logo: 'rollupdotjs', logoColor: 'white' },
    'esbuild': { name: 'esbuild', color: 'FFCF00', logo: 'esbuild', logoColor: 'black' },
    'turbopack': { name: 'Turbopack', color: '000000', logo: 'turbopack', logoColor: 'white' },
    'parcel': { name: 'Parcel', color: '21374B', logo: 'parcel', logoColor: 'white' },
    'gulp': { name: 'Gulp', color: 'CF4647', logo: 'gulp', logoColor: 'white' },
    'grunt': { name: 'Grunt', color: 'FAA918', logo: 'grunt', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // DEVOPS & TOOLS
    // ═══════════════════════════════════════════════════════════════════════
    'docker': { name: 'Docker', color: '2496ED', logo: 'docker', logoColor: 'white' },
    'kubernetes': { name: 'Kubernetes', color: '326CE5', logo: 'kubernetes', logoColor: 'white' },
    'git': { name: 'Git', color: 'F05032', logo: 'git', logoColor: 'white' },
    'github': { name: 'GitHub', color: '181717', logo: 'github', logoColor: 'white' },
    'gitlab': { name: 'GitLab', color: 'FC6D26', logo: 'gitlab', logoColor: 'white' },
    'actions': { name: 'GitHub%20Actions', color: '2088FF', logo: 'githubactions', logoColor: 'white' },
    'jenkins': { name: 'Jenkins', color: 'D24939', logo: 'jenkins', logoColor: 'white' },
    'circleci': { name: 'CircleCI', color: '343434', logo: 'circleci', logoColor: 'white' },
    'nginx': { name: 'Nginx', color: '009639', logo: 'nginx', logoColor: 'white' },
    'apache': { name: 'Apache', color: 'D22128', logo: 'apache', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // CLOUD PROVIDERS
    // ═══════════════════════════════════════════════════════════════════════
    'aws': { name: 'AWS', color: '232F3E', logo: 'amazonaws', logoColor: 'white' },
    'azure': { name: 'Azure', color: '0078D4', logo: 'microsoftazure', logoColor: 'white' },
    'gcp': { name: 'Google%20Cloud', color: '4285F4', logo: 'googlecloud', logoColor: 'white' },
    'vercel': { name: 'Vercel', color: '000000', logo: 'vercel', logoColor: 'white' },
    'netlify': { name: 'Netlify', color: '00C7B7', logo: 'netlify', logoColor: 'white' },
    'heroku': { name: 'Heroku', color: '430098', logo: 'heroku', logoColor: 'white' },
    'digitalocean': { name: 'DigitalOcean', color: '0080FF', logo: 'digitalocean', logoColor: 'white' },
    'cloudflare': { name: 'Cloudflare', color: 'F38020', logo: 'cloudflare', logoColor: 'white' },
    'railway': { name: 'Railway', color: '0B0D0E', logo: 'railway', logoColor: 'white' },
    'render': { name: 'Render', color: '46E3B7', logo: 'render', logoColor: 'black' },
    // ═══════════════════════════════════════════════════════════════════════
    // LINTERS & FORMATTERS
    // ═══════════════════════════════════════════════════════════════════════
    'eslint': { name: 'ESLint', color: '4B32C3', logo: 'eslint', logoColor: 'white' },
    'prettier': { name: 'Prettier', color: 'F7B93E', logo: 'prettier', logoColor: 'black' },
    'biome': { name: 'Biome', color: '60A5FA', logo: 'biome', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // MOBILE
    // ═══════════════════════════════════════════════════════════════════════
    'reactnative': { name: 'React%20Native', color: '61DAFB', logo: 'react', logoColor: 'black' },
    'flutter': { name: 'Flutter', color: '02569B', logo: 'flutter', logoColor: 'white' },
    'expo': { name: 'Expo', color: '000020', logo: 'expo', logoColor: 'white' },
    'ionic': { name: 'Ionic', color: '3880FF', logo: 'ionic', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // AI/ML
    // ═══════════════════════════════════════════════════════════════════════
    'tensorflow': { name: 'TensorFlow', color: 'FF6F00', logo: 'tensorflow', logoColor: 'white' },
    'pytorch': { name: 'PyTorch', color: 'EE4C2C', logo: 'pytorch', logoColor: 'white' },
    'openai': { name: 'OpenAI', color: '412991', logo: 'openai', logoColor: 'white' },
    'langchain': { name: 'LangChain', color: '1C3C3C', logo: 'langchain', logoColor: 'white' },
    // ═══════════════════════════════════════════════════════════════════════
    // PACKAGE MANAGERS
    // ═══════════════════════════════════════════════════════════════════════
    'npm': { name: 'npm', color: 'CB3837', logo: 'npm', logoColor: 'white' },
    'yarn': { name: 'Yarn', color: '2C8EBB', logo: 'yarn', logoColor: 'white' },
    'pnpm': { name: 'pnpm', color: 'F69220', logo: 'pnpm', logoColor: 'white' },
    'pip': { name: 'pip', color: '3776AB', logo: 'pypi', logoColor: 'white' },
    'cargo': { name: 'Cargo', color: '000000', logo: 'rust', logoColor: 'white' },
};
// ============================================================================
// DETECTION MAPPINGS
// ============================================================================
/** Maps detected language names to badge keys */
const LANGUAGE_MAP = {
    'JavaScript': 'javascript',
    'TypeScript': 'typescript',
    'Python': 'python',
    'Java': 'java',
    'Go': 'go',
    'Rust': 'rust',
    'Ruby': 'ruby',
    'PHP': 'php',
    'C#': 'csharp',
    'C++': 'cpp',
    'C': 'c',
    'Swift': 'swift',
    'Kotlin': 'kotlin',
    'Dart': 'dart',
    'HTML': 'html',
    'CSS': 'css',
    'Sass': 'sass',
    'SCSS': 'sass',
    'Lua': 'lua',
    'Perl': 'perl',
    'R': 'r',
    'Scala': 'scala',
    'Elixir': 'elixir',
    'Haskell': 'haskell',
    'Clojure': 'clojure',
};
/** Maps detected framework names to badge keys */
const FRAMEWORK_MAP = {
    'React': 'react',
    'Vue.js': 'vue',
    'Vue': 'vue',
    'Angular': 'angular',
    'Svelte': 'svelte',
    'Next.js': 'next',
    'Nuxt.js': 'nuxt',
    'Gatsby': 'gatsby',
    'Astro': 'astro',
    'Remix': 'remix',
    'Express': 'express',
    'NestJS': 'nestjs',
    'Fastify': 'fastify',
    'Koa': 'koa',
    'Django': 'django',
    'Flask': 'flask',
    'FastAPI': 'fastapi',
    'Spring Boot': 'spring',
    'Ruby on Rails': 'rails',
    'Laravel': 'laravel',
    'Gin': 'gin',
    'TailwindCSS': 'tailwind',
    'Tailwind CSS': 'tailwind',
    'Bootstrap': 'bootstrap',
    'Material-UI': 'mui',
    'MUI': 'mui',
    'Chakra UI': 'chakra',
    'Ant Design': 'antdesign',
    'Flutter': 'flutter',
    'React Native': 'reactnative',
    'Expo': 'expo',
    'Ionic': 'ionic',
};
/** Maps package.json dependencies to badge keys */
const DEPENDENCY_MAP = {
    // Frontend
    'react': 'react',
    'react-dom': 'react',
    'vue': 'vue',
    '@angular/core': 'angular',
    'svelte': 'svelte',
    'next': 'next',
    'nuxt': 'nuxt',
    'gatsby': 'gatsby',
    'astro': 'astro',
    '@remix-run/react': 'remix',
    'solid-js': 'solid',
    'preact': 'preact',
    'alpinejs': 'alpine',
    'htmx.org': 'htmx',
    // Backend
    'express': 'express',
    '@nestjs/core': 'nestjs',
    'fastify': 'fastify',
    'koa': 'koa',
    // CSS
    'tailwindcss': 'tailwind',
    'bootstrap': 'bootstrap',
    '@mui/material': 'mui',
    '@chakra-ui/react': 'chakra',
    'antd': 'antdesign',
    '@radix-ui/react-dialog': 'radix',
    'styled-components': 'styled',
    'bulma': 'bulma',
    // Database
    'mongoose': 'mongodb',
    'mongodb': 'mongodb',
    'pg': 'postgresql',
    'mysql2': 'mysql',
    'better-sqlite3': 'sqlite',
    'sqlite3': 'sqlite',
    'redis': 'redis',
    'ioredis': 'redis',
    '@supabase/supabase-js': 'supabase',
    'firebase': 'firebase',
    '@prisma/client': 'prisma',
    'prisma': 'prisma',
    // Testing
    'jest': 'jest',
    'mocha': 'mocha',
    'cypress': 'cypress',
    '@playwright/test': 'playwright',
    'vitest': 'vitest',
    // Build
    'webpack': 'webpack',
    'vite': 'vite',
    'rollup': 'rollup',
    'esbuild': 'esbuild',
    'parcel': 'parcel',
    // Lint/Format
    'eslint': 'eslint',
    'prettier': 'prettier',
    '@biomejs/biome': 'biome',
    // Mobile
    'react-native': 'reactnative',
    'expo': 'expo',
    '@ionic/react': 'ionic',
    // AI
    'openai': 'openai',
    'langchain': 'langchain',
    '@tensorflow/tfjs': 'tensorflow',
};
/** Maps build tools to badge keys */
const BUILD_TOOL_MAP = {
    'webpack': 'webpack',
    'vite': 'vite',
    'rollup': 'rollup',
    'esbuild': 'esbuild',
    'parcel': 'parcel',
    'gulp': 'gulp',
    'grunt': 'grunt',
};
/** Maps package managers to badge keys */
const PACKAGE_MANAGER_MAP = {
    'npm': 'npm',
    'yarn': 'yarn',
    'pnpm': 'pnpm',
    'pip': 'pip',
    'cargo': 'cargo',
};
// ============================================================================
// BADGE GENERATION FUNCTIONS
// ============================================================================
/**
 * Generate a single badge markdown
 */
function createBadge(key, style = 'flat-square') {
    const config = TECH_BADGES[key];
    if (!config)
        return null;
    const logoColor = config.logoColor || 'white';
    const markdown = `![${config.name.replace(/%20/g, ' ')}](https://img.shields.io/badge/${config.name}-${config.color}?style=${style}&logo=${config.logo}&logoColor=${logoColor})`;
    return {
        label: config.name.replace(/%20/g, ' ').replace(/%2B/g, '+').replace(/%23/g, '#'),
        markdown,
        category: getCategoryForKey(key),
    };
}
/**
 * Get category for a badge key
 */
function getCategoryForKey(key) {
    if (['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'csharp', 'cpp', 'c', 'swift', 'kotlin', 'dart', 'html', 'css', 'sass', 'lua', 'perl', 'r', 'scala', 'elixir', 'haskell', 'clojure'].includes(key)) {
        return 'language';
    }
    if (['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'supabase', 'firebase', 'prisma', 'dynamodb', 'elasticsearch', 'neo4j', 'cassandra', 'couchdb', 'mariadb'].includes(key)) {
        return 'database';
    }
    if (['aws', 'azure', 'gcp', 'vercel', 'netlify', 'heroku', 'digitalocean', 'cloudflare', 'railway', 'render'].includes(key)) {
        return 'cloud';
    }
    if (['docker', 'kubernetes', 'git', 'github', 'gitlab', 'actions', 'jenkins', 'circleci', 'nginx', 'apache', 'webpack', 'vite', 'rollup', 'esbuild', 'parcel', 'gulp', 'grunt', 'eslint', 'prettier', 'biome', 'npm', 'yarn', 'pnpm', 'pip', 'cargo'].includes(key)) {
        return 'tool';
    }
    return 'framework';
}
/**
 * Generate license badge
 */
function generateLicenseBadge(projectInfo) {
    const license = projectInfo.packageJson?.license;
    if (!license)
        return null;
    const encoded = encodeURIComponent(license);
    return {
        label: 'License',
        markdown: `![License](https://img.shields.io/badge/License-${encoded}-blue?style=flat-square)`,
        category: 'meta',
    };
}
/**
 * Generate version badge
 */
function generateVersionBadge(projectInfo) {
    const version = projectInfo.packageJson?.version;
    if (!version)
        return null;
    return {
        label: 'Version',
        markdown: `![Version](https://img.shields.io/badge/Version-${version}-green?style=flat-square)`,
        category: 'meta',
    };
}
/**
 * Generate PRs Welcome badge
 */
function generatePRsWelcomeBadge() {
    return {
        label: 'PRs Welcome',
        markdown: `![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)`,
        category: 'meta',
    };
}
/**
 * Auto-detect and generate all applicable badges based on project analysis
 */
function generateAllBadges(projectInfo, detection, style = 'flat-square') {
    const badges = [];
    const addedKeys = new Set();
    // Helper to add badge if not already added
    const addBadge = (key) => {
        if (!addedKeys.has(key)) {
            const badge = createBadge(key, style);
            if (badge) {
                badges.push(badge);
                addedKeys.add(key);
            }
        }
    };
    // 1. Add language badges
    for (const lang of detection.languages) {
        const key = LANGUAGE_MAP[lang.name] || LANGUAGE_MAP[lang.name.split(' ')[0]];
        if (key)
            addBadge(key);
    }
    // 2. Add framework badges
    for (const fw of detection.frameworks) {
        const key = FRAMEWORK_MAP[fw.name];
        if (key)
            addBadge(key);
    }
    // 3. Add badges from package.json dependencies
    const deps = {
        ...projectInfo.packageJson?.dependencies,
        ...projectInfo.packageJson?.devDependencies,
    };
    for (const dep of Object.keys(deps || {})) {
        const key = DEPENDENCY_MAP[dep];
        if (key)
            addBadge(key);
    }
    // 4. Add build tool badges
    for (const tool of detection.buildTools) {
        const key = BUILD_TOOL_MAP[tool.toLowerCase()];
        if (key)
            addBadge(key);
    }
    // 5. Add package manager badge
    if (detection.packageManager) {
        const key = PACKAGE_MANAGER_MAP[detection.packageManager.toLowerCase()];
        if (key)
            addBadge(key);
    }
    // 6. Add Node.js badge if applicable
    if (projectInfo.packageJson?.engines?.node) {
        addBadge('node');
    }
    // 7. Add Docker badge if Dockerfile exists
    if (projectInfo.files?.some(f => f.path.toLowerCase().includes('dockerfile'))) {
        addBadge('docker');
    }
    // 8. Add GitHub Actions badge if .github/workflows exists
    if (projectInfo.files?.some(f => f.path.includes('.github/workflows'))) {
        addBadge('actions');
    }
    // 9. Add meta badges
    const licenseBadge = generateLicenseBadge(projectInfo);
    if (licenseBadge)
        badges.push(licenseBadge);
    const versionBadge = generateVersionBadge(projectInfo);
    if (versionBadge)
        badges.push(versionBadge);
    badges.push(generatePRsWelcomeBadge());
    return badges;
}
/**
 * Get all badges as markdown string
 */
function getBadgesMarkdown(projectInfo, detection, style = 'flat-square') {
    const badges = generateAllBadges(projectInfo, detection, style);
    return badges.map(b => b.markdown).join(' ');
}
/**
 * Get badges grouped by category
 */
function getBadgesByCategory(projectInfo, detection, style = 'flat-square') {
    const badges = generateAllBadges(projectInfo, detection, style);
    return {
        language: badges.filter(b => b.category === 'language'),
        framework: badges.filter(b => b.category === 'framework'),
        database: badges.filter(b => b.category === 'database'),
        tool: badges.filter(b => b.category === 'tool'),
        cloud: badges.filter(b => b.category === 'cloud'),
        meta: badges.filter(b => b.category === 'meta'),
    };
}
/**
 * Create a custom badge with specified parameters
 */
function createCustomBadge(label, color, logo, style = 'flat-square', logoColor = 'white') {
    const encodedLabel = encodeURIComponent(label);
    return `![${label}](https://img.shields.io/badge/${encodedLabel}-${color}?style=${style}&logo=${logo}&logoColor=${logoColor})`;
}
//# sourceMappingURL=badgeGenerator.js.map