import type {
  Generation,
  ID,
  ItemName,
  MoveCategory,
  NatureName,
  StatID,
  StatsTable,
  Terrain,
  TypeName,
  Weather,
} from '../../data/interface';
import {toID} from '../../util';
import {getNaturalGift} from '../../items';
import type {Field, Side} from '../../field';
import type {Move} from '../../move';
import type {Pokemon} from '../../pokemon';
import {Stats} from '../../stats';
import type {RawDesc} from '../../desc';
import {NO_ROLE} from '../../data/roles';
import {isQPActive} from '../util';



export function getFinalDamagePathways(
  basePower: number,
  attack: number,
  defense: number,
  level: number,
  finalMod: number,
) {
  let damageRolls = [];
  for (let i = 0; i < 16; i++) {
    damageRolls[i] = Math.max(
      Math.round((Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * basePower * attack / defense) / 50) + 2) * finalMod * ((85 + i) / 100)), 1
    );
  }
  return damageRolls;
}


export function getMoveEffectivenessPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  type: TypeName,
  field: Field,
  desc: RawDesc,
) {
  if (move.hasType('Shadow')) {
    return 2;
  }
  let e = gen.types.get(toID(move.type))!.effectiveness[type]!;
  if (
    (attacker.hasAbility('Scrappy') || attacker.hasAbility('Mind\'s Eye') || field.defenderSide.isForesight) &&
    type === 'Ghost' && move.hasType('Normal', 'Fighting')
  ) {
    if (attacker.hasAbility('Scrappy') || attacker.hasAbility('Mind\'s Eye')) {
      desc.attackerAbility = attacker.ability;
    }
    return 1;
  } else if (
    move.hasType('Ground') &&
    (type === 'Flying' || type === 'Omnitype') &&
    (field.isGravity || defender.hasItem('Iron Ball') || move.named('Thousand Arrows'))
  ) {
    if ((defender.hasItem('Iron Ball') && !defender.hasAbility('Klutz', 'Light Born'))) {
      desc.defenderItem = defender.item;
    }
    return 1;
  } else if (field.hasTerrain('Dragonic Soul') && move.hasType('Dragon') && defender.hasType('Dragon')) {
    desc.terrain = field.terrain;
    return 1;
  } else if (defender.hasItem('Ring Target') && e === 0) {
    desc.defenderItem = defender.item;
    return 1;
  }
	
  if (
    (move.named('Freeze-Dry') && type === 'Water') ||
    (move.named('Kelp Wreck') && type === 'Steel') ||
    (move.named('Venomous Spines') && type === 'Dragon') ||
    (move.named('Shinu Slash') && ['Water', 'Ice'].includes(type)) ||
    (move.named('Minamo Giri') && ['Water', 'Ice', 'Steel', 'Dragon'].includes(type))
  ) {
    e = 2;
  } else if (move.named('Flying Press')) {
    e = (
      gen.types.get('fighting' as ID)!.effectiveness[type]! *
      gen.types.get('flying' as ID)!.effectiveness[type]!
    );
  } else if (move.named('Fyre Frost') || move.named('Fire Frost')) {
    e = (
      gen.types.get('ice' as ID)!.effectiveness[type]! *
      gen.types.get('fire' as ID)!.effectiveness[type]!
    );
  }
	
  if (field.hasWeather('Strong Winds') && type === 'Flying' && e > 1) {
    e /= 2;
    desc.weather = field.weather;
  }
	
  return e;
}



export function getStabModPathways(pokemon: Pokemon, move: Move, desc: RawDesc) {
  let stabMod = 1;
  if (pokemon.hasOriginalType(move.type)) {
    stabMod += 0.5;
  } else if (pokemon.hasAbility('Protean', 'Libero', 'Honor Bond', 'Trouble Bond', 'Battle Bond') && !pokemon.teraType) {
    stabMod += 0.5;
    desc.attackerAbility = pokemon.ability;
  }
  const teraType = pokemon.teraType;
  if (teraType === move.type && teraType !== 'Stellar') {
    stabMod += 0.5;
    desc.attackerTera = teraType;
  }
  if (pokemon.hasAbility('Adaptability', 'Assassin') && pokemon.hasType(move.type)) {
    stabMod += teraType && pokemon.hasOriginalType(teraType) ? 0.25 : 0.5;
    desc.attackerAbility = pokemon.ability;
  }
  return stabMod;
}



