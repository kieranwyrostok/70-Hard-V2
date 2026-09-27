// Light colour scheme used by the DEV app (Netlify branch deploys) so it looks clearly different from the live app.
// Each dark-theme colour on the left is swapped for its light-theme partner on the right in the built files.
// Backgrounds become light, text becomes dark, accents get a little deeper so they read on white.
export const LIGHT = {
  // backgrounds: page, tab bar, cards, fills, lines
  '#15181d': '#f3f4f7', '#111419': '#ffffff', '#171a20': '#eceef2', '#1b1f26': '#ffffff', '#1a1e24': '#ffffff',
  '#1c2029': '#eef0f4', '#1e232a': '#ffffff', '#20252c': '#f0f2f6', '#272c34': '#e7eaef', '#282d36': '#eceff3',
  '#2a3037': '#eaf0ff', '#2b3039': '#e1e5eb', '#30363f': '#d8dde4', '#353b45': '#cdd3dc', '#3d4450': '#c4cbd6',
  '#4f5766': '#a9b1be', '#2e3d22': '#deebc9', '#26331c': '#e4efd4',
  // text
  '#eef0f4': '#1b2130', '#d3d7df': '#2e3542', '#9ca3b0': '#586172', '#8c93a0': '#606979', '#8f9ab0': '#667189', '#6b7382': '#8b94a4',
  // accents + the ink used on top of them
  '#4f8dff': '#2d68ff', '#081631': '#ffffff', '#ffc233': '#f2a20c', '#e6a312': '#d4880a', '#231800': '#231800',
  '#a8f25c': '#45a01e', '#111a08': '#ffffff', '#ff5a5f': '#ec3f36',
  // "day missed" reds
  '#522a22': '#f0c2b7', '#3b2622': '#f5d6ce', '#251a18': '#fbeae6', '#200c08': '#fff3f0', '#170f0d': '#fff6f4',
  '#6e3638': '#e7a99f', '#b0452f': '#d9563d', '#93371f': '#c24a31', '#e0a89a': '#b5523f', '#8a6a60': '#8a5a4f', '#a89b96': '#7d6b66',
  '#c9c0bc': '#5c4b46', '#ffe9e2': '#3a1d16'
};
const RX = new RegExp(Object.keys(LIGHT).join('|') + '|rgba\\(168,242,92', 'gi');
export const toLight = s => s.replace(RX, m => m.startsWith('rgba') ? 'rgba(69,160,30' : LIGHT[m.toLowerCase()]);
