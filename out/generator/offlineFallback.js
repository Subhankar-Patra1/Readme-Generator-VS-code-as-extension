"use strict";
/**
 * Offline Fallback
 * Generates a basic README template when API is unavailable
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOfflineReadme = generateOfflineReadme;
const badgeGenerator_1 = require("./badgeGenerator");
/**
 * Generate a basic README template without AI
 */
function generateOfflineReadme(projectInfo, detection, projectType) {
    const projectName = projectInfo.name || 'Project';
    const badges = (0, badgeGenerator_1.getBadgesMarkdown)(projectInfo, detection);
    const description = projectInfo.packageJson?.description || 'A software project';
    const languages = detection.languages.map(l => l.name).join(', ') || 'Not detected';
    const frameworks = detection.frameworks.map(f => f.name).join(', ') || 'None';
    const packageManager = detection.packageManager || 'npm';
    let installCmd = '';
    let runCmd = '';
    // Generate install/run commands based on package manager
    switch (packageManager) {
        case 'npm':
            installCmd = 'npm install';
            runCmd = projectInfo.packageJson?.scripts?.dev
                ? 'npm run dev'
                : (projectInfo.packageJson?.scripts?.start ? 'npm start' : 'npm run start');
            break;
        case 'yarn':
            installCmd = 'yarn';
            runCmd = projectInfo.packageJson?.scripts?.dev
                ? 'yarn dev'
                : (projectInfo.packageJson?.scripts?.start ? 'yarn start' : 'yarn start');
            break;
        case 'pnpm':
            installCmd = 'pnpm install';
            runCmd = projectInfo.packageJson?.scripts?.dev
                ? 'pnpm dev'
                : (projectInfo.packageJson?.scripts?.start ? 'pnpm start' : 'pnpm start');
            break;
        case 'pip':
            installCmd = 'pip install -r requirements.txt';
            runCmd = 'python main.py';
            break;
        case 'cargo':
            installCmd = 'cargo build';
            runCmd = 'cargo run';
            break;
        case 'go mod':
            installCmd = 'go mod download';
            runCmd = 'go run .';
            break;
        default:
            installCmd = 'npm install';
            runCmd = 'npm start';
    }
    const readme = `# ${projectName}

${badges}

${description}

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## 📖 About

${description}

**Project Type:** ${projectType.displayName}

## ✨ Features

<!-- Add your features here -->
- Feature 1
- Feature 2
- Feature 3

## 🛠️ Tech Stack

- **Languages:** ${languages}
- **Frameworks:** ${frameworks}
- **Package Manager:** ${packageManager}

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- ${packageManager === 'pip' ? 'Python 3.x' : 'Node.js (v16 or higher)'}
- ${packageManager.charAt(0).toUpperCase() + packageManager.slice(1)}

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/username/${projectName.toLowerCase().replace(/\s+/g, '-')}.git
cd ${projectName.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

2. Install dependencies:
\`\`\`bash
${installCmd}
\`\`\`

## 💻 Usage

Run the project:

\`\`\`bash
${runCmd}
\`\`\`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📄 License

${projectInfo.packageJson?.license
        ? `This project is licensed under the ${projectInfo.packageJson.license} License.`
        : 'This project is licensed under the MIT License.'}

---

⚠️ *This README was generated offline using a basic template. For a better README, please configure your OpenRouter API key and regenerate.*
`;
    return readme;
}
//# sourceMappingURL=offlineFallback.js.map