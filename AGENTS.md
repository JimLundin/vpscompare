# Agent Guidelines for VPS Compare

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run preview` - Preview production build
- No test framework configured

## Code Style Guidelines

### Astro Components
- Use `.astro` extension for components with frontmatter at top (`---` delimiters)
- Component names use PascalCase (e.g., `VPSCard.astro`)
- Props interface defined in frontmatter with TypeScript types
- Runtime validation using Zod schemas for props when needed

### TypeScript & Imports
- Strict TypeScript config (`astro/tsconfigs/strict`) - use proper types
- Import with explicit extensions: `import Component from '../components/Component.astro'`
- Use `// @ts-check` in config files, type assertions in scripts (`as HTMLElement`)

### Styling & Structure
- Scoped `<style>` tags in `.astro` files with CSS custom properties
- Use tabs for indentation, kebab-case for CSS properties
- Mobile-first responsive design with `@media` queries
- Components in `src/components/`, layouts in `src/layouts/`, pages in `src/pages/`

### Error Handling & Validation
- Validate props with Zod schemas for runtime safety
- Use optional chaining and nullish coalescing in DOM manipulation
- Type DOM elements explicitly in scripts (`as HTMLSelectElement`)