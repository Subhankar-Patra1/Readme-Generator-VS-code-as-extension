/**
 * Diff Helper
 * Handles safe merging with VS Code diff view
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Check if README.md exists in the workspace
 */
export async function readmeExists(workspacePath: string): Promise<boolean> {
    const readmePath = path.join(workspacePath, 'README.md');
    
    try {
        await fs.promises.access(readmePath, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get existing README content
 */
export async function getExistingReadme(workspacePath: string): Promise<string | null> {
    const readmePath = path.join(workspacePath, 'README.md');
    
    try {
        return await fs.promises.readFile(readmePath, 'utf-8');
    } catch {
        return null;
    }
}

/**
 * Show diff between existing and new README
 */
export async function showDiff(
    workspacePath: string,
    newContent: string,
    existingContent?: string
): Promise<void> {
    const existingReadmePath = path.join(workspacePath, 'README.md');
    const tempDir = path.join(workspacePath, '.readme-generator', 'temp');
    
    // Ensure temp directory exists
    try {
        await fs.promises.mkdir(tempDir, { recursive: true });
    } catch (e) {
        // Directory might already exist
    }
    
    // Write new content to temp file
    const newReadmePath = path.join(tempDir, 'README.new.md');
    await fs.promises.writeFile(newReadmePath, newContent, 'utf-8');
    
    // If no existing content, create an empty temp file for comparison
    let leftUri: vscode.Uri;
    let rightUri: vscode.Uri = vscode.Uri.file(newReadmePath);
    
    if (existingContent) {
        leftUri = vscode.Uri.file(existingReadmePath);
    } else {
        const emptyPath = path.join(tempDir, 'README.empty.md');
        await fs.promises.writeFile(emptyPath, '', 'utf-8');
        leftUri = vscode.Uri.file(emptyPath);
    }
    
    // Show diff
    await vscode.commands.executeCommand(
        'vscode.diff',
        leftUri,
        rightUri,
        'README.md ↔ New README (Generated)',
        {
            preview: true,
            viewColumn: vscode.ViewColumn.Active
        }
    );
}

/**
 * Save new README content (overwrites existing)
 */
export async function saveReadme(workspacePath: string, content: string): Promise<boolean> {
    const readmePath = path.join(workspacePath, 'README.md');
    
    try {
        await fs.promises.writeFile(readmePath, content, 'utf-8');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Open the newly generated README in editor
 */
export async function openReadme(workspacePath: string): Promise<void> {
    const readmePath = path.join(workspacePath, 'README.md');
    const uri = vscode.Uri.file(readmePath);
    
    try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, {
            preview: false,
            viewColumn: vscode.ViewColumn.Active
        });
    } catch (e) {
        // File might not exist
    }
}

/**
 * Prompt user for action when README exists
 */
export async function promptForExistingReadme(): Promise<'overwrite' | 'diff' | 'cancel'> {
    const choice = await vscode.window.showWarningMessage(
        'README.md already exists. What would you like to do?',
        { modal: true },
        'Compare (Diff View)',
        'Overwrite',
        'Cancel'
    );
    
    switch (choice) {
        case 'Compare (Diff View)':
            return 'diff';
        case 'Overwrite':
            return 'overwrite';
        default:
            return 'cancel';
    }
}

/**
 * Cleanup temp files
 */
export async function cleanupTempFiles(workspacePath: string): Promise<void> {
    const tempDir = path.join(workspacePath, '.readme-generator', 'temp');
    
    try {
        const files = await fs.promises.readdir(tempDir);
        for (const file of files) {
            await fs.promises.unlink(path.join(tempDir, file));
        }
    } catch {
        // Directory might not exist
    }
}
