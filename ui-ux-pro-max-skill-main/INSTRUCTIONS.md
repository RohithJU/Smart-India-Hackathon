# UI/UX Pro Max Skill — Operational Instructions

> For the comprehensive guide, please refer to [UI_UX_PRO_MAX_INSTRUCTIONS.md](../UI_UX_PRO_MAX_INSTRUCTIONS.md) in the project root.

---

## Quick Reference Commands

### 1. Search by Design Domain
```bash
python src/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```
*Available Domains:* `product`, `style`, `color`, `typography`, `google-fonts`, `landing`, `chart`, `ux`, `icons`, `gsap`, `react`, `web`

### 2. Search Stack Guidelines (22 Frameworks)
```bash
python src/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```
*Available Stacks:* `html-tailwind`, `react`, `nextjs`, `shadcn`, `vue`, `nuxtjs`, `nuxt-ui`, `svelte`, `astro`, `angular`, `laravel`, `threejs`, `swiftui`, `jetpack-compose`, `react-native`, `flutter`, `javafx`, `wpf`, `winui`, `avalonia`, `uno`, `uwp`

### 3. Generate Complete Design System
```bash
python src/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system -p "<ProjectName>"
```

### 4. Fine-Tune with Design Dials (1–10)
```bash
python src/ui-ux-pro-max/scripts/search.py "<query>" --design-system --variance <1-10> --motion <1-10> --density <1-10>
```
- `--variance`: `1` (minimal/centered) to `10` (bold/asymmetric/bento)
- `--motion`: `1` (subtle micro-interactions) to `10` (complex GSAP choreography)
- `--density`: `1` (spacious 24-96px) to `10` (dense dashboard 8-32px)

### 5. Persist Design System (Master + Overrides Pattern)
```bash
python src/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "<ProjectName>" --output-dir "<project-root>" [--page "<page-name>"]
```

### 6. Contributor Asset Sync
```bash
cd cli
npm run sync:assets    # Mirrors src/ -> cli/assets/ and .claude/skills/
npm run check:assets   # Validates sync integrity
npm run verify:data    # Runs full test & validation suite
```
