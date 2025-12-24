"use strict";
/**
 * Sidebar Provider
 * Provides the sidebar webview for quick access to README generator features
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
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const workspaceScanner_1 = require("../analysis/workspaceScanner");
const languageDetector_1 = require("../analysis/languageDetector");
const projectTypeDetector_1 = require("../analysis/projectTypeDetector");
const secretStorage_1 = require("../utils/secretStorage");
const historyManager_1 = require("../history/historyManager");
class SidebarProvider {
    constructor(context) {
        this._context = context;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };
        webviewView.webview.html = this.getHtmlContent();
        // Handle messages
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'openGenerator':
                    vscode.commands.executeCommand('ai-readme.generate');
                    break;
                case 'setApiKey':
                    vscode.commands.executeCommand('ai-readme.setApiKey');
                    break;
                case 'viewHistory':
                    vscode.commands.executeCommand('ai-readme.viewHistory');
                    break;
                case 'refresh':
                    await this.refresh();
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'ai-readme');
                    break;
                case 'saveApiKey':
                    await (0, secretStorage_1.setHuggingFaceApiKey)(message.data.apiKey);
                    vscode.window.showInformationMessage('✅ API Key saved successfully!');
                    await this.refresh();
                    break;
            }
        });
        // Initial data load
        this.refresh();
    }
    async refresh() {
        if (!this._view)
            return;
        // Scan workspace
        const projectInfo = await (0, workspaceScanner_1.scanWorkspace)();
        if (!projectInfo) {
            this._view.webview.postMessage({
                type: 'noWorkspace'
            });
            return;
        }
        const detection = (0, languageDetector_1.detectAll)(projectInfo);
        const projectType = (0, projectTypeDetector_1.detectProjectType)(projectInfo, detection);
        const hasKey = await (0, secretStorage_1.hasHuggingFaceApiKey)();
        const versions = await (0, historyManager_1.getVersions)(projectInfo.rootPath);
        this._view.webview.postMessage({
            type: 'update',
            data: {
                hasApiKey: hasKey,
                project: {
                    name: projectInfo.name,
                    hasReadme: projectInfo.hasReadme,
                    totalFiles: projectInfo.totalFiles
                },
                detection: {
                    languages: detection.languages.slice(0, 3),
                    frameworks: detection.frameworks.slice(0, 3),
                    packageManager: detection.packageManager
                },
                projectType: projectType.displayName,
                historyCount: versions.length
            }
        });
    }
    getHtmlContent() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI README Generator</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 12px;
        }
        
        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .header-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            color: var(--vscode-foreground);
        }
        
        .header-icon svg {
            width: 100%;
            height: 100%;
        }
        
        .header-title {
            font-size: 14px;
            font-weight: 600;
        }
        
        .section {
            margin-bottom: 16px;
        }
        
        .section-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-sideBarSectionHeader-foreground);
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .icon-spacer {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-icon-foreground);
        }
        
        .info-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .info-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .info-value {
            font-size: 12px;
            font-weight: 500;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 6px;
        }
        
        .tag {
            font-size: 11px;
            padding: 2px 6px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-radius: 4px;
        }
        
        button {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            border: none;
            border-radius: 4px;
            font-family: inherit;
            font-size: 13px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: background 0.15s;
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
        
        .warning {
            background: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 12px;
            font-size: 12px;
        }
        
        .footer {
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
        }
        
        .no-workspace {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .loading {
            text-align: center;
            padding: 20px;
        }

        /* API Key Section Styles */
        .status-success {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .status-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            background: #4CAF50; /* Green */
            border-radius: 4px;
        }

        .api-input {
            width: 100%;
            padding: 10px;
            margin-bottom: 12px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background); 
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 12px;
            outline: none;
        }

        .api-input:focus {
            border-color: var(--vscode-focusBorder);
        }

        .btn-group {
            display: flex;
            gap: 8px;
        }

        .btn-card {
            flex: 1;
            display: flex;
            align-items: center; /* Center vertically */
            justify-content: center;
            padding: 8px 12px;
            height: 36px; /* Standard button height */
            background: #3B3B4D;
            color: white;
            border: 1px solid transparent;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            gap: 6px; /* Space between icon and text */
        }

        .btn-card:hover {
            background: #4A4A5E;
            transform: translateY(-1px);
        }

        .btn-card:active {
            transform: translateY(0);
        }

        /* Styling for the Reset button */
        .btn-icon-only {
            flex: 0 0 40px; /* Square-ish or fixed width for reset */
            background: #2b303b; 
        }

        .icon-box {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            /* Removed blue background to keep it cleaner, or keep it depending on preference. 
               Let's keep the blue logic but apply it to the SVG primarily or small highlight?
               Actually user said "normal size", usually minimal. 
               Let's remove the .icon-box wrapper styling and just style the button directly or keep it simple.
            */
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 18L10.5 14.5L7 13L10.5 11.5L12 8L13.5 11.5L17 13L13.5 14.5L12 18Z" fill="currentColor" stroke="none"/>
            </svg>
        </div>
        <span class="header-title">AI README Generator</span>
    </div>
    
    <div id="content">
        <div class="loading">Loading...</div>
    </div>
    
    <div class="footer">
        <span style="display: inline-flex; vertical-align: middle; margin-right: 4px; color: #FFD700;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C9.243 2 7 4.243 7 7V10H6C4.897 10 4 10.897 4 12V20C4 21.103 4.897 22 6 22H18C19.103 22 20 21.103 20 20V12C20 10.897 19.103 10 18 10H17V7C17 4.243 14.757 2 12 2ZM12 4C13.654 4 15 5.346 15 7V10H9V7C9 5.346 10.346 4 12 4Z" />
            </svg>
        </span>
        Privacy-first • No telemetry
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Request initial data
        vscode.postMessage({ type: 'refresh' });
        
        window.addEventListener('message', event => {
            const message = event.data;
            const content = document.getElementById('content');
            
            if (message.type === 'noWorkspace') {
                content.innerHTML = \`
                    <div class="no-workspace">
                        <p>📂 No workspace open</p>
                        <p style="margin-top: 8px;">Open a folder to get started</p>
                    </div>
                \`;
                return;
            }
            
            if (message.type === 'update') {
                const data = message.data;
                
                let html = '';
                
                // API Key Warning
                if (!data.hasApiKey) {
                    html += \`
                        <div class="warning">
                            ⚠️ API key not set
                            <button class="btn-secondary" style="margin-top: 8px;" onclick="setApiKey()">Set API Key</button>
                        </div>
                    \`;
                }
                
                // Project Info
                html += \`
                    <div class="section">
                        <div class="section-title">
                            <span class="icon-spacer">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span> 
                            PROJECT
                        </div>
                        <div class="info-card">
                            <div class="info-row">
                                <span class="info-label">Name</span>
                                <span class="info-value">\${data.project.name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Type</span>
                                <span class="badge">\${data.projectType}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Files</span>
                                <span class="info-value">\${data.project.totalFiles}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">README</span>
                                <span class="info-value" style="display: flex; align-items: center; gap: 4px;">
                                    \${data.project.hasReadme ? \`
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                        Exists
                                    \` : \`
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#F44336" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="#F44336" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="#F44336" stroke-width="2" stroke-linecap="round"/></svg>
                                        Missing
                                    \`}
                                </span>
                            </div>
                        </div>
                    </div>
                \`;
                
                // Languages & Frameworks
                if (data.detection.languages.length > 0 || data.detection.frameworks.length > 0) {
                    html += \`
                        <div class="section">
                            <div class="section-title">
                                <span class="icon-spacer">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </span>
                                DETECTED
                            </div>
                            <div class="info-card">
                    \`;
                    
                    if (data.detection.languages.length > 0) {
                        html += \`
                            <div class="info-row">
                                <span class="info-label">Languages</span>
                            </div>
                            <div class="tags">
                                \${data.detection.languages.map(l => \`<span class="tag">\${l.name}</span>\`).join('')}
                            </div>
                        \`;
                    }
                    
                    if (data.detection.frameworks.length > 0) {
                        html += \`
                            <div class="info-row" style="margin-top: 8px;">
                                <span class="info-label">Frameworks</span>
                            </div>
                            <div class="tags">
                                \${data.detection.frameworks.map(f => \`<span class="tag">\${f.name}</span>\`).join('')}
                            </div>
                        \`;
                    }
                    
                    html += \`
                            </div>
                        </div>
                    \`;
                }
                
                // History
                if (data.historyCount > 0) {
                    html += \`
                        <div class="section">
                            <div class="section-title">
                                <span class="icon-spacer">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </span>
                                HISTORY
                            </div>
                            <div class="info-card">
                                <div class="info-row">
                                    <span class="info-label">Saved Versions</span>
                                    <span class="badge">\${data.historyCount}</span>
                                </div>
                            </div>
                        </div>
                    \`;
                }
                
                // API Key Section
                html += \`
                    <div class="section">
                        <div class="section-title">
                            <span class="icon-spacer">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            API KEY
                        </div>
                        <div class="info-card" style="padding: 16px;">
                            \${data.hasApiKey ? \`
                                <div class="status-success">
                                    <div class="status-icon">
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10 3L4.5 8.5L2 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                    <span class="info-label" style="color: var(--vscode-foreground);">API Key is set</span>
                                </div>
                            \` : ''}
                            
                            <input type="password" id="api-key-input" 
                                class="api-input"
                                placeholder="\${data.hasApiKey ? 'Enter new key to replace...' : 'Enter your Groq API key...'}"
                                oninput="document.getElementById('api-key-error').style.display = 'none'"
                            >
                            <div id="api-key-error" style="color: #F44336; font-size: 11px; margin-bottom: 8px; display: none;"></div>
                            
                            <div class="btn-group">
                                <button class="btn-card" onclick="saveApiKey()">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polyline points="7 3 7 8 15 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span>Save</span>
                                </button>
                                
                                \${data.hasApiKey ? \`
                                    <button class="btn-card btn-icon-only" onclick="resetApiKey()" title="Clear input">
                                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M23 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M1 20v-6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                \` : ''}
                            </div>
                            
                            <div style="font-size: 11px; margin-top: 12px; color: var(--vscode-textLink-foreground);">
                                <a href="https://console.groq.com" style="color: inherit; text-decoration: none;">Get free API key at console.groq.com</a>
                            </div>
                        </div>
                    </div>
                \`;
                
                // Action Buttons
                html += \`
                    <div class="section">
                        <button class="btn-primary" onclick="openGenerator()">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M19 2L20 5L23 6L20 7L19 10L18 7L15 6L18 5L19 2Z" fill="currentColor" stroke="none"/>
                            </svg>
                            Generate README
                        </button>
                        <button class="btn-secondary" onclick="viewHistory()">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            View History
                        </button>
                        <button class="btn-secondary" onclick="openSettings()">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Settings
                        </button>
                    </div>
                \`;
                
                content.innerHTML = html;
            }
        });
        
        function openGenerator() {
            vscode.postMessage({ type: 'openGenerator' });
        }
        
        function setApiKey() {
            vscode.postMessage({ type: 'setApiKey' });
        }
        
        function viewHistory() {
            vscode.postMessage({ type: 'viewHistory' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function saveApiKey() {
            const input = document.getElementById('api-key-input');
            const errorEl = document.getElementById('api-key-error');
            const apiKey = input.value.trim();
            
            if (!apiKey) {
                return;
            }

            if (!apiKey.startsWith('gsk_')) {
                errorEl.textContent = 'Invalid key: Must start with "gsk_"';
                errorEl.style.display = 'block';
                return;
            }
            
            vscode.postMessage({ 
                type: 'saveApiKey',
                data: { apiKey }
            });
            
            input.value = '';
            errorEl.style.display = 'none';
        }
        
        function resetApiKey() {
            const input = document.getElementById('api-key-input');
            input.value = '';
            input.focus();
        }
    </script>
</body>
</html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
SidebarProvider.viewType = 'ai-readme.sidebarView';
//# sourceMappingURL=sidebarProvider.js.map