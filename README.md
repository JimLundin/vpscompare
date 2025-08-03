# VPS Compare

A modern VPS hosting comparison website built with Astro 5.0+ using the latest conventions and best practices.

## 🚀 Features

- **Modern Astro Architecture** - Built with Astro 5.0+ content collections and latest conventions
- **Content Collections** - Type-safe VPS data management with Zod schema validation
- **Modular Components** - Reusable UI components with proper separation of concerns
- **Advanced Filtering** - Real-time filtering and sorting with active filter display
- **Responsive Design** - Mobile-first approach with vanilla CSS (no framework dependencies)
- **Error Handling** - Graceful error boundaries and loading states
- **SEO Optimized** - Proper meta tags, Open Graph, and semantic HTML
- **Performance First** - Optimized builds with content caching

## 🏗️ Project Structure

```text
/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ErrorBoundary.astro
│   │   │   └── LoadingSpinner.astro
│   │   ├── ui/
│   │   │   ├── Badge.astro
│   │   │   └── Button.astro
│   │   └── vps/
│   │       ├── VPSCard.astro
│   │       ├── VPSFilters.astro
│   │       └── VPSGrid.astro
│   ├── data/
│   │   └── vps-plans.json
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── loaders/
│   │       └── vps-loader.ts
│   └── pages/
│       └── index.astro
├── content.config.ts
└── package.json
```

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`     |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## 🎯 Key Technologies

- **Astro 5.0+** - Modern static site generator with content collections
- **TypeScript** - Full type safety from data to UI
- **Zod** - Runtime schema validation (via `astro:content`)
- **Vanilla CSS** - No framework dependencies, custom design system
- **Content Collections** - Type-safe data management with built-in loaders

## 📊 Data Management

The project uses Astro's Content Collections API for type-safe data management:

- **Schema Validation** - Comprehensive Zod schemas with custom error messages
- **File Loader** - JSON data source with automatic validation
- **Custom Loaders** - Example implementation for external API integration
- **Type Safety** - Full TypeScript support with `CollectionEntry` types

## 🎨 Design System

Built with a custom vanilla CSS design system featuring:

- **Utility Classes** - Common patterns like `.btn`, `.badge`, `.card`
- **Component Styles** - Scoped styles for each component
- **Responsive Grid** - CSS Grid with mobile-first breakpoints
- **Color System** - Consistent color palette with semantic naming

## 🔧 Extending the Project

### Adding New VPS Providers

1. Add data to `src/data/vps-plans.json`
2. The schema will automatically validate the new entries
3. Components will automatically display the new providers

### Custom Data Sources

Use the example loader in `src/lib/loaders/vps-loader.ts` to integrate with external APIs:

```typescript
// In content.config.ts
import { createVPSLoader } from '../lib/loaders/vps-loader.js';

const vpsPlans = defineCollection({
  loader: createVPSLoader({
    apiUrl: 'https://api.example.com/vps-plans',
    apiKey: process.env.VPS_API_KEY
  }),
  schema: vpsSchema
});
```

## 📝 License

MIT License - feel free to use this project as a starting point for your own VPS comparison site.
