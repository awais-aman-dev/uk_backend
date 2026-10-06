import type { QuestionMedia, QuestionOption, QuestionType } from '../../shared/types/learn'
import type { TopicSlug } from './topics'

// Our own questions, written in the style of the DVSA car theory test (the official bank is licensed).

interface QuestionSeed {
  key: string
  topic: TopicSlug
  lesson?: string
  caseStudy?: string
  type: QuestionType
  prompt: string
  media?: QuestionMedia
  options: QuestionOption[]
  correct: string[]
  explanation: string
}

/** Text options from a list; `right` = indexes of the correct answers */
const q = (
  key: string,
  topic: TopicSlug,
  lesson: string | undefined,
  prompt: string,
  options: string[],
  right: number[],
  explanation: string,
  extra: Partial<QuestionSeed> = {}
): QuestionSeed => ({
  key,
  topic,
  lesson,
  type: right.length > 1 ? 'multi' : 'single',
  prompt,
  options: options.map((text, i) => ({ id: 'abcd'[i]!, text })),
  correct: right.map((i) => 'abcd'[i]!),
  explanation,
  ...extra
})

/** Answers are signs */
const qs = (key: string, prompt: string, signs: string[], right: number, explanation: string, lesson = 'reading-sign-shapes'): QuestionSeed => ({
  key,
  topic: 'road-and-traffic-signs',
  lesson,
  type: 'image',
  prompt,
  options: signs.map((sign, i) => ({ id: 'abcd'[i]!, sign })),
  correct: ['abcd'[right]!],
  explanation
})

const sign = (code: string) => ({ media: { kind: 'sign' as const, code } })

export const CASE_STUDIES = [
  {
    key: 'wet-school-run',
    title: 'The wet school run',
    scenario:
      'Sam passed their test last month. On a wet Monday morning they drive their younger brother to school along a busy 30 mph road, then join a dual carriageway to get to college. The lorries on the dual carriageway are throwing up a lot of spray.'
  }
]

