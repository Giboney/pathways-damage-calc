import type * as I from './interface';
import {toID} from '../util';

const RBY: string[] = [];

const GSC: string[] = [];

const ADV = [
  'Air Lock',
  'Arena Trap',
  'Battle Armor',
  'Blaze',
  'Chlorophyll',
  'Clear Body',
  'Cloud Nine',
  'Color Change',
  'Compound Eyes',
  'Cute Charm',
  'Drizzle',
  'Damp',
  'Drought',
  'Early Bird',
  'Effect Spore',
  'Flame Body',
  'Flash Fire',
  'Forecast',
  'Guts',
  'Huge Power',
  'Hustle',
  'Hyper Cutter',
  'Illuminate',
  'Immunity',
  'Inner Focus',
  'Insomnia',
  'Intimidate',
  'Keen Eye',
  'Levitate',
  'Lightning Rod',
  'Limber',
  'Liquid Ooze',
  'Magma Armor',
  'Magnet Pull',
  'Marvel Scale',
  'Minus',
  'Natural Cure',
  'Oblivious',
  'Overgrow',
  'Own Tempo',
  'Pickup',
  'Plus',
  'Poison Point',
  'Pressure',
  'Pure Power',
  'Rain Dish',
  'Rock Head',
  'Rough Skin',
  'Run Away',
  'Sand Stream',
  'Sand Veil',
  'Serene Grace',
  'Shadow Tag',
  'Shed Skin',
  'Shell Armor',
  'Shield Dust',
  'Soundproof',
  'Speed Boost',
  'Static',
  'Stench',
  'Sticky Hold',
  'Sturdy',
  'Suction Cups',
  'Swarm',
  'Swift Swim',
  'Synchronize',
  'Thick Fat',
  'Torrent',
  'Trace',
  'Truant',
  'Vital Spirit',
  'Volt Absorb',
  'Water Absorb',
  'Water Veil',
  'White Smoke',
  'Wonder Guard',
];

const DPP = ADV.concat([
  'Adaptability',
  'Aftermath',
  'Anger Point',
  'Anticipation',
  'Bad Dreams',
  'Download',
  'Dry Skin',
  'Filter',
  'Flower Gift',
  'Forewarn',
  'Frisk',
  'Gluttony',
  'Heatproof',
  'Honey Gather',
  'Hydration',
  'Ice Body',
  'Iron Fist',
  'Klutz',
  'Leaf Guard',
  'Magic Guard',
  'Mold Breaker',
  'Motor Drive',
  'Mountaineer',
  'Multitype',
  'No Guard',
  'Normalize',
  'Persistent',
  'Poison Heal',
  'Quick Feet',
  'Rebound',
  'Reckless',
  'Rivalry',
  'Scrappy',
  'Simple',
  'Skill Link',
  'Slow Start',
  'Sniper',
  'Snow Cloak',
  'Snow Warning',
  'Solar Power',
  'Solid Rock',
  'Stall',
  'Steadfast',
  'Storm Drain',
  'Super Luck',
  'Tangled Feet',
  'Technician',
  'Tinted Lens',
  'Unaware',
  'Unburden',
]);

const BW = DPP.concat([
  'Analytic',
  'Big Pecks',
  'Contrary',
  'Cursed Body',
  'Defeatist',
  'Defiant',
  'Flare Boost',
  'Friend Guard',
  'Harvest',
  'Healer',
  'Heavy Metal',
  'Illusion',
  'Imposter',
  'Infiltrator',
  'Iron Barbs',
  'Light Metal',
  'Justified',
  'Magic Bounce',
  'Moody',
  'Moxie',
  'Multiscale',
  'Mummy',
  'Overcoat',
  'Pickpocket',
  'Poison Touch',
  'Prankster',
  'Rattled',
  'Regenerator',
  'Sand Force',
  'Sand Rush',
  'Sap Sipper',
  'Sheer Force',
  'Telepathy',
  'Teravolt',
  'Toxic Boost',
  'Turboblaze',
  'Unnerve',
  'Victory Star',
  'Weak Armor',
  'Wonder Skin',
  'Zen Mode',
]);

