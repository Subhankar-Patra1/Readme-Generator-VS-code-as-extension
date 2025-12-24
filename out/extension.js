"use strict";
/**
 * AI README Generator - VS Code Extension
 * Main entry point
 *
 * Generates professional README files using Gemini 2.0 Flash via OpenRouter API.
 *
 * PRIVACY: No telemetry • No external data storage • Your code stays local
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const secretStorage_1 = require("./utils/secretStorage");
const webviewProvider_1 = require("./providers/webviewProvider");
const sidebarProvider_1 = require("./providers/sidebarProvider");
const openRouterClient_1 = require("./api/openRouterClient");
let webviewProvider;
let sidebarProvider;
/**
 * Extension activation
 */
function activate(context) {
    console.log('AI README Generator is now active!');
    // Initialize secret storage for API key
    (0, secretStorage_1.initializeSecretStorage)(context);
    // Create webview provider
    webviewProvider = new webviewProvider_1.WebviewProvider(context);
    // Create and register sidebar provider
    sidebarProvider = new sidebarProvider_1.SidebarProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(sidebarProvider_1.SidebarProvider.viewType, sidebarProvider));
    // Register commands
    registerCommands(context);
    // Show welcome message on first install
    showWelcomeMessage(context);
}
/**
 * Register all extension commands
 */
function registerCommands(context) {
    // Main generate command
    const generateCmd = vscode.commands.registerCommand('ai-readme.generate', async () => {
        await webviewProvider.createOrShow();
    });
    // Generate for specific folder (context menu)
    const generateForFolderCmd = vscode.commands.registerCommand('ai-readme.generateForFolder', async (uri) => {
        if (uri) {
            await webviewProvider.createOrShow(uri.fsPath);
        }
        else {
            await webviewProvider.createOrShow();
        }
    });
    // Set API key command
    const setApiKeyCmd = vscode.commands.registerCommand('ai-readme.setApiKey', async () => {
        const key = await vscode.window.showInputBox({
            title: 'OpenRouter API Key',
            prompt: 'Enter your OpenRouter API key',
            placeHolder: 'sk-or-v1-...',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                if (!value.startsWith('sk-or-')) {
                    return 'Invalid OpenRouter API key format. Should start with sk-or-';
                }
                return null;
            }
        });
        if (key) {
            try {
                await (0, secretStorage_1.setApiKey)(key.trim());
                // Test connection
                const isValid = await (0, openRouterClient_1.testConnection)();
                if (isValid) {
                    vscode.window.showInformationMessage('✅ API key saved and verified successfully!');
                }
                else {
                    vscode.window.showWarningMessage('⚠️ API key saved, but connection test failed. Please verify your key.');
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
            }
        }
    });
    // View history command
    const viewHistoryCmd = vscode.commands.registerCommand('ai-readme.viewHistory', async () => {
        await webviewProvider.createOrShow();
        // The webview will show history by default
    });
    // Regenerate section command (triggered from webview)
    const regenerateSectionCmd = vscode.commands.registerCommand('ai-readme.regenerateSection', async (sectionId) => {
        // This is handled by the webview
        vscode.window.showInformationMessage(`Regenerating section: ${sectionId}`);
    });
    // Export command
    const exportCmd = vscode.commands.registerCommand('ai-readme.exportReadme', async () => {
        await webviewProvider.createOrShow();
        // Export will be handled in webview
    });
    // Set Groq API key command (using same storage key as HuggingFace for compatibility)
    const setHuggingFaceApiKeyCmd = vscode.commands.registerCommand('ai-readme.setHuggingFaceApiKey', async () => {
        const key = await vscode.window.showInputBox({
            title: 'Groq API Key',
            prompt: 'Enter your Groq API key (get free at console.groq.com/keys)',
            placeHolder: 'gsk_...',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                if (!value.startsWith('gsk_')) {
                    return 'Invalid Groq API key format. Should start with gsk_';
                }
                return null;
            }
        });
        if (key) {
            try {
                await (0, secretStorage_1.setHuggingFaceApiKey)(key.trim());
                await (0, secretStorage_1.setApiProvider)('huggingface'); // Keep same provider type for storage
                vscode.window.showInformationMessage('✅ Groq API key saved! You now have fast, free AI generation.');
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
            }
        }
    });
    // Add all commands to subscriptions
    context.subscriptions.push(generateCmd, generateForFolderCmd, setApiKeyCmd, setHuggingFaceApiKeyCmd, viewHistoryCmd, regenerateSectionCmd, exportCmd);
}
/**
 * Show welcome message on first install
 */
async function showWelcomeMessage(context) {
    const hasShownWelcome = context.globalState.get('ai-readme.welcomeShown');
    if (!hasShownWelcome) {
        const hasKey = await (0, secretStorage_1.hasApiKey)();
        const hasHfKey = await (0, secretStorage_1.hasHuggingFaceApiKey)();
        if (!hasKey && !hasHfKey) {
            const action = await vscode.window.showInformationMessage('👋 Welcome to AI README Generator! Set up your free HuggingFace API key for best rate limits.', 'Set HuggingFace Key', 'Use OpenRouter', 'Later');
            if (action === 'Set HuggingFace Key') {
                vscode.commands.executeCommand('ai-readme.setHuggingFaceApiKey');
            }
            else if (action === 'Use OpenRouter') {
                vscode.commands.executeCommand('ai-readme.setApiKey');
            }
        }
        await context.globalState.update('ai-readme.welcomeShown', true);
    }
}
/**
 * Extension deactivation
 */
function deactivate() {
    console.log('AI README Generator is now deactivated.');
}
//# sourceMappingURL=extension.js.map