export const QUESTIONS: QuestionSeed[] = [
  /* ---------- Alertness ---------- */
  q('al-uturn', 'alertness', 'observation-and-distraction', 'Before you make a U-turn in the road, what should you do?',
    ['Give an arm signal as well as using your indicators', 'Look over your shoulder for a final check', 'Signal so that other drivers slow down for you', 'Select a higher gear than normal'], [1],
    'Mirrors don’t show everything. A final look over your shoulder covers the blind spot before you turn across the road.'),
  q('al-phone', 'alertness', 'observation-and-distraction', 'When may you use a hand-held mobile phone while driving?',
    ['When you’re stopped in queuing traffic', 'When you’re waiting at traffic lights', 'To call 999 or 112 in a genuine emergency when it’s unsafe or impractical to stop', 'When you’re driving below 20 mph'], [2],
    'It’s illegal to hold a phone while driving — including in queues and at lights. The only exception is a genuine emergency call when it would be unsafe or impractical to stop.'),
  q('al-dazzle', 'alertness', 'observation-and-distraction', 'You’re dazzled by the headlights of an oncoming vehicle at night. What should you do?',
    ['Slow down or stop', 'Flash your headlights at the driver', 'Switch to main beam', 'Close your eyes for a moment'], [0],
    'If you can’t see, slow down or stop until your eyes recover. Don’t retaliate with main beam — you’ll dazzle them too.'),
  q('al-distract', 'alertness', 'observation-and-distraction', 'Which TWO of these could distract you while driving?',
    ['Loud music', 'Checking your mirrors', 'Programming a satnav while moving', 'Looking well ahead'], [0, 2],
    'Loud music and fiddling with a satnav take your attention away from the road. Set your route before you set off.'),
  q('al-msm', 'alertness', 'observation-and-distraction', 'What’s the purpose of the Mirrors – Signal – Manoeuvre routine?',
    ['To save fuel on long journeys', 'To check it’s safe and let others know your plans before you change speed or direction', 'To avoid having to look over your shoulder', 'To get through junctions faster'], [1],
    'MSM makes sure you know what’s around you and others know what you’re about to do — before you do it.'),

  /* ---------- Attitude ---------- */
  q('at-gap', 'attitude', 'courtesy-and-following', 'What’s the minimum time gap you should leave behind the vehicle in front on a dry road?',
    ['1 second', '2 seconds', '4 seconds', '10 seconds'], [1],
    'Use the two-second rule on dry roads: “Only a fool breaks the two-second rule.” Double it in the wet.'),
  q('at-cutin', 'attitude', 'courtesy-and-following', 'A driver pulls out in front of you, making you brake. What should you do?',
    ['Flash your lights to show you’re annoyed', 'Sound your horn and drive close behind them', 'Stay calm and don’t react', 'Overtake them as soon as you can'], [2],
    'Everyone makes mistakes. Reacting aggressively only raises the risk of a crash — let it go.'),
  q('at-flash', 'attitude', 'courtesy-and-following', 'When should you flash your headlights at other road users?',
    ['To show you’re giving way', 'To let them know you’re there', 'To tell them they can go', 'To say thank you'], [1],
    'The Highway Code says flashing headlights only means “I’m here”. Others may misread anything else.'),
  q('at-lorry', 'attitude', 'courtesy-and-following', 'Why should you hang back when following a large lorry?',
    ['To get a better view of the road ahead', 'To stop the lorry braking suddenly', 'So you use less fuel', 'So faster cars can overtake you'], [0],
    'Staying back lets you see past the lorry and gives the driver a chance to see you in their mirrors.'),

  /* ---------- Safety and your vehicle ---------- */
  q('sv-tread', 'safety-and-your-vehicle', 'vehicle-checks', 'What’s the minimum legal tread depth for car tyres?',
    ['1 mm', '1.6 mm', '2.5 mm', '4 mm'], [1],
    'At least 1.6 mm across the central three-quarters of the tread, all the way round. Many experts recommend replacing at 3 mm.'),
  q('sv-wear', 'safety-and-your-vehicle', 'vehicle-checks', 'What can cause heavy, uneven wear on your tyres?',
    ['Faulty suspension', 'Driving on motorways', 'Using air conditioning', 'Running low on fuel'], [0],
    'Faults in the suspension, brakes or steering, or wheels out of balance, can wear tyres unevenly.'),
  q('sv-fuel', 'safety-and-your-vehicle', 'vehicle-checks', 'Which TWO things will increase your fuel consumption?',
    ['Under-inflated tyres', 'Leaving an empty roof rack fitted', 'Accelerating smoothly', 'Planning your route'], [0, 1],
    'Low tyre pressures increase rolling resistance and a roof rack adds drag — both burn more fuel.'),
  q('sv-oil', 'safety-and-your-vehicle', 'vehicle-checks', 'When should you check your engine oil level?',
    ['Before a long journey', 'Only at the MOT', 'With the engine running and hot', 'Once a year'], [0],
    'Check regularly and before long trips, with the car on level ground — part of the POWDER checks.'),
  q('sv-brake-light', 'safety-and-your-vehicle', 'vehicle-checks', 'Your brake warning light comes on while you’re driving. What should you do?',
    ['Ignore it until your next service', 'Stop as soon as it’s safe and get the brakes checked', 'Pump the brake pedal hard', 'Drive faster to get home quickly'], [1],
    'A brake warning light can mean low fluid or a fault. Don’t risk it — stop safely and get help.'),

  /* ---------- Safety margins ---------- */
  q('sm-30', 'safety-margins', 'stopping-distances', 'What’s the typical overall stopping distance at 30 mph on a dry road?',
    ['12 metres', '23 metres', '36 metres', '53 metres'], [1],
    '9 m thinking + 14 m braking = 23 m — about six car lengths.'),
  q('sm-70', 'safety-margins', 'stopping-distances', 'What’s the typical overall stopping distance at 70 mph on a dry road?',
    ['53 metres', '75 metres', '96 metres', '120 metres'], [2],
    '21 m thinking + 75 m braking = 96 m — about 24 car lengths.'),
  q('sm-wet', 'safety-margins', 'stopping-distances', 'How much longer can your stopping distance be in wet weather?',
    ['About the same', 'At least double', 'Ten times longer', 'About half'], [1],
    'Tyres have less grip on wet roads — allow at least double the dry distance.'),
  q('sm-ice', 'safety-margins', 'stopping-distances', 'On icy roads, braking distance can be up to how many times longer than on dry roads?',
    ['Twice', 'Five times', 'Ten times', 'Twenty times'], [2],
    'On ice, braking distances can be ten times longer. Drive slowly and gently.'),
  q('sm-moto', 'safety-margins', 'stopping-distances', 'Why should you leave extra room behind a motorcyclist on a wet or uneven road?',
    ['They may brake or swerve suddenly to avoid a hazard', 'Motorcycles are faster than cars', 'So they can overtake you', 'Motorcyclists don’t like being followed'], [0],
    'Riders may need to avoid potholes, drain covers or puddles without warning — give them space.'),

  /* ---------- Hazard awareness ---------- */
  q('ha-ball', 'hazard-awareness', 'spotting-developing-hazards', 'A ball bounces into the road ahead. What should you do?',
    ['Slow down and be ready to stop for a child running after it', 'Sound your horn', 'Steer around the ball', 'Speed up to get past'], [0],
    'Where there’s a ball, there’s often a child. Expect someone to run out.'),
  q('ha-icecream', 'hazard-awareness', 'spotting-developing-hazards', 'You’re approaching a parked ice-cream van. What should you expect?',
    ['Children stepping out without looking', 'The van pulling out quickly', 'Loud music', 'The van’s lights flashing'], [0],
    'Children excited about ice cream may run into the road from behind the van.'),
  q('ha-developing', 'hazard-awareness', 'spotting-developing-hazards', 'In the hazard perception test, what is a “developing hazard”?',
    ['Something that would make you take action, like changing speed or direction', 'Any parked car', 'Any road sign', 'Something behind you'], [0],
    'You score by responding to hazards that would make you slow down, stop or steer — the earlier, the more points.'),
  q('ha-doors', 'hazard-awareness', 'spotting-developing-hazards', 'You’re driving past a line of parked cars. What should you watch out for?',
    ['Doors opening and people stepping out between them', 'Car alarms going off', 'Wet paint', 'Open windows'], [0],
    'Drive slowly enough to stop and leave a door’s width of space if you can.'),
  q('ha-vision', 'hazard-awareness', 'spotting-developing-hazards', 'Which TWO of these could make it harder to see hazards ahead?',
    ['Bright, low sun', 'Heavy rain', 'A clean windscreen', 'Driving below the speed limit'], [0, 1],
    'Glare and heavy rain both cut visibility — slow down so you can stop in the distance you can see.'),

  /* ---------- Vulnerable road users ---------- */
  q('vr-cyclist', 'vulnerable-road-users', 'sharing-the-road', 'How much room should you leave when overtaking a cyclist at speeds up to 30 mph?',
    ['At least 0.5 metres', 'At least 1.5 metres', 'At least 3 metres', 'As little as possible'], [1],
    'Leave at least 1.5 m at up to 30 mph, and more at higher speeds. If you can’t, wait behind.'),
  q('vr-horse', 'vulnerable-road-users', 'sharing-the-road', 'How should you pass a horse rider?',
    ['At under 10 mph, leaving at least 2 metres', 'Sound your horn to warn them first', 'Quickly, to get it over with', 'Close to the kerb side'], [0],
    'Pass wide and slow — under 10 mph with at least 2 m of space. Horses can be startled easily.'),
  q('vr-junction', 'vulnerable-road-users', 'sharing-the-road', 'Pedestrians are waiting to cross the side road you’re turning into. What should you do?',
    ['Give way to them', 'Sound your horn', 'Turn quickly before they step out', 'Wave them across, whatever the traffic'], [0],
    'Since 2022, you should give way to pedestrians crossing or waiting to cross a road you’re turning into.'),
  q('vr-door', 'vulnerable-road-users', 'sharing-the-road', 'Which road users are most at risk when you open your car door?',
    ['Cyclists', 'Lorry drivers', 'Bus passengers', 'Motorway traffic'], [0],
    'Use the “Dutch Reach”: open the door with the hand furthest from it, so you turn and look behind.'),
  q('vr-elderly', 'vulnerable-road-users', 'sharing-the-road', 'An elderly person is still crossing as your light turns green. What should you do?',
    ['Wait patiently until they’ve crossed', 'Sound your horn', 'Edge forward slowly', 'Rev your engine'], [0],
    'Older pedestrians may be slower and less able to hear or see you. Give them time.'),

  /* ---------- Other types of vehicle ---------- */
  q('ov-long', 'other-types-of-vehicle', 'large-vehicles', 'A long vehicle ahead is turning left but moves out to the right first. What should you do?',
    ['Stay well back and don’t pass on its left', 'Overtake on the left', 'Sound your horn', 'Flash your headlights'], [0],
    'Long vehicles swing out to get round corners. Passing on the left could trap you.'),
  q('ov-bus', 'other-types-of-vehicle', 'large-vehicles', 'A bus ahead signals to pull away from a stop. What should you do?',
    ['Give way to it if it’s safe to do so', 'Accelerate past', 'Sound your horn', 'Flash it out'], [0],
    'Let buses pull out when it’s safe — and watch for passengers crossing in front of them.'),
  q('ov-wind', 'other-types-of-vehicle', 'large-vehicles', 'Why should you take extra care overtaking a high-sided vehicle on a windy day?',
    ['A sudden gust could push you off course as you pass it', 'It will slow down suddenly', 'The road will be slippery', 'Its lights will dazzle you'], [0],
    'The lorry shields you from the wind — until you clear it. Hold the wheel firmly.'),
  q('ov-amber', 'other-types-of-vehicle', 'large-vehicles', 'What does a flashing amber beacon on top of a vehicle mean?',
    ['It’s a slow-moving vehicle', 'It’s an emergency vehicle', 'It’s a doctor on call', 'It’s a learner driver'], [0],
    'Amber beacons warn of slow-moving or breakdown vehicles. Green is a doctor; blue is emergency services.'),

  /* ---------- Vehicle handling ---------- */
  q('vh-fog', 'vehicle-handling', 'weather-and-night', 'When should you use your fog lights?',
    ['When visibility is seriously reduced — generally to less than 100 metres', 'Whenever it’s raining', 'At night on unlit roads', 'In light mist'], [0],
    'Fog lights can dazzle others and hide your brake lights, so switch them off when visibility improves.'),
  q('vh-aqua', 'vehicle-handling', 'weather-and-night', 'Your steering suddenly feels light while driving through deep standing water. What should you do?',
    ['Ease off the accelerator and let the car slow down', 'Brake firmly', 'Steer sharply', 'Accelerate through it'], [0],
    'Your tyres are aquaplaning on a layer of water. Ease off gently until grip returns.'),
  q('vh-hill', 'vehicle-handling', 'weather-and-night', 'Why should you select a lower gear before going down a steep hill?',
    ['To use engine braking to help control your speed', 'To save fuel', 'To go faster', 'To protect the clutch'], [0],
    'A lower gear stops the car running away and saves your brakes from overheating.'),
  q('vh-snow', 'vehicle-handling', 'weather-and-night', 'How can you avoid wheelspin when pulling away on snow or ice?',
    ['Use the highest gear you can, such as second, and pull away gently', 'Use first gear with high revs', 'Release the clutch quickly', 'Steer from side to side'], [0],
    'A higher gear means less torque at the wheels, so they’re less likely to spin.'),

  /* ---------- Motorway rules ---------- */
  q('mw-limit', 'motorway-rules', 'motorway-basics', 'What’s the national speed limit for cars on a motorway?',
    ['60 mph', '70 mph', '80 mph', '50 mph'], [1],
    'Unless signs say otherwise, 70 mph — the same as dual carriageways.'),
  q('mw-redx', 'motorway-rules', 'motorway-basics', 'A red X is shown above your lane on a smart motorway. What does it mean?',
    ['Don’t drive in that lane', 'It’s a lane for overtaking', 'It’s a bus lane', 'Reduce speed to 50 mph'], [0],
    'A red X means the lane is closed — often for a breakdown or workers ahead. Driving in it is an offence.'),
  q('mw-lane', 'motorway-rules', 'motorway-basics', 'Which lane should you normally use on a three-lane motorway?',
    ['The left-hand lane, unless you’re overtaking', 'The middle lane', 'The right-hand lane', 'Whichever is quietest'], [0],
    'Keep left unless overtaking. Hogging the middle lane is careless driving.'),
  q('mw-hardshoulder', 'motorway-rules', 'motorway-basics', 'When may you stop on the hard shoulder of a motorway?',
    ['In an emergency or if you break down', 'To make a phone call', 'To have a rest', 'To check a map'], [0],
    'Only in an emergency. If you’re tired, leave at the next exit or services.'),
  q('mw-studs', 'motorway-rules', 'motorway-basics', 'What colour are the reflective studs between the left-hand lane and the hard shoulder?',
    ['Red', 'Amber', 'White', 'Green'], [0],
    'Red marks the left edge, amber the central reservation, white the lanes, green the slip roads.'),

  /* ---------- Rules of the road ---------- */
  q('rr-single', 'rules-of-the-road', 'speed-limits', 'What’s the national speed limit for cars on a single carriageway?',
    ['50 mph', '60 mph', '70 mph', '40 mph'], [1],
    'On single carriageways the national limit for cars is 60 mph.'),
  q('rr-builtup', 'rules-of-the-road', 'speed-limits', 'What’s the speed limit in a built-up area with street lights, unless signs say otherwise?',
    ['20 mph', '30 mph', '40 mph', '50 mph'], [1],
    'Street lights usually mean a 30 mph limit — though many towns now use 20 mph zones, so watch the signs.'),
  q('rr-horn', 'rules-of-the-road', 'speed-limits', 'In a built-up area, when must you NOT sound your horn while moving?',
    ['Between 11.30 pm and 7 am', 'Between 10 pm and 6 am', 'Between midnight and 8 am', 'At any time'], [0],
    'Don’t use your horn while moving in a built-up area between 11.30 pm and 7 am — unless another road user poses a danger.'),
  q('rr-mini', 'rules-of-the-road', 'speed-limits', 'At a mini-roundabout, who should you normally give way to?',
    ['Traffic from the right', 'Traffic from the left', 'Traffic behind you', 'Nobody'], [0],
    'As at any roundabout, give way to traffic coming from your right.'),
  q('rr-box', 'rules-of-the-road', 'speed-limits', 'When may you enter a yellow box junction?',
    ['When your exit road or lane is clear', 'Whenever the lights are green', 'When there’s space in the box', 'Only at night'], [0],
    'Don’t enter unless your exit is clear. You may wait in the box when turning right if only oncoming traffic stops you.'),
  q('rr-pelican', 'rules-of-the-road', 'speed-limits', 'The amber light is flashing at a pelican crossing. What must you do?',
    ['Give way to anyone still crossing', 'Stop and wait for green', 'Speed up to clear the crossing', 'Sound your horn'], [0],
    'Flashing amber: pedestrians already on the crossing have priority. Go only when it’s clear.'),

  /* ---------- Road and traffic signs ---------- */
  q('rs-noentry', 'road-and-traffic-signs', 'reading-sign-shapes', 'What does this sign mean?',
    ['No entry for vehicular traffic', 'One-way street', 'No parking', 'Road closed to pedestrians'], [0],
    'A red circle with a white bar means no entry. You’ll usually see it at the end of a one-way street.', sign('no-entry')),
  q('rs-nsl', 'road-and-traffic-signs', 'reading-sign-shapes', 'What does this sign mean?',
    ['National speed limit applies', 'End of all restrictions', 'No overtaking', 'Motorway ends'], [0],
    'For cars: 60 mph on single carriageways, 70 mph on dual carriageways and motorways.', sign('national-speed-limit')),
  q('rs-children', 'road-and-traffic-signs', 'reading-sign-shapes', 'What does this sign warn you about?',
    ['Children going to or from school', 'A playground next to the road', 'A pedestrian zone', 'No pedestrians'], [0],
    'Slow down and watch for children crossing, especially at school opening and closing times.', sign('children')),
  q('rs-stop', 'road-and-traffic-signs', 'reading-sign-shapes', 'What must you do at this sign?',
    ['Stop at the line, even if the road is clear', 'Slow down and give way if necessary', 'Stop only if traffic is coming', 'Stop only at night'], [0],
    'STOP is the only octagonal sign. You must stop completely at the line — every time.', sign('stop')),
  q('rs-triangles', 'road-and-traffic-signs', 'reading-sign-shapes', 'What do most signs in a red triangle do?',
    ['Warn you', 'Give orders', 'Give information', 'Show directions'], [0],
    'Triangles warn, circles give orders, rectangles inform.'),
  q('rs-blue', 'road-and-traffic-signs', 'reading-sign-shapes', 'What do blue circular signs usually tell you?',
    ['Something you must do', 'Something you must not do', 'A warning', 'A tourist attraction'], [0],
    'Blue circles give positive (mandatory) instructions, like “turn left” or “keep left”.'),
  qs('rs-nostopping', 'Which sign means “no stopping”?', ['no-stopping', 'no-waiting', 'no-entry', 'parking'], 0,
    'A red cross on a blue background is a clearway: no stopping at all. A single diagonal is no waiting.'),
  qs('rs-mini', 'Which sign means “mini-roundabout”?', ['roundabout-ahead', 'mini-roundabout', 'keep-left', 'turn-left'], 1,
    'The blue circle with three white arrows is a mini-roundabout. The red triangle only warns of a roundabout ahead.'),

  /* ---------- Documents ---------- */
  q('dc-mot', 'documents', 'documents-and-insurance', 'Most cars need an MOT once they are three years old. How often after that?',
    ['Every 6 months', 'Every year', 'Every 2 years', 'Every 3 years'], [1],
    'After the first MOT at three years old, cars need one every year.'),
  q('dc-insurance', 'documents', 'documents-and-insurance', 'What’s the minimum insurance you need to drive on public roads?',
    ['Third party only', 'Fully comprehensive', 'Third party, fire and theft', 'Personal accident cover'], [0],
    'Third party only is the legal minimum — it covers injury or damage you cause to others.'),
  q('dc-dvla', 'documents', 'documents-and-insurance', 'When must you tell DVLA?',
    ['When you change your name or address', 'Each time you renew your insurance', 'When you take a passenger', 'When you get a parking ticket'], [0],
    'Keep your licence and logbook details up to date — you can be fined if you don’t.'),
  q('dc-learner', 'documents', 'documents-and-insurance', 'Which TWO must you have before driving on public roads as a learner?',
    ['A valid provisional licence', 'Insurance that covers you', 'A passed theory test', 'Your own car'], [0, 1],
    'You also need a qualified supervisor and L plates — but not a theory pass to practise.'),

  /* ---------- Incidents ---------- */
  q('in-first', 'incidents', 'at-an-incident', 'You arrive at the scene of a crash. What should you do first?',
    ['Warn other traffic, for example with hazard warning lights', 'Move the injured people', 'Give the casualties a drink', 'Leave as quickly as possible'], [0],
    'Make the scene safe first so it doesn’t become a second crash. Then call 999 or 112.'),
  q('in-helmet', 'incidents', 'at-an-incident', 'Why shouldn’t you remove an injured motorcyclist’s helmet?',
    ['It could make their injuries worse', 'It’s illegal', 'It belongs to them', 'The police will need it'], [0],
    'Only remove a helmet if it’s essential, for example if they’re not breathing.'),
  q('in-hazards', 'incidents', 'at-an-incident', 'When may you use hazard warning lights while moving?',
    ['On a motorway or unrestricted dual carriageway, to warn drivers behind of a hazard ahead', 'When parking on double yellow lines', 'When towing', 'To thank another driver'], [0],
    'Use them briefly to warn of a queue or hazard ahead, then switch them off.'),
  q('in-drabc', 'incidents', 'at-an-incident', 'What does DR ABC stand for in first aid?',
    ['Danger, Response, Airway, Breathing, Circulation', 'Drive, Report, Assist, Bandage, Call', 'Doctor, Rescue, Ambulance, Bleeding, Care', 'Danger, Rest, Alert, Breathe, Calm'], [0],
    'Check for Danger, get a Response, open the Airway, check Breathing, then deal with Circulation (bleeding).'),

  /* ---------- Vehicle loading ---------- */
  q('vl-who', 'vehicle-loading', 'loads-and-passengers', 'Who is responsible for making sure a vehicle isn’t overloaded?',
    ['The driver', 'The owner', 'The person who loaded it', 'The police'], [0],
    'The driver is responsible for the vehicle, its load and its passengers.'),
  q('vl-roof', 'vehicle-loading', 'loads-and-passengers', 'How does a heavy load on a roof rack affect your car?',
    ['It reduces stability', 'It improves braking', 'It improves road holding', 'It makes no difference'], [0],
    'Weight up high raises the centre of gravity and makes the car less stable, especially on bends.'),
  q('vl-child', 'vehicle-loading', 'loads-and-passengers', 'Children must normally use a suitable child seat until they’re 12 years old or how tall?',
    ['135 cm', '150 cm', '120 cm', '100 cm'], [0],
    'Whichever comes first: 12 years old or 135 cm tall.'),

  /* ---------- Case study: the wet school run ---------- */
  q('cs-zigzag', 'rules-of-the-road', 'speed-limits', 'Outside the school there are yellow zigzag lines. What do they mean?',
    ['Don’t stop or park on them', 'Parking for school staff only', 'A bus stop', 'Speed bumps ahead'], [0],
    'Keep the entrance clear so children can be seen. Don’t even stop to drop off.', { caseStudy: 'wet-school-run' }),
  q('cs-gap', 'safety-margins', 'stopping-distances', 'It’s raining. How should Sam change the gap to the car in front?',
    ['Leave at least double the normal gap', 'Keep the same gap', 'Halve the gap', 'Use the hazard lights instead'], [0],
    'Stopping distances at least double in the wet — so the time gap should be at least four seconds.', { caseStudy: 'wet-school-run' }),
  q('cs-patrol', 'vulnerable-road-users', 'sharing-the-road', 'A school crossing patrol steps out holding a STOP sign. What must Sam do?',
    ['Stop and wait until the patrol is back on the pavement', 'Slow down and drive round them', 'Sound the horn', 'Carry on if no children are crossing yet'], [0],
    'You must stop when a school crossing patrol shows the sign — it’s the law.', { caseStudy: 'wet-school-run' }),
  q('cs-dual', 'rules-of-the-road', 'speed-limits', 'What’s the speed limit for Sam’s car on the dual carriageway, unless signs say otherwise?',
    ['70 mph', '60 mph', '50 mph', '80 mph'], [0],
    'The national limit for cars on dual carriageways is 70 mph — but drive to the conditions.', { caseStudy: 'wet-school-run' }),
  q('cs-spray', 'vehicle-handling', 'weather-and-night', 'Spray from lorries is making it hard to see. What lights should Sam use?',
    ['Dipped headlights', 'Sidelights only', 'Main beam', 'Hazard warning lights'], [0],
    'Use dipped headlights when visibility is seriously reduced. Fog lights only if it drops below about 100 metres.', { caseStudy: 'wet-school-run' })
]