const XY = BW.concat([
  'Aerilate',
  'Aura Break',
  'Aroma Veil',
  'Bulletproof',
  'Cheek Pouch',
  'Competitive',
  'Dark Aura',
  'Delta Stream',
  'Desolate Land',
  'Fairy Aura',
  'Flower Veil',
  'Fur Coat',
  'Gale Wings',
  'Gooey',
  'Grass Pelt',
  'Magician',
  'Mega Launcher',
  'Parental Bond',
  'Pixilate',
  'Primordial Sea',
  'Protean',
  'Refrigerate',
  'Stance Change',
  'Strong Jaw',
  'Sweet Veil',
  'Symbiosis',
  'Tough Claws',
]);

const SM = XY.concat([
  'Battery',
  'Battle Bond',
  'Beast Boost',
  'Berserk',
  'Comatose',
  'Corrosion',
  'Dancer',
  'Dazzling',
  'Disguise',
  'Electric Surge',
  'Emergency Exit',
  'Fluffy',
  'Full Metal Body',
  'Galvanize',
  'Grassy Surge',
  'Innards Out',
  'Liquid Voice',
  'Long Reach',
  'Merciless',
  'Misty Surge',
  'Neuroforce',
  'Power Construct',
  'Power of Alchemy',
  'Prism Armor',
  'Psychic Surge',
  'Queenly Majesty',
  'RKS System',
  'Receiver',
  'Schooling',
  'Shadow Shield',
  'Shields Down',
  'Slush Rush',
  'Stamina',
  'Stakeout',
  'Steelworker',
  'Soul-Heart',
  'Surge Surfer',
  'Tangling Hair',
  'Triage',
  'Water Bubble',
  'Water Compaction',
  'Wimp Out',
]);

const SS = SM.concat([
  'As One (Glastrier)',
  'As One (Spectrier)',
  'Ball Fetch',
  'Chilling Neigh',
  'Cotton Down',
  'Curious Medicine',
  'Dauntless Shield',
  'Dragon\'s Maw',
  'Gorilla Tactics',
  'Grim Neigh',
  'Gulp Missile',
  'Hunger Switch',
  'Ice Face',
  'Ice Scales',
  'Intrepid Sword',
  'Libero',
  'Mimicry',
  'Mirror Armor',
  'Neutralizing Gas',
  'Pastel Veil',
  'Perish Body',
  'Power Spot',
  'Propeller Tail',
  'Punk Rock',
  'Quick Draw',
  'Ripen',
  'Sand Spit',
  'Screen Cleaner',
  'Stalwart',
  'Steam Engine',
  'Steely Spirit',
  'Transistor',
  'Unseen Fist',
  'Wandering Spirit',
]);

const SV = SS.concat([
  'Anger Shell',
  'Armor Tail',
  'Beads of Ruin',
  'Commander',
  'Costar',
  'Cud Chew',
  'Earth Eater',
  'Electromorphosis',
  'Embody Aspect (Cornerstone)',
  'Embody Aspect (Hearthflame)',
  'Embody Aspect (Teal)',
  'Embody Aspect (Wellspring)',
  'Good as Gold',
  'Guard Dog',
  'Hadron Engine',
  'Hospitality',
  'Lingering Aroma',
  'Mind\'s Eye',
  'Mycelium Might',
  'Opportunist',
  'Orichalcum Pulse',
  'Poison Puppeteer',
  'Protosynthesis',
  'Purifying Salt',
  'Quark Drive',
  'Rocky Payload',
  'Seed Sower',
  'Sharpness',
  'Supersweet Syrup',
  'Supreme Overlord',
  'Sword of Ruin',
  'Tablets of Ruin',
  'Tera Shell',
  'Tera Shift',
  'Teraform Zero',
  'Thermal Exchange',
  'Toxic Chain',
  'Toxic Debris',
  'Vessel of Ruin',
  'Well-Baked Body',
  'Wind Power',
  'Wind Rider',
  'Zero to Hero',
]);

