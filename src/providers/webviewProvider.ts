/**
 * Webview Provider
 * Manages the main webview panel for README generation UI
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectInfo, scanWorkspace, getProjectSummary } from '../analysis/workspaceScanner';
import { detectAll, DetectionResult } from '../analysis/languageDetector';
import { detectProjectType, ProjectTypeResult } from '../analysis/projectTypeDetector';
import { getAllTemplates, getTemplate, ALL_SECTIONS, ReadmeTemplate } from '../templates/templates';
import { generateReadme, getPromptPreview, GenerationOptions } from '../generator/readmeGenerator';
import { buildRefinementPrompt } from '../generator/promptBuilder';
import { ChatMessage, StreamCallback, generateWithStreaming } from '../api/openRouterClient';
import { generateWithGroq, ChatMessage as GroqChatMessage, StreamCallback as GroqStreamCallback } from '../api/groqClient';
import { hasApiKey, getApiKey, hasHuggingFaceApiKey, getApiProvider } from '../utils/secretStorage';
import { saveVersion, getVersions, getVersionContent, rollbackToVersion, ReadmeVersion } from '../history/historyManager';
import { readmeExists, showDiff, saveReadme, getExistingReadme, promptForExistingReadme, openReadme } from '../utils/diffHelper';
import { promptAndExport } from '../utils/fileExporter';

export class WebviewProvider {
    public static readonly viewType = 'ai-readme.webview';
    
    private _panel: vscode.WebviewPanel | undefined;
    private _context: vscode.ExtensionContext;
    private _targetFolder: string | undefined;
    
    // Cached data
    private _projectInfo: ProjectInfo | null = null;
    private _detection: DetectionResult | null = null;
    private _projectType: ProjectTypeResult | null = null;
    private _generatedContent: string = '';
    
    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }
    
    /**
     * Create or show the webview panel
     */
    public async createOrShow(targetFolder?: string): Promise<void> {
        this._targetFolder = targetFolder;
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        
        // If we already have a panel, show it
        if (this._panel) {
            this._panel.reveal(column);
            await this.refreshData();
            return;
        }
        
        // Create new panel
        this._panel = vscode.window.createWebviewPanel(
            WebviewProvider.viewType,
            'AI README Generator',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this._context.extensionPath, 'webview'))
                ]
            }
        );
        
        // Set the HTML content
        this._panel.webview.html = await this.getWebviewContent();
        
        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            this._context.subscriptions
        );
        
        // Handle disposal
        this._panel.onDidDispose(
            () => {
                this._panel = undefined;
            },
            undefined,
            this._context.subscriptions
        );
        
        // Load initial data
        await this.refreshData();
    }
    
    /**
     * Refresh project data
     */
    private async refreshData(): Promise<void> {
        if (!this._panel) return;
        
        // Step 1: Show scanning state
        this._panel.webview.postMessage({
            type: 'loading',
            data: { 
                message: 'Scanning files...',
                step: 1,
                totalSteps: 4
            }
        });
        
        // Scan workspace
        this._projectInfo = await scanWorkspace(this._targetFolder);
        
        if (!this._projectInfo) {
            this._panel.webview.postMessage({
                type: 'error',
                data: { message: 'No workspace folder found. Please open a folder first.' }
            });
            return;
        }
        
        // Step 2: Show detecting languages
        this._panel.webview.postMessage({
            type: 'loading',
            data: { 
                message: 'Detecting languages & frameworks...',
                step: 2,
                totalSteps: 4
            }
        });
        
        // Detect languages, frameworks, etc.
        this._detection = detectAll(this._projectInfo);
        this._projectType = detectProjectType(this._projectInfo, this._detection);
        
        // Step 3: Checking API key
        this._panel.webview.postMessage({
            type: 'loading',
            data: { 
                message: 'Checking API configuration...',
                step: 3,
                totalSteps: 4
            }
        });
        
        // Check API key
        const hasKey = await hasApiKey();
        
        // Step 4: Loading history
        this._panel.webview.postMessage({
            type: 'loading',
            data: { 
                message: 'Loading history...',
                step: 4,
                totalSteps: 4
            }
        });
        
        // Get history
        const versions = await getVersions(this._projectInfo.rootPath);
        
        // Send data to webview
        this._panel.webview.postMessage({
            type: 'init',
            data: {
                hasApiKey: hasKey,
                project: {
                    name: this._projectInfo.name,
                    path: this._projectInfo.rootPath,
                    hasReadme: this._projectInfo.hasReadme,
                    totalFiles: this._projectInfo.totalFiles
                },
                detection: {
                    languages: this._detection.languages,
                    frameworks: this._detection.frameworks,
                    packageManager: this._detection.packageManager,
                    buildTools: this._detection.buildTools,
                    testFrameworks: this._detection.testFrameworks
                },
                projectType: {
                    type: this._projectType.type,
                    displayName: this._projectType.displayName,
                    confidence: this._projectType.confidence
                },
                templates: getAllTemplates().map(t => ({
                    id: t.id,
                    name: t.name,
                    description: t.description,
                    icon: t.icon
                })),
                sections: ALL_SECTIONS,
                history: versions.map(v => ({
                    id: v.id,
                    date: v.date,
                    preview: v.preview
                }))
            }
        });
    }
    
    /**
     * Handle messages from webview
     */
    private async handleMessage(message: any): Promise<void> {
        switch (message.type) {
            case 'generate':
                await this.handleGenerate(message.data);
                break;
            
            case 'previewPrompt':
                await this.handlePreviewPrompt(message.data);
                break;
            
            case 'save':
                await this.handleSave(message.data);
                break;
            
            case 'export':
                await this.handleExport();
                break;
            
            case 'showDiff':
                await this.handleShowDiff();
                break;
            
            case 'loadVersion':
                await this.handleLoadVersion(message.data.versionId);
                break;
            
            case 'rollback':
                await this.handleRollback(message.data.versionId);
                break;
            
            case 'refresh':
                await this.refreshData();
                break;
            
            case 'openSettings':
                vscode.commands.executeCommand('workbench.action.openSettings', 'ai-readme');
                break;
            
            case 'setApiKey':
                vscode.commands.executeCommand('ai-readme.setApiKey');
                break;
            
            case 'refine':
                await this.handleRefine(message.data.instruction, message.data.currentContent);
                break;
            
            case 'saveApiKey':
                const { setHuggingFaceApiKey } = await import('../utils/secretStorage');
                await setHuggingFaceApiKey(message.data.apiKey);
                vscode.window.showInformationMessage('✅ API Key saved successfully!');
                break;
        }
    }
    
    /**
     * Handle generate README
     */
    private async handleGenerate(options: GenerationOptions): Promise<void> {
        if (!this._panel || !this._projectInfo || !this._detection || !this._projectType) {
            return;
        }
        
        // Check if API key is set
        const hasKey = await hasHuggingFaceApiKey();
        if (!hasKey) {
            this._panel.webview.postMessage({
                type: 'error',
                data: { 
                    message: '🔑 API Key Required!\n\nTo generate a README, please set your Groq API key first.\n\n📍 Look for the "🔑 API Key" section in the sidebar\n🆓 Get your free API key at console.groq.com\n\nOnce you save your API key, click Generate again!' 
                }
            });
            return;
        }
        
        // Clear previous content
        this._generatedContent = '';
        
        // Show generating state
        this._panel.webview.postMessage({
            type: 'generating',
            data: { message: 'Generating README...' }
        });
        
        // Generate README with streaming
        await generateReadme(
            this._projectInfo,
            this._detection,
            this._projectType,
            options,
            // onToken
            (token) => {
                this._generatedContent += token;
                this._panel?.webview.postMessage({
                    type: 'token',
                    data: { token }
                });
            },
            // onComplete
            async (content) => {
                this._generatedContent = content;
                this._panel?.webview.postMessage({
                    type: 'generated',
                    data: { content }
                });
                
                // Save to history
                if (this._projectInfo) {
                    await saveVersion(this._projectInfo.rootPath, content);
                    const versions = await getVersions(this._projectInfo.rootPath);
                    this._panel?.webview.postMessage({
                        type: 'historyUpdated',
                        data: {
                            history: versions.map(v => ({
                                id: v.id,
                                date: v.date,
                                preview: v.preview
                            }))
                        }
                    });
                }
            },
            // onError
            (error) => {
                this._panel?.webview.postMessage({
                    type: 'error',
                    data: { message: error.message }
                });
            }
        );
    }
    
    /**
     * Handle refine README with natural language instructions
     */
    private async handleRefine(instruction: string, currentContent: string): Promise<void> {
        if (!this._panel) {
            return;
        }
        
        // Show generating state with refining message
        this._panel.webview.postMessage({
            type: 'generating',
            data: { message: '✨ Refining README' }
        });
        
        // Build refinement prompt
        const { systemPrompt, userPrompt } = buildRefinementPrompt(instruction, currentContent);
        
        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];
        
        // Clear previous content
        this._generatedContent = '';
        
        // Check which API to use
        const hasGroqKey = await hasHuggingFaceApiKey();
        const hasOrKey = await hasApiKey();
        const provider = await getApiProvider();
        const useGroq = hasGroqKey && (provider === 'huggingface' || !hasOrKey);
        
        const callbacks: StreamCallback = {
            onToken: (token: string) => {
                this._generatedContent += token;
                this._panel?.webview.postMessage({
                    type: 'token',
                    data: { token }
                });
            },
            onComplete: async (content: string) => {
                this._generatedContent = content;
                this._panel?.webview.postMessage({
                    type: 'generated',
                    data: { content }
                });
                
                // Save to history
                if (this._projectInfo) {
                    await saveVersion(this._projectInfo.rootPath, content);
                    const versions = await getVersions(this._projectInfo.rootPath);
                    this._panel?.webview.postMessage({
                        type: 'historyUpdated',
                        data: {
                            history: versions.map(v => ({
                                id: v.id,
                                date: v.date,
                                preview: v.preview
                            }))
                        }
                    });
                }
            },
            onError: (error: Error) => {
                this._panel?.webview.postMessage({
                    type: 'error',
                    data: { message: error.message }
                });
            }
        };
        
        try {
            if (useGroq) {
                await generateWithGroq(messages as GroqChatMessage[], callbacks as GroqStreamCallback);
            } else {
                await generateWithStreaming(messages, callbacks);
            }
        } catch (error) {
            this._panel?.webview.postMessage({
                type: 'error',
                data: { message: error instanceof Error ? error.message : String(error) }
            });
        }
    }
    
    /**
     * Handle prompt preview
     */
    private async handlePreviewPrompt(options: GenerationOptions): Promise<void> {
        if (!this._panel || !this._projectInfo || !this._detection || !this._projectType) {
            return;
        }
        
        const prompt = getPromptPreview(
            this._projectInfo,
            this._detection,
            this._projectType,
            options
        );
        
        this._panel.webview.postMessage({
            type: 'promptPreview',
            data: { prompt }
        });
    }
    
    /**
     * Handle save README
     */
    private async handleSave(data: { content: string }): Promise<void> {
        if (!this._projectInfo) return;
        
        const content = data.content || this._generatedContent;
        if (!content) {
            vscode.window.showWarningMessage('No content to save. Generate a README first.');
            return;
        }
        
        // Check if README exists
        const exists = await readmeExists(this._projectInfo.rootPath);
        
        if (exists) {
            const action = await promptForExistingReadme();
            
            switch (action) {
                case 'diff':
                    await showDiff(this._projectInfo.rootPath, content);
                    return;
                case 'cancel':
                    return;
                case 'overwrite':
                    // Continue to save
                    break;
            }
        }
        
        const saved = await saveReadme(this._projectInfo.rootPath, content);
        
        if (saved) {
            vscode.window.showInformationMessage('README.md saved successfully!');
            await openReadme(this._projectInfo.rootPath);
            
            // Refresh data to update hasReadme
            await this.refreshData();
        } else {
            vscode.window.showErrorMessage('Failed to save README.md');
        }
    }
    
    /**
     * Handle show diff
     */
    private async handleShowDiff(): Promise<void> {
        if (!this._projectInfo || !this._generatedContent) return;
        
        const existing = await getExistingReadme(this._projectInfo.rootPath);
        await showDiff(this._projectInfo.rootPath, this._generatedContent, existing || undefined);
    }
    
    /**
     * Handle export
     */
    private async handleExport(): Promise<void> {
        if (!this._projectInfo) return;
        
        const content = this._generatedContent;
        if (!content) {
            vscode.window.showWarningMessage('No content to export. Generate a README first.');
            return;
        }
        
        await promptAndExport(content, this._projectInfo.rootPath);
    }
    
    /**
     * Handle load version
     */
    private async handleLoadVersion(versionId: string): Promise<void> {
        if (!this._projectInfo || !this._panel) return;
        
        const content = await getVersionContent(this._projectInfo.rootPath, versionId);
        
        if (content) {
            this._generatedContent = content;
            this._panel.webview.postMessage({
                type: 'generated',
                data: { content }
            });
        }
    }
    
    /**
     * Handle rollback
     */
    private async handleRollback(versionId: string): Promise<void> {
        if (!this._projectInfo) return;
        
        const confirm = await vscode.window.showWarningMessage(
            'Are you sure you want to restore this version? This will overwrite the current README.md.',
            { modal: true },
            'Restore'
        );
        
        if (confirm !== 'Restore') return;
        
        const success = await rollbackToVersion(this._projectInfo.rootPath, versionId);
        
        if (success) {
            vscode.window.showInformationMessage('README.md restored successfully!');
            await openReadme(this._projectInfo.rootPath);
            await this.refreshData();
        } else {
            vscode.window.showErrorMessage('Failed to restore version.');
        }
    }
    
    /**
     * Get the webview HTML content
     */
    private async getWebviewContent(): Promise<string> {
        const webviewPath = path.join(this._context.extensionPath, 'webview');
        
        // Try to load external files
        let html: string;
        let css: string;
        let js: string;
        
        try {
            html = await fs.promises.readFile(path.join(webviewPath, 'index.html'), 'utf-8');
            css = await fs.promises.readFile(path.join(webviewPath, 'styles.css'), 'utf-8');
            js = await fs.promises.readFile(path.join(webviewPath, 'main.js'), 'utf-8');
        } catch {
            // Return inline HTML if files don't exist
            return this.getInlineWebviewContent();
        }
        
        // Replace placeholders
        html = html.replace('/* STYLES */', css);
        html = html.replace('/* SCRIPT */', js);
        
        return html;
    }
    
    /**
     * Get inline webview content (fallback)
     */
    private getInlineWebviewContent(): string {
        return getWebviewHtml();
    }
}

