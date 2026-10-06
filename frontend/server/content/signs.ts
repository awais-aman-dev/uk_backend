import type { SignCategory, SignSpec } from '../../shared/types/learn'

const RED = '#d4021d'
const BLUE = '#005eb8'

const warn = (symbol: string): SignSpec => ({ shape: 'triangle', fill: '#fff', border: RED, symbol })
const ban = (symbol: string, extra: Partial<SignSpec> = {}): SignSpec => ({ shape: 'circle', fill: '#fff', border: RED, symbol, ...extra })
const must = (symbol: string): SignSpec => ({ shape: 'circle', fill: BLUE, symbol })
const info = (symbol: string, shape: SignSpec['shape'] = 'rect'): SignSpec => ({ shape, fill: BLUE, symbol })

export const SIGNS: { code: string; name: string; category: SignCategory; meaning: string; spec: SignSpec }[] = [
  // Warning — red triangles
  { code: 'crossroads', name: 'Crossroads', category: 'warning', meaning: 'Crossroads ahead. Watch for traffic joining from both sides.', spec: warn('plus') },
  { code: 't-junction', name: 'T-junction', category: 'warning', meaning: 'T-junction ahead. You’ll need to give way before turning left or right.', spec: warn('t-junction') },
  { code: 'bend-left', name: 'Bend to the left', category: 'warning', meaning: 'Bend to the left ahead. Slow down before the bend, not in it.', spec: warn('bend-left') },
  { code: 'double-bend', name: 'Double bend', category: 'warning', meaning: 'Double bend ahead, first to the left.', spec: warn('double-bend') },
  { code: 'roundabout-ahead', name: 'Roundabout', category: 'warning', meaning: 'Roundabout ahead. Be ready to give way to traffic from the right.', spec: warn('roundabout') },
  { code: 'traffic-signals', name: 'Traffic signals', category: 'warning', meaning: 'Traffic lights ahead, which may be out of sight.', spec: warn('signals') },
  { code: 'road-narrows', name: 'Road narrows on both sides', category: 'warning', meaning: 'The road gets narrower on both sides ahead.', spec: warn('narrows') },
  { code: 'two-way-traffic', name: 'Two-way traffic', category: 'warning', meaning: 'Two-way traffic straight ahead — often after a one-way section.', spec: warn('two-way') },
  { code: 'pedestrians', name: 'Pedestrians in road ahead', category: 'warning', meaning: 'Pedestrians may be walking in the road ahead.', spec: warn('person') },
  { code: 'children', name: 'Children going to or from school', category: 'warning', meaning: 'Children going to or from school or a playground ahead.', spec: warn('children') },
  { code: 'cyclists', name: 'Cycle route ahead', category: 'warning', meaning: 'Cyclists may be crossing or joining the road ahead.', spec: warn('bicycle') },
  { code: 'slippery-road', name: 'Slippery road', category: 'warning', meaning: 'Road surface may be slippery — slow down and avoid harsh braking.', spec: warn('skid') },
  { code: 'uneven-road', name: 'Uneven road', category: 'warning', meaning: 'Uneven road surface ahead.', spec: warn('bumps') },
  { code: 'roadworks', name: 'Road works', category: 'warning', meaning: 'Road works ahead. Expect lower speed limits and workers near the road.', spec: warn('roadworks') },
  { code: 'give-way', name: 'Give way', category: 'regulatory', meaning: 'Give way to traffic on the major road.', spec: { shape: 'inverted-triangle', fill: '#fff', border: RED, symbol: 'text', text: 'GIVE WAY' } },
  { code: 'stop', name: 'Stop', category: 'regulatory', meaning: 'Stop at the line and give way to traffic on the major road — even if it looks clear.', spec: { shape: 'octagon', fill: RED, border: '#fff', symbol: 'text', text: 'STOP' } },

  // Regulatory — red circles prohibit
  { code: 'speed-20', name: '20 mph limit', category: 'regulatory', meaning: 'Maximum speed 20 mph.', spec: ban('text', { text: '20' }) },
  { code: 'speed-30', name: '30 mph limit', category: 'regulatory', meaning: 'Maximum speed 30 mph.', spec: ban('text', { text: '30' }) },
  { code: 'speed-40', name: '40 mph limit', category: 'regulatory', meaning: 'Maximum speed 40 mph.', spec: ban('text', { text: '40' }) },
  { code: 'speed-50', name: '50 mph limit', category: 'regulatory', meaning: 'Maximum speed 50 mph.', spec: ban('text', { text: '50' }) },
  { code: 'national-speed-limit', name: 'National speed limit applies', category: 'regulatory', meaning: 'National speed limit applies: 60 mph on single carriageways and 70 mph on dual carriageways and motorways for cars.', spec: { shape: 'circle', fill: '#fff', symbol: 'national' } },
  { code: 'no-entry', name: 'No entry', category: 'regulatory', meaning: 'No entry for vehicular traffic.', spec: { shape: 'circle', fill: RED, symbol: 'no-entry' } },
  { code: 'no-overtaking', name: 'No overtaking', category: 'regulatory', meaning: 'Do not overtake.', spec: ban('cars') },
  { code: 'no-right-turn', name: 'No right turn', category: 'regulatory', meaning: 'Do not turn right.', spec: ban('arrow-right', { slash: true }) },
  { code: 'no-u-turn', name: 'No U-turns', category: 'regulatory', meaning: 'Do not make a U-turn.', spec: ban('u-turn', { slash: true }) },
  { code: 'no-cycling', name: 'No cycling', category: 'regulatory', meaning: 'No cycling.', spec: ban('bicycle') },
  { code: 'no-stopping', name: 'No stopping (clearway)', category: 'regulatory', meaning: 'No stopping at any time, not even to pick up or set down passengers.', spec: { shape: 'circle', fill: BLUE, border: RED, symbol: 'cross' } },
  { code: 'no-waiting', name: 'No waiting', category: 'regulatory', meaning: 'No waiting — usually with times shown on a plate below.', spec: { shape: 'circle', fill: BLUE, border: RED, symbol: 'slash' } },

  // Regulatory — blue circles give orders
  { code: 'turn-left', name: 'Turn left ahead', category: 'regulatory', meaning: 'Turn left ahead — a mandatory instruction.', spec: must('arrow-left') },
  { code: 'ahead-only', name: 'Ahead only', category: 'regulatory', meaning: 'You must go straight ahead.', spec: must('arrow-up') },
  { code: 'keep-left', name: 'Keep left', category: 'regulatory', meaning: 'Keep to the left of the sign — usually on a traffic island.', spec: must('keep-left') },
  { code: 'mini-roundabout', name: 'Mini-roundabout', category: 'regulatory', meaning: 'Mini-roundabout: give way to traffic from the right and go round clockwise.', spec: must('mini-roundabout') },

  // Information — rectangles
  { code: 'one-way', name: 'One-way traffic', category: 'information', meaning: 'One-way traffic in the direction of the arrow.', spec: info('one-way') },
  { code: 'parking', name: 'Parking place', category: 'information', meaning: 'Parking place or lay-by.', spec: info('P', 'square') },
  { code: 'hospital', name: 'Hospital ahead', category: 'information', meaning: 'Hospital ahead with an Accident and Emergency department.', spec: info('H', 'square') },
  { code: 'dead-end', name: 'No through road', category: 'information', meaning: 'No through road for vehicles.', spec: info('dead-end', 'square') },
  { code: 'motorway', name: 'Start of motorway', category: 'motorway', meaning: 'Start of motorway and point from which motorway regulations apply.', spec: info('motorway', 'square') }
]
