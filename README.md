# Chrome Speed Meter Extension

A Chrome extension for monitoring real-time internet usage across browser tabs. This extension provides detailed insights into bandwidth consumption and helps users track their internet usage patterns.

## Project Setup

This project is built using modern web technologies to ensure optimal performance and maintainability:

- Vite for fast development and optimized builds
- React for efficient UI rendering
- TypeScript for type safety
- Tailwind CSS for responsive styling

### Prerequisites

Before you begin, ensure you have installed:

- Node.js (version 16 or higher)
- npm (usually comes with Node.js)
- Google Chrome browser

### Installation

Follow these steps to set up the development environment:

```bash
# Clone the repository
git clone https://github.com/your-username/chrome-speed-meter.git

# Navigate to the project directory
cd chrome-speed-meter

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Project Structure

The project follows a clean and maintainable structure:

```
chrome-speed-meter/
├── src/               # Source files
│   ├── assets/       # Static assets
│   ├── components/   # React components
│   └── styles/       # CSS and styling files
├── public/           # Public static files
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Project dependencies and scripts
```

### Available Scripts

The project includes several npm scripts for development:

- `npm run dev`: Starts the development server
- `npm run build`: Creates a production build
- `npm run preview`: Previews the production build locally

### Development

This project uses several key technologies and approaches:

1. **TypeScript Configuration**: The project uses two TypeScript configuration files:
   - `tsconfig.json`: Main configuration for the application code
   - `tsconfig.node.json`: Configuration for build tools and Node.js environment

2. **Vite Configuration**: The project uses Vite for fast development and optimized production builds. Key features include:
   - Hot Module Replacement (HMR)
   - Path aliasing for clean imports
   - Optimized asset handling

3. **Styling**: Tailwind CSS is configured for utility-first styling, making it easy to create responsive and maintainable designs.
