/**
 * Groq API Client
 * Uses Groq's free tier with generous rate limits
 * OpenAI-compatible API format, much simpler than HuggingFace
 * 
 * Free tier: 30 requests/minute, 14,400 requests/day
 * Get API key: https://console.groq.com/keys
 */

import { getHuggingFaceApiKey } from '../utils/secretStorage';

// Groq API endpoint (OpenAI-compatible)
const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';

// Groq free models (sorted by quality)
const GROQ_MODELS = [
    'llama-3.3-70b-versatile',      // Best quality, 32k context
    'llama-3.1-8b-instant',          // Fast, good quality
    'mixtral-8x7b-32768',            // Mixtral, 32k context
    'gemma2-9b-it',                   // Google Gemma 2
];

let currentModelIndex = 0;

function getCurrentModel(): string {
    return GROQ_MODELS[currentModelIndex];
}

function getModelDisplayName(): string {
    const model = getCurrentModel();
    return model.split('-').slice(0, 2).join('-');
}

function switchToNextModel(): boolean {
    if (currentModelIndex < GROQ_MODELS.length - 1) {
        currentModelIndex++;
        return true;
    }
    return false;
}

function resetToFirstModel(): void {
    currentModelIndex = 0;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface StreamCallback {
    onToken: (token: string) => void;
    onComplete: (fullContent: string) => void;
    onError: (error: Error) => void;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate README content using Groq API
 * Automatically tries fallback models if needed
 */
export async function generateWithGroq(
    messages: ChatMessage[],
    callbacks: StreamCallback
): Promise<void> {
    // We're reusing the HuggingFace key storage for Groq key
    const apiKey = await getHuggingFaceApiKey();
    
    if (!apiKey) {
        callbacks.onError(new Error('Groq API key not configured. Please set your Groq API key.'));
        return;
    }

    // Reset to first model at the start of each generation
    resetToFirstModel();

    // Try each model in sequence
    while (true) {
        const currentModel = getCurrentModel();
        const modelName = getModelDisplayName();
        
        try {
            callbacks.onToken(`🤖 Using Groq model: **${modelName}**\n\n`);
            
            const response = await fetch(GROQ_API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: currentModel,
                    messages: messages,
                    max_tokens: 4096,
                    temperature: 0.7,
                    stream: false, // Non-streaming for simplicity
                })
            });

            // Check for errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                
                // Rate limit - try next model
                if (response.status === 429) {
                    if (switchToNextModel()) {
                        const nextModel = getModelDisplayName();
                        callbacks.onToken(`\n⚠️ Rate limited. Switching to **${nextModel}**...\n\n`);
                        await sleep(1500);
                        continue;
                    } else {
                        resetToFirstModel();
                        callbacks.onError(new Error(
                            '⏳ Rate limit reached on all models.\n\n' +
                            'Please wait a moment and try again.'
                        ));
                        return;
                    }
                }
                
                // Model not found - try next
                if (response.status === 404) {
                    if (switchToNextModel()) {
                        const nextModel = getModelDisplayName();
                        callbacks.onToken(`\n⚠️ Model unavailable. Trying **${nextModel}**...\n\n`);
                        await sleep(500);
                        continue;
                    }
                }
                
                // Auth error
                if (response.status === 401) {
                    callbacks.onError(new Error('❌ Invalid Groq API key. Please check your API key in settings.'));
                    return;
                }
                
                // Other error
                callbacks.onError(new Error(`Groq API Error: ${errorMessage}`));
                return;
            }

            // Parse response (OpenAI-compatible format)
            const result = await response.json() as {
                choices?: Array<{
                    message?: {
                        content?: string;
                    };
                }>;
            };
            
            const generatedText = result.choices?.[0]?.message?.content || '';
            
            // Check if we got content
            if (!generatedText || generatedText.trim().length === 0) {
                if (switchToNextModel()) {
                    const nextModel = getModelDisplayName();
                    callbacks.onToken(`\n⚠️ No response. Trying **${nextModel}**...\n\n`);
                    await sleep(500);
                    continue;
                }
            }
            
            // Stream the content (simulate streaming for better UX)
            const words = generatedText.split(' ');
            const chunkSize = 3;
            
            for (let i = 0; i < words.length; i += chunkSize) {
                const chunk = words.slice(i, i + chunkSize).join(' ') + ' ';
                callbacks.onToken(chunk);
                await sleep(15); // Small delay for streaming effect
            }
            
            callbacks.onComplete(generatedText);
            return; // Success!
            
        } catch (error) {
            // Network error - try next model
            if (switchToNextModel()) {
                const nextModel = getModelDisplayName();
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
export async function testGroqConnection(): Promise<boolean> {
    const apiKey = await getHuggingFaceApiKey();
    
    if (!apiKey) {
        return false;
    }

    try {
        const response = await fetch(GROQ_API_BASE, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_MODELS[0],
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        });
        
        // 200 or 429 (rate limit) means the key is valid
        return response.status === 200 || response.status === 429;
    } catch {
        return false;
    }
}
