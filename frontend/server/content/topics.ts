// The 14 DVSA theory test categories. `icon` = AppIcon name.
export const TOPICS = [
  { slug: 'alertness', title: 'Alertness', icon: 'eye', description: 'Observation, anticipation and staying focused behind the wheel.' },
  { slug: 'attitude', title: 'Attitude', icon: 'smile', description: 'Patience, courtesy and keeping a safe distance.' },
  { slug: 'safety-and-your-vehicle', title: 'Safety and your vehicle', icon: 'wrench', description: 'Checks, faults and keeping your car roadworthy.' },
  { slug: 'safety-margins', title: 'Safety margins', icon: 'gauge', description: 'Stopping distances and driving in bad weather.' },
  { slug: 'hazard-awareness', title: 'Hazard awareness', icon: 'hazard', description: 'Spotting developing hazards early and acting in time.' },
  { slug: 'vulnerable-road-users', title: 'Vulnerable road users', icon: 'person', description: 'Pedestrians, cyclists, horse riders and motorcyclists.' },
  { slug: 'other-types-of-vehicle', title: 'Other types of vehicle', icon: 'bus', description: 'Sharing the road with lorries, buses and slow vehicles.' },
  { slug: 'vehicle-handling', title: 'Vehicle handling', icon: 'wheel', description: 'Control in rain, ice, fog, hills and at night.' },
  { slug: 'motorway-rules', title: 'Motorway rules', icon: 'motorway', description: 'Joining, lane discipline, smart motorways and breakdowns.' },
  { slug: 'rules-of-the-road', title: 'Rules of the road', icon: 'road', description: 'Speed limits, junctions, roundabouts and right of way.' },
  { slug: 'road-and-traffic-signs', title: 'Road and traffic signs', icon: 'sign', description: 'Shapes, colours and what every sign is telling you.' },
  { slug: 'documents', title: 'Documents', icon: 'document', description: 'Licences, insurance, MOT and vehicle tax.' },
  { slug: 'incidents', title: 'Incidents, accidents and emergencies', icon: 'firstaid', description: 'What to do at the scene and basic first aid.' },
  { slug: 'vehicle-loading', title: 'Vehicle loading', icon: 'box', description: 'Loads, passengers, child seats and towing.' }
] as const

export type TopicSlug = (typeof TOPICS)[number]['slug']
