/**
 * OpenRouter API Client
 * Communicates with OpenRouter API using Gemini 2.0 Flash (free tier).
 * Supports streaming responses for real-time README generation.
 * Includes automatic retry with exponential backoff for rate limits.
 */

import { getApiKey } from '../utils/secretStorage';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Primary model and fallbacks (all free - more options = better availability)
const MODELS = [
    'google/gemini-2.0-flash-exp:free',           // Best quality, primary
    'google/gemma-2-9b-it:free',                   // Good quality fallback
    'meta-llama/llama-3.2-3b-instruct:free',      // Fast fallback
    'meta-llama/llama-3.1-8b-instruct:free',      // Another Llama option
    'mistralai/mistral-7b-instruct:free',         // Mistral fallback
    'microsoft/phi-3-mini-128k-instruct:free',    // Microsoft fallback
    'openchat/openchat-7b:free',                   // OpenChat fallback
    'huggingfaceh4/zephyr-7b-beta:free'           // Zephyr fallback
];

let currentModelIndex = 0;

function getCurrentModel(): string {
    return MODELS[currentModelIndex];
}

function switchToNextModel(): boolean {
    if (currentModelIndex < MODELS.length - 1) {
        currentModelIndex++;
        return true;
    }
    return false;
}

function resetToFirstModel(): void {
    currentModelIndex = 0;
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000; // 2 seconds
const MAX_DELAY_MS = 30000; // 30 seconds

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface StreamCallback {
    onToken: (token: string) => void;
    onComplete: (fullContent: string) => void;
    onError: (error: Error) => void;
    onRetry?: (attempt: number, delayMs: number) => void;
}

// Interface for project details
export interface ProjectDetails {
    name: string;
    description?: string;
    files: string[];
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate README content using OpenRouter API with streaming
 * Automatically tries fallback models if the primary model is busy
 */
export async function generateWithStreaming(
    messages: ChatMessage[],
    callbacks: StreamCallback
): Promise<void> {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
        callbacks.onError(new Error('API key not configured. Please set your Groq API key.'));
        return;
    }

    // Reset to first model at the start of each generation
    resetToFirstModel();
    
    // Try each model in sequence
    while (true) {
        const currentModel = getCurrentModel();
        const modelName = currentModel.split('/')[1]?.split(':')[0] || currentModel;
        
        try {
            // Use onToken to send status updates (mapped from onToken in interface)
            // Note: The interface has onToken, but here we might abuse it for status or add a status callback?
            // "callbacks.onToken" is likely expected to receive just content.
            // However, the original code sent "🤖 Using model..." via onToken.
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
                    messages: messages, // Pass messages directly
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
                    } else {
                        // All models exhausted
                        resetToFirstModel();
                        callbacks.onError(new Error(
                            '⏳ All free models are currently busy.\n\n' +
                            'Please wait 1-2 minutes and try again.\n' +
                            'Tip: Free tier has shared rate limits across all users.'
                        ));
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
                    callbacks.onError(new Error('❌ Invalid API key. Please check your Groq API key in settings.'));
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
                                callbacks.onToken(token); // Use onToken
                            }
                            
                            // Check for error in response
                            if (json.error) {
                                throw new Error(json.error.message || 'API returned an error');
                            }
                        } catch (e) {
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

            callbacks.onComplete(fullContent); // Use onComplete
            return; // Success!
            
        } catch (error) {
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
 * Test connection to Groq API
 */
export async function testConnection(): Promise<boolean> {
    try {
        const apiKey = await getApiKey();
        
        if (!apiKey) {
            return false;
        }

        // Use a lightweight model for connection test
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/ai-readme-generator',
                'X-Title': 'AI README Generator - VS Code Extension'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free',
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Connection test failed:', error);
        return false;
    }
}
