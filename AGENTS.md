# Agent Guidelines for VPS Compare

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- No test framework configured

## Code Style Guidelines

### Astro Components
- Use `.astro` extension for components
- Place frontmatter at top with `---` delimiters
- Import statements use relative paths with file extensions
- Component names use PascalCase (e.g., `Welcome.astro`)

### TypeScript
- Strict TypeScript configuration enabled (`astro/tsconfigs/strict`)
- Use `// @ts-check` for JavaScript files when needed

### Imports & File Structure
- Relative imports with explicit extensions: `import Welcome from '../components/Welcome.astro'`
- Assets imported as modules: `import astroLogo from '../assets/astro.svg'`
- Components in `src/components/`, layouts in `src/layouts/`, pages in `src/pages/`

### Styling
- Scoped styles using `<style>` tags in `.astro` files
- Use tabs for indentation in HTML/Astro templates
- CSS properties use kebab-case
- Responsive design with mobile-first approach