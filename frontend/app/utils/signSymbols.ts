// Symbol library for road signs: SVG fragments drawn in a ±20 unit box (currentColor = the sign's ink).
// Used by SignGraphic and the admin sign editor.
const RED = '#d4021d'

export const SIGN_SYMBOLS: Record<string, string> = {
  plus: '<path d="M0-18v36M-18 0h36" stroke="currentColor" stroke-width="7"/>',
  't-junction': '<path d="M0 18V-6M-18-8h36" stroke="currentColor" stroke-width="7"/>',
  'bend-left': '<path d="M6 19V2C6-8 0-12-8-13" fill="none" stroke="currentColor" stroke-width="7"/><path d="M-18-13 -6-21v16z" fill="currentColor"/>',
  'double-bend': '<path d="M4 19c0-8-10-9-10-17s10-9 10-17" fill="none" stroke="currentColor" stroke-width="6"/><path d="M-4-20 4-14 12-20z" fill="currentColor" transform="rotate(-20)"/>',
  roundabout: '<g fill="none" stroke="currentColor" stroke-width="5"><path d="M-12 7a14 14 0 0 1 4-19"/><path d="M12 7a14 14 0 0 1-20 7"/><path d="M4-14a14 14 0 0 1 10 17"/></g><g fill="currentColor"><path d="M-14-16l9 0-6 8z"/><path d="M-12 18l-3-9 9 3z" transform="rotate(120)"/><path d="M-12 18l-3-9 9 3z" transform="rotate(240)"/></g>',
  signals: '<rect x="-7" y="-19" width="14" height="38" rx="3" fill="#1d1d1f"/><circle cy="-10" r="4.2" fill="#ff3b30"/><circle r="4.2" fill="#ffb000"/><circle cy="10" r="4.2" fill="#30d158"/>',
  narrows: '<path d="M-12 19V5l6-8v-15M12 19V5l-6-8v-15" fill="none" stroke="currentColor" stroke-width="5"/>',
  'two-way': '<path d="M-7 19V-8M7-19V8" stroke="currentColor" stroke-width="5"/><path d="M-14-6-7-18 0-6zM0 6l7 12 7-12z" fill="currentColor"/>',
  person: '<circle cy="-14" r="4" fill="currentColor"/><path d="M0-8v12M0-5-7 3M0-5 7 1M0 4-6 17M0 4l6 13" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>',
  children: '<g transform="translate(-7 2) scale(.9)"><circle cy="-14" r="4" fill="currentColor"/><path d="M0-8v12M0-5-7 3M0-5 7 1M0 4-6 17M0 4l6 13" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/></g><g transform="translate(9 6) scale(.7)"><circle cy="-14" r="4" fill="currentColor"/><path d="M0-8v12M0-5-7 3M0-5 7 1M0 4-6 17M0 4l6 13" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/></g>',
  bicycle: '<g fill="none" stroke="currentColor" stroke-width="3"><circle cx="-10" cy="7" r="7"/><circle cx="10" cy="7" r="7"/><path d="M-10 7-2-6h10l2 13M-2-6l4 13h-12M8-6 6-11" stroke-linejoin="round"/></g><circle cx="1" cy="-15" r="3" fill="currentColor"/>',
  skid: '<rect x="-9" y="-19" width="18" height="12" rx="3" fill="currentColor"/><path d="M-6 0c-4 5 4 9 0 14M6 0c-4 5 4 9 0 14" fill="none" stroke="currentColor" stroke-width="3"/>',
  bumps: '<path d="M-19 12h6q4-14 8 0h2q4-14 8 0h14" fill="none" stroke="currentColor" stroke-width="5"/>',
  roadworks: '<circle cx="-4" cy="-14" r="4" fill="currentColor"/><path d="M-4-8l2 11-8 13M-2 3l7 13M-4-5l10 5M6 0l10-14" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M4 18q8-12 16 0z" fill="currentColor"/>',
  national: '<path d="M-28 20 20-28l8 8-48 48z" fill="#1d1d1f"/>',
  'no-entry': '<rect x="-32" y="-8" width="64" height="16" fill="#fff"/>',
  cars: '<g transform="translate(-9 0)"><rect x="-6" y="-10" width="12" height="18" rx="3" fill="#1d1d1f"/><rect x="-4" y="-6" width="8" height="5" rx="1" fill="#fff"/></g><g transform="translate(9 0)"><rect x="-6" y="-10" width="12" height="18" rx="3" fill="' + RED + '"/><rect x="-4" y="-6" width="8" height="5" rx="1" fill="#fff"/></g>',
  'arrow-right': '<path d="M-10 18V0q0-8 8-8h6" fill="none" stroke="currentColor" stroke-width="6"/><path d="M4-17l12 9-12 9z" fill="currentColor"/>',
  'u-turn': '<path d="M8 18V-2a8 8 0 0 0-16 0v8" fill="none" stroke="currentColor" stroke-width="6"/><path d="M-16 4h16L-8 16z" fill="currentColor"/>',
  'arrow-left': '<path d="M10 18V0q0-8-8-8h-6" fill="none" stroke="currentColor" stroke-width="6"/><path d="M-4-17l-12 9 12 9z" fill="currentColor"/>',
  'arrow-up': '<path d="M0 20V-6" stroke="currentColor" stroke-width="6"/><path d="M-11-4 0-20l11 16z" fill="currentColor"/>',
  'keep-left': '<path d="M12-12-6 6" stroke="currentColor" stroke-width="6"/><path d="M-14 14l4-16 12 12z" fill="currentColor"/>',
  'mini-roundabout': '<g fill="none" stroke="currentColor" stroke-width="5"><path d="M-13-5a14 14 0 0 1 15-9"/><path d="M13-5a14 14 0 0 1-6 17"/><path d="M-7 12a14 14 0 0 1-8-12"/></g><g fill="currentColor"><path d="M2-19l9 5-9 5z"/><path d="M2-19l9 5-9 5z" transform="rotate(120)"/><path d="M2-19l9 5-9 5z" transform="rotate(240)"/></g>',
  cross: '<path d="M-22-22 22 22M22-22-22 22" stroke="' + RED + '" stroke-width="7"/>',
  slash: '<path d="M-22-22 22 22" stroke="' + RED + '" stroke-width="7"/>',
  'one-way': '<path d="M-24 0h38" stroke="currentColor" stroke-width="8"/><path d="M10-12l16 12-16 12z" fill="currentColor"/>',
  'dead-end': '<path d="M0 20V-8" stroke="currentColor" stroke-width="9"/><rect x="-14" y="-18" width="28" height="9" fill="' + RED + '"/>',
  motorway: '<path d="M-16 20-5-12M16 20 5-12" stroke="currentColor" stroke-width="4"/><path d="M0 20v-6M0 8V2M0-4v-6" stroke="currentColor" stroke-width="3"/><path d="M-20-12h40" stroke="currentColor" stroke-width="4"/><path d="M-20-12v-6M20-12v-6" stroke="currentColor" stroke-width="3"/>'
}