export function getQPBoostedStatPathways(
  pokemon: Pokemon,
): StatID {
  if (pokemon.boostedStat && pokemon.boostedStat !== 'auto') {
    return pokemon.boostedStat; // override.
  }
  let bestStat: StatID = 'atk';
  for (const stat of ['def', 'spa', 'spd', 'spe'] as StatID[]) {
    if (
      // proto/quark ignore boosts when considering their boost
      getModifiedStatPathways(pokemon.rawStats[stat], pokemon.boosts[stat]) >
      getModifiedStatPathways(pokemon.rawStats[bestStat], pokemon.boosts[bestStat])
    ) {
      bestStat = stat;
    }
  }
  return bestStat;
}



export function getModifiedStatPathways(stat: number, mod: number) {
  const numerator = 0;
  const denominator = 1;
  const modernGenBoostTable = [
    [2, 8],
    [2, 7],
    [2, 6],
    [2, 5],
    [2, 4],
    [2, 3],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 2],
    [7, 2],
    [8, 2],
  ];
  stat = stat * modernGenBoostTable[6 + mod][numerator];
  stat = Math.floor(stat / modernGenBoostTable[6 + mod][denominator]);

  return stat;
}



export function computeFinalStatsPathways(
  attacker: Pokemon,
  defender: Pokemon,
  field: Field,
  ...stats: StatID[]
) {
  const sides: Array<[Pokemon, Side]> =
    [[attacker, field.attackerSide], [defender, field.defenderSide]];
  for (const [pokemon, side] of sides) {
    for (const stat of stats) {
      if (stat === 'spe') {
        pokemon.stats.spe = getFinalSpeedPathways(pokemon, field, side);
      } else {
        pokemon.stats[stat] = getModifiedStatPathways(pokemon.rawStats[stat]!, pokemon.boosts[stat]!);
      }
    }
  }
}


const EV_ITEMS = [
  'Macho Brace',
  'Power Anklet',
  'Power Band',
  'Power Belt',
  'Power Bracer',
  'Power Lens',
  'Power Weight',
];
export function getFinalSpeedPathways(pokemon: Pokemon, field: Field, side: Side) {
  const weather = field.weather || '';
  const terrain = field.terrain || '';
  let speed = getModifiedStatPathways(pokemon.rawStats.spe, pokemon.boosts.spe);
  let speedMod = 1;

  if ((pokemon.hasAbility('Unburden') && pokemon.abilityOn) ||
      (pokemon.hasAbility('Chlorophyll') && ['Sun', 'Harsh Sunshine'].includes(weather)) ||
      (pokemon.hasAbility('Sand Rush', 'Desert Devil') && ['Sand', 'Raging Sandstorm'].includes(weather)) ||
      (pokemon.hasAbility('Swift Swim') && ['Rain', 'Heavy Rain', 'Harsh Typhoon'].includes(weather)) ||
      (pokemon.hasAbility('Slush Rush') && ['Hail', 'Snow', 'Violent Blizzard'].includes(weather)) ||
      (pokemon.hasAbility('Surge Surfer') && ['Electric', 'Faraday Cage'].includes(terrain)) ||
      (pokemon.hasAbility('Killing Joke')) ||
      (pokemon.hasAbility('Anti-Gravity') && field.isGravity)
  ) {
    speedMod *= 2;
  } else if (
    (pokemon.hasAbility('Quick Feet') && pokemon.status) ||
    (pokemon.hasAbility('Lighten') && pokemon.abilityOn) ||
		(isQPActive(pokemon, field) && getQPBoostedStatPathways(pokemon) === 'spe')
  ) {
    speedMod *= 1.5;
  } else if (pokemon.hasAbility('Chaos Control')) {
    speedMod *= 1.25;
  } else if (pokemon.hasAbility('Slow Start') && pokemon.abilityOn) {
    speedMod *= 0.5;
  }

  if (
		pokemon.hasItem('Choice Scarf') ||
		(pokemon.hasItem('Nuptial Veil') && pokemon.named('Salandit'))
	) {
    speedMod *= 1.5;
  } else if (pokemon.hasItem('Iron Ball', ...EV_ITEMS)) {
    speedMod *= 0.5;
  } else if (pokemon.hasItem('Quick Powder') && pokemon.named('Ditto')) {
    speedMod *= 2;
  }

  if (side.isTailwind) speedMod *= 2;
  // Pledge swamp would get applied here when implemented
	
  if (pokemon.hasStatus('par') && !pokemon.hasAbility('Quick Feet', 'Laced Cream', 'Dry Aged')) {
    speedMod *= 0.5;
  }

  return Math.max(Math.round(speed * speedMod), 1);
}



