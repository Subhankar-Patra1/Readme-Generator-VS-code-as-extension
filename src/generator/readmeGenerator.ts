/**
 * README Generator
 * Main orchestration for README generation
 * Supports both Groq and OpenRouter APIs
 */

import { ProjectInfo } from '../analysis/workspaceScanner';
import { DetectionResult } from '../analysis/languageDetector';
import { ProjectTypeResult } from '../analysis/projectTypeDetector';
import { ReadmeTemplate, ReadmeSection, getTemplate } from '../templates/templates';
import { buildPrompt, buildSectionRegeneratePrompt, PromptOptions } from './promptBuilder';
import { generateWithStreaming, ChatMessage, StreamCallback } from '../api/openRouterClient';
import { generateWithGroq, ChatMessage as GroqChatMessage, StreamCallback as GroqStreamCallback } from '../api/groqClient';
import { generateOfflineReadme } from './offlineFallback';
import { hasApiKey, hasHuggingFaceApiKey, getApiProvider } from '../utils/secretStorage';

export interface GenerationOptions {
    templateId: string;
    enabledSections: string[];
    language: string;
    tone: string;
    customInstructions?: string;
    includeBadges: boolean;
    customBadges?: string;
}

export interface GenerationResult {
    content: string;
    isOffline: boolean;
    error?: string;
}

/**
 * Generate README with streaming
 * Automatically uses HuggingFace if configured, otherwise OpenRouter
 */
export async function generateReadme(
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    options: GenerationOptions,
    onToken: (token: string) => void,
    onComplete: (content: string) => void,
    onError: (error: Error) => void
): Promise<void> {
    // Check which API to use
    const hasGroqKey = await hasHuggingFaceApiKey(); // Reusing HF storage for Groq key
    const hasOrKey = await hasApiKey();
    const provider = await getApiProvider();
    
    // Use Groq if configured, or if it's the preferred provider
    const useGroq = hasGroqKey && (provider === 'huggingface' || !hasOrKey);
    
    if (!hasGroqKey && !hasOrKey) {
        // Use offline fallback
        const offlineContent = generateOfflineReadme(projectInfo, detection, projectType);
        onComplete(offlineContent);
        return;
    }
    
    const template = getTemplate(options.templateId);
    
    const promptOptions: PromptOptions = {
        template: template,
        enabledSections: options.enabledSections,
        language: options.language,
        tone: options.tone,
        customInstructions: options.customInstructions,
        includeBadges: options.includeBadges,
        customBadges: options.customBadges
    };
    
    const { systemPrompt, userPrompt } = buildPrompt(
        projectInfo,
        detection,
        projectType,
        promptOptions
    );
    
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    const callbacks: StreamCallback = {
        onToken: onToken,
        onComplete: onComplete,
        onError: onError
    };
    
    try {
        if (useGroq) {
            // Use Groq API
            await generateWithGroq(messages as GroqChatMessage[], callbacks as GroqStreamCallback);
        } else {
            // Use OpenRouter API
            await generateWithStreaming(messages, callbacks);
        }
    } catch (error) {
        // Fallback to offline mode on error
        const offlineContent = generateOfflineReadme(projectInfo, detection, projectType);
        onError(new Error('API request failed. Using offline template.'));
        onComplete(offlineContent);
    }
}

/**
 * Regenerate a specific section
 */
export async function regenerateSection(
    section: ReadmeSection,
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    currentContent: string,
    customInstructions: string | undefined,
    onToken: (token: string) => void,
    onComplete: (content: string) => void,
    onError: (error: Error) => void
): Promise<void> {
    const hasKey = await hasApiKey();
    
    if (!hasKey) {
        onError(new Error('API key not configured. Cannot regenerate section.'));
        return;
    }
    
    const { systemPrompt, userPrompt } = buildSectionRegeneratePrompt(
        section,
        projectInfo,
        detection,
        projectType,
        currentContent,
        customInstructions
    );
    
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    const callbacks: StreamCallback = {
        onToken: onToken,
        onComplete: onComplete,
        onError: onError
    };
    
    // Check which API to use
    const hasGroqKey = await hasHuggingFaceApiKey(); // Reusing HF storage for Groq
    const hasOrKey = await hasApiKey();
    const provider = await getApiProvider();
    const useGroq = hasGroqKey && (provider === 'huggingface' || !hasOrKey);
    
    if (useGroq) {
        await generateWithGroq(messages as GroqChatMessage[], callbacks as GroqStreamCallback);
    } else {
        await generateWithStreaming(messages, callbacks);
    }
}

/**
 * Generate README non-streaming (for simple use cases)
 * Uses a promise-based wrapper around the streaming API
 */
export async function generateReadmeSimple(
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    options: GenerationOptions
): Promise<GenerationResult> {
    const hasGroqKey = await hasHuggingFaceApiKey(); // Reusing HF storage for Groq key
    const hasOrKey = await hasApiKey();
    
    if (!hasGroqKey && !hasOrKey) {
        return {
            content: generateOfflineReadme(projectInfo, detection, projectType),
            isOffline: true
        };
    }
    
    const template = getTemplate(options.templateId);
    
    const promptOptions: PromptOptions = {
        template: template,
        enabledSections: options.enabledSections,
        language: options.language,
        tone: options.tone,
        customInstructions: options.customInstructions,
        includeBadges: options.includeBadges,
        customBadges: options.customBadges
    };
    
    const { systemPrompt, userPrompt } = buildPrompt(
        projectInfo,
        detection,
        projectType,
        promptOptions
    );
    
    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    
    // Use a promise wrapper to collect the streamed content
    return new Promise((resolve) => {
        let content = '';
        
        const callbacks: StreamCallback = {
            onToken: (token: string) => { content += token; },
            onComplete: (fullContent: string) => {
                resolve({
                    content: fullContent,
                    isOffline: false
                });
            },
            onError: () => {
                resolve({
                    content: generateOfflineReadme(projectInfo, detection, projectType),
                    isOffline: true,
                    error: 'API request failed'
                });
            }
        };
        
        // Check which API to use
        const useGroq = hasGroqKey && (!hasOrKey);
        
        if (useGroq) {
            generateWithGroq(messages as GroqChatMessage[], callbacks as GroqStreamCallback);
        } else {
            generateWithStreaming(messages, callbacks);
        }
    });
}

/**
 * Get the final prompt for preview
 */
export function getPromptPreview(
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    options: GenerationOptions
): string {
    const template = getTemplate(options.templateId);
    
    const promptOptions: PromptOptions = {
        template: template,
        enabledSections: options.enabledSections,
        language: options.language,
        tone: options.tone,
        customInstructions: options.customInstructions,
        includeBadges: options.includeBadges,
        customBadges: options.customBadges
    };
    
    const { systemPrompt, userPrompt } = buildPrompt(
        projectInfo,
        detection,
        projectType,
        promptOptions
    );
    
    return `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
}