const PATHWAYS = SV.concat([
  //add neutralizing gas immune stuff later
  'Burn Out',//irrelevant use for multihit? no thanks
  //'Who\'s Next',//not used/irrelevant
  'Raijin\'s Will',//irrelevant
  'Tsukuyomi',//sleep oppo unless ability prevents
  'Amaterasu',//burn oppo
  'Daydreamer',//irrelevant
  'Titanium Armor',//finalmods x0.7 if special, defmods x1/0.7 if phys or psyshock (dumb)
  //'Holy Aegis',//unused defense supreme overlord? not implemented correctly??
  'Dragonize',//normal -> dragon
  'Lightning Speed',//done ground immune, +5 prio except in psyterrain, electric surge, iron fist, huge power, half phys dmg, half of half (quarter) spec dmg, airborne, serene grace
  'Darkness Boost',//done 1/16 fighting dmg taken, max speed on switchin, +6 atk -1 speed on hit
  'Swarm Shell',//done weaker ver, sand stream, attack x1.5, finalmods /= 1.5
  'Untouchable',//done +6 speed and evasion on switch in
  'Golden Hour',//add omnitype, 0.5x finalmod dr, 1.5x atmod, clear body (for intim/hahaweak), affected by iron ball/gravity, airborne, immune to hazards
  'Killing Joke',//change gengar form -> forsaken, double speed, multiscale, bypass protect, 
  'X Pickup',//+6 atk + 6 speed on switch in
  //'Storm Emperor',//unused, summons storm (new weather)
  'Lightning Armor',//finalmod x0.5 if contact dr, (50% para on contact)
  //'Crown of Zeus',//unused lot of buffs if hit with electric move
  'Juggernaut',//irrelevant, all moves omniboost
  'Legendary Aura',//lots of bullshit bpmods x2, finalmods x0.25 dr jesus
  'Paid in Full',//always live on 1 hp unless already 1 hp, (+3 atk and spa + return double damage of hit)
  'Born to Die',//always live on 1 hp. (+6 atk and spa + return double damage of hit)
  'Chaos Control',//1.25x speed, change oppo ability to truant
  'Ha Ha You\'re Weak',//-6 to all oppo stats on switch
  'Relaxation',//irrelevant
  'Heavenly Shield',//defensive download
  'Ghouliate',//normal -> ghost
  'Awakening',//comatose + bpmod x 0.5 (resist ice steel rock dragon electric) + atmod x1.3 if phys
  'Sinisterize',//normal -> dark
  //'Ethereal',//not implemented. add ghost type 
  //'Rotting',//not implemented. add ghost type 
  'Angel Tears',//finalmod x.5 if dragon, bpmod x1.5 if water or fairy
  'Honor Bond',//protean + form change on ko
  'Trouble Bond',//protean + form change on ko
  //'Khepri',//unused drought + finalmods x0.5 if supereffective
  //'Scorched Earth',//unused gives oppo scorched earth hazards (burn)
  //'Haunted Field',//unused give oppo haunted field hazards (yawn)
  'Desert Devil',//sand rush + bpmods x1.3 if sand and rockgroundsteel
  //'Guidance System',//unused super luck + sniper (finalmods x2 if crit for total of 3x on crits)
  'Duelize',//normal -> fighting
  'Distortion',//trick room on switch ends onswitchout/onhit, change melmetal form, bpmods x1.5 if punch, ground immune, +1 atk when hit by ground, 5x accuracy, airborne
  'Immolate',//normal -> fire
  'Venomize',//normal -> poison
  'Turbo Engine',//electric immune, final mods x0.5 and additional x2/3 if special, atmods x2
  'Darkness Boost2',//max speed on switch, change ttar form, -3 speed +6 atk onhit
  'Swarm Shell2',//atmods x4 if phys, sandstream, finalmods x1/3
  'Killing Joke2',//change gengar form, psychic surge, double dmg on psyterrain <- nope
  'X Pickup2',//+3 atk and speed on switch
  'Raijin\'s Will2',//irrelevant, para on hit
  'Burn Out2',//irrelevant, burn on hit
  'Untouchable2',// done +2 speed and evasion on switch in
  'Beary Broken',//+1 prio on grassyterrain, grassy surge, bpmods x1.5, ignore armor tail, 
  'Pure Prayer',//+1 prio on heal move
  'Accelerate',//irrelevant, speed moxie
  //'Bewildering Mist',//unsued, give oppo bewildering mist hazard (confusion)
  'Sword of Damocles',//+1 prio on misty, misty surge, bpmods x2, finalmods x0.75
  'Solar Grace',//cloud nine
  'Demolition Expert',//boost bullet moves
  //'Stealth Bomber',//unused
  'Rainbow Wings',//
  'Slumbering Beast',//
  'Power of Friendship',//
  'Vocalist',//
  'Blinding',//
  'Frost Body',//
  'Misery After',//
  'Spirit Call',//
  //'Dragon Fear',
  'Natural Enemy',//finalmods x2 if resisted grass or bug move
  'Insidious',//finalmods x2 if resisted poison or bug move
  'Airborne',//+1 spa on tailwind/wind move, immune to wind
  'Bee Ware',//bug moves +1 prio
  'Extra Cortex',//irrelevant psychic status moves +1
  'Fly Trap', //immune to bug and poisonstatus
  'Tellurize',//normal -> ground
  'Silk Mail',//if fire move finalmods x2 else finalmods x0.5 (weak to fire)
  'Swiper',//atmods x2 if no item + pickpocket
  'Sweet Heart',//atmods x2 if fairy move
  'Spirit Drain',//ghost storm drain but +1 spd
  'Swarming',//form change on unown, immune to ground
  'Showdown Mode',//form change on lokix
  'Screamer',//bpmods x1.5 if sound, immune to sound
  'Iron Heel',//bpmods x1.5 if kicking
  'Fusion Core',//water absorb, 1.25x evasion in rain, atmods 1.5x if special
  'Dirty Deeds',//bpmods x1.5 if dark
  'Clean Heart',//bpmods x1.5 if fairy
  'Barren Desert',//start raging sandstorm
  'Aphrodite\'s Whim',//irrelevant, infatuate all pokemon on field
  'Vicious Edge',//blade moves deal extra 1/8 max hp indirect (magic guard immune)
  'Ranger Remedy',//25% shed skin
  'Sharpshooter',//bpmods x1.5 if shot
  'Gallant',//irrelevant cute charm ignore gender
  'Rock Shards',//irrelevant, set rocks on hit
  'Scrap Metal',//irrelevant, set steel type rocks on hit
  'Frozen Tundra',//start violent blizzard
  'Forest Spirits',//bpmods x1.3 if fairy or grass
  'Druidcraft',//bpmods x0.5 if bug ice or flying dr
  'Floriate',//normal -> grass
  //'Life Drain',//unused, passive leech seed (broken af)
  'All or Nothing',//bpmods x(1 + random) defmods x(1 - random), random is [0,50], if 50, move will crit, why decrease defense? who knows TODO
  'Gambler Legacy',//irrelevant, serene grace for normal moves
  'Lighten',//unburden, but 1.5x
  'Swan Song',//irrelevant, perish song for whole battle (switch every 3 turns or faint)
  'Noble Hunt',//atmods x1.5 + moxie on first ko, resets moxie count on switch out
  //'Harbinger of Storm',//not implemented
  //'Plasma Hellscape',//not used, electric surge, earth eater, normal -> electric
  'Ya Estas Cocinado',//basculegion form change, bpmods x4/3 if contact, weird mix of supremeoverlord and quark drive. basically atmods x(supremeoverlord + 0.3), but its should boost speed in real battle
  'Aquamynthesis',//rain proto
  'Healing Droplets',//drizzle, grassy surge, rain dish
  'Healing Droplets++',//drizzle, grassy surge, rain dish, iron fist
  //'Moribund',//not used, clear body, 99% cursed body, perish body
  //'Volatile Brew',//not used, irrelevant, 25% poison on hit, stacks with other effects
  'Seraphic Heal',//irrelevant, water moves heal status + 1/16 hp
  'Neurotoxicity',//bpmods x1.3 if poison or electric
  'Metallicize',//normal -> steel
  'Gravity Surge',//start gravity
  'Fiery Spirit',//immune to intim/mesmerize, immune to burn
  'Divine Mandate',//bpmods x1.3 if fairy or flying
  'Dragon DNA',//bpmods x1.5 if dragon move and use is not dragon type
  'Showtime',//+6 all stats, -1 all stats end of each turn
  'Abyssal Veil',//change zoroark form, bpmods x1.5, cursed body 100%, magic guard
  'Annoying Wall',//finalmods x0.2 if special, defmods x2 if phys or psyshock (dumb), atmods x1.5, regenerator 100%
  'Abyssal Veil ++',//change zoroark form, bpmods x1.5, cursed body 100%, dodge attacks every other turn (no guard bypasses), magic guard
  'Reaper',//heal 1/8 of damage dealt
  'Stacked Odds',//supreme overlord but 1 + 0.06xfainted, atmods
  'Cooling',//irrelevant, snow hydration
  'First Blood',//bpmods x1.25 if target at or above 75%
  'Soul Conduit',//irrelevant, soul heart copy
  'Lucky Charm',//irrelevant, victory star copy
  'Eureka',//neuroforce copy
  'Bird of Prey',//inner focus copy
  'Dreadful',//bpmods x1.3 if target has nonvolatile status
  'Basilisk',//dragon moves guarantee crit if target is para, dragon moves 30% para
  'Rags to Riches',//irrelevant, double money from battles
  'Holy Duster',//irrelevant, defogs on switch in, but still takes hazards
  'Blademaster',//bpmods x1.5 if blade
  'Dream World',//start dream world terrain, sleep normal and psychic types
  //dream world terrain: psychic type for mimicry, nature power(psychic), terrain pulse/blast
  //if target psychic or normal, normal and psychic pokemon can move while asleep
  //ALL sleeping pokemon recover 8% max hp end of turn
  'Deep Roots',//big root as an ability does not stack with big root
  'Stellar Debris',//sets stellar rocks on hit, can have 2 layers 1/6 vs 1/8
  'Sinful Gluttony',//fuck this
  'Lightning Fast',//start endless electric terrain, +1 prio on electric terrain
  'Vicious Claws',//slicing moves deal extra 1/8 max hp indirect (magic guard immune)
  'Screen Maker',//irrelevant, screens last an extra 2 turns
  'Coral Debris',//irrelevant, sets spikes if hit by phys
  'Anti-Gravity',//double speed in gravity
  'Draconic Soul',//start dragonic soul terrain
  //dragonic terrain: dragon type for mimicry, nature power (dragon pulse), terrain pulse/blast
  //dragon moves are neutral vs dragon pokemon
  //bpmods x1.5 if dragon move, finalmods x0.9 if target dragon
  'Terror Realm',//start terror realm terrain
  //terror terrain: dark type for secret power, mimicry, nature power (dark pulse), terrain pulse/blast. zmove terrain pulse/blast is ghost type??
  //bpmods x1.5 if ghost or dark move
  //if asleep and not ghost or dark, lose 1/8 hp end of turn
  //moves heal 50% of damage dealt if target is asleep
  'Faraday Cage',//start faraday cage terrain
  //doubles as electric terrain for abilities, moves, and electric seed, cannot be replaced by electric terrain
  //electric pokemon get charge at end of turn
  //bpmods x1.5 if electric move
  'Frozen Kingdom',//start frozen kingdom terrain and snow
  //frozen terrain: ice type for secret power, mimicry, nature power (ice beam), terrain pulse/blast
  //bpmods x1.5 if ice move
  //lowers speed by one on switch if not ice type
  //if weather or terrain is changed both disappear
  'Fatal Release',//sets sticky web on faint
  'Hydrochasm Surge',//lot of shit
  'Hydrochasm Surge++',//even more shit fuck arfy for this man i aint coding that unaware, clear body, battle armor, noguard, magic guard, 
  'Requiem Di Diavolo',//gliscor form change, bpmods x2 if sound move, soundproof, poison heal, swansong
  'Bull Rush',//gorilla tactics clone
  'Frost Drain',//ice immunity, raise spd
  'Witchcraft',//fire moves cant miss, airborne
  'Crescendo',//whismur form change, ignore flash fire and well baked body, normal -> fire, fluffy, metronome (finalmods), atmods x1.5 is sound, not there yet  ----> atmods x0.5 if target has flash fire or well baked body
  'Grit',//guts but atmods x1.3
  'Primal Fury',//bpmods x1.3 if bug or flying move
  'Velocity',//irrelevant, boost speed on ko, once per switch in
  'Mind Flay',//psychic moves apply the mind flay effect (lose 1/8 hp eor)
  'Ambusher',//bpmods x1.25 if first turn out
  'Golden Land',//bpmods x(1 + money/30) caps at 1.25, also add 5xlvl money on hit
  'Spendthrift',//proto, but only activated by big nugget
  'Pandemonium',//TODO (later)
  'Assassin',//adaptability clone
  'Light Born',//atmods x2, klutz
  'Evoboost',//atmods x1.5, 
  'Great Mischief',//toggle 0.5bpmod + dirty deeds copy
  'Soul Ablaze',//riolu
  'Lunar Light',//unaware, magic guard, 50% atmod fairy move
  'Vile Venom',//iron heel, double poison damage, 25% boost if target is poisoned
  'Robust Toxin',//25% dr if attacker is poisoned, heals from poisoned foes NEED TO DO HEALING LATER
  'Rampage',//guts + quick feet + klutz
  'Rolling Stone',//sturdy + rock head + speed boost on hit
  'Beary Cold',//tough claws + slush rush + swift swim
  'Spookster',//25% dr + cursed body + levitate
  'Hoppertunist',//tinted lens + compound eye + swarm
  'Fowl Play',//tailwind on switch + wind rider = airborne
  'Heavy Heart',//sheer force + cheek pouch + gluttony
  'Purrfection',//psychic terrain seed sower + 50% spa boost + infiltrator
  'Stubborn Mule',//boots + stamina for def and spd + inner focus
  'Primeval Gift',//normal -> type of berry
  'Laced Cream',//immune to effects nonvola status, gives to attacker if they make contact
  'Tracker',//
  'Vicious Fangs',//
  'Night Stalker',//
  'Berry Good',//unused
  'Boiling Point',//
  'Street Chef',// DONE
  'Vegetarian',//seraphic heal for grass
  'Dry-Aged',//DONE ignores stat changes from any source, item, status, stat stages
  'Mesmerize',//intim but spatk
  'Rapid Fire',//loaded dice as an ability
  'Oxidation',//poison hits steel for normal effectiveness
  'Ferrite Scales',//bmods x0.5 if rock or ice dr, immuse to poison
  'Garden of Thorns',//DONE
  //'Temporal Exchange',//unused (for now)
  'Flash Flood', //done
  //'Lightning Chain',//
  //'Ice Sculptor',//
  //'Mana Burn',//
  //'Magical Meltdown',//
  //'Elementalist',//
  //'Spell Focus',//
  'Brewer',//
  'Dust Reaction',//
  'Snake Oil',//
  'Hydrate',//
  'Equivalence',//
  'Open Stance',//
  'Tranquility',//
  'Blind Spot',//
  'Psyonize',//
  'Martial Body',//
  //'Guidance',//
  //'Blessed Salt',//
  //'Chakra Mirror',//unused
  //'Astral Projection',//
  //'Praise the Sun',//
  'Mindless Rage',//
  'Heavy Blows',//
  'Undying Rage',//
  'Restless',//
  //'Hellfire',//
  //'Law Breaker',//
  //'Breakdown',//
  //'Scorching Touch',//
  //'Bane',//
  'Transmutation',//DONE
  'Rock Never Dies',//DONE
  'Absolute Gaia',//DONE
  'Combo Flurry',//DONE
  'Revelry',//
  'Undead Detonation',//
  'Soul Siphon',//DONE
  'Axe Tyranny',//
]);

export const ABILITIES = [[], RBY, GSC, ADV, DPP, BW, XY, SM, SS, SV, PATHWAYS];

export class Abilities implements I.Abilities {
  private readonly gen: I.GenerationNum;

  constructor(gen: I.GenerationNum) {
    this.gen = gen;
  }

  get(id: I.ID) {
    return ABILITIES_BY_ID[this.gen][id];
  }

  *[Symbol.iterator]() {
    for (const id in ABILITIES_BY_ID[this.gen]) {
      yield this.get(id as I.ID)!;
    }
  }
}

class Ability implements I.Ability {
  readonly kind: 'Ability';
  readonly id: I.ID;
  readonly name: I.AbilityName;

  constructor(name: string) {
    this.kind = 'Ability';
    this.id = toID(name);
    this.name = name as I.AbilityName;
  }
}

const ABILITIES_BY_ID: Array<{[id: string]: Ability}> = [];

for (const abilities of ABILITIES) {
  const map: {[id: string]: Ability} = {};
  for (const ability of abilities) {
    const a = new Ability(ability);
    map[a.id] = a;
  }
  ABILITIES_BY_ID.push(map);
}