export function checkMultihitBoostPathways(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  attackerUsedItem = false,
  defenderUsedItem = false
) {
  // NOTE: attacker.ability must be Parental Bond for these moves to be multi-hit
  if (move.named('Gyro Ball', 'Electro Ball') && defender.hasAbility('Gooey', 'Tangling Hair')) {
    // Gyro Ball (etc) makes contact into Gooey (etc) whenever its inflicting multiple hits because
    // this can only happen if the attacker ability is Parental Bond (and thus can't be Long Reach)
    if (attacker.hasItem('White Herb') && !attackerUsedItem) {
      desc.attackerItem = attacker.item;
      attackerUsedItem = true;
    } else {
      attacker.boosts.spe = Math.max(attacker.boosts.spe - 1, -6);
      attacker.stats.spe = getFinalSpeedPathways(attacker, field, field.attackerSide);
      desc.defenderAbility = defender.ability;
    }
    // BUG: Technically Sitrus/Figy Berry + Unburden can also affect the defender's speed, but
    // this goes far beyond what we care to implement (especially once Gluttony is considered) now
  } else if (move.named('Power-Up Punch')) {
    attacker.boosts.atk = Math.min(attacker.boosts.atk + 1, 6);
    attacker.stats.atk = getModifiedStatPathways(attacker.rawStats.atk, attacker.boosts.atk);
  }

  const atkSimple = attacker.hasAbility('Simple') ? 2 : 1;
  const defSimple = defender.hasAbility('Simple') ? 2 : 1;

  if ((!defenderUsedItem) &&
    (defender.hasItem('Luminous Moss') && move.hasType('Water')) ||
    (defender.hasItem('Maranga Berry') && move.category === 'Special') ||
    (defender.hasItem('Kee Berry') && move.category === 'Physical')) {
    const defStat = defender.hasItem('Kee Berry') ? 'def' : 'spd';
    if (attacker.hasAbility('Unaware')) {
      desc.attackerAbility = attacker.ability;
    } else {
      if (defender.hasAbility('Contrary')) {
        desc.defenderAbility = defender.ability;
        if (defender.hasItem('White Herb') && !defenderUsedItem) {
          desc.defenderItem = defender.item;
          defenderUsedItem = true;
        } else {
          defender.boosts[defStat] = Math.max(-6, defender.boosts[defStat] - defSimple);
        }
      } else {
        defender.boosts[defStat] = Math.min(6, defender.boosts[defStat] + defSimple);
      }
      if (defSimple === 2) desc.defenderAbility = defender.ability;
      defender.stats[defStat] = getModifiedStatPathways(defender.rawStats[defStat], defender.boosts[defStat]);
      desc.defenderItem = defender.item;
      defenderUsedItem = true;
    }
  }

  if (defender.hasAbility('Seed Sower')) {
    field.terrain = 'Grassy';
  }
  if (defender.hasAbility('Sand Spit')) {
    field.weather = 'Sand';
  }

  if (defender.hasAbility('Stamina')) {
    if (attacker.hasAbility('Unaware')) {
      desc.attackerAbility = attacker.ability;
    } else {
      defender.boosts.def = Math.min(defender.boosts.def + 1, 6);
      defender.stats.def = getModifiedStatPathways(defender.rawStats.def, defender.boosts.def);
      desc.defenderAbility = defender.ability;
    }
  } else if (defender.hasAbility('Water Compaction') && move.hasType('Water')) {
    if (attacker.hasAbility('Unaware')) {
      desc.attackerAbility = attacker.ability;
    } else {
      defender.boosts.def = Math.min(defender.boosts.def + 2, 6);
      defender.stats.def = getModifiedStatPathways(defender.rawStats.def, defender.boosts.def);
      desc.defenderAbility = defender.ability;
    }
  } else if (defender.hasAbility('Weak Armor')) {
    if (attacker.hasAbility('Unaware')) {
      desc.attackerAbility = attacker.ability;
    } else {
      if (defender.hasItem('White Herb') && !defenderUsedItem && defender.boosts.def === 0) {
        desc.defenderItem = defender.item;
        defenderUsedItem = true;
      } else {
        defender.boosts.def = Math.max(defender.boosts.def - 1, -6);
        defender.stats.def = getModifiedStatPathways(defender.rawStats.def, defender.boosts.def);
      }
      desc.defenderAbility = defender.ability;
    }
    defender.boosts.spe = Math.min(defender.boosts.spe + 2, 6);
    defender.stats.spe = getFinalSpeedPathways(defender, field, field.defenderSide);
  }

  if (move.dropsStats) {
    if (attacker.hasAbility('Unaware')) {
      desc.attackerAbility = attacker.ability;
    } else {
      // No move with dropsStats has fancy logic regarding category here
      const stat = move.category === 'Special' ? 'spa' : 'atk';

      let boosts = attacker.boosts[stat];
      if (attacker.hasAbility('Contrary')) {
        boosts = Math.min(6, boosts + move.dropsStats);
        desc.attackerAbility = attacker.ability;
      } else {
        boosts = Math.max(-6, boosts - move.dropsStats * atkSimple);
      }
      if (atkSimple === 2) desc.attackerAbility = attacker.ability;

      if (attacker.hasItem('White Herb') && attacker.boosts[stat] < 0 && !attackerUsedItem) {
        boosts += move.dropsStats * atkSimple;
        desc.attackerItem = attacker.item;
        attackerUsedItem = true;
      }

      attacker.boosts[stat] = boosts;
      attacker.stats[stat] = getModifiedStatPathways(attacker.rawStats[stat], defender.boosts[stat]);
    }
  }

  // Do ability swap after all other effects
  if (defender.hasAbility('Mummy', 'Wandering Spirit', 'Lingering Aroma') && move.flags.contact) {
    const oldAttackerAbility = attacker.ability;
    attacker.ability = defender.ability;
    // If attacker ability is notable, then ability swap is notable.
    if (desc.attackerAbility) {
      desc.defenderAbility = defender.ability;
    }
    if (defender.hasAbility('Wandering Spirit')) {
      defender.ability = oldAttackerAbility;
    }
  }

  return [attackerUsedItem, defenderUsedItem];
}



