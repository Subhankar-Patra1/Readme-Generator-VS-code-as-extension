"use strict";
/**
 * File Exporter
 * Export README to different formats (MD, TXT, PDF)
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
exports.exportAsMarkdown = exportAsMarkdown;
exports.exportAsText = exportAsText;
exports.exportAsPdf = exportAsPdf;
exports.promptAndExport = promptAndExport;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Strip markdown formatting for plain text export
 */
function stripMarkdown(content) {
    let text = content;
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, (match) => {
        const lines = match.split('\n').slice(1, -1);
        return lines.join('\n');
    });
    // Remove inline code
    text = text.replace(/`([^`]+)`/g, '$1');
    // Remove headers (keep text)
    text = text.replace(/^#{1,6}\s+(.*)$/gm, '$1');
    // Remove bold/italic
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    // Remove links (keep text)
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image: $1]');
    // Remove badges (shield.io images)
    text = text.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '');
    text = text.replace(/!\[.*?\]\(https:\/\/img\.shields\.io.*?\)/g, '');
    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '---');
    // Clean up extra blank lines
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}
/**
 * Export README as Markdown
 */
async function exportAsMarkdown(content, workspacePath, filename = 'README') {
    const defaultUri = vscode.Uri.file(path.join(workspacePath, `${filename}.md`));
    const uri = await vscode.window.showSaveDialog({
        defaultUri: defaultUri,
        filters: {
            'Markdown': ['md']
        },
        title: 'Export README as Markdown'
    });
    if (!uri)
        return null;
    try {
        await fs.promises.writeFile(uri.fsPath, content, 'utf-8');
        vscode.window.showInformationMessage(`README exported to ${path.basename(uri.fsPath)}`);
        return uri.fsPath;
    }
    catch (e) {
        vscode.window.showErrorMessage(`Failed to export: ${e}`);
        return null;
    }
}
/**
 * Export README as plain text
 */
async function exportAsText(content, workspacePath, filename = 'README') {
    const defaultUri = vscode.Uri.file(path.join(workspacePath, `${filename}.txt`));
    const uri = await vscode.window.showSaveDialog({
        defaultUri: defaultUri,
        filters: {
            'Text': ['txt']
        },
        title: 'Export README as Text'
    });
    if (!uri)
        return null;
    try {
        const plainText = stripMarkdown(content);
        await fs.promises.writeFile(uri.fsPath, plainText, 'utf-8');
        vscode.window.showInformationMessage(`README exported to ${path.basename(uri.fsPath)}`);
        return uri.fsPath;
    }
    catch (e) {
        vscode.window.showErrorMessage(`Failed to export: ${e}`);
        return null;
    }
}
/**
 * Export README as PDF (requires OS-level handling or external tool)
 * This is a simplified implementation that creates an HTML file that can be printed to PDF
 */
async function exportAsPdf(content, workspacePath, filename = 'README') {
    // For PDF export, we'll create an HTML file that the user can print to PDF
    // A full PDF implementation would require additional dependencies like puppeteer
    const defaultUri = vscode.Uri.file(path.join(workspacePath, `${filename}.html`));
    const uri = await vscode.window.showSaveDialog({
        defaultUri: defaultUri,
        filters: {
            'HTML (Print to PDF)': ['html']
        },
        title: 'Export README as HTML (Print to PDF)'
    });
    if (!uri)
        return null;
    try {
        const html = generatePrintableHtml(content);
        await fs.promises.writeFile(uri.fsPath, html, 'utf-8');
        vscode.window.showInformationMessage('README exported as HTML. Open in browser and use Print → Save as PDF.', 'Open File').then(action => {
            if (action === 'Open File') {
                vscode.env.openExternal(uri);
            }
        });
        return uri.fsPath;
    }
    catch (e) {
        vscode.window.showErrorMessage(`Failed to export: ${e}`);
        return null;
    }
}
/**
 * Generate printable HTML with basic markdown rendering
 */
function generatePrintableHtml(markdown) {
    // Basic markdown to HTML conversion
    let html = markdown;
    // Headers
    html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Images (including badges)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    // Lists
    html = html.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>README</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            color: #111;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        code {
            background: #f5f5f5;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
        }
        pre {
            background: #f5f5f5;
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background: none;
            padding: 0;
        }
        a { color: #0066cc; }
        img { max-width: 100%; height: auto; }
        li { margin: 0.25em 0; }
        @media print {
            body { max-width: none; padding: 1cm; }
            a { color: inherit; text-decoration: underline; }
        }
    </style>
</head>
<body>
<p>${html}</p>
</body>
</html>`;
}
/**
 * Prompt user for export format and export
 */
async function promptAndExport(content, workspacePath) {
    const format = await vscode.window.showQuickPick([
        { label: '📄 Markdown (.md)', value: 'md' },
        { label: '📝 Plain Text (.txt)', value: 'txt' },
        { label: '🖨️ HTML (Print to PDF)', value: 'pdf' }
    ], {
        placeHolder: 'Select export format',
        title: 'Export README'
    });
    if (!format)
        return null;
    switch (format.value) {
        case 'md':
            return exportAsMarkdown(content, workspacePath);
        case 'txt':
            return exportAsText(content, workspacePath);
        case 'pdf':
            return exportAsPdf(content, workspacePath);
        default:
            return null;
    }
}
//# sourceMappingURL=fileExporter.js.map