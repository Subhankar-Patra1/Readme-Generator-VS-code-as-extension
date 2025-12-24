"use strict";
/**
 * OpenRouter API Client
 * Communicates with OpenRouter API using Gemini 2.0 Flash (free tier).
 * Supports streaming responses for real-time README generation.
 * Includes automatic retry with exponential backoff for rate limits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithStreaming = generateWithStreaming;
exports.generateNonStreaming = generateNonStreaming;
exports.testConnection = testConnection;
exports.getRateLimitInfo = getRateLimitInfo;
const secretStorage_1 = require("../utils/secretStorage");
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Primary model and fallbacks (all free - more options = better availability)
const MODELS = [
    'google/gemini-2.0-flash-exp:free', // Best quality, primary
    'google/gemma-2-9b-it:free', // Good quality fallback
    'meta-llama/llama-3.2-3b-instruct:free', // Fast fallback
    'meta-llama/llama-3.1-8b-instruct:free', // Another Llama option
    'mistralai/mistral-7b-instruct:free', // Mistral fallback
    'microsoft/phi-3-mini-128k-instruct:free', // Microsoft fallback
    'openchat/openchat-7b:free', // OpenChat fallback
    'huggingfaceh4/zephyr-7b-beta:free' // Zephyr fallback
];
let currentModelIndex = 0;
function getCurrentModel() {
    return MODELS[currentModelIndex];
}
function switchToNextModel() {
    if (currentModelIndex < MODELS.length - 1) {
        currentModelIndex++;
        return true;
    }
    return false;
}
function resetToFirstModel() {
    currentModelIndex = 0;
}
// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000; // 2 seconds
const MAX_DELAY_MS = 30000; // 30 seconds
/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Calculate delay with exponential backoff
 */
function getRetryDelay(attempt) {
    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
    return Math.min(delay, MAX_DELAY_MS);
}
/**
 * Make API request with retry logic
 */
async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES, onRetry) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            // If rate limited (429), retry after delay
            if (response.status === 429 && attempt < maxRetries) {
                const delayMs = getRetryDelay(attempt);
                if (onRetry) {
                    onRetry(attempt + 1, delayMs);
                }
                await sleep(delayMs);
                continue;
            }
            return response;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                const delayMs = getRetryDelay(attempt);
                if (onRetry) {
                    onRetry(attempt + 1, delayMs);
                }
                await sleep(delayMs);
            }
        }
    }
    throw lastError || new Error('Request failed after retries');
}
/**
 * Generate README content using OpenRouter API with streaming
 * Automatically tries fallback models if the primary model is busy
 */
