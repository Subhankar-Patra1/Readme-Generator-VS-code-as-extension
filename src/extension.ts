/**
 * AI README Generator - VS Code Extension
 * Main entry point
 * 
 * Generates professional README files using Gemini 2.0 Flash via OpenRouter API.
 * 
 * PRIVACY: No telemetry • No external data storage • Your code stays local
 */

import * as vscode from 'vscode';
import { initializeSecretStorage, setApiKey, hasApiKey, setHuggingFaceApiKey, hasHuggingFaceApiKey, setApiProvider } from './utils/secretStorage';
import { WebviewProvider } from './providers/webviewProvider';
import { SidebarProvider } from './providers/sidebarProvider';
import { testConnection } from './api/openRouterClient';
import { testHuggingFaceConnection } from './api/huggingFaceClient';

let webviewProvider: WebviewProvider;
let sidebarProvider: SidebarProvider;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('AI README Generator is now active!');
    
    // Initialize secret storage for API key
    initializeSecretStorage(context);
    
    // Create webview provider
    webviewProvider = new WebviewProvider(context);
    
    // Create and register sidebar provider
    sidebarProvider = new SidebarProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType,
            sidebarProvider
        )
    );
    
    // Register commands
    registerCommands(context);
    
    // Show welcome message on first install
    showWelcomeMessage(context);
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
    // Main generate command
    const generateCmd = vscode.commands.registerCommand('ai-readme.generate', async () => {
        await webviewProvider.createOrShow();
    });
    
    // Generate for specific folder (context menu)
    const generateForFolderCmd = vscode.commands.registerCommand(
        'ai-readme.generateForFolder',
        async (uri: vscode.Uri) => {
            if (uri) {
                await webviewProvider.createOrShow(uri.fsPath);
            } else {
                await webviewProvider.createOrShow();
            }
        }
    );
    
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
                await setApiKey(key.trim());
                
                // Test connection
                const isValid = await testConnection();
                
                if (isValid) {
                    vscode.window.showInformationMessage(
                        '✅ API key saved and verified successfully!'
                    );
                } else {
                    vscode.window.showWarningMessage(
                        '⚠️ API key saved, but connection test failed. Please verify your key.'
                    );
                }
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to save API key: ${error}`
                );
            }
        }
    });
    
    // View history command
    const viewHistoryCmd = vscode.commands.registerCommand('ai-readme.viewHistory', async () => {
        await webviewProvider.createOrShow();
        // The webview will show history by default
    });
    
    // Regenerate section command (triggered from webview)
    const regenerateSectionCmd = vscode.commands.registerCommand(
        'ai-readme.regenerateSection',
        async (sectionId: string) => {
            // This is handled by the webview
            vscode.window.showInformationMessage(`Regenerating section: ${sectionId}`);
        }
    );
    
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
                await setHuggingFaceApiKey(key.trim());
                await setApiProvider('huggingface'); // Keep same provider type for storage
                
                vscode.window.showInformationMessage(
                    '✅ Groq API key saved! You now have fast, free AI generation.'
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to save API key: ${error}`
                );
            }
        }
    });
    
    // Add all commands to subscriptions
    context.subscriptions.push(
        generateCmd,
        generateForFolderCmd,
        setApiKeyCmd,
        setHuggingFaceApiKeyCmd,
        viewHistoryCmd,
        regenerateSectionCmd,
        exportCmd
    );
}

/**
 * Show welcome message on first install
 */
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
    const hasShownWelcome = context.globalState.get<boolean>('ai-readme.welcomeShown');
    
    if (!hasShownWelcome) {
        const hasKey = await hasApiKey();
        const hasHfKey = await hasHuggingFaceApiKey();
        
        if (!hasKey && !hasHfKey) {
            const action = await vscode.window.showInformationMessage(
                '👋 Welcome to AI README Generator! Set up your free HuggingFace API key for best rate limits.',
                'Set HuggingFace Key',
                'Use OpenRouter',
                'Later'
            );
            
            if (action === 'Set HuggingFace Key') {
                vscode.commands.executeCommand('ai-readme.setHuggingFaceApiKey');
            } else if (action === 'Use OpenRouter') {
                vscode.commands.executeCommand('ai-readme.setApiKey');
            }
        }
        
        await context.globalState.update('ai-readme.welcomeShown', true);
    }
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('AI README Generator is now deactivated.');
}
