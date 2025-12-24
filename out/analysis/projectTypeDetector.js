"use strict";
/**
 * Project Type Detector
 * Classifies project into categories: Web App, Backend, Library, CLI, Mobile, Desktop
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectProjectType = detectProjectType;
/**
 * Detect project type based on project info and detection results
 */
function detectProjectType(projectInfo, detection) {
    const pkg = projectInfo.packageJson;
    const frameworks = detection.frameworks;
    const files = projectInfo.files;
    // Check for monorepo indicators
    const hasWorkspaces = pkg?.workspaces ||
        files.some(f => f.name === 'lerna.json' || f.name === 'pnpm-workspace.yaml');
    if (hasWorkspaces) {
        return {
            type: 'monorepo',
            displayName: 'Monorepo',
            confidence: 0.9,
            reason: 'Detected workspace configuration'
        };
    }
    // Check for mobile frameworks
    const mobileFrameworks = ['React Native', 'Flutter', 'Ionic', 'Cordova'];
    const hasMobileFramework = frameworks.some(f => mobileFrameworks.includes(f.name));
    if (hasMobileFramework) {
        return {
            type: 'mobile',
            displayName: 'Mobile App',
            confidence: 0.95,
            reason: `Using ${frameworks.find(f => mobileFrameworks.includes(f.name))?.name}`
        };
    }
    // Check for desktop frameworks
    const desktopFrameworks = ['Electron', 'Tauri'];
    const hasDesktopFramework = frameworks.some(f => desktopFrameworks.includes(f.name));
    if (hasDesktopFramework) {
        return {
            type: 'desktop',
            displayName: 'Desktop App',
            confidence: 0.95,
            reason: `Using ${frameworks.find(f => desktopFrameworks.includes(f.name))?.name}`
        };
    }
    // Check for CLI indicators
    const hasBinField = pkg?.bin !== undefined;
    const hasCliKeyword = pkg?.keywords?.some((k) => k.toLowerCase().includes('cli') || k.toLowerCase().includes('command'));
    if (hasBinField || hasCliKeyword) {
        return {
            type: 'cli',
            displayName: 'CLI Tool',
            confidence: 0.85,
            reason: hasBinField ? 'Has bin field in package.json' : 'CLI-related keywords'
        };
    }
    // Check for library indicators
    const hasMain = pkg?.main !== undefined;
    const hasTypes = pkg?.types !== undefined || pkg?.typings !== undefined;
    const hasExports = pkg?.exports !== undefined;
    const isPrivate = pkg?.private === true;
    const libraryScore = (hasMain ? 1 : 0) + (hasTypes ? 1 : 0) + (hasExports ? 1 : 0) + (!isPrivate ? 1 : 0);
    if (libraryScore >= 2 && !isPrivate) {
        return {
            type: 'library',
            displayName: 'Library/Package',
            confidence: 0.7 + (libraryScore * 0.05),
            reason: 'Has library configuration (main, types, exports)'
        };
    }
    // Check for fullstack frameworks
    const fullstackFrameworks = ['Next.js', 'Nuxt.js', 'SvelteKit', 'Remix'];
    const hasFullstackFramework = frameworks.some(f => fullstackFrameworks.includes(f.name));
    if (hasFullstackFramework) {
        return {
            type: 'fullstack',
            displayName: 'Full-Stack App',
            confidence: 0.9,
            reason: `Using ${frameworks.find(f => fullstackFrameworks.includes(f.name))?.name}`
        };
    }
    // Check for frontend frameworks
    const frontendFrameworks = ['React', 'Vue.js', 'Angular', 'Svelte'];
    const hasFrontendFramework = frameworks.some(f => frontendFrameworks.includes(f.name));
    // Check for backend frameworks
    const backendFrameworks = ['Express.js', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot'];
    const hasBackendFramework = frameworks.some(f => backendFrameworks.includes(f.name));
    if (hasFrontendFramework && hasBackendFramework) {
        return {
            type: 'fullstack',
            displayName: 'Full-Stack App',
            confidence: 0.85,
            reason: 'Has both frontend and backend frameworks'
        };
    }
    if (hasFrontendFramework) {
        return {
            type: 'web-app',
            displayName: 'Web Application',
            confidence: 0.85,
            reason: `Using ${frameworks.find(f => frontendFrameworks.includes(f.name))?.name}`
        };
    }
    if (hasBackendFramework) {
        return {
            type: 'backend',
            displayName: 'Backend/API',
            confidence: 0.85,
            reason: `Using ${frameworks.find(f => backendFrameworks.includes(f.name))?.name}`
        };
    }
    // Check file structure
    const hasPublicFolder = files.some(f => f.name === 'public' && f.isDirectory);
    const hasSrcFolder = files.some(f => f.name === 'src' && f.isDirectory);
    const hasIndexHtml = files.some(f => f.name === 'index.html');
    if (hasPublicFolder || hasIndexHtml) {
        return {
            type: 'web-app',
            displayName: 'Web Application',
            confidence: 0.6,
            reason: 'Has public folder or index.html'
        };
    }
    // Check for server files
    const hasServerFile = files.some(f => f.name === 'server.js' ||
        f.name === 'server.ts' ||
        f.name === 'app.js' ||
        f.name === 'app.ts' ||
        f.name === 'index.js' ||
        f.name === 'main.py' ||
        f.name === 'app.py');
    if (hasServerFile && !hasPublicFolder && !hasIndexHtml) {
        return {
            type: 'backend',
            displayName: 'Backend/API',
            confidence: 0.6,
            reason: 'Has server entry file'
        };
    }
    return {
        type: 'unknown',
        displayName: 'Project',
        confidence: 0.3,
        reason: 'Could not determine project type'
    };
}
//# sourceMappingURL=projectTypeDetector.js.map