"use strict";
/**
 * History Manager
 * Manages README versions for rollback functionality
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveVersion = saveVersion;
exports.getVersions = getVersions;
exports.getVersionContent = getVersionContent;
exports.deleteVersion = deleteVersion;
exports.rollbackToVersion = rollbackToVersion;
exports.hasHistory = hasHistory;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const HISTORY_FOLDER = '.readme-generator';
const HISTORY_SUBFOLDER = 'history';
const MAX_VERSIONS = 20;
/**
 * Get the history directory path for a workspace
 */
function getHistoryDir(workspacePath) {
    return path.join(workspacePath, HISTORY_FOLDER, HISTORY_SUBFOLDER);
}
/**
 * Ensure history directory exists
 */
async function ensureHistoryDir(workspacePath) {
    const historyDir = getHistoryDir(workspacePath);
    try {
        await fs.promises.mkdir(historyDir, { recursive: true });
    }
    catch (e) {
        // Directory might already exist
    }
    // Add .gitignore to the .readme-generator folder
    const gitignorePath = path.join(workspacePath, HISTORY_FOLDER, '.gitignore');
    try {
        await fs.promises.writeFile(gitignorePath, '*\n', { flag: 'wx' });
    }
    catch (e) {
        // File might already exist
    }
    return historyDir;
}
/**
 * Generate a short hash of content
 */
function generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}
/**
 * Get preview text from content
 */
function getPreview(content, maxLength = 100) {
    // Get first non-empty line that isn't a badge or header
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed &&
            !trimmed.startsWith('#') &&
            !trimmed.startsWith('![') &&
            !trimmed.startsWith('[![') &&
            trimmed.length > 10) {
            return trimmed.substring(0, maxLength) + (trimmed.length > maxLength ? '...' : '');
        }
    }
    return content.substring(0, maxLength) + '...';
}
/**
 * Save a new README version
 */
async function saveVersion(workspacePath, content) {
    const historyDir = await ensureHistoryDir(workspacePath);
    const timestamp = Date.now();
    const hash = generateHash(content);
    const filename = `${timestamp}-${hash}.md`;
    const filePath = path.join(historyDir, filename);
    await fs.promises.writeFile(filePath, content, 'utf-8');
    // Cleanup old versions
    await cleanupOldVersions(workspacePath);
    return {
        id: `${timestamp}-${hash}`,
        timestamp: timestamp,
        date: new Date(timestamp).toLocaleString(),
        hash: hash,
        preview: getPreview(content),
        filePath: filePath
    };
}
/**
 * Get all saved versions
 */
async function getVersions(workspacePath) {
    const historyDir = getHistoryDir(workspacePath);
    try {
        const files = await fs.promises.readdir(historyDir);
        const versions = [];
        for (const file of files) {
            if (!file.endsWith('.md'))
                continue;
            const match = file.match(/^(\d+)-([a-f0-9]+)\.md$/);
            if (!match)
                continue;
            const timestamp = parseInt(match[1], 10);
            const hash = match[2];
            const filePath = path.join(historyDir, file);
            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                versions.push({
                    id: `${timestamp}-${hash}`,
                    timestamp: timestamp,
                    date: new Date(timestamp).toLocaleString(),
                    hash: hash,
                    preview: getPreview(content),
                    filePath: filePath
                });
            }
            catch (e) {
                // Skip files that can't be read
            }
        }
        // Sort by timestamp descending (newest first)
        versions.sort((a, b) => b.timestamp - a.timestamp);
        return versions;
    }
    catch (e) {
        return [];
    }
}
/**
 * Get a specific version's content
 */
async function getVersionContent(workspacePath, versionId) {
    const versions = await getVersions(workspacePath);
    const version = versions.find(v => v.id === versionId);
    if (!version)
        return null;
    try {
        return await fs.promises.readFile(version.filePath, 'utf-8');
    }
    catch (e) {
        return null;
    }
}
/**
 * Delete a specific version
 */
async function deleteVersion(workspacePath, versionId) {
    const versions = await getVersions(workspacePath);
    const version = versions.find(v => v.id === versionId);
    if (!version)
        return false;
    try {
        await fs.promises.unlink(version.filePath);
        return true;
    }
    catch (e) {
        return false;
    }
}
/**
 * Cleanup old versions (keep only MAX_VERSIONS)
 */
async function cleanupOldVersions(workspacePath) {
    const versions = await getVersions(workspacePath);
    if (versions.length <= MAX_VERSIONS)
        return;
    const toDelete = versions.slice(MAX_VERSIONS);
    for (const version of toDelete) {
        try {
            await fs.promises.unlink(version.filePath);
        }
        catch (e) {
            // Ignore deletion errors
        }
    }
}
/**
 * Rollback to a specific version (writes to README.md)
 */
async function rollbackToVersion(workspacePath, versionId) {
    const content = await getVersionContent(workspacePath, versionId);
    if (!content)
        return false;
    const readmePath = path.join(workspacePath, 'README.md');
    try {
        await fs.promises.writeFile(readmePath, content, 'utf-8');
        return true;
    }
    catch (e) {
        return false;
    }
}
/**
 * Check if history exists for workspace
 */
async function hasHistory(workspacePath) {
    const versions = await getVersions(workspacePath);
    return versions.length > 0;
}
//# sourceMappingURL=historyManager.js.map