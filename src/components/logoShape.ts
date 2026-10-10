// The logo's geometry and colours, shared by the logo (Logo.tsx) and the
// colour dots on the photo card (HoloCard.tsx), so the brand colours live in
// one place. Paths are on a 32-unit grid.

// Fixed brand colours, orange first. Fixed rather than theme variables because
// a logo should look the same in both themes (the light theme's deepened hues
// exist for text contrast). They match public/favicon.svg.
export const BRAND = ['#ff7a2f', '#19c3b1', '#ffd166', '#ef476f'];

// The mountain, drawn back to front. Two flat polygons make one peak with a
// lit side (orange) and a shaded side (teal); a gold sun sits behind it.
export const SUN = { cx: 23.5, cy: 9, r: 3.2 };
export const BACK_PEAK = 'M2 27 L12 9 L19.5 21 L22 17 L30 27 Z'; // teal: the whole mountain
export const FRONT_FACE = 'M2 27 L12 9 L16.5 16.5 L9 27 Z'; // orange: the sunny left side
export const GROUND = 'M2 27 H30 V29 H2 Z'; // rose: a base line
