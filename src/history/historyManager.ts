/**
 * History Manager
 * Manages README versions for rollback functionality
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const HISTORY_FOLDER = '.readme-generator';
const HISTORY_SUBFOLDER = 'history';
const MAX_VERSIONS = 20;

export interface ReadmeVersion {
    id: string;
    timestamp: number;
    date: string;
    hash: string;
    preview: string;
    filePath: string;
}

/**
 * Get the history directory path for a workspace
 */
function getHistoryDir(workspacePath: string): string {
    return path.join(workspacePath, HISTORY_FOLDER, HISTORY_SUBFOLDER);
}

/**
 * Ensure history directory exists
 */
async function ensureHistoryDir(workspacePath: string): Promise<string> {
    const historyDir = getHistoryDir(workspacePath);
    
    try {
        await fs.promises.mkdir(historyDir, { recursive: true });
    } catch (e) {
        // Directory might already exist
    }
    
    // Add .gitignore to the .readme-generator folder
    const gitignorePath = path.join(workspacePath, HISTORY_FOLDER, '.gitignore');
    try {
        await fs.promises.writeFile(gitignorePath, '*\n', { flag: 'wx' });
    } catch (e) {
        // File might already exist
    }
    
    return historyDir;
}

/**
 * Generate a short hash of content
 */
function generateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}

/**
 * Get preview text from content
 */
function getPreview(content: string, maxLength: number = 100): string {
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
export async function saveVersion(workspacePath: string, content: string): Promise<ReadmeVersion> {
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
export async function getVersions(workspacePath: string): Promise<ReadmeVersion[]> {
    const historyDir = getHistoryDir(workspacePath);
    
    try {
        const files = await fs.promises.readdir(historyDir);
        const versions: ReadmeVersion[] = [];
        
        for (const file of files) {
            if (!file.endsWith('.md')) continue;
            
            const match = file.match(/^(\d+)-([a-f0-9]+)\.md$/);
            if (!match) continue;
            
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
            } catch (e) {
                // Skip files that can't be read
            }
        }
        
        // Sort by timestamp descending (newest first)
        versions.sort((a, b) => b.timestamp - a.timestamp);
        
        return versions;
    } catch (e) {
        return [];
    }
}

/**
 * Get a specific version's content
 */
export async function getVersionContent(workspacePath: string, versionId: string): Promise<string | null> {
    const versions = await getVersions(workspacePath);
    const version = versions.find(v => v.id === versionId);
    
    if (!version) return null;
    
    try {
        return await fs.promises.readFile(version.filePath, 'utf-8');
    } catch (e) {
        return null;
    }
}

/**
 * Delete a specific version
 */
export async function deleteVersion(workspacePath: string, versionId: string): Promise<boolean> {
    const versions = await getVersions(workspacePath);
    const version = versions.find(v => v.id === versionId);
    
    if (!version) return false;
    
    try {
        await fs.promises.unlink(version.filePath);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Cleanup old versions (keep only MAX_VERSIONS)
 */
async function cleanupOldVersions(workspacePath: string): Promise<void> {
    const versions = await getVersions(workspacePath);
    
    if (versions.length <= MAX_VERSIONS) return;
    
    const toDelete = versions.slice(MAX_VERSIONS);
    
    for (const version of toDelete) {
        try {
            await fs.promises.unlink(version.filePath);
        } catch (e) {
            // Ignore deletion errors
        }
    }
}

/**
 * Rollback to a specific version (writes to README.md)
 */
export async function rollbackToVersion(workspacePath: string, versionId: string): Promise<boolean> {
    const content = await getVersionContent(workspacePath, versionId);
    
    if (!content) return false;
    
    const readmePath = path.join(workspacePath, 'README.md');
    
    try {
        await fs.promises.writeFile(readmePath, content, 'utf-8');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Check if history exists for workspace
 */
export async function hasHistory(workspacePath: string): Promise<boolean> {
    const versions = await getVersions(workspacePath);
    return versions.length > 0;
}