export function affectedByHazards(field: Field, pokemon: Pokemon) {
  return false;
}



export function getAuraCrystalAtMod(pokemon: Pokemon) {
  let effectiveAura;

  if (pokemon.alignment === 'Shiny') {
    effectiveAura = Math.floor(pokemon.lightAura / 2);
  } else if (pokemon.alignment === 'Shadow') {
    effectiveAura = Math.floor(pokemon.darkAura / 2);
  } else {
    // Only "pairs" of aura count.
    effectiveAura = Math.min(pokemon.lightAura, pokemon.darkAura);
  }

  let mult = 1 + Math.min(0.01 * effectiveAura, 0.25);
  return mult;
}



export function getAuraCrystalDR(pokemon: Pokemon) {
  let effectiveAura;

  if (pokemon.alignment === 'Shiny') {
    effectiveAura = Math.floor(pokemon.lightAura / 2);
  } else if (pokemon.alignment === 'Shadow') {
    effectiveAura = Math.floor(pokemon.darkAura / 2);
  } else {
    // Only "pairs" of aura count.
    effectiveAura = Math.min(pokemon.lightAura, pokemon.darkAura);
  }

  let mult = 1 - Math.min(0.005 * effectiveAura, 0.125);
  return mult;
}



export function getRoleDamageMod(pokemon: Pokemon) {
  if (pokemon.role !== NO_ROLE && pokemon.hasType(...pokemon.role.types)) {
    switch (pokemon.roleRank) {
      case 'Apprentice':
        return 1.04;
      case 'Expert':
        return 1.07;
      case 'Master':
        return 1.10;
      default:
        console.log('No role rank selected.');
    }
  }
  return 1;
}



export function getAteAbilityType(gen: Generation, attacker: Pokemon, move: Move) {
  switch (attacker.ability) {
    case 'Liquid Voice':
      if (move.flags.sound) {
        return 'Water';
      }
      return false;
    case 'Primeval Gift':
      if (attacker.item?.endsWith('Berry')) {
        return getNaturalGift(gen, attacker.item)!.t;
      }
      return false;
    case 'Aerialate':
      return 'Flying';
    case 'Floriate':
      return 'Grass';
    case 'Tellurize':
      return 'Ground';
    case 'Venomize':
      return 'Poison';
    case 'Immolate':
    case 'Crescendo':
      return 'Fire';
    case 'Duelize':
      return 'Fighting';
    case 'Galvanize':
    case 'Plasma Hellscape':
      return 'Electric';
    case 'Ghouliate':
      return 'Ghost';
    case 'Sinisterize':
      return 'Dark';
    case 'Normalize':
      return 'Normal';
    case 'Pixilate':
      return 'Fairy';
    case 'Metallicize':
      return 'Steel';
    case 'Dragonize':
      return 'Dragon';
    case 'Refrigerate':
      return 'Ice';
    default:
      return false;
  }
}
