"use strict";
/**
 * Secret Storage Utility
 * Securely stores and retrieves API keys using VS Code's SecretStorage API.
 * Supports both OpenRouter and HuggingFace API keys.
 * The API keys are never logged or exposed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSecretStorage = initializeSecretStorage;
exports.setApiKey = setApiKey;
exports.getApiKey = getApiKey;
exports.deleteApiKey = deleteApiKey;
exports.hasApiKey = hasApiKey;
exports.setHuggingFaceApiKey = setHuggingFaceApiKey;
exports.getHuggingFaceApiKey = getHuggingFaceApiKey;
exports.deleteHuggingFaceApiKey = deleteHuggingFaceApiKey;
exports.hasHuggingFaceApiKey = hasHuggingFaceApiKey;
exports.setApiProvider = setApiProvider;
exports.getApiProvider = getApiProvider;
exports.hasAnyApiKey = hasAnyApiKey;
exports.getActiveApiKey = getActiveApiKey;
const OPENROUTER_API_KEY_SECRET = 'ai-readme-generator.openrouter-api-key';
const HUGGINGFACE_API_KEY_SECRET = 'ai-readme-generator.huggingface-api-key';
const API_PROVIDER_SECRET = 'ai-readme-generator.api-provider';
let secretStorage;
/**
 * Initialize the secret storage with the extension context
 */
function initializeSecretStorage(context) {
    secretStorage = context.secrets;
}
// ============================================================================
// OPENROUTER API KEY
// ============================================================================
/**
 * Store the OpenRouter API key securely
 */
async function setApiKey(key) {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.store(OPENROUTER_API_KEY_SECRET, key);
}
/**
 * Retrieve the OpenRouter API key
 */
async function getApiKey() {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    return await secretStorage.get(OPENROUTER_API_KEY_SECRET);
}
/**
 * Delete the OpenRouter API key
 */
async function deleteApiKey() {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.delete(OPENROUTER_API_KEY_SECRET);
}
/**
 * Check if OpenRouter API key is configured
 */
async function hasApiKey() {
    const key = await getApiKey();
    return !!key && key.length > 0;
}
// ============================================================================
// HUGGINGFACE API KEY
// ============================================================================
/**
 * Store the HuggingFace API key securely
 */
async function setHuggingFaceApiKey(key) {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.store(HUGGINGFACE_API_KEY_SECRET, key);
}
/**
 * Retrieve the HuggingFace API key
 */
async function getHuggingFaceApiKey() {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    return await secretStorage.get(HUGGINGFACE_API_KEY_SECRET);
}
/**
 * Delete the HuggingFace API key
 */
async function deleteHuggingFaceApiKey() {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.delete(HUGGINGFACE_API_KEY_SECRET);
}
/**
 * Check if HuggingFace API key is configured
 */
async function hasHuggingFaceApiKey() {
    const key = await getHuggingFaceApiKey();
    return !!key && key.length > 0;
}
// ============================================================================
// API PROVIDER SELECTION
// ============================================================================
/**
 * Set the active API provider
 */
async function setApiProvider(provider) {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    await secretStorage.store(API_PROVIDER_SECRET, provider);
}
/**
 * Get the active API provider (defaults to 'huggingface')
 */
async function getApiProvider() {
    if (!secretStorage) {
        throw new Error('Secret storage not initialized');
    }
    const provider = await secretStorage.get(API_PROVIDER_SECRET);
    return provider || 'huggingface';
}
/**
 * Check if any API key is configured
 */
async function hasAnyApiKey() {
    const hasOR = await hasApiKey();
    const hasHF = await hasHuggingFaceApiKey();
    return hasOR || hasHF;
}
/**
 * Get the active API key based on selected provider
 */
async function getActiveApiKey() {
    const provider = await getApiProvider();
    if (provider === 'huggingface') {
        return await getHuggingFaceApiKey();
    }
    return await getApiKey();
}
//# sourceMappingURL=secretStorage.js.map