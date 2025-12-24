/**
 * Workspace Scanner
 * Scans the workspace to collect project information for README generation.
 * Respects .gitignore and excludes node_modules, .git, .env files.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import ignore, { Ignore } from 'ignore';

export interface ProjectFile {
    path: string;
    relativePath: string;
    name: string;
    extension: string;
    isDirectory: boolean;
}

export interface ProjectInfo {
    name: string;
    rootPath: string;
    files: ProjectFile[];
    packageJson?: any;
    hasReadme: boolean;
    existingReadmeContent?: string;
    configFiles: string[];
    sourceFiles: string[];
    totalFiles: number;
}

// Files and directories to always exclude
const ALWAYS_EXCLUDE = [
    'node_modules',
    '.git',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    '.DS_Store',
    'Thumbs.db',
    '.vscode',
    '.idea',
    'dist',
    'build',
    'out',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    '*.log',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.readme-generator'
];

// Config files to detect
const CONFIG_FILES = [
    'package.json',
    'tsconfig.json',
    'webpack.config.js',
    'vite.config.js',
    'vite.config.ts',
    'next.config.js',
    'next.config.mjs',
    'nuxt.config.js',
    'nuxt.config.ts',
    'angular.json',
    'vue.config.js',
    'rollup.config.js',
    'esbuild.config.js',
    'requirements.txt',
    'Pipfile',
    'pyproject.toml',
    'setup.py',
    'Cargo.toml',
    'go.mod',
    'Gemfile',
    'composer.json',
    'pom.xml',
    'build.gradle',
    'CMakeLists.txt',
    'Makefile',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    '.travis.yml',
    '.github/workflows',
    'Jenkinsfile',
    'azure-pipelines.yml',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CHANGELOG.md'
];

// Source file extensions
const SOURCE_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw',
    '.java', '.kt', '.scala',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.cs', '.fs',
    '.cpp', '.c', '.h', '.hpp',
    '.swift',
    '.dart',
    '.vue', '.svelte',
    '.html', '.css', '.scss', '.sass', '.less'
];

/**
 * Load and parse .gitignore file
 */
function loadGitignore(rootPath: string): Ignore {
    const ig = ignore();
    
    // Add always excluded patterns
    ig.add(ALWAYS_EXCLUDE);
    
    // Try to load .gitignore
    const gitignorePath = path.join(rootPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        try {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
            ig.add(gitignoreContent);
        } catch (e) {
            // Ignore read errors
        }
    }
    
    return ig;
}

/**
 * Recursively scan directory
 */
async function scanDirectory(
    dirPath: string,
    rootPath: string,
    ig: Ignore,
    maxDepth: number = 5,
    currentDepth: number = 0
): Promise<ProjectFile[]> {
    const files: ProjectFile[] = [];
    
    if (currentDepth > maxDepth) {
        return files;
    }
    
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = path.relative(rootPath, fullPath);
            
            // Check if ignored
            if (ig.ignores(relativePath)) {
                continue;
            }
            
            const extension = path.extname(entry.name).toLowerCase();
            
            const projectFile: ProjectFile = {
                path: fullPath,
                relativePath: relativePath,
                name: entry.name,
                extension: extension,
                isDirectory: entry.isDirectory()
            };
            
            files.push(projectFile);
            
            // Recursively scan subdirectories
            if (entry.isDirectory()) {
                const subFiles = await scanDirectory(fullPath, rootPath, ig, maxDepth, currentDepth + 1);
                files.push(...subFiles);
            }
        }
    } catch (e) {
        // Ignore access errors
    }
    
    return files;
}

/**
 * Read and parse package.json
 */
async function readPackageJson(rootPath: string): Promise<any | undefined> {
    const packageJsonPath = path.join(rootPath, 'package.json');
    
    try {
        if (fs.existsSync(packageJsonPath)) {
            const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
            return JSON.parse(content);
        }
    } catch (e) {
        // Ignore parse errors
    }
    
    return undefined;
}

/**
 * Read existing README.md content
 */
async function readExistingReadme(rootPath: string): Promise<string | undefined> {
    const readmePath = path.join(rootPath, 'README.md');
    
    try {
        if (fs.existsSync(readmePath)) {
            return await fs.promises.readFile(readmePath, 'utf-8');
        }
    } catch (e) {
        // Ignore read errors
    }
    
    return undefined;
}

