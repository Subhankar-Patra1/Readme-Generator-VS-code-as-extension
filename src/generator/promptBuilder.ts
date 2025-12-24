/**
 * Prompt Builder
 * The "Brain" that constructs the final prompt sent to the AI
 * Based on project analysis and user settings
 */

import { ProjectInfo, getProjectSummary } from '../analysis/workspaceScanner';
import { DetectionResult } from '../analysis/languageDetector';
import { ProjectTypeResult } from '../analysis/projectTypeDetector';
import { ReadmeTemplate, ReadmeSection } from '../templates/templates';
import { getBadgesMarkdown } from './badgeGenerator';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PromptOptions {
    template: ReadmeTemplate;
    enabledSections: string[];
    language: string;
    tone: string;
    customInstructions?: string;
    includeBadges: boolean;
    customBadges?: string;
}

export interface GeneratedPrompt {
    systemPrompt: string;
    userPrompt: string;
    badges?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get language instruction based on selected language
 * Supports: English, Simple English, Spanish, French, German, Chinese, Japanese, Hindi
 */
function getLanguageInstruction(language: string): string {
    const instructions: Record<string, string> = {
        'english': 'Write in fluent, professional English.',
        'simpleEnglish': 'Write in simple, easy-to-understand English. Avoid jargon and complex technical terms.',
        'spanish': 'Write in Spanish (Español). Use proper grammar and professional vocabulary.',
        'french': 'Write in French (Français). Use proper grammar and professional vocabulary.',
        'german': 'Write in German (Deutsch). Use proper grammar and professional vocabulary.',
        'chinese': 'Write in Simplified Chinese (简体中文). Use proper grammar and professional vocabulary.',
        'japanese': 'Write in Japanese (日本語). Use proper grammar and professional vocabulary.',
        'hindi': 'Write in Hindi (हिन्दी). Use proper grammar and professional vocabulary.',
    };

    return instructions[language] || instructions['english'];
}

/**
 * Get tone instruction based on selected tone
 * Supports: Professional, Friendly, Minimal, Technical
 */
function getToneInstruction(tone: string): string {
    const instructions: Record<string, string> = {
        'professional': 'Use a professional, authoritative tone. Be clear, concise, and direct.',
        'friendly': 'Use a friendly, welcoming tone. Be approachable, encouraging, and enthusiastic.',
        'minimal': 'Use a minimal, concise tone. Focus only on essential information. No fluff.',
        'technical': 'Use a technical, detailed tone. Include specifications, configurations, and in-depth explanations.',
    };

    return instructions[tone] || instructions['professional'];
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

/**
 * Build the system prompt with explicit style rules
 */
function buildSystemPrompt(options: PromptOptions): string {
    return `You are an expert technical writer specializing in creating beautiful, professional README.md files that look stunning on GitHub.

${options.template.promptPrefix}

${getLanguageInstruction(options.language)}
${getToneInstruction(options.tone)}

═══════════════════════════════════════════════════════════════════════════════
🎨 MANDATORY STYLE RULES (FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════════════════════

## 1. TITLE SECTION FORMAT (USE ACTUAL PROJECT NAME!)
⚠️ The project name is provided in the project analysis. Use IT, not a placeholder!

\`\`\`markdown
# [emoji] [ACTUAL PROJECT NAME FROM ANALYSIS] - Short Catchy Tagline

![Tech1](https://img.shields.io/badge/Tech1-color?style=flat-square&logo=tech1)
![Tech2](https://img.shields.io/badge/Tech2-color?style=flat-square&logo=tech2)

> A brief, compelling description of what this project does and why it matters.
\`\`\`

EXAMPLE: If project is named "watchtogether", the heading should be:
\`\`\`markdown
# 🎬 WatchTogether - Watch Videos Together in Real-Time
\`\`\`

CRITICAL: 
- Read the project name from "Project: [name]" in the analysis
- Capitalize it properly (WatchTogether, not watchtogether)
- Add a relevant emoji at the start
- Add a catchy tagline that describes what it does

## 2. BADGE COLORS (Use these EXACT hex codes)
| Technology | Color | Logo |
|------------|-------|------|
| React | \`#61DAFB\` | react |
| Vue | \`#4FC08D\` | vuedotjs |
| Angular | \`#DD0031\` | angular |
| Next.js | \`#000000\` | nextdotjs |
| Node.js | \`#339933\` | nodedotjs |
| TypeScript | \`#3178C6\` | typescript |
| JavaScript | \`#F7DF1E\` | javascript |
| Python | \`#3776AB\` | python |
| Go | \`#00ADD8\` | go |
| Rust | \`#000000\` | rust |
| MongoDB | \`#47A248\` | mongodb |
| PostgreSQL | \`#4169E1\` | postgresql |
| Docker | \`#2496ED\` | docker |
| Tailwind | \`#06B6D4\` | tailwindcss |

## 3. FEATURE LIST FORMAT (EXACT PATTERN)
Each feature MUST follow this format:
\`\`\`
- [emoji] **Feature Name** - Brief description of what it does
\`\`\`

Example patterns (adapt to the actual project):
\`\`\`markdown
## ✨ Features

- � **[Main Feature]** - Description based on actual project functionality
- ⚡ **[Performance Feature]** - How the project optimizes something
- 🔒 **[Security Feature]** - Security aspects if applicable
- 🎨 **[UI/UX Feature]** - User interface highlights
- 🛠️ **[Developer Feature]** - Developer experience improvements
\`\`\`

IMPORTANT: Analyze the actual project files to write REAL features, not placeholders!

## 4. EMOJI RULES
Use VARIED, COLORFUL emojis - different for each item:
🎬 🎯 🖥️ 🎤 💬 🎨 ⚡ 🛠️ 🔒 📱 🌐 🚀 ✨ 💡 🔥 📊 🎮 🔧 📦 🎪 🌟 💎 🏆 🎉 💪 🌈 ⭐ 🔑 📈 🎭

## 5. SECTION HEADERS (With emojis)
\`\`\`markdown
## ✨ Features
## 🚀 Getting Started
## 📦 Installation
## 💻 Usage
## ⚙️ Configuration
## 🏗️ Project Structure
## 🧪 Testing
## 🤝 Contributing
## 📄 License
## 🙏 Acknowledgments
\`\`\`

## 5b. INSTALLATION GUIDE (CRITICAL - ANALYZE ACTUAL PROJECT STRUCTURE)

⚠️ IMPORTANT: ONLY include installation steps for folders that ACTUALLY EXIST in the project!
- First, analyze the project's folder structure from the provided file list
- If there's NO "client" folder, DO NOT mention "client" in installation
- If there's NO "server" folder, DO NOT mention "server" in installation
- Only include steps for folders that have their own package.json

EXAMPLES OF CORRECT BEHAVIOR:

**If project ONLY has root package.json (single folder project):**
\`\`\`markdown
## 📦 Installation
\`\`\`bash
git clone <repository-url>
cd projectname
npm install
\`\`\`

## 🚀 Running
\`\`\`bash
npm run dev
\`\`\`
\`\`\`

**If project has "server" folder but NO "client" folder:**
\`\`\`markdown
## � Installation

### 1. Install root dependencies:
\`\`\`bash
npm install
\`\`\`

### 2. Install server dependencies:
\`\`\`bash
cd server
npm install
\`\`\`
\`\`\`

**If project has both "client" AND "server" folders:**
- Then include steps for both

KEY RULES FOR INSTALLATION:
1. ⚠️ ANALYZE the actual folder structure first - don't assume folders exist
2. ⚠️ NEVER write installation for folders that don't exist
3. Only include subfolders that have their own package.json
4. Use the ACTUAL folder names from the project (might be "frontend", "api", "web", etc.)
5. Check the file list provided to see what folders actually exist


## 6. CODE BLOCKS
ALWAYS specify the language for syntax highlighting:
\`\`\`bash
npm install package-name
\`\`\`
\`\`\`typescript
const example = "Hello World";
\`\`\`
\`\`\`python
print("Hello World")
\`\`\`

## 7. PROJECT STRUCTURE (CRITICAL - READ ACTUAL FILES!)

⚠️⚠️⚠️ EXTREMELY IMPORTANT: 
- The FILE LIST is provided in the project analysis below
- DO NOT make up folder names! Read the ACTUAL folders from the file list
- DO NOT include folders like "client/", "server/" if they don't exist in the file list
- ONLY show files and folders that ACTUALLY EXIST in the provided file list

HOW TO CREATE THE STRUCTURE:
1. Look at the "Files:" section in the project analysis
2. List ONLY those files and folders, nothing else
3. Use ASCII tree format with descriptions

EXAMPLE FORMAT:
\`\`\`
projectname/
├── src/                       # Source code
│   ├── index.ts              # Entry point
│   └── utils.ts              # Utility functions
├── package.json              # Dependencies
└── README.md                 # This file
\`\`\`

WRONG (making up folders):
\`\`\`
├── client/                   # ❌ Don't add if doesn't exist!
├── server/                   # ❌ Don't add if doesn't exist!
\`\`\`

KEY RULES:
1. ⚠️ READ the actual file list from the analysis - don't invent folders
2. Only show folders and files that appear in the provided file list
3. Group by actual folder structure, not assumed structure
4. Add helpful # descriptions for each item

## 8. TABLES FOR STRUCTURED DATA
\`\`\`markdown
| Variable | Description | Required |
|----------|-------------|----------|
| \`API_KEY\` | Your API key | Yes |
| \`DB_URL\` | Database connection | Yes |
\`\`\`

## 9. VISUAL ELEMENTS
- Use horizontal rules \`---\` between major sections
- Use blockquotes \`>\` for important notes
- Use collapsible sections for long content:
\`\`\`markdown
<details>
<summary>Click to expand</summary>
Content here
</details>
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
📋 QUALITY REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

1. ✅ Every feature line: [emoji] **Bold Name** - Description
2. ✅ Use inline shields.io badges with correct colors
3. ✅ Each feature should have a DIFFERENT emoji
4. ✅ Make descriptions detailed but concise
5. ✅ Use proper Markdown syntax throughout
6. ✅ Include Table of Contents for long READMEs
7. ✅ Code blocks MUST have language specifiers
8. ✅ Make it look like a TOP GitHub repository

Generate the README now. Make it BEAUTIFUL and PROFESSIONAL!`;
}

// ============================================================================
// SECTION INSTRUCTIONS BUILDER
// ============================================================================

/**
 * Build section instructions from enabled sections
 */
function buildSectionInstructions(enabledSections: string[], template: ReadmeTemplate): string {
    const sectionDetails = template.sections
        .filter(s => enabledSections.includes(s.id))
        .map(s => `- **${s.name}**: ${s.description}`)
        .join('\n');

    return `Generate ONLY these sections in this order:
${sectionDetails}`;
}

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

/**
 * Build the user prompt with project context
 */
function buildUserPrompt(
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    options: PromptOptions,
    badges?: string
): string {
    const projectSummary = getProjectSummary(projectInfo);

    let prompt = `Generate a README.md for the following project:

═══════════════════════════════════════════════════════════════════════════════
📁 PROJECT INFORMATION
═══════════════════════════════════════════════════════════════════════════════

${projectSummary}

═══════════════════════════════════════════════════════════════════════════════
🔍 DETECTED TECHNOLOGIES
═══════════════════════════════════════════════════════════════════════════════

| Category | Detected |
|----------|----------|
| **Project Type** | ${projectType.displayName} |
| **Languages** | ${detection.languages.map(l => l.name).join(', ') || 'None detected'} |
| **Frameworks** | ${detection.frameworks.map(f => f.name).join(', ') || 'None detected'} |
| **Package Manager** | ${detection.packageManager || 'Unknown'} |
| **Build Tools** | ${detection.buildTools.join(', ') || 'None detected'} |
| **Test Frameworks** | ${detection.testFrameworks.join(', ') || 'None detected'} |

═══════════════════════════════════════════════════════════════════════════════
📑 TEMPLATE & SECTIONS
═══════════════════════════════════════════════════════════════════════════════

**Template**: "${options.template.name}"

${buildSectionInstructions(options.enabledSections, options.template)}`;

    // Add auto-generated badges
    if (options.includeBadges && badges) {
        prompt += `

═══════════════════════════════════════════════════════════════════════════════
🏷️ AUTO-DETECTED BADGES (Include these at the top)
═══════════════════════════════════════════════════════════════════════════════

${badges}`;
    }

    // Add user-selected custom badges
    if (options.customBadges && options.customBadges.trim()) {
        prompt += `

═══════════════════════════════════════════════════════════════════════════════
🎯 USER-SELECTED BADGES (Include these prominently)
═══════════════════════════════════════════════════════════════════════════════

${options.customBadges}`;
    }

    // Add custom instructions
    if (options.customInstructions) {
        prompt += `

═══════════════════════════════════════════════════════════════════════════════
📝 ADDITIONAL INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

${options.customInstructions}`;
    }

    prompt += `

═══════════════════════════════════════════════════════════════════════════════
🚀 GENERATE NOW
═══════════════════════════════════════════════════════════════════════════════

Generate the complete README.md content following all style rules above:`;

    return prompt;
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================

/**
 * Build the complete prompt for README generation
 */
export function buildPrompt(
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    options: PromptOptions
): GeneratedPrompt {
    // Generate badges using auto-detection
    const badges = options.includeBadges
        ? getBadgesMarkdown(projectInfo, detection)
        : undefined;

    return {
        systemPrompt: buildSystemPrompt(options),
        userPrompt: buildUserPrompt(projectInfo, detection, projectType, options, badges),
        badges: badges,
    };
}

// ============================================================================
// SECTION REGENERATION
// ============================================================================

/**
 * Build prompt for regenerating a specific section
 */
export function buildSectionRegeneratePrompt(
    section: ReadmeSection,
    projectInfo: ProjectInfo,
    detection: DetectionResult,
    projectType: ProjectTypeResult,
    currentContent: string,
    customInstructions?: string
): GeneratedPrompt {
    const projectSummary = getProjectSummary(projectInfo);

    const systemPrompt = `You are an expert technical writer. Your task is to regenerate a SPECIFIC section of a README file.

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL INSTRUCTION
═══════════════════════════════════════════════════════════════════════════════

Generate ONLY the "${section.name}" section.
- Do NOT include any other sections
- Do NOT include intro or outro text
- Do NOT include the full README

═══════════════════════════════════════════════════════════════════════════════
🎨 FORMATTING RULES
═══════════════════════════════════════════════════════════════════════════════

1. Use proper Markdown formatting with headers (##, ###)
2. MUST use emojis in headers and bullet points
3. For features: [emoji] **Bold Name** - Description
4. For code blocks: ALWAYS specify language (\`\`\`bash, \`\`\`javascript, etc.)
5. Use tables for structured data
6. Make it look BEAUTIFUL!

Varied emojis to use:
🎬 🎯 🖥️ 🎤 💬 🎨 ⚡ 🛠️ 🔒 📱 🌐 🚀 ✨ 💡 🔥 📊 🎮 🔧 📦 🎪 🌟 💎 🏆`;

    let userPrompt = `Regenerate the "${section.name}" section for this project:

═══════════════════════════════════════════════════════════════════════════════
📁 PROJECT CONTEXT
═══════════════════════════════════════════════════════════════════════════════

${projectSummary}

| Category | Value |
|----------|-------|
| **Project Type** | ${projectType.displayName} |
| **Languages** | ${detection.languages.map(l => l.name).join(', ') || 'Unknown'} |
| **Frameworks** | ${detection.frameworks.map(f => f.name).join(', ') || 'None detected'} |
| **Package Manager** | ${detection.packageManager || 'Unknown'} |

═══════════════════════════════════════════════════════════════════════════════
📄 CURRENT README (For Reference)
═══════════════════════════════════════════════════════════════════════════════

\`\`\`markdown
${currentContent}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
🎯 SECTION TO REGENERATE
═══════════════════════════════════════════════════════════════════════════════

**${section.name}**: ${section.description}`;

    if (customInstructions) {
        userPrompt += `

═══════════════════════════════════════════════════════════════════════════════
📝 ADDITIONAL INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

${customInstructions}`;
    }

    userPrompt += `

═══════════════════════════════════════════════════════════════════════════════
🚀 GENERATE NOW
═══════════════════════════════════════════════════════════════════════════════

Generate ONLY the "${section.name}" section now:`;

    return {
        systemPrompt,
        userPrompt,
    };
}

// ============================================================================
// REFINEMENT PROMPT BUILDER
// ============================================================================

/**
 * Build a prompt for refining the README based on natural language instructions
 * Allows users to make specific changes without regenerating the entire README
 */
export function buildRefinementPrompt(
    instruction: string,
    currentReadme: string
): GeneratedPrompt {
    const systemPrompt = `You are an expert technical writer who specializes in refining and improving README.md files.

Your task is to modify the provided README based on the user's natural language instruction.

CRITICAL RULES:
1. ⚠️ ONLY CHANGE WHAT THE USER ASKS FOR - This is the #1 rule!
   - If user says "change the heading" → ONLY change the heading, leave everything else UNTOUCHED
   - If user says "rewrite installation" → ONLY rewrite installation section, leave all other sections EXACTLY as they are
   - DO NOT modify, improve, or "fix" sections the user didn't mention

2. ⚠️ PRESERVE EXACT FORMATTING for unchanged sections:
   - If badges are on ONE LINE, keep them on ONE LINE
   - If there are blank lines between sections, keep them
   - Copy unchanged sections CHARACTER BY CHARACTER

3. Keep all badges, emojis, and styling EXACTLY as they appear in unchanged sections
4. Return the COMPLETE modified README (but only the requested part is different)
5. Use proper Markdown syntax throughout

EXAMPLE OF CORRECT BEHAVIOR:
User says: "Change the heading to say MyApp"

BEFORE:
# OldName - A Great App
![Badge1](url1) ![Badge2](url2)
> Description text here

AFTER (CORRECT - only heading changed):
# MyApp - A Great App  
![Badge1](url1) ![Badge2](url2)
> Description text here

AFTER (WRONG - changed more than requested):
# MyApp  ← Changed (good)
![Badge1](url1)  ← Moved to new line (BAD!)
![Badge2](url2)  ← Moved to new line (BAD!)
> Better description ← Changed description (BAD!)

FORMATTING EXAMPLES:
ORIGINAL (badges on same line):
\`\`\`
![JavaScript](badge1) ![HTML5](badge2) ![npm](badge3)
\`\`\`
CORRECT OUTPUT (keep on same line):
\`\`\`
![JavaScript](badge1) ![HTML5](badge2) ![npm](badge3)
\`\`\`
WRONG OUTPUT (breaking onto separate lines):
\`\`\`
![JavaScript](badge1)
![HTML5](badge2)
![npm](badge3)
\`\`\`

COMMON INSTRUCTIONS AND HOW TO HANDLE THEM:
- "Rewrite [section]" → Completely rewrite only that section with fresh content
- "Make it more detailed" → Add more explanation, examples, and depth
- "Make it shorter" → Remove unnecessary content while keeping key points
- "Add more emojis" → Add relevant emojis to headers and features
- "Fix [something]" → Correct the specific issue mentioned
- "Add [something]" → Insert new content in the appropriate place
- "Remove [something]" → Delete the specified content
- "Improve [section]" → Enhance quality without complete rewrite
- "Add a diagram" / "Add architecture diagram" / "Add flow diagram" → Create an ASCII art diagram

SPECIAL: FILE STRUCTURE REQUESTS
When user asks to "add more details to file structure" or "add more files":
1. Look at the existing file structure in the README
2. Expand it by adding MORE files that would logically exist in the same folders
3. Add subfolders if they would make sense (like components/, utils/, hooks/, etc.)
4. For example, if user says "add api.js file":
   - Find the appropriate folder in the structure
   - Add the file there with a description
5. Keep the same ASCII tree format (├──, └──, │)
6. Add helpful # descriptions for each new file

Example:
User: "Add more files to the src folder"
BEFORE:
\`\`\`
src/
├── index.js              # Entry point
└── App.js                # Main component
\`\`\`
AFTER (add logical files):
\`\`\`
src/
├── index.js              # Entry point
├── App.js                # Main component
├── App.css               # Main styles
├── components/           # Reusable components
│   ├── Header.js        # Navigation header
│   └── Footer.js        # Footer component
└── utils/                # Utility functions
    └── helpers.js        # Helper functions
\`\`\`

ASCII DIAGRAMS - AI DECIDES THE BEST FORMAT:
When user asks for diagrams, CHOOSE the most appropriate format based on the project and context. Here are examples:

**Type 1: Flow Diagram (for request/response, data flow)**
\`\`\`
Client Request → API Gateway → Service → Database
                                  ↓
                          External API
\`\`\`

**Type 2: Box Diagram (for architecture explanations)**
\`\`\`
+------------------------------------------------------------------+
|                     Why This Approach?                            |
+------------------------------------------------------------------+
|  Problem: [Describe the problem]                                  |
|  Solution: [Describe the solution]                                |
|                                                                   |
|   +----------+          +----------+          +----------+        |
|   | Step 1   | -------> | Step 2   | -------> | Step 3   |        |
|   +----------+          +----------+          +----------+        |
+------------------------------------------------------------------+
\`\`\`

**Type 3: Simple Arrow Flow (for simple processes)**
\`\`\`
User → Frontend → Backend → Database
                     ↑
                   Redis Cache
\`\`\`

**Type 4: Layered Architecture**
\`\`\`
┌─────────────────────────────────┐
│         Presentation Layer       │
├─────────────────────────────────┤
│          Business Logic          │
├─────────────────────────────────┤
│           Data Access            │
├─────────────────────────────────┤
│            Database              │
└─────────────────────────────────┘
\`\`\`

**Type 5: Component Relationship**
\`\`\`
    ┌──────────┐
    │  Main    │
    │  App     │
    └────┬─────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Auth  │ │ API   │
└───────┘ └───────┘
\`\`\`

CHOOSE THE RIGHT DIAGRAM TYPE based on:
- What the user is trying to explain
- The actual project's architecture
- Complexity of the concept`;

    const userPrompt = `═══════════════════════════════════════════════════════════════════════════════
📄 CURRENT README
═══════════════════════════════════════════════════════════════════════════════

\`\`\`markdown
${currentReadme}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
📝 USER'S INSTRUCTION
═══════════════════════════════════════════════════════════════════════════════

${instruction}

═══════════════════════════════════════════════════════════════════════════════
🚀 GENERATE THE MODIFIED README
═══════════════════════════════════════════════════════════════════════════════

Apply the user's instruction and return the COMPLETE modified README.

⚠️ CRITICAL OUTPUT RULES:
- DO NOT wrap your output in \\\`\\\`\\\`markdown or any code blocks
- DO NOT add any explanations or comments
- Just output the raw README content directly, starting with the title (e.g., # Project Name)
- The first character of your output should be "#" or "!" (for badge)

OUTPUT NOW (no code blocks, just the raw README):`;

    return {
        systemPrompt,
        userPrompt,
    };
}
