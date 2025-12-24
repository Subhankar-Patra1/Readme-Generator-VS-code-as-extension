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
    
    // Set Groq API key command
    const setGroqApiKeyCmd = vscode.commands.registerCommand('ai-readme.setApiKey', async () => {
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
                // We use the "HuggingFace" storage slot for Groq to maintain compatibility if needed, 
                // OR we can migrate. Since we are refactoring, let's just use the setHuggingFaceApiKey 
                // function but wrap it as our main key.
                await setHuggingFaceApiKey(key.trim());
                await setApiProvider('huggingface'); 
                
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
    
    // Legacy/Alternative command for manual invocation if needed, mapped to same logic
    const setHuggingFaceApiKeyCmd = vscode.commands.registerCommand('ai-readme.setHuggingFaceApiKey', async () => {
         vscode.commands.executeCommand('ai-readme.setApiKey');
    });
    
    // Add all commands to subscriptions
    context.subscriptions.push(
        generateCmd,
        generateForFolderCmd,
        setGroqApiKeyCmd,
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
        const hasKey = await hasHuggingFaceApiKey();
        
        if (!hasKey) {
            const action = await vscode.window.showInformationMessage(
                '👋 Welcome to AI README Generator! Set up your free Groq API key for fast generation.',
                'Set Groq API Key',
                'Later'
            );
            
            if (action === 'Set Groq API Key') {
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