/**
 * Scan the workspace or a specific folder
 */
export async function scanWorkspace(folderPath?: string): Promise<ProjectInfo | null> {
    // Get the workspace folder
    let rootPath: string;
    
    if (folderPath) {
        rootPath = folderPath;
    } else {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        rootPath = workspaceFolders[0].uri.fsPath;
    }
    
    // Load .gitignore
    const ig = loadGitignore(rootPath);
    
    // Scan directory
    const files = await scanDirectory(rootPath, rootPath, ig);
    
    // Read package.json
    const packageJson = await readPackageJson(rootPath);
    
    // Check for README
    const existingReadmeContent = await readExistingReadme(rootPath);
    const hasReadme = !!existingReadmeContent;
    
    // Filter config files and source files
    const configFiles = files
        .filter(f => !f.isDirectory && CONFIG_FILES.some(cf => f.name === cf || f.relativePath.includes(cf)))
        .map(f => f.relativePath);
    
    const sourceFiles = files
        .filter(f => !f.isDirectory && SOURCE_EXTENSIONS.includes(f.extension))
        .map(f => f.relativePath);
    
    return {
        name: packageJson?.name || path.basename(rootPath),
        rootPath: rootPath,
        files: files,
        packageJson: packageJson,
        hasReadme: hasReadme,
        existingReadmeContent: existingReadmeContent,
        configFiles: configFiles,
        sourceFiles: sourceFiles,
        totalFiles: files.filter(f => !f.isDirectory).length
    };
}

/**
 * Get a summary of the project structure for the AI prompt
 */
export function getProjectSummary(projectInfo: ProjectInfo): string {
    const summary: string[] = [];
    
    summary.push(`Project Name: ${projectInfo.name}`);
    summary.push(`Total Files: ${projectInfo.totalFiles}`);
    
    if (projectInfo.configFiles.length > 0) {
        summary.push(`\nConfig Files:\n${projectInfo.configFiles.map(f => `  - ${f}`).join('\n')}`);
    }
    
    // Get file extension counts
    const extensionCounts: Record<string, number> = {};
    for (const file of projectInfo.files) {
        if (!file.isDirectory && file.extension) {
            extensionCounts[file.extension] = (extensionCounts[file.extension] || 0) + 1;
        }
    }
    
    const sortedExtensions = Object.entries(extensionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (sortedExtensions.length > 0) {
        summary.push(`\nFile Types:\n${sortedExtensions.map(([ext, count]) => `  - ${ext}: ${count} files`).join('\n')}`);
    }
    
    // Add package.json info
    if (projectInfo.packageJson) {
        const pkg = projectInfo.packageJson;
        
        if (pkg.description) {
            summary.push(`\nDescription: ${pkg.description}`);
        }
        
        if (pkg.dependencies) {
            const deps = Object.keys(pkg.dependencies).slice(0, 15);
            summary.push(`\nDependencies:\n${deps.map(d => `  - ${d}`).join('\n')}`);
            if (Object.keys(pkg.dependencies).length > 15) {
                summary.push(`  ... and ${Object.keys(pkg.dependencies).length - 15} more`);
            }
        }
        
        if (pkg.devDependencies) {
            const devDeps = Object.keys(pkg.devDependencies).slice(0, 10);
            summary.push(`\nDev Dependencies:\n${devDeps.map(d => `  - ${d}`).join('\n')}`);
        }
        
        if (pkg.scripts) {
            const scripts = Object.entries(pkg.scripts).slice(0, 10);
            summary.push(`\nScripts:\n${scripts.map(([name, cmd]) => `  - ${name}: ${cmd}`).join('\n')}`);
        }
    }
    
    // Add directory structure (top level)
    const topLevelDirs = projectInfo.files
        .filter(f => f.isDirectory && !f.relativePath.includes(path.sep))
        .map(f => f.name)
        .slice(0, 15);
    
    if (topLevelDirs.length > 0) {
        summary.push(`\nTop-Level Directories:\n${topLevelDirs.map(d => `  - ${d}/`).join('\n')}`);
    }
    
    return summary.join('\n');
}