async function generateWithStreaming(messages, callbacks) {
    const apiKey = await (0, secretStorage_1.getApiKey)();
    if (!apiKey) {
        callbacks.onError(new Error('API key not configured. Please set your OpenRouter API key.'));
        return;
    }
    // Reset to first model at the start of each generation
    resetToFirstModel();
    // Try each model in sequence
    while (true) {
        const currentModel = getCurrentModel();
        const modelName = currentModel.split('/')[1]?.split(':')[0] || currentModel;
        try {
            callbacks.onToken(`🤖 Using model: **${modelName}**\n\n`);
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/ai-readme-generator',
                    'X-Title': 'AI README Generator - VS Code Extension'
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: messages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });
            // Check for errors
            if (!response.ok) {
                const errorText = await response.text();
                // Rate limit (429) or model busy - try next model
                if (response.status === 429 || errorText.includes('busy') || errorText.includes('overloaded')) {
                    if (switchToNextModel()) {
                        const nextModel = getCurrentModel().split('/')[1]?.split(':')[0] || getCurrentModel();
                        callbacks.onToken(`\n⚠️ ${modelName} is busy. Switching to **${nextModel}**...\n\n`);
                        await sleep(1500); // Brief pause before trying next model
                        continue; // Try next model
                    }
                    else {
                        // All models exhausted
                        resetToFirstModel();
                        callbacks.onError(new Error('⏳ All free models are currently busy.\n\n' +
                            'Please wait 1-2 minutes and try again.\n' +
                            'Tip: Free tier has shared rate limits across all users.'));
                        return;
                    }
                }
                // Model not found (404) - try next model
                if (response.status === 404) {
                    if (switchToNextModel()) {
                        const nextModel = getCurrentModel().split('/')[1]?.split(':')[0] || getCurrentModel();
                        callbacks.onToken(`\n⚠️ ${modelName} unavailable. Trying **${nextModel}**...\n\n`);
                        await sleep(500);
                        continue;
                    }
                }
                // Auth error
                if (response.status === 401) {
                    callbacks.onError(new Error('❌ Invalid API key. Please check your OpenRouter API key in settings.'));
                    return;
                }
                // Other error
                callbacks.onError(new Error(`API Error (${response.status}): ${errorText}`));
                return;
            }
            if (!response.body) {
                callbacks.onError(new Error('No response body received'));
                return;
            }
            // Successfully connected - stream the response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let buffer = '';
            let hasReceivedContent = false;
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            continue;
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices?.[0]?.delta?.content;
                            if (token) {
                                if (!hasReceivedContent) {
                                    // Clear the "Using model" message once content starts
                                    hasReceivedContent = true;
                                }
                                fullContent += token;
                                callbacks.onToken(token);
                            }
                            // Check for error in response
                            if (json.error) {
                                throw new Error(json.error.message || 'API returned an error');
                            }
                        }
                        catch (e) {
                            // Skip malformed JSON chunks
                        }
                    }
                }
            }
            // Check if we got any content
            if (fullContent.trim().length === 0) {
                if (switchToNextModel()) {
                    const nextModel = getCurrentModel().split('/')[1]?.split(':')[0] || getCurrentModel();
                    callbacks.onToken(`\n⚠️ No response from ${modelName}. Trying **${nextModel}**...\n\n`);
                    await sleep(500);
                    continue;
                }
            }
            callbacks.onComplete(fullContent);
            return; // Success!
        }
        catch (error) {
            // Network error - try next model
            if (switchToNextModel()) {
                const nextModel = getCurrentModel().split('/')[1]?.split(':')[0] || getCurrentModel();
                callbacks.onToken(`\n⚠️ Connection error. Trying **${nextModel}**...\n\n`);
                await sleep(1000);
                continue;
            }
            callbacks.onError(error instanceof Error ? error : new Error(String(error)));
            return;
        }
    }
}
/**
 * Generate README content without streaming (fallback)
 */
async function generateNonStreaming(messages) {
    const apiKey = await (0, secretStorage_1.getApiKey)();
    if (!apiKey) {
        throw new Error('API key not configured. Please set your OpenRouter API key.');
    }
    const response = await fetchWithRetry(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/ai-readme-generator',
            'X-Title': 'AI README Generator - VS Code Extension'
        },
        body: JSON.stringify({
            model: getCurrentModel(),
            messages: messages,
            stream: false,
            temperature: 0.7,
            max_tokens: 4096
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
            throw new Error('⏳ Rate limit reached. Please wait 30-60 seconds and try again.');
        }
        throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    const json = await response.json();
    return json.choices?.[0]?.message?.content || '';
}
/**
 * Test API connection with a simple request
 */
async function testConnection() {
    try {
        const apiKey = await (0, secretStorage_1.getApiKey)();
        if (!apiKey) {
            return false;
        }
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/ai-readme-generator',
                'X-Title': 'AI README Generator - VS Code Extension'
            },
            body: JSON.stringify({
                model: getCurrentModel(),
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        });
        // 429 is rate limit, but key is still valid
        return response.ok || response.status === 429;
    }
    catch {
        return false;
    }
}
/**
 * Get rate limit info
 */
function getRateLimitInfo() {
    return `
📊 OpenRouter Free Tier Limits:
• Model: Gemini 2.0 Flash Experimental (free)
• Rate: ~20 requests/minute (shared)
• Daily: ~200 requests/day
• Note: Free models share capacity across all users

💡 Tips:
• Wait 30-60 seconds if rate limited
• Avoid rapid repeated requests
• The extension auto-retries up to 3 times
    `.trim();
}
//# sourceMappingURL=openRouterClient.js.map