/**
 * Get the full webview HTML
 */
function getWebviewHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI README Generator</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-editor-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
            --border-radius: 6px;
            --spacing-sm: 8px;
            --spacing-md: 16px;
            --spacing-lg: 24px;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: var(--spacing-lg);
            line-height: 1.5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--spacing-lg);
            padding-bottom: var(--spacing-md);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        h1 {
            font-size: 1.5rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .header-actions {
            display: flex;
            gap: var(--spacing-sm);
        }
        
        button {
            font-family: inherit;
            font-size: 13px;
            padding: 6px 14px;
            border-radius: var(--border-radius);
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-icon {
            padding: 6px;
            background: transparent;
            color: var(--vscode-foreground);
        }
        
        .btn-icon:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .main-grid {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: var(--spacing-lg);
            min-height: calc(100vh - 150px);
        }
        
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
        }
        
        .panel {
            background: var(--vscode-sideBar-background);
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-panel-border);
            overflow: hidden;
        }
        
        .panel-header {
            padding: var(--spacing-sm) var(--spacing-md);
            background: var(--vscode-sideBarSectionHeader-background);
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .panel-content {
            padding: var(--spacing-md);
        }
        
        .project-info {
            display: grid;
            gap: var(--spacing-sm);
        }
        
        .info-row {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .info-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            min-width: 100px;
        }
        
        .info-value {
            font-size: 13px;
            font-weight: 500;
        }
        
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 500;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        
        .templates-grid {
            display: grid;
            gap: var(--spacing-sm);
        }
        
        .template-card {
            padding: var(--spacing-sm) var(--spacing-md);
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-panel-border);
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .template-card:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .template-card.selected {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-activeSelectionBackground);
        }
        
        .template-icon {
            font-size: 1.2rem;
        }
        
        .template-info {
            flex: 1;
        }
        
        .template-name {
            font-weight: 500;
            font-size: 13px;
        }
        
        .template-desc {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        
        .sections-list {
            display: grid;
            gap: 4px;
            max-height: 200px;
            overflow-y: auto;
        }
        
        .section-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            padding: 4px 0;
        }
        
        .section-item input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        
        .section-name {
            font-size: 13px;
            flex: 1;
        }
        
        .options-grid {
            display: grid;
            gap: var(--spacing-md);
        }
        
        .option-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .option-label {
            font-size: 12px;
            font-weight: 500;
        }
        
        select {
            font-family: inherit;
            font-size: 13px;
            padding: 6px 10px;
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            cursor: pointer;
        }
        
        select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .preview-panel {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        
        .preview-content {
            flex: 1;
            overflow: auto;
            padding: var(--spacing-md);
            background: var(--vscode-editor-background);
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-panel-border);
            font-family: var(--vscode-editor-font-family);
            font-size: 14px;
            line-height: 1.6;
        }
        
        .preview-content h1 { font-size: 1.8em; margin: 0.5em 0; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.3em; }
        .preview-content h2 { font-size: 1.4em; margin: 1em 0 0.5em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.3em; }
        .preview-content h3 { font-size: 1.2em; margin: 1em 0 0.5em; }
        .preview-content p { margin: 0.5em 0; }
        .preview-content ul, .preview-content ol { margin: 0.5em 0; padding-left: 2em; }
        .preview-content li { margin: 0.25em 0; }
        .preview-content code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
        .preview-content pre { background: var(--vscode-textCodeBlock-background); padding: 1em; border-radius: 6px; overflow-x: auto; margin: 0.5em 0; }
        .preview-content pre code { background: none; padding: 0; }
        .preview-content img { max-width: 100%; height: auto; }
        .preview-content a { color: var(--vscode-textLink-foreground); }
        
        .preview-actions {
            display: flex;
            gap: var(--spacing-sm);
            padding: var(--spacing-md) 0;
            flex-wrap: wrap;
        }
        
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-lg);
            gap: var(--spacing-md);
            color: var(--vscode-descriptionForeground);
        }
        
        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--vscode-panel-border);
            border-top-color: var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .success-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #059669);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: successPop 0.5s ease-out;
        }
        
        .success-icon::after {
            content: '';
            width: 24px;
            height: 24px;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: center;
        }
        
        @keyframes successPop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .ready-message {
            text-align: center;
            animation: fadeInUp 0.5s ease-out 0.3s both;
        }
        
        .ready-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
        }
        
        .ready-subtitle {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
        
        .ready-hint {
            margin-top: 16px;
            padding: 12px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 6px;
            font-size: 13px;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        /* Jumping dots animation */
        .jumping-dots {
            display: inline-flex;
            gap: 4px;
            margin-left: 4px;
        }
        
        .jumping-dots .dot {
            width: 8px;
            height: 8px;
            background: var(--vscode-button-background);
            border-radius: 50%;
            animation: jumpingDot 1.4s ease-in-out infinite;
        }
        
        .jumping-dots .dot:nth-child(1) {
            animation-delay: 0s;
        }
        
        .jumping-dots .dot:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .jumping-dots .dot:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes jumpingDot {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-12px);
            }
        }
        
        .btn-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 0.8s linear infinite;
            margin-right: 6px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .btn-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .generating-text {
            font-size: 16px;
            font-weight: 500;
            color: var(--vscode-foreground);
            display: flex;
            align-items: baseline;
        }
        
        .generating-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 20px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-inputValidation-errorForeground);
            padding: var(--spacing-md);
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-md);
        }
        
        .warning {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: var(--spacing-md);
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-md);
        }
        
        .api-key-notice {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: var(--spacing-md);
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-md);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--spacing-md);
        }
        
        .history-list {
            max-height: 150px;
            overflow-y: auto;
        }
        
        .history-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            padding: 6px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            cursor: pointer;
        }
        
        .history-item:last-child {
            border-bottom: none;
        }
        
        .history-item:hover {
            background: var(--vscode-list-hoverBackground);
            margin: 0 calc(-1 * var(--spacing-md));
            padding: 6px var(--spacing-md);
        }
        
        .history-date {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            min-width: 120px;
        }
        
        .history-preview {
            font-size: 12px;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 400px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            gap: var(--spacing-md);
        }
        
        .placeholder-icon {
            font-size: 3rem;
            opacity: 0.5;
        }
        
        textarea {
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            padding: var(--spacing-sm);
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            resize: vertical;
            width: 100%;
            min-height: 100px;
        }
        
        textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .prompt-preview {
            background: var(--vscode-textCodeBlock-background);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            max-height: 300px;
            overflow-y: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            white-space: pre-wrap;
            margin-top: var(--spacing-sm);
        }
        
        .privacy-notice {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            padding: var(--spacing-sm);
            text-align: center;
            border-top: 1px solid var(--vscode-panel-border);
            margin-top: var(--spacing-md);
        }
        
        .checkbox-row {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            font-size: 13px;
        }
        
        .badges-gallery {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .badge-category {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .badge-category-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .badge-btn {
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 500;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: transform 0.15s, opacity 0.15s;
        }
        
        .badge-btn:hover {
            transform: scale(1.05);
            opacity: 0.9;
        }
        
        .badge-btn.selected {
            box-shadow: 0 0 0 2px var(--vscode-focusBorder);
        }
        
        .selected-badges {
            margin-top: 8px;
            padding: 8px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-family: monospace;
            font-size: 10px;
            word-break: break-all;
            max-height: 60px;
            overflow-y: auto;
            display: none;
        }
        
        .selected-badges.has-badges {
            display: block;
        }
        
        @media (max-width: 900px) {
            .main-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="17" cy="5" r="3" fill="currentColor" stroke="none"/>
                </svg>
                AI README Generator
            </h1>
            <div class="header-actions">
                <button class="btn-secondary" onclick="refreshData()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M1 20v-6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Refresh
                </button>
                <button class="btn-icon" onclick="openSettings()" title="Settings">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </header>
        
        <div id="api-key-notice" class="api-key-notice" style="display: none;">
            <span>⚠️ API key not configured. Set your Groq API key to use AI generation.</span>
            <button class="btn-primary" onclick="setApiKey()">Set API Key</button>
        </div>
        
        <div id="error-container"></div>
        
        <div class="main-grid">
            <div class="sidebar">
                <!-- Project Info Panel -->
                <div class="panel">
                    <div class="panel-header">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Project
                        </span>
                    </div>
                    <div class="panel-content">
                        <div class="project-info" id="project-info">
                            <div class="loading">
                                <div class="spinner"></div>
                                <span>Analyzing workspace...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Template Selection -->
                <div class="panel">
                    <div class="panel-header">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="9" y1="21" x2="9" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Template
                        </span>
                    </div>
                    <div class="panel-content">
                        <div class="templates-grid" id="templates-grid"></div>
                    </div>
                </div>
                
                <!-- Sections -->
                <div class="panel">
                    <div class="panel-header">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Sections
                        </span>
                        <button class="btn-icon" onclick="toggleAllSections()" title="Toggle All">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6 7 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="m22 10-7.5 7.5L13 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="panel-content">
                        <div class="sections-list" id="sections-list"></div>
                    </div>
                </div>
                
                <!-- Options -->
                <div class="panel">
                    <div class="panel-header">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Options
                        </span>
                    </div>
                    <div class="panel-content">
                        <div class="options-grid">
                            <div class="option-group">
                                <label class="option-label">Language</label>
                                <select id="language-select">
                                    <option value="english">English</option>
                                    <option value="simpleEnglish">Simple English</option>
                                    <option value="spanish">Spanish</option>
                                    <option value="french">French</option>
                                    <option value="german">German</option>
                                    <option value="chinese">Chinese</option>
                                    <option value="japanese">Japanese</option>
                                    <option value="hindi">Hindi</option>
                                </select>
                            </div>
                            <div class="option-group">
                                <label class="option-label">Tone</label>
                                <select id="tone-select">
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="technical">Technical</option>
                                </select>
                            </div>
                            <div class="checkbox-row">
                                <input type="checkbox" id="include-badges" checked>
                                <label for="include-badges">Include Badges</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- History -->
                <div class="panel">
                    <div class="panel-header">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            History
                        </span>
                    </div>
                    <div class="panel-content">
                        <div class="history-list" id="history-list">
                            <div style="color: var(--vscode-descriptionForeground); font-size: 12px;">No history yet</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Preview Panel -->
            <div class="panel preview-panel">
                <div class="panel-header">
                    <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Preview
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-secondary" onclick="previewPrompt()">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Preview Prompt
                        </button>
                        <button class="btn-secondary" onclick="toggleRefine()" id="refine-toggle-btn" style="display: none;">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Refine
                        </button>
                        <button class="btn-primary" onclick="generate()" id="generate-btn">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="currentColor"/>
                            </svg>
                            Generate
                        </button>
                    </div>
                </div>
                <div class="panel-content" style="flex: 1; display: flex; flex-direction: column;">
                    <div class="refine-section" id="refine-section" style="display: none; padding: 12px; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBarSectionHeader-background);">
                        <div style="margin-bottom: 8px; font-weight: 600; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Refine README
                            </span>
                            <button class="btn-icon" onclick="toggleRefine()" title="Close">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="text" id="refine-input" placeholder="Tell AI what to change... e.g. 'Add more details to installation', 'Fix the project structure'" style="flex: 1; padding: 10px 14px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 6px; font-size: 13px;">
                            <button class="btn-primary" onclick="refineReadme()" id="refine-btn" style="padding: 10px 16px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Apply
                            </button>
                        </div>
                        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 8px;">
                            💡 Examples: "Rewrite features section", "Add architecture diagram", "Make it shorter", "Add more emojis", "Fix installation steps"
                        </div>
                    </div>
                    <div class="preview-content" id="preview-content" style="flex: 1; overflow: auto;">
                        <div class="placeholder">
                            <div class="placeholder-icon">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div>
                                <h3>Ready to Generate</h3>
                                <p>Select a template and click "Generate" to create your README</p>
                            </div>
                        </div>
                    </div>
                    <div class="preview-actions" id="preview-actions" style="display: none;">
                        <button class="btn-secondary" onclick="toggleRefine()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Refine
                        </button>
                        <button class="btn-primary" onclick="saveReadme()">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="7 3 7 8 15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Save README.md
                        </button>
                        <button class="btn-secondary" onclick="showDiff()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Compare
                        </button>
                        <button class="btn-secondary" onclick="exportReadme()">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Export
                        </button>
                    </div>
                </div>
                <div class="privacy-notice">
                    <span style="display: inline-flex; vertical-align: middle; margin-right: 4px; color: #FFD700;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C9.243 2 7 4.243 7 7V10H6C4.897 10 4 10.897 4 12V20C4 21.103 4.897 22 6 22H18C19.103 22 20 21.103 20 20V12C20 10.897 19.103 10 18 10H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V10H9V7C9 5.346 10.346 4 12 4Z" />
                        </svg>
                    </span>
                    Privacy: No telemetry • No external data storage • Your code stays local
                </div>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // State
        let state = {
            hasApiKey: false,
            project: null,
            detection: null,
            projectType: null,
            templates: [],
            sections: [],
            history: [],
            selectedTemplate: 'openSource',
            enabledSections: [],
            generatedContent: '',
            selectedBadges: []
        };
        
        // Initialize
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'init':
                    handleInit(message.data);
                    break;
                case 'loading':
                    showLoading(message.data.message, message.data.step, message.data.totalSteps);
                    break;
                case 'generating':
                    showGenerating(message.data?.message);
                    break;
                case 'token':
                    appendToken(message.data.token);
                    break;
                case 'generated':
                    showGenerated(message.data.content);
                    break;
                case 'error':
                    showError(message.data.message);
                    break;
                case 'promptPreview':
                    showPromptPreview(message.data.prompt);
                    break;
                case 'historyUpdated':
                    renderHistory(message.data.history);
                    break;
            }
        });
        
        function handleInit(data) {
            state = { ...state, ...data };
            
            // Show/hide API key notice
            document.getElementById('api-key-notice').style.display = 
                data.hasApiKey ? 'none' : 'flex';
            
            // Render project info
            renderProjectInfo(data);
            
            // Render templates
            renderTemplates(data.templates);
            
            // Set default enabled sections based on template
            const template = data.templates.find(t => t.id === state.selectedTemplate);
            state.enabledSections = state.sections
                .filter(s => s.defaultEnabled)
                .map(s => s.id);
            
            // Render sections
            renderSections(data.sections);
            
            // Render history
            renderHistory(data.history);
            
            // Show ready state in preview panel
            showReadyState(data);
        }
        
        function showReadyState(data) {
            const container = document.getElementById('preview-content');
            const fileCount = data.project.totalFiles || 0;
            const languages = data.detection.languages.map(l => l.name).slice(0, 2).join(', ');
            
            container.innerHTML = \`
                <div class="loading">
                    <div class="success-icon"></div>
                    <div class="ready-message">
                        <div class="ready-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px; color: #10b981;" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="currentColor"/>
                            </svg>
                            Analysis Complete!
                        </div>
                        <div class="ready-subtitle">
                            Found \${fileCount} files\${languages ? ' with ' + languages : ''}
                        </div>
                        <div class="ready-hint">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M18.13 21.01a2 2 0 0 1-2.12-.03L12.3 18.5a7.68 7.68 0 0 0-3.6-1.5 5.59 5.59 0 0 1-5.18-4.78 5.6 5.6 0 0 1 5.48-6.19c1.94 0 3.7.86 4.8 2.3l.53.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Click "Generate" to create your README
                        </div>
                    </div>
                </div>
            \`;
            
            // Hide action buttons on refresh/init - only show after generate
            document.getElementById('preview-actions').style.display = 'none';
            document.getElementById('refine-section').style.display = 'none';
            document.getElementById('refine-toggle-btn').style.display = 'none';
            // Reset button text on refresh
            document.getElementById('generate-btn').textContent = '✨ Generate';
        }
        
        function renderProjectInfo(data) {
            const container = document.getElementById('project-info');
            container.innerHTML = \`
                <div class="info-row">
                    <span class="info-label">Name</span>
                    <span class="info-value">\${data.project.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Type</span>
                    <span class="badge">\${data.projectType.displayName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Languages</span>
                    <span class="info-value">\${data.detection.languages.map(l => l.name).join(', ') || 'None detected'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Frameworks</span>
                    <span class="info-value">\${data.detection.frameworks.map(f => f.name).join(', ') || 'None detected'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Files</span>
                    <span class="info-value">\${data.project.totalFiles} files</span>
                </div>
                \${data.project.hasReadme ? '<div class="info-row"><span class="badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align: text-bottom; margin-right: 4px;" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> README exists</span></div>' : ''}
            \`;
        }
        
        function renderTemplates(templates) {
            const container = document.getElementById('templates-grid');
            container.innerHTML = templates.map(t => \`
                <div class="template-card \${t.id === state.selectedTemplate ? 'selected' : ''}" 
                     onclick="selectTemplate('\${t.id}')">
                    <span class="template-icon">\${t.icon}</span>
                    <div class="template-info">
                        <div class="template-name">\${t.name}</div>
                        <div class="template-desc">\${t.description}</div>
                    </div>
                </div>
            \`).join('');
        }
        
        function selectTemplate(templateId) {
            state.selectedTemplate = templateId;
            renderTemplates(state.templates);
        }
        
        function renderSections(sections) {
            const container = document.getElementById('sections-list');
            container.innerHTML = sections.map(s => \`
                <div class="section-item">
                    <input type="checkbox" id="section-\${s.id}" 
                           \${state.enabledSections.includes(s.id) ? 'checked' : ''}
                           onchange="toggleSection('\${s.id}')">
                    <label class="section-name" for="section-\${s.id}">\${s.name}</label>
                </div>
            \`).join('');
        }
        
        function toggleSection(sectionId) {
            const index = state.enabledSections.indexOf(sectionId);
            if (index > -1) {
                state.enabledSections.splice(index, 1);
            } else {
                state.enabledSections.push(sectionId);
            }
        }
        
        function toggleAllSections() {
            if (state.enabledSections.length === state.sections.length) {
                state.enabledSections = [];
            } else {
                state.enabledSections = state.sections.map(s => s.id);
            }
            renderSections(state.sections);
        }
        
        function renderHistory(history) {
            const container = document.getElementById('history-list');
            if (!history || history.length === 0) {
                container.innerHTML = '<div style="color: var(--vscode-descriptionForeground); font-size: 12px;">No history yet</div>';
                return;
            }
            
            container.innerHTML = history.slice(0, 10).map(h => \`
                <div class="history-item" onclick="loadVersion('\${h.id}')">
                    <span class="history-date">\${h.date}</span>
                    <span class="history-preview">\${h.preview}</span>
                </div>
            \`).join('');
        }
        
        function getOptions() {
            return {
                templateId: state.selectedTemplate,
                enabledSections: state.enabledSections,
                language: document.getElementById('language-select').value,
                tone: document.getElementById('tone-select').value,
                includeBadges: document.getElementById('include-badges').checked,
                customBadges: state.selectedBadges.map(b => b.markdown).join(' ')
            };
        }
        
        function generate() {
            vscode.postMessage({
                type: 'generate',
                data: getOptions()
            });
        }
        
        let isPreviewOpen = false;

        function previewPrompt() {
            if (isPreviewOpen) {
                // Close preview - restore generated content or empty state
                if (state.generatedContent) {
                    showGenerated(state.generatedContent);
                } else {
                    // Show ready state or default placeholder
                    showReadyState({
                        project: state.project,
                        detection: state.detection,
                        projectType: state.projectType
                    });
                }
                isPreviewOpen = false;
            } else {
                vscode.postMessage({
                    type: 'previewPrompt',
                    data: getOptions()
                });
            }
        }
        
        function showGenerating(message) {
            const displayMessage = message || 'Generating README';
            const container = document.getElementById('preview-content');
            container.innerHTML = \`
                <div class="generating-container">
                    <div class="spinner"></div>
                    <div class="generating-text">
                        \${displayMessage}
                        <span class="jumping-dots">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </span>
                    </div>
                </div>
            \`;
            document.getElementById('preview-actions').style.display = 'none';
            document.getElementById('refine-section').style.display = 'none';
            document.getElementById('refine-toggle-btn').style.display = 'none';
            
            // Disable generate button and show loading state
            const generateBtn = document.getElementById('generate-btn');
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="btn-spinner"></span> Processing...';
        }
        
        function appendToken(token) {
            const container = document.getElementById('preview-content');
            if (container.querySelector('.loading')) {
                container.innerHTML = '';
            }
            state.generatedContent += token;
            container.innerHTML = renderMarkdown(state.generatedContent);
        }
        
        function showGenerated(content) {
            state.generatedContent = content;
            const container = document.getElementById('preview-content');
            container.innerHTML = renderMarkdown(content);
            document.getElementById('preview-actions').style.display = 'flex';
            document.getElementById('refine-toggle-btn').style.display = 'inline-flex';
            // Don't auto-show refine - user clicks button to open it
            document.getElementById('refine-section').style.display = 'none';
            // Re-enable and change button to Regenerate after first generation
            const generateBtn = document.getElementById('generate-btn');
            generateBtn.disabled = false;
            generateBtn.textContent = '🔄 Regenerate';
        }
        
        function showPromptPreview(prompt) {
            isPreviewOpen = true;
            const container = document.getElementById('preview-content');
            container.innerHTML = \`
                <h3>📝 Prompt Preview</h3>
                <p style="color: var(--vscode-descriptionForeground);">This is the prompt that will be sent to the AI:</p>
                <div class="prompt-preview">\${escapeHtml(prompt)}</div>
            \`;
            
            // Allow closing by refining or generating
            document.getElementById('preview-actions').style.display = 'none';
        }
        
        function showLoading(message, step, totalSteps) {
            const container = document.getElementById('preview-content');
            const projectInfo = document.getElementById('project-info');
            
            // Calculate progress percentage
            const progress = step && totalSteps ? Math.round((step / totalSteps) * 100) : 0;
            
            // Show in preview content with progress bar
            container.innerHTML = \`
                <div class="loading">
                    <div class="spinner"></div>
                    <span>\${message}</span>
                    \${step && totalSteps ? \`
                        <div style="width: 200px; margin-top: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">Step \${step} of \${totalSteps}</span>
                                <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">\${progress}%</span>
                            </div>
                            <div style="height: 4px; background: var(--vscode-panel-border); border-radius: 2px; overflow: hidden;">
                                <div style="height: 100%; width: \${progress}%; background: var(--vscode-button-background); transition: width 0.3s ease;"></div>
                            </div>
                        </div>
                    \` : ''}
                </div>
            \`;
            
            // Also update project info panel with progress
            if (projectInfo) {
                projectInfo.innerHTML = \`
                    <div class="loading" style="padding: 8px 0;">
                        <div class="spinner" style="width: 20px; height: 20px;"></div>
                        <span style="font-size: 12px;">\${message}</span>
                        \${step && totalSteps ? \`<span style="font-size: 11px; color: var(--vscode-descriptionForeground);">(\${step}/\${totalSteps})</span>\` : ''}
                    </div>
                \`;
            }
        }
        
        function showError(message) {
            // Check if this is a multi-line important message (like API key warning)
            if (message.includes('\\n')) {
                const container = document.getElementById('preview-content');
                const lines = message.split('\\n').filter(l => l.trim());
                const title = lines[0];
                const body = lines.slice(1).join('<br>');
                
                container.innerHTML = \`
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🔑</div>
                        <h2 style="margin-bottom: 16px; color: var(--vscode-errorForeground);">\${title}</h2>
                        <div style="max-width: 400px; line-height: 1.8; color: var(--vscode-descriptionForeground); font-size: 14px;">
                            \${body}
                        </div>
                        <a href="https://console.groq.com" target="_blank" style="margin-top: 20px; padding: 10px 20px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border-radius: 6px; text-decoration: none; font-weight: 500;">
                            🆓 Get Free API Key
                        </a>
                    </div>
                \`;
            } else {
                // Simple error message - show in error container briefly
                const container = document.getElementById('error-container');
                container.innerHTML = \`<div class="error">❌ \${message}</div>\`;
                setTimeout(() => container.innerHTML = '', 5000);
            }
        }
        
        function saveReadme() {
            vscode.postMessage({
                type: 'save',
                data: { content: state.generatedContent }
            });
        }
        
        function showDiff() {
            vscode.postMessage({ type: 'showDiff' });
        }
        
        function exportReadme() {
            vscode.postMessage({ type: 'export' });
        }
        
        function loadVersion(versionId) {
            vscode.postMessage({
                type: 'loadVersion',
                data: { versionId }
            });
        }
        
        function refreshData() {
            vscode.postMessage({ type: 'refresh' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function setApiKey() {
            vscode.postMessage({ type: 'setApiKey' });
        }
        
        function refineReadme() {
            const input = document.getElementById('refine-input');
            const instruction = input.value.trim();
            
            if (!instruction) {
                showError('Please enter an instruction (e.g., "Rewrite the installation section")');
                return;
            }
            
            if (!state.generatedContent) {
                showError('No README content to refine. Generate one first.');
                return;
            }
            
            // Clear input
            input.value = '';
            
            // Send refine message
            vscode.postMessage({
                type: 'refine',
                data: {
                    instruction: instruction,
                    currentContent: state.generatedContent
                }
            });
            
            // Hide refine section after sending
            document.getElementById('refine-section').style.display = 'none';
        }
        
        function toggleRefine() {
            const refineSection = document.getElementById('refine-section');
            if (refineSection.style.display === 'none') {
                refineSection.style.display = 'block';
                document.getElementById('refine-input').focus();
            } else {
                refineSection.style.display = 'none';
            }
        }
        
        function insertBadge(name, color, logo) {
            const logoParam = logo ? '&logo=' + logo : '';
            const badgeMarkdown = '![' + name + '](https://img.shields.io/badge/' + name + '-' + color + '?style=flat-square' + logoParam + ')';
            
            // Toggle badge selection
            const index = state.selectedBadges.findIndex(b => b.name === name);
            if (index > -1) {
                state.selectedBadges.splice(index, 1);
            } else {
                state.selectedBadges.push({ name, markdown: badgeMarkdown });
            }
            
            // Update UI
            updateBadgesDisplay();
            
            // Toggle button selected state
            const buttons = document.querySelectorAll('.badge-btn');
            buttons.forEach(btn => {
                if (btn.textContent === name || btn.textContent === name.split('-')[0]) {
                    btn.classList.toggle('selected', state.selectedBadges.some(b => b.name === name));
                }
            });
        }
        
        function updateBadgesDisplay() {
            const container = document.getElementById('selected-badges');
            if (state.selectedBadges.length > 0) {
                container.classList.add('has-badges');
                container.textContent = state.selectedBadges.map(b => b.markdown).join(' ');
            } else {
                container.classList.remove('has-badges');
                container.textContent = '';
            }
        }
        
        function getSelectedBadgesMarkdown() {
            return state.selectedBadges.map(b => b.markdown).join(' ');
        }
        
        // Simple markdown renderer
        function renderMarkdown(md) {
            if (!md) return '';
            let html = escapeHtml(md);
            
            // Code blocks
            html = html.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, '<pre><code class="language-$1">$2</code></pre>');
            
            // Inline code
            html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            
            // Headers
            html = html.replace(/^######\\s+(.*)$/gm, '<h6>$1</h6>');
            html = html.replace(/^#####\\s+(.*)$/gm, '<h5>$1</h5>');
            html = html.replace(/^####\\s+(.*)$/gm, '<h4>$1</h4>');
            html = html.replace(/^###\\s+(.*)$/gm, '<h3>$1</h3>');
            html = html.replace(/^##\\s+(.*)$/gm, '<h2>$1</h2>');
            html = html.replace(/^#\\s+(.*)$/gm, '<h1>$1</h1>');
            
            // Bold
            html = html.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
            
            // Italic
            html = html.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
            
            // Links
            html = html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
            
            // Images
            html = html.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1" />');
            
            // Lists
            html = html.replace(/^[-*]\\s+(.*)$/gm, '<li>$1</li>');
            
            // Paragraphs
            html = html.replace(/\\n\\n/g, '</p><p>');
            
            return '<p>' + html + '</p>';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
}
