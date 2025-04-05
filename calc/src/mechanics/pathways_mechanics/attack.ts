//Ruin abilities in doubles
import type {Generation, AbilityName, StatID, Terrain} from '../../data/interface';
import {toID} from '../../util';
import {
  getBerryResistType,
  getFlingPower,
  getItemBoostType,
  getMultiAttack,
  getNaturalGift,
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
  checkMultihitBoost,
  checkTeraformZero,
  checkWindRider,
  checkWonderRoom,
  countBoosts,
  getStatDescriptionText,
  getShellSideArmCategory,
  getWeight,
  isGrounded,
  isQPActive,
} from '../util';
import {
  getStabModPathways,
  getQPBoostedStatPathways,
  getModifiedStatPathways,
  computeFinalStatsPathways,
  getRoleDamageMod,
} from './util';

export function calculateAttackPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false
) {
  let attack: number;
  const attackStat =
    move.named('Shell Side Arm') &&
    getShellSideArmCategory(attacker, defender) === 'Physical'
      ? 'atk'
      : move.named('Body Press', 'Wall Crash', 'Shield Bash', 'Mule Masher')
        ? 'def'
        : move.category === 'Special'
          ? 'spa'
          : 'atk';
  desc.attackEVs =
    move.named('Foul Play', 'Rigged Game')
      ? getStatDescriptionText(gen, defender, attackStat, defender.nature)
      : getStatDescriptionText(gen, attacker, attackStat, attacker.nature);
  const attackSource = move.named('Foul Play', 'Rigged Game') ? defender : attacker;
  if (attackSource.boosts[attackStat] === 0 ||
      (isCritical && attackSource.boosts[attackStat] < 0)) {
    attack = attackSource.rawStats[attackStat];
  } else if (defender.hasAbility('Unaware', 'Lunar Light', 'Hydrochasm Surge', 'Hydrochasm Surge++')) {
    attack = attackSource.rawStats[attackStat];
    desc.defenderAbility = defender.ability;
  } else {
    attack = getModifiedStatPathways(attackSource.rawStats[attackStat]!, attackSource.boosts[attackStat]!);
    desc.attackBoost = attackSource.boosts[attackStat];
  }

  const atMod = calculateAtModPathways(gen, attacker, defender, move, field, desc);
  return Math.max(Math.round(attack * atMod), 1);
}

