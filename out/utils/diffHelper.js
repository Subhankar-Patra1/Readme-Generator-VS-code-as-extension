"use strict";
/**
 * Diff Helper
 * Handles safe merging with VS Code diff view
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
exports.readmeExists = readmeExists;
exports.getExistingReadme = getExistingReadme;
exports.showDiff = showDiff;
exports.saveReadme = saveReadme;
exports.openReadme = openReadme;
exports.promptForExistingReadme = promptForExistingReadme;
exports.cleanupTempFiles = cleanupTempFiles;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Check if README.md exists in the workspace
 */
async function readmeExists(workspacePath) {
    const readmePath = path.join(workspacePath, 'README.md');
    try {
        await fs.promises.access(readmePath, fs.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get existing README content
 */
async function getExistingReadme(workspacePath) {
    const readmePath = path.join(workspacePath, 'README.md');
    try {
        return await fs.promises.readFile(readmePath, 'utf-8');
    }
    catch {
        return null;
    }
}
/**
 * Show diff between existing and new README
 */
async function showDiff(workspacePath, newContent, existingContent) {
    const existingReadmePath = path.join(workspacePath, 'README.md');
    const tempDir = path.join(workspacePath, '.readme-generator', 'temp');
    // Ensure temp directory exists
    try {
        await fs.promises.mkdir(tempDir, { recursive: true });
    }
    catch (e) {
        // Directory might already exist
    }
    // Write new content to temp file
    const newReadmePath = path.join(tempDir, 'README.new.md');
    await fs.promises.writeFile(newReadmePath, newContent, 'utf-8');
    // If no existing content, create an empty temp file for comparison
    let leftUri;
    let rightUri = vscode.Uri.file(newReadmePath);
    if (existingContent) {
        leftUri = vscode.Uri.file(existingReadmePath);
    }
    else {
        const emptyPath = path.join(tempDir, 'README.empty.md');
        await fs.promises.writeFile(emptyPath, '', 'utf-8');
        leftUri = vscode.Uri.file(emptyPath);
    }
    // Show diff
    await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, 'README.md ↔ New README (Generated)', {
        preview: true,
        viewColumn: vscode.ViewColumn.Active
    });
}
/**
 * Save new README content (overwrites existing)
 */
async function saveReadme(workspacePath, content) {
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
 * Open the newly generated README in editor
 */
async function openReadme(workspacePath) {
    const readmePath = path.join(workspacePath, 'README.md');
    const uri = vscode.Uri.file(readmePath);
    try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, {
            preview: false,
            viewColumn: vscode.ViewColumn.Active
        });
    }
    catch (e) {
        // File might not exist
    }
}
/**
 * Prompt user for action when README exists
 */
async function promptForExistingReadme() {
    const choice = await vscode.window.showWarningMessage('README.md already exists. What would you like to do?', { modal: true }, 'Compare (Diff View)', 'Overwrite', 'Cancel');
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
async function cleanupTempFiles(workspacePath) {
    const tempDir = path.join(workspacePath, '.readme-generator', 'temp');
    try {
        const files = await fs.promises.readdir(tempDir);
        for (const file of files) {
            await fs.promises.unlink(path.join(tempDir, file));
        }
    }
    catch {
        // Directory might not exist
    }
}
//# sourceMappingURL=diffHelper.js.map