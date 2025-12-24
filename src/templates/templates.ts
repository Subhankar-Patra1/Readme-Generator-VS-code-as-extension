/**
 * README Templates
 * 5 built-in templates for different project types
 */

export interface ReadmeSection {
    id: string;
    name: string;
    description: string;
    defaultEnabled: boolean;
}

export interface ReadmeTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    sections: ReadmeSection[];
    promptPrefix: string;
}

// All available sections
export const ALL_SECTIONS: ReadmeSection[] = [
    { id: 'title', name: 'Title & Badges', description: 'Project name, badges, and hero section', defaultEnabled: true },
    { id: 'toc', name: 'Table of Contents', description: 'Clickable navigation links', defaultEnabled: true },
    { id: 'description', name: 'Description', description: 'Project overview and purpose', defaultEnabled: true },
    { id: 'demo', name: 'Demo/Screenshots', description: 'Demo GIF or screenshots section', defaultEnabled: true },
    { id: 'features', name: 'Features', description: 'Key features and capabilities', defaultEnabled: true },
    { id: 'techstack', name: 'Tech Stack', description: 'Technologies and tools used', defaultEnabled: true },
    { id: 'structure', name: 'Project Structure', description: 'File tree and directory layout', defaultEnabled: true },
    { id: 'prerequisites', name: 'Prerequisites', description: 'System requirements and dependencies', defaultEnabled: true },
    { id: 'installation', name: 'Installation', description: 'How to install the project', defaultEnabled: true },
    { id: 'envvars', name: 'Environment Variables', description: 'Environment configuration table', defaultEnabled: false },
    { id: 'usage', name: 'Usage', description: 'How to use the project', defaultEnabled: true },
    { id: 'configuration', name: 'Configuration', description: 'Configuration options', defaultEnabled: false },
    { id: 'api', name: 'API Reference', description: 'API documentation', defaultEnabled: false },
    { id: 'examples', name: 'Examples', description: 'Code examples', defaultEnabled: false },
    { id: 'testing', name: 'Testing', description: 'How to run tests', defaultEnabled: false },
    { id: 'deployment', name: 'Deployment', description: 'Deployment instructions', defaultEnabled: false },
    { id: 'contributing', name: 'Contributing', description: 'Contribution guidelines', defaultEnabled: true },
    { id: 'roadmap', name: 'Roadmap', description: 'Future plans', defaultEnabled: false },
    { id: 'changelog', name: 'Changelog', description: 'Version history', defaultEnabled: false },
    { id: 'license', name: 'License', description: 'License information', defaultEnabled: true },
    { id: 'acknowledgements', name: 'Acknowledgements', description: 'Credits and thanks', defaultEnabled: false },
    { id: 'contact', name: 'Contact', description: 'Contact information', defaultEnabled: false }
];

// Open Source Template
export const openSourceTemplate: ReadmeTemplate = {
    id: 'openSource',
    name: 'Open Source',
    description: 'Ideal for open source projects with community focus',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20" stroke="currentColor" stroke-width="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2"/></svg>',
    sections: ALL_SECTIONS.map(s => ({
        ...s,
        defaultEnabled: ['title', 'description', 'features', 'installation', 'usage', 'contributing', 'license'].includes(s.id)
    })),
    promptPrefix: `Generate a README for an OPEN SOURCE project. Focus on:
- Community-friendly language
- Clear contribution guidelines
- Prominent badges (license, version, build status)
- Easy-to-follow installation and usage
- Welcoming tone to encourage contributions`
};

// Library/Package Template
export const libraryTemplate: ReadmeTemplate = {
    id: 'library',
    name: 'Library/Package',
    description: 'Best for npm packages, PyPI packages, or libraries',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sections: ALL_SECTIONS.map(s => ({
        ...s,
        defaultEnabled: ['title', 'description', 'features', 'installation', 'usage', 'api', 'examples', 'license'].includes(s.id)
    })),
    promptPrefix: `Generate a README for a LIBRARY/PACKAGE. Focus on:
- Quick installation instructions (copy-paste ready)
- API documentation with clear examples
- TypeScript/type support information
- Version compatibility notes
- Minimal but comprehensive documentation`
};

// Startup/SaaS Template
export const startupTemplate: ReadmeTemplate = {
    id: 'startup',
    name: 'Startup/SaaS',
    description: 'Perfect for startups and commercial products',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.48-.56.93-1.23 1.32-2h-4.32z" fill="currentColor"/><path d="M12 15l-3 3 5 5 3-3-5-5z" fill="currentColor"/><path d="M15 12l-5-5-1.5 3.5 3.5 1.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 15a8 8 0 1 1 0-14 8 8 0 0 1 0 14z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sections: ALL_SECTIONS.map(s => ({
        ...s,
        defaultEnabled: ['title', 'description', 'features', 'demo', 'installation', 'usage', 'deployment', 'contact'].includes(s.id)
    })),
    promptPrefix: `Generate a README for a STARTUP/SaaS product. Focus on:
- Compelling product description
- Key selling points and features
- Professional branding tone
- Easy getting started guide
- Support and contact information`
};

// Academic/College Template
export const academicTemplate: ReadmeTemplate = {
    id: 'academic',
    name: 'Academic/College',
    description: 'Suited for research projects and academic work',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sections: ALL_SECTIONS.map(s => ({
        ...s,
        defaultEnabled: ['title', 'description', 'features', 'installation', 'usage', 'acknowledgements', 'license'].includes(s.id)
    })),
    promptPrefix: `Generate a README for an ACADEMIC/RESEARCH project. Focus on:
- Clear problem statement and objectives
- Methodology explanation
- Results or expected outcomes
- Academic references format
- Proper attribution and acknowledgements`
};

// Personal Project Template
export const personalTemplate: ReadmeTemplate = {
    id: 'personal',
    name: 'Personal Project',
    description: 'Simple and clean for portfolio projects',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sections: ALL_SECTIONS.map(s => ({
        ...s,
        defaultEnabled: ['title', 'description', 'features', 'installation', 'usage', 'license'].includes(s.id)
    })),
    promptPrefix: `Generate a README for a PERSONAL/PORTFOLIO project. Focus on:
- Showcase your skills and learning
- Clean and simple format
- Highlight interesting technical challenges
- Visual appeal for portfolio
- Friendly, personal tone`
};

// All templates
export const TEMPLATES: Record<string, ReadmeTemplate> = {
    openSource: openSourceTemplate,
    library: libraryTemplate,
    startup: startupTemplate,
    academic: academicTemplate,
    personal: personalTemplate
};

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): ReadmeTemplate {
    return TEMPLATES[templateId] || openSourceTemplate;
}

/**
 * Get all templates as array
 */
export function getAllTemplates(): ReadmeTemplate[] {
    return Object.values(TEMPLATES);
}
