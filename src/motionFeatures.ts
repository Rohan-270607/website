// domMax includes drag. It is the biggest part of Framer Motion, so App.tsx
// loads this file with a dynamic import: it becomes its own chunk that
// downloads after the page is already showing, instead of blocking it.
export { domMax as default } from 'framer-motion';
