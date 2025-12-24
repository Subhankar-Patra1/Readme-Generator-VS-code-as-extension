/**
 * HuggingFace Inference API Client
 * Communicates with HuggingFace's Inference API for text generation.
 * Supports streaming responses and automatic model fallback.
 * 
 * Free tier: 1000 requests/day with generous rate limits
 */

import { getHuggingFaceApiKey } from '../utils/secretStorage';

// HuggingFace Router API endpoint (new endpoint as of late 2024)
const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models';

// Models available via HuggingFace Inference API (sorted by quality)
const HF_MODELS = [
    'mistralai/Mistral-7B-Instruct-v0.3',      // Best quality, fast
    'HuggingFaceH4/zephyr-7b-beta',            // Very capable
    'microsoft/Phi-3-mini-4k-instruct',        // Microsoft model
    'google/gemma-2b-it',                       // Google model
    'tiiuae/falcon-7b-instruct',               // Falcon model
];

let currentModelIndex = 0;

function getCurrentModel(): string {
    return HF_MODELS[currentModelIndex];
}

function getModelDisplayName(): string {
    const model = getCurrentModel();
    return model.split('/')[1] || model;
}

function switchToNextModel(): boolean {
    if (currentModelIndex < HF_MODELS.length - 1) {
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
 * Format messages for HuggingFace instruction-tuned models
 */
function formatPrompt(messages: ChatMessage[]): string {
    let prompt = '';
    
    for (const msg of messages) {
        if (msg.role === 'system') {
            prompt += `### System:\n${msg.content}\n\n`;
        } else if (msg.role === 'user') {
            prompt += `### User:\n${msg.content}\n\n`;
        } else if (msg.role === 'assistant') {
            prompt += `### Assistant:\n${msg.content}\n\n`;
        }
    }
    
    prompt += '### Assistant:\n';
    return prompt;
}

/**
 * Generate README content using HuggingFace Inference API
 * Automatically tries fallback models if the primary model is busy
 */
export async function generateWithHuggingFace(
    messages: ChatMessage[],
    callbacks: StreamCallback
): Promise<void> {
    const apiKey = await getHuggingFaceApiKey();
    
    if (!apiKey) {
        callbacks.onError(new Error('HuggingFace API key not configured. Please set your HuggingFace API key.'));
        return;
    }

    // Reset to first model at the start of each generation
    resetToFirstModel();
    
    const prompt = formatPrompt(messages);

    // Try each model in sequence
    while (true) {
        const currentModel = getCurrentModel();
        const modelName = getModelDisplayName();
        
        try {
            callbacks.onToken(`🤖 Using HuggingFace model: **${modelName}**\n\n`);
            
            const response = await fetch(`${HF_API_BASE}/${currentModel}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 4096,
                        temperature: 0.7,
                        top_p: 0.95,
                        do_sample: true,
                        return_full_text: false,
                    },
                    options: {
                        wait_for_model: true,
                        use_cache: false,
                    }
                })
            });

            // Check for errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                const errorMessage = errorData.error || `HTTP ${response.status}`;
                
                // Model loading or busy - try next model
                if (response.status === 503 || errorMessage.includes('loading') || errorMessage.includes('busy')) {
                    if (switchToNextModel()) {
                        const nextModel = getModelDisplayName();
                        callbacks.onToken(`\n⚠️ ${modelName} is loading. Switching to **${nextModel}**...\n\n`);
                        await sleep(1000);
                        continue;
                    } else {
                        resetToFirstModel();
                        callbacks.onError(new Error(
                            '⏳ All models are currently loading.\n\n' +
                            'HuggingFace models need to warm up. Please try again in 30 seconds.'
                        ));
                        return;
                    }
                }
                
                // Rate limit
                if (response.status === 429) {
                    if (switchToNextModel()) {
                        const nextModel = getModelDisplayName();
                        callbacks.onToken(`\n⚠️ Rate limited. Switching to **${nextModel}**...\n\n`);
                        await sleep(1500);
                        continue;
                    }
                }
                
                // Auth error
                if (response.status === 401) {
                    callbacks.onError(new Error('❌ Invalid HuggingFace API key. Please check your API key in settings.'));
                    return;
                }
                
                // Other error
                callbacks.onError(new Error(`HuggingFace API Error: ${errorMessage}`));
                return;
            }

            // Parse response
            const result = await response.json() as Array<{ generated_text?: string }> | { generated_text?: string } | string;
            
            let generatedText = '';
            
            // Handle different response formats
            if (Array.isArray(result) && result[0]?.generated_text) {
                generatedText = result[0].generated_text;
            } else if (typeof result === 'object' && result !== null && 'generated_text' in result && result.generated_text) {
                generatedText = result.generated_text;
            } else if (typeof result === 'string') {
                generatedText = result;
            }
            
            // Check if we got content
            if (!generatedText || generatedText.trim().length === 0) {
                if (switchToNextModel()) {
                    const nextModel = getModelDisplayName();
                    callbacks.onToken(`\n⚠️ No response from ${modelName}. Trying **${nextModel}**...\n\n`);
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
                await sleep(20); // Small delay for streaming effect
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
 * Test connection to HuggingFace API
 */
export async function testHuggingFaceConnection(): Promise<boolean> {
    const apiKey = await getHuggingFaceApiKey();
    
    if (!apiKey) {
        return false;
    }

    try {
        const response = await fetch(`${HF_API_BASE}/${HF_MODELS[0]}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: 'Hello',
                parameters: { max_new_tokens: 5 }
            })
        });
        
        // 200, 503 (loading), or 429 (rate limit) all mean the key is valid
        return response.status === 200 || response.status === 503 || response.status === 429;
    } catch {
        return false;
    }
}
