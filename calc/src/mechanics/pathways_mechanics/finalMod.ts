import type {Generation, AbilityName, StatID, Terrain} from '../../data/interface';
import {toID} from '../../util';
import {
  getBerryResistType,
  getFlingPower,
  getItemBoostType,
  getMultiAttack,
  getTechnoBlast,
} from '../../items';
import type {RawDesc} from '../../desc';
import type {Field} from '../../field';
import type {Move} from '../../move';
import type {Pokemon} from '../../pokemon';
import {Result} from '../../result';
import {
  checkAirLock,
  checkForecast,
  checkInfiltrator,
  checkItem,
  checkTeraformZero,
  checkWindRider,
  checkWonderRoom,
  countBoosts,
  getStatDescriptionText,
  getShellSideArmCategory,
  getWeight,
  handleFixedDamageMoves,
  isGrounded,
} from '../util';
import {
  getStabModPathways,
  getModifiedStatPathways,
  computeFinalStatsPathways,
  checkMultihitBoostPathways,
  affectedByHazards,
} from './util';


export function calculateFinalModPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false,
  typeEffectiveness: number,
  hitCount = 0
) {
  let finalMod = 1;
  
  //attacker ability
  if (
    (attacker.hasAbility('Sniper', 'Guidance System') && isCritical) ||
    (attacker.hasAbility('Tinted Lens') && typeEffectiveness < 1) ||
    (attacker.hasAbility('Insidious') && typeEffectiveness < 1 && move.hasType('Bug', 'Poison')) ||
    (attacker.hasAbility('Natural Enemy') && typeEffectiveness < 1 && move.hasType('Bug', 'Grass'))
  ){
    finalMod *= 2;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Neuroforce', 'Eureka') && typeEffectiveness > 1) {
    finalMod *= 1.25;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Crescendo') && move.timesUsedWithMetronome! >= 1) {
    const timesUsedWithMetronome = Math.min(5, Math.floor(move.timesUsedWithMetronome!));
    finalMod *= 1 + 0.2 * timesUsedWithMetronome;
    desc.attackerAbility = attacker.ability;
  }
  
  //defender ability
  if (defender.hasAbility('Darkness Boost') && move.hasType('Fighting')) {
    finalMod /= 16;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Annoying Wall') && move.category === 'Special') {
    finalMod *= 0.2;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Legendary Aura')) {
    finalMod *= 0.25;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Swarm Shell2')) {
    finalMod /= 3;
    desc.defenderAbility = defender.ability;
  } else if (
    (defender.hasAbility('Ice Scales') && move.category === 'Special') ||
    (defender.hasAbility('Multiscale', 'Shadow Shield', 'Killing Joke') && defender.curHP() === defender.maxHP() &&
     hitCount === 0 && !affectedByHazards(defender, field) && !attacker.hasAbility('Parental Bond (Child)')) ||
    (defender.hasAbility('Water Bubble') && move.hasType('Fire')) ||
    (defender.hasAbility('Punk Rock') && move.flags.sound) ||
    (defender.hasAbility('Angel Tears') && move.hasType('Dragon')) ||
    (defender.hasAbility('Khepri') && typeEffectiveness > 1) ||
    defender.hasAbility('Golden Hour') ||
    (defender.hasAbility('Lightning Armor') && move.flags.contact)
  ) {
    finalMod *= 0.5;
    desc.defenderAbility = defender.ability;
  } else if (
    (defender.hasAbility('Filter', 'Solid Rock', 'Prism Armor') && typeEffectiveness > 1) ||
    defender.hasAbility('Sword of Damocles')
  ) {
    finalMod *= 0.75;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Titanium Armor') && move.category === 'Special') {
    finalMod *= 0.7;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Fluffy')) {
    if (move.flags.contact && !attacker.hasAbility('Long Reach')) {
      finalMod *= 0.5;
      desc.defenderAbility = defender.ability;
    }
    if (move.hasType('Fire')) {
      finalMod *= 2;
      desc.defenderAbility = defender.ability;
    }
  } else if (defender.hasAbility('Silk Mail')) {
    finalMod *= move.hasType('Fire') ? 2 : 0.5;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Swarm Shell')) {
    finalMod /= 1.5;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Turbo Engine')) {
    finalMod *= 0.5;
    if (move.category === 'Special') finalMod /= 1.5;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Lightning Speed')) {
    finalMod *= 0.5;
    if (move.category === 'Special') finalMod *= 0.5;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Holy Aegis')) {
    //supremeoverlord defense here
  } else if (defender.hasAbility('Hydrochasm Surge', 'Hydrochasm Surge++') && field.hasWeather('Rain', 'Heavy Rain', 'Harsh Typhoon')) {
    finalMod *= 0.5;
    desc.defenderAbility = defender.ability;
    desc.weather = field.weather;
  }
  
  //field
  if (field.attackerSide.isBattery && move.category === 'Special') {
    finalMod *= 1.3;
    desc.isBattery = true;
  }
  if (field.attackerSide.isPowerSpot) {
    finalMod *= 1.3;
    desc.isPowerSpot = true;
  }
  if (field.defenderSide.isFriendGuard) {
    finalMod *= 0.75
    desc.isFriendGuard = true;
  }
  if (field.hasTerrain('Dragonic Soul') && defender.hasType('Dragon')) {
    finalMod *= 0.9;
    desc.terrain = field.terrain;
  }
  
  //weather
  if (field.hasWeather('Sun', 'Harsh Sunshine') && !defender.hasItem('Utility Umbrella')) {
    if (move.hasType('Fire')) {
      finalMod *= 1.5;
      desc.weather = field.weather;
    } else if (move.hasType('Water')) {
      finalMod *= 0.5;
      desc.weather = field.weather;
    }
  } else if (field.hasWeather('Rain', 'Heavy Rain') && !defender.hasItem('Utility Umbrella')) {
    if (move.hasType('Water')) {
      finalMod *= 1.5;
      desc.weather = field.weather;
    } else if (move.hasType('Fire')) {
      finalMod *= 0.5;
      desc.weather = field.weather;
    }
  } else if (field.hasWeather('Violent Blizzard') && move.hasType('Fire', 'Fighting')) {
    finalMod *= 0.5;
    desc.weather = field.weather;
  } else if (field.hasWeather('Harsh Typhoon') && move.hasType('Flying', 'Water')) {
    finalMod *= 1.5;
    desc.weather = field.weather;
  }
  
  //attacker item
  if (attacker.hasItem('Life Orb')) {
    finalMod *= 1.3;
    desc.attackerItem = attacker.item;
  } else if (
    (attacker.hasItem('Expert Belt') && typeEffectiveness > 1) ||
    (attacker.hasItem('Soul Dew') && ['Latias', 'Latios'].some(e => attacker.name.includes(e)) && move.hasType('Psychic', 'Dragon'))
  ) {
    finalMod *= 1.2;
    desc.attackerItem = attacker.item;
  } else if (attacker.hasItem('Metronome') && move.timesUsedWithMetronome! >= 1) {
    const timesUsedWithMetronome = Math.min(5, Math.floor(move.timesUsedWithMetronome!));
    finalMod *= 1 + 0.2 * timesUsedWithMetronome;
    desc.attackerItem = attacker.item;
  }
  
  //defender item
  if (defender.hasItem('Inner Light') && move.hasType('Shadow')) {
    finalMod *= 0.5;
    desc.defenderItem = defender.item;
  } else if (
    move.hasType(getBerryResistType(defender.item)) && (typeEffectiveness > 1 || move.hasType('Normal')) &&
    hitCount === 0 && !attacker.hasAbility('Unnerve', 'As One (Glastrier)', 'As One (Spectrier)', 'Parental Bond (Child)')
  ) {
    finalMod *= 0.5;
    if (defender.hasAbility('Ripen')) {
      finalMod *= 0.5;
    }
    desc.defenderItem = defender.item;
  }
  
  //other shit
  if (field.gameType !== 'Singles' && ['allAdjacent', 'allAdjacentFoes'].includes(move.target)) {
    finalMod *= 0.75;
  }

  if (isCritical) {
    finalMod *= 1.5;
    desc.isCritical = isCritical;
  }
  
  finalMod *= getStabModPathways(attacker, move, desc);
  finalMod *= typeEffectiveness;
  if (
    attacker.hasStatus('brn') && move.category === 'Physical' &&
    !attacker.hasAbility('Guts', 'Grit', 'Laced Cream', 'Dry-Aged') && !move.named('Facade', 'Brilliant Bravado')
  ) {
    finalMod *= 0.5;
    desc.isBurned = true;
  } else if (
    attacker.hasStatus('fbt') && move.category === 'Special' &&
    !attacker.hasAbility('Guts', 'Grit', 'Laced Cream', 'Dry-Aged') && !move.named('Facade', 'Brilliant Bravado')
  ) {
    finalMod *= 0.5;
    desc.isFrostbitten = true;
  }
  
  if (!isCritical && !move.named('Brick Break', 'Psychic Fangs', 'Doom Blade', 'Stone Fangs')) {
    if (field.defenderSide.isAuroraVeil) {
      finalMod *= field.gameType !== 'Singles' ? 2 / 3 : 0.5;
      desc.isAuroraVeil = true;
    } else if (field.defenderSide.isReflect && move.category === 'Physical') {
      finalMod *= field.gameType !== 'Singles' ? 2 / 3 : 0.5;
      desc.isReflect = true;
    } else if (field.defenderSide.isLightScreen && move.category === 'Special') {
      finalMod *= field.gameType !== 'Singles' ? 2 / 3 : 0.5;
      desc.isLightScreen = true;
    }
  }
  
  //protect here
  //only for power moves, other stuff is handled in calc function
  if (field.defenderSide.isProtected && (move.isMax || move.isZ)) {
    finalMod *= 0.25;
    desc.isProtected = true;
  }
  
  if (move.named('Earthquake') && field.hasTerrain('Grassy')) {
    finalMod *= 0.5;
    desc.terrain = field.terrain;
  }
  
  return finalMod;
}