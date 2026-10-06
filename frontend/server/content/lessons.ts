import type { Block } from '../../shared/types/learn'
import type { TopicSlug } from './topics'

interface LessonSeed {
  slug: string
  topic: TopicSlug
  title: string
  summary: string
  minutes: number
  blocks: Block[]
}

export const LESSONS: LessonSeed[] = [
  {
    slug: 'observation-and-distraction',
    topic: 'alertness',
    title: 'Look early, stay focused',
    summary: 'How good drivers scan the road — and why your phone stays in the glovebox.',
    minutes: 4,
    blocks: [
      { type: 'text', text: 'Most crashes aren’t caused by a lack of skill. They happen because a driver **didn’t see** something in time. Alertness is about looking far ahead, checking around you and keeping your attention on the road.' },
      { type: 'figure', figure: 'mirror-signal', caption: 'Mirrors, signal, position, speed, look — before every change of speed or direction.' },
      { type: 'keypoints', title: 'Scan like a pro', items: ['Look well ahead — at least 12 seconds up the road.', 'Check your mirrors every 5–8 seconds and before you slow down or change direction.', 'Do a final shoulder check for blind spots before pulling out or turning across traffic.', 'At night, slow down or stop if you’re dazzled — never retaliate with main beam.'] },
      { type: 'callout', tone: 'rule', title: 'The law on phones', text: 'You **must not** hold a phone or sat nav while driving — including in queues or at traffic lights. The only exception is a 999 or 112 call in a genuine emergency when it’s unsafe or impractical to stop.' },
      { type: 'check', questions: ['al-phone', 'al-uturn', 'al-msm'] }
    ]
  },
  {
    slug: 'courtesy-and-following',
    topic: 'attitude',
    title: 'Patience and safe gaps',
    summary: 'Keep your cool, give others space and use the two-second rule.',
    minutes: 4,
    blocks: [
      { type: 'text', text: 'A good attitude is a safety skill. Calm drivers make better decisions, leave more space and are far less likely to be involved in a crash.' },
      { type: 'figure', figure: 'two-second-rule', caption: 'When the car ahead passes a fixed point, say “Only a fool breaks the two-second rule.” If you reach the point before you finish, you’re too close.' },
      { type: 'keypoints', items: ['Leave at least a two-second gap on dry roads, four in the wet, and up to ten times more on ice.', 'Only flash your headlights to let others know you’re there.', 'If someone makes a mistake, let it go — don’t chase, tailgate or gesture.', 'Hang back from large vehicles so you can see past them and they can see you.'] },
      { type: 'check', questions: ['at-gap', 'at-cutin', 'at-flash'] }
    ]
  },
  {
    slug: 'vehicle-checks',
    topic: 'safety-and-your-vehicle',
    title: 'Keep your car roadworthy',
    summary: 'POWDER checks, tyres and the warning lights you can’t ignore.',
    minutes: 5,
    blocks: [
      { type: 'text', text: 'You’re responsible for making sure your car is safe to drive. A few minutes of checks each week can stop a breakdown — or a crash.' },
      { type: 'keypoints', title: 'POWDER', items: ['**P**etrol — enough fuel for the trip.', '**O**il — check the level on flat ground before long journeys.', '**W**ater — coolant and screenwash topped up.', '**D**amage — lights, wipers, mirrors and bodywork.', '**E**lectrics — all lights and indicators working.', '**R**ubber — tyre pressures and at least 1.6 mm of tread.'] },
      { type: 'callout', tone: 'warning', title: 'Red warning light?', text: 'A red light on the dashboard — brakes, oil pressure or engine temperature — means stop as soon as it’s safe and get help.' },
      { type: 'check', questions: ['sv-tread', 'sv-brake-light', 'sv-fuel'] }
    ]
  },
  {
    slug: 'stopping-distances',
    topic: 'safety-margins',
    title: 'Stopping distances',
    summary: 'Thinking plus braking distance — and how fast it grows with speed.',
    minutes: 5,
    blocks: [
      { type: 'text', text: 'Your **overall stopping distance** is the distance you travel while you react (thinking distance) plus the distance it takes the brakes to stop the car (braking distance). Double your speed and the braking distance roughly **quadruples**.' },
      { type: 'figure', figure: 'stopping-distances', caption: 'Drag the speed slider and switch between dry, wet and icy roads.' },
      { type: 'keypoints', title: 'Learn these for the test', items: ['20 mph — 12 m (three car lengths)', '30 mph — 23 m (six car lengths)', '40 mph — 36 m (nine car lengths)', '50 mph — 53 m (thirteen car lengths)', '60 mph — 73 m (eighteen car lengths)', '70 mph — 96 m (twenty-four car lengths)'] },
      { type: 'callout', tone: 'tip', title: 'Weather multipliers', text: 'Wet roads: at least **double**. Ice: up to **ten times** longer.' },
      { type: 'check', questions: ['sm-30', 'sm-70', 'sm-ice'] }
    ]
  },
  {
    slug: 'spotting-developing-hazards',
    topic: 'hazard-awareness',
    title: 'Spotting developing hazards',
    summary: 'What counts as a developing hazard and when to respond in the test.',
    minutes: 6,
    blocks: [
      { type: 'text', text: 'A **developing hazard** is something that would make you take action — slow down, stop or change direction. In the hazard perception test you score up to 5 points per hazard. The earlier you respond once it starts to develop, the more you score.' },
      { type: 'scene', clip: 'school-run', caption: 'A ball bounces between parked cars. Where there’s a ball, a child may follow.' },
      { type: 'keypoints', title: 'Clues to look for', items: ['Children near schools, parks and ice-cream vans.', 'Parked cars — doors opening, people stepping out, cars pulling away.', 'Side roads and driveways where vehicles might emerge.', 'Brake lights ahead, buses at stops, cyclists checking over their shoulder.'] },
      { type: 'callout', tone: 'warning', title: 'Don’t click like crazy', text: 'Clicking constantly or in a pattern scores **zero** for that clip. Click when you see a hazard, and once more as it develops.' },
      { type: 'check', questions: ['ha-ball', 'ha-developing', 'ha-doors'] }
    ]
  },
  {
    slug: 'sharing-the-road',
    topic: 'vulnerable-road-users',
    title: 'Sharing the road',
    summary: 'The hierarchy of road users, and space for cyclists, riders and pedestrians.',
    minutes: 5,
    blocks: [
      { type: 'text', text: 'Since 2022, the Highway Code has a **hierarchy of road users**: those who can do the most harm have the greatest responsibility to look out for others. In a car, that’s you.' },
      { type: 'scene', clip: 'car-door', caption: 'A car door opens in front of a cyclist — who has nowhere to go but into your lane.' },
      { type: 'keypoints', items: ['Leave at least **1.5 m** when overtaking cyclists at up to 30 mph — more at higher speeds.', 'Pass horse riders at under **10 mph** with at least **2 m** of space.', 'Give way to pedestrians crossing or waiting to cross a road you’re turning into.', 'Use the “Dutch Reach” to open your door: use the hand furthest from it so you look behind.'] },
      { type: 'check', questions: ['vr-cyclist', 'vr-horse', 'vr-junction'] }
    ]
  },
  {
    slug: 'large-vehicles',
    topic: 'other-types-of-vehicle',
    title: 'Lorries, buses and slow vehicles',
    summary: 'Blind spots, wide turns and when to give way.',
    minutes: 3,
    blocks: [
      { type: 'text', text: 'Large vehicles need more room to turn and stop, and their drivers can’t see everything around them. **If you can’t see their mirrors, they can’t see you.**' },
      { type: 'keypoints', items: ['Long vehicles may swing right before turning left — don’t pass on the inside.', 'Give way to buses pulling out from stops when it’s safe.', 'Expect gusts when you overtake high-sided vehicles in wind.', 'Amber beacons mean slow-moving vehicles; green means a doctor on call.'] },
      { type: 'check', questions: ['ov-long', 'ov-bus', 'ov-amber'] }
    ]
  },
  {
    slug: 'weather-and-night',
    topic: 'vehicle-handling',
    title: 'Rain, fog, ice and night',
    summary: 'Keeping control when grip and visibility drop.',
    minutes: 5,
    blocks: [
      { type: 'text', text: 'Bad weather cuts both **grip** and **visibility**. The fix is almost always the same: slow down, leave more space, and do everything more gently.' },
      { type: 'scene', clip: 'motorway-night', caption: 'At night you see less and judge speed worse — watch for brake lights far ahead.' },
      { type: 'keypoints', items: ['Fog lights only when visibility is under about 100 m — and off again when it clears.', 'Aquaplaning? Ease off the accelerator; don’t brake or steer sharply.', 'On snow and ice, pull away in second gear and brake gently, early.', 'Use a lower gear on steep downhill stretches for engine braking.'] },
      { type: 'check', questions: ['vh-fog', 'vh-aqua', 'vh-snow'] }
    ]
  },
  {
    slug: 'motorway-basics',
    topic: 'motorway-rules',
    title: 'Motorway basics',
    summary: 'Joining, lanes, smart motorways and what to do if you break down.',
    minutes: 5,
    blocks: [
      { type: 'text', text: 'Motorways are statistically our safest roads — but speeds are high, so mistakes are serious. Learner drivers can now take motorway lessons with an approved instructor in a dual-controlled car.' },
      { type: 'keypoints', items: ['Join using the slip road to match the speed of traffic, and give way to traffic already on the motorway.', 'Keep left unless overtaking; return to the left lane when it’s safe.', 'A **red X** means the lane is closed — never drive in it.', 'Stop on the hard shoulder only in an emergency. Leave the car by the left doors and wait behind the barrier.'] },
      { type: 'callout', tone: 'tip', title: 'Stud colours', text: '**Red** — left edge. **Amber** — central reservation. **White** — lane lines. **Green** — slip roads and lay-bys.' },
      { type: 'check', questions: ['mw-redx', 'mw-lane', 'mw-studs'] }
    ]
  },
  {
    slug: 'speed-limits',
    topic: 'rules-of-the-road',
    title: 'Speed limits and right of way',
    summary: 'National limits, junctions, roundabouts and crossings.',
    minutes: 5,
    blocks: [
      { type: 'text', text: 'A speed limit is the **maximum**, not a target. The right speed is the one that lets you stop safely in the distance you can see to be clear.' },
      { type: 'signs', codes: ['speed-20', 'speed-30', 'national-speed-limit', 'mini-roundabout'], caption: 'Circles give orders. The white disc with a black stripe means national speed limit applies.' },
      { type: 'keypoints', title: 'National limits for cars', items: ['Built-up areas with street lights: **30 mph** (unless signed).', 'Single carriageways: **60 mph**.', 'Dual carriageways and motorways: **70 mph**.'] },
      { type: 'keypoints', title: 'Right of way', items: ['At roundabouts, give way to traffic from your right.', 'Don’t enter a yellow box junction unless your exit is clear.', 'At a pelican crossing’s flashing amber, give way to anyone still crossing.'] },
      { type: 'check', questions: ['rr-single', 'rr-builtup', 'rr-box'] }
    ]
  },
  {
    slug: 'reading-sign-shapes',
    topic: 'road-and-traffic-signs',
    title: 'Reading sign shapes',
    summary: 'Circles order, triangles warn, rectangles inform.',
    minutes: 4,
    blocks: [
      { type: 'text', text: 'You don’t need to memorise every sign. Learn the **shape and colour code** and you can work out almost any sign you meet.' },
      { type: 'figure', figure: 'sign-shapes' },
      { type: 'signs', codes: ['children', 'roundabout-ahead', 'slippery-road', 'no-entry', 'turn-left', 'one-way'], caption: 'Warnings, orders and information.' },
      { type: 'callout', tone: 'rule', title: 'Two exceptions', text: '**STOP** is the only octagon and **GIVE WAY** is the only upside-down triangle — so you can recognise them even when covered in snow.' },
      { type: 'check', questions: ['rs-triangles', 'rs-blue', 'rs-nostopping'] }
    ]
  },
  {
    slug: 'documents-and-insurance',
    topic: 'documents',
    title: 'Licence, insurance and MOT',
    summary: 'The paperwork you need before you turn the key.',
    minutes: 3,
    blocks: [
      { type: 'keypoints', items: ['Learners need a valid provisional licence, insurance, L plates and a qualified supervisor (21+, held a full licence for 3 years).', 'Third party insurance is the legal minimum.', 'Cars need an MOT at three years old, then every year.', 'Tell DVLA when you change your name or address.'] },
      { type: 'check', questions: ['dc-mot', 'dc-insurance', 'dc-learner'] }
    ]
  },
  {
    slug: 'at-an-incident',
    topic: 'incidents',
    title: 'At the scene of an incident',
    summary: 'Make it safe, call for help and DR ABC first aid.',
    minutes: 4,
    blocks: [
      { type: 'keypoints', title: 'In order', items: ['Warn other traffic — hazard lights, and a warning triangle if it’s safe (never on a motorway).', 'Switch off engines and make sure nobody smokes.', 'Call 999 or 112 with the exact location.', 'Don’t move casualties unless they’re in further danger.', 'Don’t remove a motorcyclist’s helmet unless it’s essential.'] },
      { type: 'callout', tone: 'tip', title: 'DR ABC', text: '**D**anger, **R**esponse, **A**irway, **B**reathing, **C**irculation.' },
      { type: 'check', questions: ['in-first', 'in-helmet', 'in-drabc'] }
    ]
  },
  {
    slug: 'loads-and-passengers',
    topic: 'vehicle-loading',
    title: 'Loads, passengers and child seats',
    summary: 'What you’re responsible for when you carry people and things.',
    minutes: 3,
    blocks: [
      { type: 'keypoints', items: ['The driver is responsible for the vehicle, its load and its passengers.', 'Heavy roof loads reduce stability — take bends more slowly.', 'Children need a suitable child seat until they’re 12 or 135 cm tall, whichever comes first.', 'Never fit a rear-facing child seat in front of an active airbag.'] },
      { type: 'check', questions: ['vl-who', 'vl-roof', 'vl-child'] }
    ]
  }
]
