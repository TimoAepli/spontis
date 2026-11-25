import { Category, Friend, Participant, Profile, Visibility } from '../models';

/**
 * Beispieldaten für den Demo-Modus rund um St. Gallen.
 * Alle IDs beginnen mit «demo-», damit sie nie mit echten Daten verwechselt werden.
 * Die Zeiten werden relativ zu «jetzt» berechnet, damit die Demo zu jeder Tageszeit passt.
 */

export const DEMO_ME: Profile = {
  id: 'demo-me',
  username: 'lena_sg',
  first_name: 'Lena',
  invite_code: 'DE0001',
};

/** Demo-Personen: Freunde von Lena und Leute aus der Nähe. */
export const DEMO_PEOPLE = {
  jonas: { id: 'demo-jonas', firstName: 'Jonas', username: 'jonas.k', code: 'DE0002' },
  sara: { id: 'demo-sara', firstName: 'Sara', username: 'sara_sg', code: 'DE0003' },
  luca: { id: 'demo-luca', firstName: 'Luca', username: 'luca99', code: 'DE0004' },
  nina: { id: 'demo-nina', firstName: 'Nina', username: 'nina.b', code: 'DE0005' },
  elena: { id: 'demo-elena', firstName: 'Elena', username: 'elena_m', code: 'DE0006' },
  noah: { id: 'demo-noah', firstName: 'Noah', username: 'noah.run', code: 'DE0007' },
  mia: { id: 'demo-mia', firstName: 'Mia', username: 'mia_sg', code: 'DE0008' },
  timo: { id: 'demo-timo', firstName: 'Timo', username: 'timo.climb', code: 'DE0009' },
  lara: { id: 'demo-lara', firstName: 'Lara', username: 'lara_l', code: 'DE000A' },
  dario: { id: 'demo-dario', firstName: 'Dario', username: 'dario_d', code: 'DE000B' },
  selin: { id: 'demo-selin', firstName: 'Selin', username: 'selin.s', code: 'DE000C' },
  ben: { id: 'demo-ben', firstName: 'Ben', username: 'ben_sg', code: 'DE000D' },
} as const;

type PersonKey = keyof typeof DEMO_PEOPLE;

export interface DemoActivity {
  id: string;
  creatorId: string;
  creatorFirstName: string;
  creatorInviteCode: string;
  category: Category;
  title: string;
  startsAt: Date;
  lat: number;
  lng: number;
  placeName: string;
  minParticipants: number;
  visibility: Visibility;
  isSponsored: boolean;
  participants: Participant[];
}

export interface DemoSeed {
  activities: DemoActivity[];
  friends: Friend[];
}

/** Startzeit: jetzt + Minuten, auf 5 Minuten gerundet. */
function inMinutes(now: Date, minutes: number): Date {
  const fiveMin = 5 * 60000;
  return new Date(Math.round((now.getTime() + minutes * 60000) / fiveMin) * fiveMin);
}

function person(key: PersonKey, joinedAt: Date): Participant {
  return { userId: DEMO_PEOPLE[key].id, firstName: DEMO_PEOPLE[key].firstName, joinedAt };
}

export function buildDemoSeed(now: Date = new Date()): DemoSeed {
  const earlier = new Date(now.getTime() - 40 * 60000);

  const make = (
    id: string,
    creator: PersonKey,
    category: Category,
    title: string,
    startInMin: number,
    place: { name: string; lat: number; lng: number },
    min: number,
    visibility: Visibility,
    others: PersonKey[],
  ): DemoActivity => ({
    id: `demo-${id}`,
    creatorId: DEMO_PEOPLE[creator].id,
    creatorFirstName: DEMO_PEOPLE[creator].firstName,
    creatorInviteCode: DEMO_PEOPLE[creator].code,
    category,
    title,
    startsAt: inMinutes(now, startInMin),
    lat: place.lat,
    lng: place.lng,
    placeName: place.name,
    minParticipants: min,
    visibility,
    isSponsored: false,
    participants: [creator, ...others].map((k) => person(k, earlier)),
  });

  const activities: DemoActivity[] = [
    make('thai', 'luca', 'essen', 'Zmittag Thai am Marktplatz', 25,
      { name: 'Marktplatz', lat: 47.4245, lng: 9.3767 }, 2, 'friends', ['sara']),
    make('joggen', 'noah', 'sport', 'Joggen um die Drei Weieren', 45,
      { name: 'Drei Weieren', lat: 47.4166, lng: 9.3845 }, 2, 'nearby', []),
    make('volleyball', 'jonas', 'sport', 'Volleyball auf der Kreuzbleiche', 75,
      { name: 'Kreuzbleiche', lat: 47.4262, lng: 9.3611 }, 6, 'nearby', ['sara', 'luca', 'nina']),
    make('bier', 'sara', 'ausgang', 'Feierabendbier im Klosterviertel', 120,
      { name: 'Gallusplatz', lat: 47.4233, lng: 9.3766 }, 3, 'friends', ['nina']),
    make('bouldern', 'timo', 'sport', 'Bouldern – wer kommt mit?', 180,
      { name: 'Kletterhalle St. Gallen', lat: 47.4136, lng: 9.327 }, 3, 'nearby', ['lara']),
    make('openstage', 'elena', 'kultur', 'Open Stage im Palace', 240,
      { name: 'Palace, Blumenbergplatz', lat: 47.4252, lng: 9.372 }, 4, 'nearby', []),
    make('spiele', 'mia', 'anderes', 'Spieleabend mit Pizza', 300,
      { name: 'Linsebühl', lat: 47.4271, lng: 9.3843 }, 4, 'friends', ['jonas']),
  ];

  const friend = (key: PersonKey, status: Friend['status'], direction: Friend['direction']): Friend => ({
    userId: DEMO_PEOPLE[key].id,
    firstName: DEMO_PEOPLE[key].firstName,
    username: DEMO_PEOPLE[key].username,
    status,
    direction,
  });

  const friends: Friend[] = [
    friend('jonas', 'accepted', 'outgoing'),
    friend('sara', 'accepted', 'incoming'),
    friend('luca', 'accepted', 'outgoing'),
    friend('nina', 'accepted', 'incoming'),
    friend('mia', 'accepted', 'incoming'),
    friend('ben', 'pending', 'incoming'),
  ];

  return { activities, friends };
}

/** Reihenfolge, in der simulierte Personen beitreten (Freunde zuerst). */
export const DEMO_JOIN_ORDER: PersonKey[] = ['jonas', 'sara', 'nina', 'luca', 'mia', 'dario', 'selin', 'lara', 'noah', 'timo', 'elena', 'ben'];
