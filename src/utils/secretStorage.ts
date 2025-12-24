/**
 * Secret Storage Utility
 * Securely stores and retrieves API keys using VS Code's SecretStorage API.
 * Supports both OpenRouter and HuggingFace API keys.
 * The API keys are never logged or exposed.
 */

import * as vscode from 'vscode';

const OPENROUTER_API_KEY_SECRET = 'ai-readme-generator.openrouter-api-key';
const HUGGINGFACE_API_KEY_SECRET = 'ai-readme-generator.huggingface-api-key';
const API_PROVIDER_SECRET = 'ai-readme-generator.api-provider';

export type ApiProvider = 'openrouter' | 'huggingface';

let secretStorage: vscode.SecretStorage;

/**
 * Initialize the secret storage with the extension context
 */
export function initializeSecretStorage(context: vscode.ExtensionContext): void {
    secretStorage = context.secrets;
}

// ============================================================================
// OPENROUTER API KEY
// ============================================================================

/**
 * Store the OpenRouter API key securely
 */
export async function setApiKey(key: string): Promise<void> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.store(OPENROUTER_API_KEY_SECRET, key);
}

/**
 * Retrieve the OpenRouter API key
 */
export async function getApiKey(): Promise<string | undefined> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    return await secretStorage.get(OPENROUTER_API_KEY_SECRET);
}

/**
 * Delete the OpenRouter API key
 */
export async function deleteApiKey(): Promise<void> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.delete(OPENROUTER_API_KEY_SECRET);
}

/**
 * Check if OpenRouter API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
    const key = await getApiKey();
    return !!key && key.length > 0;
}

// ============================================================================
// HUGGINGFACE API KEY
// ============================================================================

/**
 * Store the HuggingFace API key securely
 */
export async function setHuggingFaceApiKey(key: string): Promise<void> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.store(HUGGINGFACE_API_KEY_SECRET, key);
}

/**
 * Retrieve the HuggingFace API key
 */
export async function getHuggingFaceApiKey(): Promise<string | undefined> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    return await secretStorage.get(HUGGINGFACE_API_KEY_SECRET);
}

/**
 * Delete the HuggingFace API key
 */
export async function deleteHuggingFaceApiKey(): Promise<void> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.delete(HUGGINGFACE_API_KEY_SECRET);
}

/**
 * Check if HuggingFace API key is configured
 */
export async function hasHuggingFaceApiKey(): Promise<boolean> {
    const key = await getHuggingFaceApiKey();
    return !!key && key.length > 0;
}

// ============================================================================
// API PROVIDER SELECTION
// ============================================================================

/**
 * Set the active API provider
 */
export async function setApiProvider(provider: ApiProvider): Promise<void> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.store(API_PROVIDER_SECRET, provider);
}

/**
 * Get the active API provider (defaults to 'huggingface')
 */
export async function getApiProvider(): Promise<ApiProvider> {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    const provider = await secretStorage.get(API_PROVIDER_SECRET);
    return (provider as ApiProvider) || 'huggingface';
}

/**
 * Check if any API key is configured
 */
export async function hasAnyApiKey(): Promise<boolean> {
    const hasOR = await hasApiKey();
    const hasHF = await hasHuggingFaceApiKey();
    return hasOR || hasHF;
}

/**
 * Get the active API key based on selected provider
 */
export async function getActiveApiKey(): Promise<string | undefined> {
    const provider = await getApiProvider();
    if (provider === 'huggingface') {
        return await getHuggingFaceApiKey();
    }
    return await getApiKey();
}
