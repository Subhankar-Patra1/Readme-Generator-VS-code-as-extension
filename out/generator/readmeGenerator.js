"use strict";
/**
 * README Generator
 * Main orchestration for README generation
 * Supports both Groq and OpenRouter APIs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReadme = generateReadme;
exports.regenerateSection = regenerateSection;
exports.generateReadmeSimple = generateReadmeSimple;
exports.getPromptPreview = getPromptPreview;
const templates_1 = require("../templates/templates");
const promptBuilder_1 = require("./promptBuilder");
const openRouterClient_1 = require("../api/openRouterClient");
const groqClient_1 = require("../api/groqClient");
const offlineFallback_1 = require("./offlineFallback");
const secretStorage_1 = require("../utils/secretStorage");
/**
 * Generate README with streaming
 * Automatically uses HuggingFace if configured, otherwise OpenRouter
 */
async function generateReadme(projectInfo, detection, projectType, options, onToken, onComplete, onError) {
    // Check which API to use
    const hasGroqKey = await (0, secretStorage_1.hasHuggingFaceApiKey)(); // Reusing HF storage for Groq key
    const hasOrKey = await (0, secretStorage_1.hasApiKey)();
    const provider = await (0, secretStorage_1.getApiProvider)();
    // Use Groq if configured, or if it's the preferred provider
    const useGroq = hasGroqKey && (provider === 'huggingface' || !hasOrKey);
    if (!hasGroqKey && !hasOrKey) {
        // Use offline fallback
        const offlineContent = (0, offlineFallback_1.generateOfflineReadme)(projectInfo, detection, projectType);
        onComplete(offlineContent);
        return;
    }
    const template = (0, templates_1.getTemplate)(options.templateId);
    const promptOptions = {
        template: template,
        enabledSections: options.enabledSections,
        language: options.language,
        tone: options.tone,
        customInstructions: options.customInstructions,
        includeBadges: options.includeBadges,
        customBadges: options.customBadges
    };
    const { systemPrompt, userPrompt } = (0, promptBuilder_1.buildPrompt)(projectInfo, detection, projectType, promptOptions);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    const callbacks = {
        onToken: onToken,
        onComplete: onComplete,
        onError: onError
    };
    try {
        if (useGroq) {
            // Use Groq API
            await (0, groqClient_1.generateWithGroq)(messages, callbacks);
        }
        else {
            // Use OpenRouter API
            await (0, openRouterClient_1.generateWithStreaming)(messages, callbacks);
        }
    }
    catch (error) {
        // Fallback to offline mode on error
        const offlineContent = (0, offlineFallback_1.generateOfflineReadme)(projectInfo, detection, projectType);
        onError(new Error('API request failed. Using offline template.'));
        onComplete(offlineContent);
    }
}
/**
 * Regenerate a specific section
 */
async function regenerateSection(section, projectInfo, detection, projectType, currentContent, customInstructions, onToken, onComplete, onError) {
    const hasKey = await (0, secretStorage_1.hasApiKey)();
    if (!hasKey) {
        onError(new Error('API key not configured. Cannot regenerate section.'));
        return;
    }
    const { systemPrompt, userPrompt } = (0, promptBuilder_1.buildSectionRegeneratePrompt)(section, projectInfo, detection, projectType, currentContent, customInstructions);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    const callbacks = {
        onToken: onToken,
        onComplete: onComplete,
        onError: onError
    };
    // Check which API to use
    const hasGroqKey = await (0, secretStorage_1.hasHuggingFaceApiKey)(); // Reusing HF storage for Groq
    const hasOrKey = await (0, secretStorage_1.hasApiKey)();
    const provider = await (0, secretStorage_1.getApiProvider)();
    const useGroq = hasGroqKey && (provider === 'huggingface' || !hasOrKey);
    if (useGroq) {
        await (0, groqClient_1.generateWithGroq)(messages, callbacks);
    }
    else {
        await (0, openRouterClient_1.generateWithStreaming)(messages, callbacks);
    }
}
/**
 * Generate README non-streaming (for simple use cases)
 * Uses a promise-based wrapper around the streaming API
 */
async function generateReadmeSimple(projectInfo, detection, projectType, options) {
    const hasGroqKey = await (0, secretStorage_1.hasHuggingFaceApiKey)(); // Reusing HF storage for Groq key
    const hasOrKey = await (0, secretStorage_1.hasApiKey)();
    if (!hasGroqKey && !hasOrKey) {
        return {
            content: (0, offlineFallback_1.generateOfflineReadme)(projectInfo, detection, projectType),
            isOffline: true
        };
    }
    const template = (0, templates_1.getTemplate)(options.templateId);
    const promptOptions = {
        template: template,
        enabledSections: options.enabledSections,
        language: options.language,
        tone: options.tone,
        customInstructions: options.customInstructions,
        includeBadges: options.includeBadges,
        customBadges: options.customBadges
    };
    const { systemPrompt, userPrompt } = (0, promptBuilder_1.buildPrompt)(projectInfo, detection, projectType, promptOptions);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
    // Use a promise wrapper to collect the streamed content
    return new Promise((resolve) => {
        let content = '';
        const callbacks = {
            onToken: (token) => { content += token; },
            onComplete: (fullContent) => {
                resolve({
                    content: fullContent,
                    isOffline: false
                });
            },
            onError: () => {
                resolve({
                    content: (0, offlineFallback_1.generateOfflineReadme)(projectInfo, detection, projectType),
                    isOffline: true,
                    error: 'API request failed'
                });
            }
        };
        // Check which API to use
        const useGroq = hasGroqKey && (!hasOrKey);
        if (useGroq) {
            (0, groqClient_1.generateWithGroq)(messages, callbacks);
        }
        else {
            (0, openRouterClient_1.generateWithStreaming)(messages, callbacks);
        }
    });
}
/**
 * Get the final prompt for preview
 */
function getPromptPreview(projectInfo, detection, projectType, options) {
    const template = (0, templates_1.getTemplate)(options.templateId);
    const promptOptions = {
        template: template,
        enabledSections: options.enabledSections,
        language: options.language,
        tone: options.tone,
        customInstructions: options.customInstructions,
        includeBadges: options.includeBadges,
        customBadges: options.customBadges
    };
    const { systemPrompt, userPrompt } = (0, promptBuilder_1.buildPrompt)(projectInfo, detection, projectType, promptOptions);
    return `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`;
}
//# sourceMappingURL=readmeGenerator.js.map