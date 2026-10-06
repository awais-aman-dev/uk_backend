import type { Block } from '../../shared/types/learn'

// "The Highway Code in plain English" — our own summary, not the official text.

interface ChapterSeed {
  slug: string
  title: string
  summary: string
  blocks: Block[]
}

export const EBOOK: ChapterSeed[] = [
  {
    slug: 'introduction',
    title: 'The hierarchy of road users',
    summary: 'Who has the most responsibility on the road — and why.',
    blocks: [
      { type: 'text', text: 'The Highway Code applies to everyone: drivers, riders, cyclists, horse riders and pedestrians. Some rules are law — written as **must** or **must not** — and breaking them is a criminal offence. Others are advice, but ignoring them can still be used against you in court.' },
      { type: 'heading', text: 'The hierarchy' },
      { type: 'text', text: 'Road users who can cause the greatest harm have the greatest responsibility to reduce the danger they pose to others. Pedestrians — especially children, older people and disabled people — are at the top of the hierarchy, followed by cyclists, horse riders and motorcyclists.' },
      { type: 'keypoints', items: ['Drivers of large vehicles have the most responsibility, then cars, then motorcycles.', 'The hierarchy doesn’t remove everyone’s duty to behave responsibly.', 'At junctions, give way to pedestrians crossing or waiting to cross the road you’re turning into.'] }
    ]
  },
  {
    slug: 'before-you-drive',
    title: 'Before you drive',
    summary: 'Fitness, eyesight, alcohol and making sure your car is ready.',
    blocks: [
      { type: 'heading', text: 'Are you fit to drive?' },
      { type: 'keypoints', items: ['You must be able to read a car number plate from 20 metres in good daylight, with glasses or lenses if you need them.', 'Don’t drive if you’re tired, unwell or taking medicine that makes you drowsy.', 'Don’t drink and drive — there’s no safe amount. Drugs, including some prescribed ones, are also illegal to drive on above certain limits.'] },
      { type: 'heading', text: 'Your vehicle' },
      { type: 'text', text: 'Before every journey, make sure your windows and mirrors are clean, your lights work and your tyres are in good condition with at least **1.6 mm** of tread.' },
      { type: 'callout', tone: 'rule', title: 'Seat belts', text: 'You must wear a seat belt if one is fitted. As the driver, you’re responsible for passengers under 14 wearing a belt or the right child restraint.' }
    ]
  },
  {
    slug: 'general-rules',
    title: 'General rules, speed and stopping',
    summary: 'Signals, speed limits, safe gaps and using your lights.',
    blocks: [
      { type: 'heading', text: 'Signals' },
      { type: 'text', text: 'Signal to let others know what you’re about to do — in good time, and only after checking your mirrors. Make sure your signal is cancelled afterwards so you don’t mislead anyone.' },
      { type: 'heading', text: 'Speed' },
      { type: 'keypoints', items: ['30 mph in built-up areas with street lights, unless signs show otherwise.', '60 mph on single carriageways and 70 mph on dual carriageways and motorways for cars.', 'The limit is a maximum — drive at a speed that lets you stop in the distance you can see to be clear.'] },
      { type: 'figure', figure: 'stopping-distances' },
      { type: 'heading', text: 'Lights' },
      { type: 'text', text: 'Use headlights at night and when visibility is seriously reduced. Don’t use main beam when it could dazzle other road users, and only use fog lights when you can see less than about 100 metres.' }
    ]
  },
  {
    slug: 'junctions-and-roundabouts',
    title: 'Junctions and roundabouts',
    summary: 'Give way, look, and take your time.',
    blocks: [
      { type: 'text', text: 'Most collisions in towns happen at junctions. Approach slowly, look in every direction and be sure it’s safe before you go — “look right, look left, look right again” is a good habit.' },
      { type: 'signs', codes: ['give-way', 'stop', 'roundabout-ahead', 'mini-roundabout'] },
      { type: 'keypoints', items: ['At STOP signs, you must stop at the line even if the road is clear.', 'At roundabouts, give way to traffic from the right unless signs or markings say otherwise.', 'Watch for cyclists and motorcyclists, who can be hidden by pillars and other vehicles.', 'Don’t enter a box junction unless your exit is clear.'] }
    ]
  },
  {
    slug: 'vulnerable-users',
    title: 'Pedestrians, cyclists and riders',
    summary: 'Space, patience and looking twice.',
    blocks: [
      { type: 'keypoints', title: 'Pedestrians', items: ['Give way to people on a zebra crossing and to anyone still crossing at a flashing amber light.', 'Take extra care near schools, parks and bus stops.', 'Older and disabled people may need more time to cross.'] },
      { type: 'keypoints', title: 'Cyclists', items: ['Leave at least 1.5 m when overtaking at up to 30 mph.', 'Cyclists may ride in the centre of a lane on quiet roads, in slow traffic and at junctions — it’s for their safety.', 'Don’t cut across cyclists when turning in or out of a junction.'] },
      { type: 'keypoints', title: 'Horse riders', items: ['Pass at under 10 mph with at least 2 m of space.', 'Don’t sound your horn or rev your engine.'] }
    ]
  },
  {
    slug: 'motorways',
    title: 'Motorways',
    summary: 'Joining, lanes, signals and smart motorways.',
    blocks: [
      { type: 'keypoints', items: ['Learners may only drive on a motorway with an approved driving instructor in a dual-controlled car.', 'Join using the slip road and adjust your speed to fit into a safe gap.', 'Keep in the left lane unless overtaking.', 'Never drive in a lane marked with a red X.', 'Variable speed limits shown in a red circle are mandatory.'] },
      { type: 'signs', codes: ['motorway'], caption: 'Motorway regulations apply from this sign.' },
      { type: 'callout', tone: 'warning', title: 'If you break down', text: 'Pull onto the hard shoulder or an emergency area, switch on hazard lights, leave by the left-hand doors and wait behind the barrier. Call for help.' }
    ]
  },
  {
    slug: 'breakdowns-and-incidents',
    title: 'Breakdowns and incidents',
    summary: 'Keeping yourself and others safe when things go wrong.',
    blocks: [
      { type: 'text', text: 'If you break down, get your vehicle off the road if you can, and warn other traffic with your hazard lights. Use a warning triangle on normal roads if it’s safe — never on a motorway.' },
      { type: 'heading', text: 'At an incident' },
      { type: 'keypoints', items: ['Make the scene safe and warn other traffic.', 'Call 999 or 112 and give the exact location.', 'Don’t move casualties unless they’re in danger.', 'If you’re involved, you must stop and exchange details — and report it to the police within 24 hours if you can’t.'] }
    ]
  },
  {
    slug: 'signs-and-markings',
    title: 'Signs and road markings',
    summary: 'The visual language of the road.',
    blocks: [
      { type: 'figure', figure: 'sign-shapes' },
      { type: 'signs', codes: ['crossroads', 'bend-left', 'traffic-signals', 'pedestrians', 'cyclists', 'roadworks'], caption: 'Warning signs' },
      { type: 'signs', codes: ['no-entry', 'no-overtaking', 'no-right-turn', 'no-stopping', 'ahead-only', 'keep-left'], caption: 'Signs giving orders' },
      { type: 'keypoints', title: 'Road markings', items: ['A double white line with a solid line on your side: don’t cross or straddle it.', 'Yellow zigzags outside schools: don’t stop or park.', 'White zigzags at crossings: no overtaking or parking.', 'Double yellow lines: no waiting at any time.'] }
    ]
  }
]
