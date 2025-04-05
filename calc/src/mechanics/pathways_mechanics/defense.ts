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
} from './util';

export function calculateDefensePathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false
) {
  let defense: number;
  const hitsPhysical = move.overrideDefensiveStat === 'def' || move.category === 'Physical' ||
    (move.named('Shell Side Arm') && getShellSideArmCategory(attacker, defender) === 'Physical');
  const defenseStat = hitsPhysical ? 'def' : 'spd';
  desc.defenseEVs = getStatDescriptionText(gen, defender, defenseStat, defender.nature);
  if (defender.boosts[defenseStat] === 0 ||
      (isCritical && defender.boosts[defenseStat] > 0) ||
      move.ignoreDefensive) {
    defense = defender.rawStats[defenseStat];
  } else if (attacker.hasAbility('Unaware', 'Lunar Light', 'Hydrochasm Surge', 'Hydrochasm Surge++')) {
    defense = defender.rawStats[defenseStat];
    desc.attackerAbility = attacker.ability;
  } else {
    defense = getModifiedStatPathways(defender.rawStats[defenseStat]!, defender.boosts[defenseStat]!);
    desc.defenseBoost = defender.boosts[defenseStat];
  }

  const dfMod = calculateDfModPathways(
    gen,
    attacker,
    defender,
    move,
    field,
    desc,
    isCritical,
    hitsPhysical
  );

  return Math.max(Math.round(defense * dfMod), 1);
}

export function calculateDfModPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  isCritical = false,
  hitsPhysical = false
) {
  let dfMod = 1;
  
  //attacker ability
  if (
    ((attacker.hasAbility('Sword of Ruin') && hitsPhysical) ||
    (attacker.hasAbility('Beads of Ruin') && move.category === 'Special'))
    //essentials does not do ruin immunity
    //it also does not account for psyshock for beads
  ) {
    dfMod *= 0.75;
    desc.attackerAbility = attacker.ability;
  }
  
  //defender ability
  if (
    (defender.hasAbility('Fur Coat', 'Annoying Wall') && hitsPhysical)
  ) {
    dfMod *= 2;
    desc.defenderAbility = defender.ability;
  } else if (
    (defender.hasAbility('Flower Gift') && //essentials does not account for psyshock here
     field.hasWeather('Sun', 'Harsh Sunshine') && defender.hasItem('Utility Umbrella') && move.category === 'Special') ||
    //essentials says grass pelt is for ALL defenses >:)
    (defender.hasAbility('Grass Pelt') && field.hasTerrain('Grassy')) ||
    //essentials does not account for psyshock here either
    (defender.hasAbility('Marvel Scale') && defender.status && move.category === 'Physical')
  ) {
    dfMod *= 1.5;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Titanium Armor') && hitsPhysical) {
    dfMod /= 0.7;
    desc.defenderAbility = defender.ability;
  } else if (
    isQPActive(defender, field) &&
    ((hitsPhysical && getQPBoostedStatPathways(defender) === 'def') ||
     (move.category === 'Special' && getQPBoostedStatPathways(defender) === 'spd'))//essentials does not account for psyshock here
  ) {
    dfMod *= 1.3;
    desc.defenderAbility = defender.ability;
  } else if (defender.hasAbility('Soul Ablaze') && defender.hasItem('Cobalt Gem')) {
    dfMod += Number((1 - defender.curHP() / defender.maxHP()).toFixed(2));
    desc.defenderAbility = defender.ability;
  }
  
  //field
  if (
    field.defenderSide.isFlowerGift && field.hasWeather('Sun', 'Harsh Sunshine') &&//essentials does not account for psyshock here
    defender.hasItem('Utility Umbrella') && move.category === 'Special' && !defender.hasAbility('Flower Gift')
  ) {
    dfMod *= 1.5;
    desc.isFlowerGiftAttacker = true;
  }
  
  //weather
  if (
    (defender.hasType('Rock') && field.hasWeather('Sand', 'Raging Sandstorm') && !hitsPhysical) ||
    (defender.hasType('Ice') && field.hasWeather('Snow', 'Violent Blizzard') && hitsPhysical)
  ) {
    dfMod *= 1.5;
    desc.weather = field.weather;
  }
  
  //Items
  //attacker items: NONE
  //defender item
  if (
    (defender.hasItem('Golden Truffle') && defender.named('Lechonk')) ||
    //essentials does not account for psyshock here
    (defender.hasItem('Deep Sea Scale') && defender.named('Clamperl') && move.category === 'Special')
  ) {
    dfMod *= 2;
    desc.defenderItem = defender.item;
  } else if (
    //essentials does not account for psyshock here
    (defender.hasItem('Assault Vest') && move.category === 'Special') ||
    (defender.hasItem('Eviolite') && gen.species.get(toID(defender.name))?.nfe) ||
    (defender.hasItem('Metal Powder') && defender.named('Ditto'))
  ) {
    dfMod *= 1.5;
    desc.defenderItem = defender.item;
  }
  
  //doubles ruin abilities
  if (
    (field.isSwordOfRuin && hitsPhysical && !attacker.hasAbility('Sword of Ruin')) ||
    (field.isBeadsOfRuin && move.category === 'Special' && !attacker.hasAbility('Beads of Ruin'))
  ) {
    dfMod *= 0.75;
    if (hitsPhysical) {
      desc.isSwordOfRuin = true;
    }
    if (move.category === 'Special') {
      desc.isBeadsOfRuin = true;
    }
  }

  return dfMod;
}