export function calculateAtModPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc
) {
  let atMod = 1;

  //alright lets just rewrite this crap
  //attacker ability
  if (attacker.hasAbility('Swarm Shell2')) {
    atMod *= 4;
    desc.attackerAbility = attacker.ability;
  } else if (
    attacker.hasAbility('Light Born', 'Turbo Engine') ||
    (attacker.hasAbility('Sweet Heart') && move.hasType('Fairy')) ||
    (attacker.hasAbility('Swiper') && !attacker.item) ||
    (attacker.hasAbility('Huge Power', 'Pure Power', 'Lightning Speed') && move.category === 'Physical')
  ) {
    atMod *= 2;
    desc.attackerAbility = attacker.ability;
  } else if (
    attacker.hasAbility('Noble Hunt', 'Evoboost', 'Annoying Wall', 'Golden Hour') ||
    (attacker.hasAbility('Embody Aspect (Wellspring)', 'Embody Aspect (Hearthflame)', 'Embody Aspect (Cornerstone)') && move.hasType('Grass')) ||
    (attacker.hasAbility('Fusion Core') && move.category === 'Special') ||
    (attacker.curHP() <= attacker.maxHP() / 3 &&
     ((attacker.hasAbility('Overgrow') && move.hasType('Grass')) ||
      (attacker.hasAbility('Blaze') && move.hasType('Fire')) ||
      (attacker.hasAbility('Torrent') && move.hasType('Water')) ||
      (attacker.hasAbility('Swarm') && move.hasType('Bug')) ||
      (attacker.hasAbility('Lunar Light')))
    ) ||
    (move.category === 'Special' && attacker.abilityOn && attacker.hasAbility('Plus', 'Minus')) ||
    (attacker.hasAbility('Flash Fire') && attacker.abilityOn && move.hasType('Fire')) ||
    (attacker.hasAbility('Flower Gift') &&
     field.hasWeather('Sun', 'Harsh Sunshine') && !attacker.hasItem('Utility Umbrella') && move.category === 'Physical'
    ) ||
    (attacker.hasAbility('Guts') && attacker.status && move.category === 'Physical') ||
    (attacker.hasAbility('Hustle', 'Swarm Shell') && move.category === 'Physical') ||
    (attacker.hasAbility('Solar Power') &&
     field.hasWeather('Sun', 'Harsh Sunshine') && !attacker.hasItem('Utility Umbrella') && move.category === 'Special')
  ) {
    atMod *= 1.5;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Crescendo')) {
    let mod = 1;
    if (move.flags.sound) mod *= 1.5;
    if (defender.hasAbility('Flash Fire', 'Well Baked Body')) mod *= 0.5;
    if (mod !== 1) {
      atMod *= mod;
      desc.attackerAbility = attacker.ability;
    }
  } else if (
    (attacker.hasAbility('Embody Aspect (Teal)') && move.hasType('Grass')) ||
    (attacker.hasAbility('Embody Aspect (Wellspring)') && move.hasType('Water')) ||
    (attacker.hasAbility('Embody Aspect (Hearthflame)') && move.hasType('Fire')) ||
    (attacker.hasAbility('Embody Aspect (Cornerstone)') && move.hasType('Rock'))
  ) {
    atMod *= 1.33;
    desc.attackerAbility = attacker.ability;
  } else if (
    ((isQPActive(attacker, field) && !attacker.hasAbility('Ya Estas Cocinado')) &&
     ((move.category === 'Physical' && getQPBoostedStatPathways(attacker) === 'atk') ||
      (move.category === 'Special' && getQPBoostedStatPathways(attacker) === 'spa'))
    ) ||
    (attacker.hasAbility('Hadron Engine') && move.category === 'Special' && field.hasTerrain('Electric', 'Faraday Cage')) ||
    (attacker.hasAbility('Orichalcum Pulse') &&
     move.category === 'Physical' && field.hasWeather('Sun', 'Harsh Sunshine') && !attacker.hasItem('Utility Umbrella')
    ) ||
    (attacker.hasAbility('Grit') && attacker.status && move.category === 'Physical') ||
    (attacker.hasAbility('Awakening') && move.category === 'Physical') ||
    (attacker.hasAbility('Hydrochasm Surge++') && attacker.named('Swampert-Stalking-Tide') && move.category === 'Special')
  ) {
    atMod *= 1.3;
    desc.attackerAbility = attacker.ability;
  } else if (
    (attacker.hasAbility('Slow Start') && attacker.abilityOn && move.category === 'Physical') ||
    (attacker.hasAbility('Defeatist') && attacker.curHP() <= attacker.maxHP() / 2)
  ) {
    atMod *= 0.5;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Supreme Overlord') && attacker.alliesFainted) {
    atMod = Math.min(1.5, 1 + 0.1 * attacker.alliesFainted);
    desc.attackerAbility = attacker.ability;
    desc.alliesFainted = attacker.alliesFainted;
  } else if (attacker.hasAbility('Stacked Odds') && attacker.alliesFainted) {
    atMod *= Math.min(1.5, 1 + 0.06 * attacker.alliesFainted);;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Ya Estas Cocinado')) {
    let mod = 1;
    if (attacker.alliesFainted) {
      mod += Math.min(0.5, 0.1 * attacker.alliesFainted);;
      desc.alliesFainted = attacker.alliesFainted;
    }
    if (
      isQPActive(attacker, field) &&
      ((move.category === 'Physical' && getQPBoostedStatPathways(attacker) === 'atk') ||
       (move.category === 'Special' && getQPBoostedStatPathways(attacker) === 'spa'))
    ) {
      mod += 0.3;
    }
    if (mod !== 1) {
      atMod *= mod;
      desc.attackerAbility = attacker.ability;
    }
  } else if (attacker.hasAbility('Soul Ablaze') && attacker.hasItem('Cobalt Gem')) {
    atMod += Number((1 - attacker.curHP() / attacker.maxHP()).toFixed(2));
    desc.attackerAbility = attacker.ability;
  }
  
  //defender ability
  if (
    (defender.hasAbility('Tablets of Ruin') && move.category === 'Physical') ||
    (defender.hasAbility('Vessel of Ruin') && move.category === 'Special') //essentials does not do ruin immunity
  ) {
    atMod *= 0.75;
    desc.defenderAbility = defender.ability;
  } else if (
    defender.hasAbility('Hydrochasm Surge', 'Hydrochasm Surge++') &&
    field.hasWeather('Sun', 'Harsh Sunshine', 'Sand', 'Raging Sandstorm')
  ) {
    atMod *= 1.25;
    desc.defenderAbility = defender.ability;
    desc.weather = field.weather;
  }
  
  //field
  if (
    field.attackerSide.isFlowerGift && field.hasWeather('Sun', 'Harsh Sunshine') &&
    !attacker.hasItem('Utility Umbrella') && move.category === 'Physical' && !attacker.hasAbility('Flower Gift')
  ) {
    atMod *= 1.5;
    desc.isFlowerGiftAttacker = true;
  }
  
  if (
    (field.isTabletsOfRuin && move.category === 'Physical' && !defender.hasAbility('Tablets of Ruin')) ||
    (field.isVesselOfRuin && move.category === 'Special' && !defender.hasAbility('Vessel of Ruin'))
  ) {
    atMod *= 0.75;
    desc[move.category === 'Special' ? 'isVesselOfRuin' : 'isTabletsOfRuin'] = true;
  }

  //ITEMS
  //attacker item
  if (
    (attacker.hasItem('Thick Club') &&
     attacker.named('Cubone', 'Marowak', 'Marowak-Alola', 'Marowak-Alola-Totem') && move.category === 'Physical') ||
    (attacker.hasItem('Deep Sea Tooth') && attacker.named('Clamperl') && move.category === 'Special') ||
    (attacker.hasItem('Light Ball') && attacker.name.includes('Pikachu')) ||
    (attacker.hasItem('Golden Truffle') && attacker.named('Lechonk'))
  ) {
    atMod *= 2;
    desc.attackerItem = attacker.item;
  } else if (attacker.hasItem('Nuptial Veil') && attacker.named('Salandit') && move.category === 'Special') {
    atMod *= 1.5;
    desc.attackerItem = attacker.item;
  }

  //ROLE
  atMod *= getRoleDamageMod(attacker);

  return atMod;
}