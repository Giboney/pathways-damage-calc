import type {Generation, Weather, Terrain, TypeName, ID} from './data/interface';
import type {Field, Side} from './field';
import type {Move} from './move';
import type {Pokemon} from './pokemon';
import {type Damage, damageRange, multiDamageRange} from './result';
import {error} from './util';
// NOTE: This needs to come last to simplify bundling
import {isGrounded} from './mechanics/util';
import {hasMagicGuard, affectedByHazards} from './mechanics/pathways_mechanics/util';

export interface RawDesc {
  HPEVs?: string;
  attackBoost?: number;
  attackEVs?: string;
  attackerAbility?: string;
  attackerItem?: string;
  attackerName: string;
  attackerTera?: string;
  defenderAbility?: string;
  defenderItem?: string;
  defenderName: string;
  defenderTera?: string;
  defenseBoost?: number;
  defenseEVs?: string;
  hits?: number;
  alliesFainted?: number;
  isStellarFirstUse?: boolean;
  isBeadsOfRuin?: boolean;
  isSwordOfRuin?: boolean;
  isTabletsOfRuin?: boolean;
  isVesselOfRuin?: boolean;
  isAuroraVeil?: boolean;
  isFlowerGiftAttacker?: boolean;
  isFlowerGiftDefender?: boolean;
  isFriendGuard?: boolean;
  isHelpingHand?: boolean;
  isCritical?: boolean;
  isLightScreen?: boolean;
  isBurned?: boolean;
  isFrostbitten?: boolean;
  isProtected?: boolean;
  isReflect?: boolean;
  isBattery?: boolean;
  isPowerSpot?: boolean;
  isWonderRoom?: boolean;
  isSwitching?: 'out' | 'in';
  moveBP?: number;
  moveName: string;
  moveTurns?: string;
  moveType?: TypeName;
  rivalry?: 'buffed' | 'nerfed';
  terrain?: Terrain;
  weather?: Weather;
  isDefenderDynamaxed?: boolean;
  //my additions
  isCharge?: boolean;
}

export function display(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  rawDesc: RawDesc,
  notation = '%',
  err = true
) {
  const [min, max] = damageRange(damage);

  const minDisplay = toDisplay(notation, min, defender.maxHP());
  const maxDisplay = toDisplay(notation, max, defender.maxHP());

  const desc = buildDescription(rawDesc, attacker, defender);
  const damageText = `${min}-${max} (${minDisplay} - ${maxDisplay}${notation})`;

  if (move.category === 'Status' && !move.named('Nature Power')) return `${desc}: ${damageText}`;
  const koChanceText = getKOChance(gen, attacker, defender, move, field, damage, err).text;
  return koChanceText ? `${desc}: ${damageText} -- ${koChanceText}` : `${desc}: ${damageText}`;
}

export function displayMove(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  notation = '%'
) {
  const [min, max] = damageRange(damage);

  const minDisplay = toDisplay(notation, min, defender.maxHP());
  const maxDisplay = toDisplay(notation, max, defender.maxHP());

  const recoveryText = getRecovery(gen, attacker, defender, move, field, damage, notation).text;
  const recoilText = getRecoil(gen, attacker, defender, move, damage, notation).text;

  return `${minDisplay} - ${maxDisplay}${notation}${recoveryText &&
    ` (${recoveryText})`}${recoilText && ` (${recoilText})`}`;
}

export function getRecovery(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  let minD;
  let maxD;
  if (move.timesUsed && move.timesUsed > 1) {
    [minD, maxD] = multiDamageRange(damage) as [number[], number[]];
  } else {
    minD = [minDamage];
    maxD = [maxDamage];
  }

  const recovery = [0, 0] as [number, number];
  let text = '';

  const ignoresShellBell =
    gen.num === 3 && move.named('Doom Desire', 'Future Sight');
  if (attacker.hasItem('Shell Bell') && !ignoresShellBell) {
    for (let i = 0; i < minD.length; i++) {
      recovery[0] += minD[i] > 0 ? Math.max(Math.round(minD[i] / 8), 1) : 0;
      recovery[1] += maxD[i] > 0 ? Math.max(Math.round(maxD[i] / 8), 1) : 0;
    }
    // This is incorrect if the opponent heals during your damage
    // Ex: Sitrus Berry procs in the middle of multi-hit move
    const maxHealing = Math.round(defender.curHP() / 8);
    recovery[0] = Math.min(recovery[0], maxHealing);
    recovery[1] = Math.min(recovery[1], maxHealing);
  }
 
  if (attacker.hasAbility('Reaper')) {
    for (let i = 0; i < minD.length; i++) {
      recovery[0] += minD[i] > 0 ? Math.max(Math.round(minD[i] / 8), 1) : 0;
      recovery[1] += maxD[i] > 0 ? Math.max(Math.round(maxD[i] / 8), 1) : 0;
    }
    // This is incorrect if the opponent heals during your damage
    // Ex: Sitrus Berry procs in the middle of multi-hit move
    const maxHealing = Math.round(defender.curHP() / 8);
    recovery[0] = Math.min(recovery[0], maxHealing);
    recovery[1] = Math.min(recovery[1], maxHealing);
  }
  if (field.hasTerrain('Terror Realm') && (defender.hasStatus('slp') || defender.hasAbility('Comatose', 'Awakening'))) {
    const max = Math.round(defender.maxHP() / 2);
    for (let i = 0; i < minD.length; i++) {
      recovery[0] += Math.min(Math.round(minD[i] * move.hits / 2), max);
      recovery[1] += Math.min(Math.round(maxD[i] * move.hits / 2), max);
    }
  }

  if (move.named('G-Max Finale')) {
    recovery[0] += Math.round(attacker.maxHP() / 6);
    recovery[1] += Math.round(attacker.maxHP() / 6);
  }

  if (move.named('Pain Split')) {
    const average = Math.floor((attacker.curHP() + defender.curHP()) / 2);
    recovery[0] = recovery[1] = average - attacker.curHP();
  }

  if (move.drain) {
    // Parental Bond counts as multiple heals for drain moves, but not for Shell Bell
    // Currently no drain moves are multihit, however this covers for it.
    if (attacker.hasAbility('Parental Bond') || move.hits > 1) {
      [minD, maxD] = multiDamageRange(damage) as [number[], number[]];
    }
    const percentHealed = move.drain[0] / move.drain[1];
    const max = Math.round(defender.curHP() * percentHealed);
    for (let i = 0; i < minD.length; i++) {
      const range = [minD[i], maxD[i]];
      for (const j in recovery) {
        let drained = Math.max(Math.round(range[j] * percentHealed), 1);
        if (attacker.hasItem('Big Root')) drained = Math.trunc(drained * 5324 / 4096);
        recovery[j] += Math.min(drained, max);
      }
    }
  }

  if (recovery[1] === 0) return {recovery, text};

  const minHealthRecovered = toDisplay(notation, recovery[0], attacker.maxHP());
  const maxHealthRecovered = toDisplay(notation, recovery[1], attacker.maxHP());
  const change = recovery[0] > 0 ? 'recovered' : 'lost';
  text = `${minHealthRecovered} - ${maxHealthRecovered}${notation} ${change}`;

  return {recovery, text};
}

// TODO: return recoil damage as exact HP
export function getRecoil(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [min, max] = damageRange(damage);

  let recoil: [number, number] | number = [0, 0];
  let text = '';

  const damageOverflow = min > defender.curHP() || max > defender.curHP();
  if (move.recoil) {
    const mod = (move.recoil[0] / move.recoil[1]) * 100;
    let minRecoilDamage, maxRecoilDamage;
    if (damageOverflow) {
      minRecoilDamage =
        toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
      maxRecoilDamage =
        toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
    } else {
      minRecoilDamage = toDisplay(
        notation, Math.min(min, defender.curHP()) * mod, attacker.maxHP(), 100
      );
      maxRecoilDamage = toDisplay(
        notation, Math.min(max, defender.curHP()) * mod, attacker.maxHP(), 100
      );
    }
    if (!attacker.hasAbility('Rock Head')) {
      recoil = [minRecoilDamage, maxRecoilDamage];
      text = `${minRecoilDamage} - ${maxRecoilDamage}${notation} recoil damage`;
    }
  } else if (move.hasCrashDamage) {
    const genMultiplier = gen.num === 2 ? 12.5 : gen.num >= 3 ? 50 : 1;

    let minRecoilDamage, maxRecoilDamage;
    if (damageOverflow && gen.num !== 2) {
      minRecoilDamage =
        toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
      maxRecoilDamage =
        toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
    } else {
      minRecoilDamage = toDisplay(
        notation, Math.min(min, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100
      );
      maxRecoilDamage = toDisplay(
        notation, Math.min(max, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100
      );
    }

    recoil = [minRecoilDamage, maxRecoilDamage];
    switch (gen.num) {
    case 1:
      recoil = toDisplay(notation, 1, attacker.maxHP());
      text = '1hp damage on miss';
      break;
    case 2: case 3: case 4:
      if (defender.hasType('Ghost')) {
        if (gen.num === 4) {
          const gen4CrashDamage = Math.floor(((defender.maxHP() * 0.5) / attacker.maxHP()) * 100);
          recoil = notation === '%' ? gen4CrashDamage : Math.floor((gen4CrashDamage / 100) * 48);
          text = `${gen4CrashDamage}% crash damage`;
        } else {
          recoil = 0;
          text = 'no crash damage on Ghost types';
        }
      } else {
        text = `${minRecoilDamage} - ${maxRecoilDamage}${notation} crash damage on miss`;
      }
      break;
    default:
      recoil = notation === '%' ? 24 : 50;
      text = '50% crash damage';
    }
  } else if (move.struggleRecoil) {
    recoil = notation === '%' ? 12 : 25;
    text = '25% struggle damage';
    // Struggle recoil is actually rounded down in Gen 4 per DaWoblefet's research, but until we
    // return recoil damage as exact HP the best we can do is add some more text to this effect
    if (gen.num === 4) text += ' (rounded down)';
  } else if (move.mindBlownRecoil) {
    recoil = notation === '%' ? 24 : 50;
    text = '50% recoil damage';
  }

  return {recoil, text};
}

export function getKOChance(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  err = true
) {
  damage = combine(damage);
  if (isNaN(damage[0])) {
    error(err, 'damage[0] must be a number.');
    return {chance: 0, n: 0, text: ''};
  }
  if (damage[damage.length - 1] === 0) {
    error(err, 'damage[damage.length - 1] === 0.');
    return {chance: 0, n: 0, text: ''};
  }

  // Code doesn't really work if these aren't set.
  if (move.timesUsed === undefined) move.timesUsed = 1;
  if (move.timesUsedWithMetronome === undefined) move.timesUsedWithMetronome = 1;

  if (damage[0] >= defender.maxHP() && move.timesUsed === 1 && move.timesUsedWithMetronome === 1) {
    return {chance: 1, n: 1, text: 'guaranteed OHKO'};
  }

  const hazards = getHazards(gen, defender, field);
  const eot = getEndOfTurn(gen, attacker, defender, move, field);
  const toxicCounter =
    defender.hasStatus('tox') && !hasMagicGuard(defender, field) && !defender.hasAbility('Poison Heal', 'Reqieum Di Diavolo')
      ? defender.toxicCounter : 0;

  // multi-hit moves have too many possibilities for brute-forcing to work, so reduce it
  // to an approximate distribution
  let qualifier = move.hits > 2 ? 'approx. ' : '';

  const hazardsText = hazards.texts.length > 0
    ? ' after ' + serializeText(hazards.texts)
    : '';
  const afterText =
    hazards.texts.length > 0 || eot.texts.length > 0
      ? ' after ' + serializeText(hazards.texts.concat(eot.texts))
      : '';
  const afterTextNoHazards = eot.texts.length > 0 ? ' after ' + serializeText(eot.texts) : '';

  function roundChance(chance: number) {
    // prevent displaying misleading 100% or 0% chances
    return Math.max(Math.min(Math.round(chance * 1000), 999), 1) / 10;
  }

  function KOChance(
    chanceWithoutEot: number | undefined,
    chanceWithEot: number | undefined,
    n: number,
    multipleTurns = false,
  ) {
    // chanceWithoutEot and chanceWithEot are calculated separately for OHKOs
    // because the difference between KOing at start of turn is very important in some cases
    // for 2HKOs and onward, only chanceWithEot is calculated,
    // so chanceWithoutEot will be set to 0 for the purposes of this function
    // all this really does is skip straight to that last else if block
    // using the number of hits we can determine the type of KO we are checking for
    // chance is the value that is returned by this function,
    // and is the higher of the two chance parameters
    const KOTurnText = n === 1 ? 'OHKO'
      : (multipleTurns ? `KO in ${n} turns` : `${n}HKO`);
    let text = qualifier;
    let chance = undefined;
    if (chanceWithoutEot === undefined || chanceWithEot === undefined) {
      text += `possible ${KOTurnText}`;
      // not a KO
    } else if (chanceWithoutEot + chanceWithEot === 0) {
      chance = 0;
      text += 'not a KO';
      // if the move OHKOing is guaranteed even without end of turn damage
    } else if (chanceWithoutEot === 1) {
      chance = chanceWithoutEot;
      text = 'guaranteed ';
      text += `OHKO${hazardsText}`;
    } else if (chanceWithoutEot > 0) {
      chance = chanceWithEot;
      // if the move OHKOing is possible, but eot damage guarantees the OHKO
      // I have it so that the text specifies the chance of the OHKO without eot damage,
      // because it might matter in some scenarios
      // eg. if your opponent has a move that can OHKO you but you're faster,
      // it might be important to get the OKKO before they can move
      if (chanceWithEot === 1) {
        text += `${roundChance(chanceWithoutEot)}% chance to ${KOTurnText}${hazardsText} ` +
          `(guaranteed ${KOTurnText}${afterTextNoHazards})`;
        // if the move OHKOing is possible, and eot damage increases the odds of the KO
      } else if (chanceWithEot > chanceWithoutEot) {
        text += `${roundChance(chanceWithoutEot)}% chance to ${KOTurnText}${hazardsText} ` +
          `(${qualifier}${roundChance(chanceWithEot)}% chance to ` +
          `${KOTurnText}${afterTextNoHazards})`;
        // if the move KOing is possible, and eot damage does not increase the odds of the KO
      } else if (chanceWithoutEot > 0) {
        text += `${roundChance(chanceWithoutEot)}% chance to ${KOTurnText}${hazardsText}`;
      }
    } else if (chanceWithoutEot === 0) {
      chance = chanceWithEot;
      // if the move KOing is not possible, but eot damage guarantees the OHKO
      if (chanceWithEot === 1) {
        text = 'guaranteed ';
        text += `${KOTurnText}${afterText}`;
        // if the move KOing is not possible, but eot damage might KO
      } else if (chanceWithEot > 0) {
        text += `${roundChance(chanceWithEot)}% chance to ${KOTurnText}${afterText}`;
      }
    }
    return {chance, n, text};
  }

  if ((move.timesUsed === 1 && move.timesUsedWithMetronome === 1) || move.isZ) {
    const chance = computeKOChance(
      damage, defender.curHP() - hazards.damage, 0, 1, 1, defender.maxHP(), 0
    );
    const chanceWithEot = computeKOChance(
      damage, defender.curHP() - hazards.damage, eot.damage, 1, 1, defender.maxHP(), toxicCounter
    );

    // checks if either chance is greater than 0
    if (chance + chanceWithEot > 0) return KOChance(chance, chanceWithEot, 1);

    // Parental Bond's combined first + second hit only is accurate for chance to OHKO, for
    // multihit KOs its only approximated. We should be doing squashMultihit here instead of
    // pretending we ar emore accurate than we are, but just throwing on an qualifer should be
    // sufficient.
    if (damage.length === 256) {
      qualifier = 'approx. ';
      // damage = squashMultihit(gen, damage, move.hits, err);
    }

    for (let i = 2; i <= 4; i++) {
      const chance = computeKOChance(
        damage, defender.curHP() - hazards.damage, eot.damage, i, 1, defender.maxHP(), toxicCounter
      );
      if (chance > 0) return KOChance(0, chance, i);
    }

    for (let i = 5; i <= 9; i++) {
      if (
        predictTotal(damage[0], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
        defender.curHP() - hazards.damage
      ) {
        return KOChance(0, 1, i);
      } else if (
        predictTotal(damage[damage.length - 1], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
        defender.curHP() - hazards.damage
      ) {
        // possible but no concrete chance
        return KOChance(undefined, undefined, i);
      }
    }
  } else {
    const chance = computeKOChance(
      damage, defender.maxHP() - hazards.damage,
      eot.damage,
      move.hits || 1,
      move.timesUsed || 1,
      defender.maxHP(),
      toxicCounter
    );
    if (chance > 0) return KOChance(0, chance, move.timesUsed, chance === 1);

    if (predictTotal(
      damage[0],
      eot.damage,
      1,
      move.timesUsed,
      toxicCounter,
      defender.maxHP()
    ) >=
      defender.curHP() - hazards.damage
    ) {
      return KOChance(0, 1, move.timesUsed, true);
    } else if (
      predictTotal(
        damage[damage.length - 1],
        eot.damage,
        1,
        move.timesUsed,
        toxicCounter,
        defender.maxHP()
      ) >=
      defender.curHP() - hazards.damage
    ) {
      // possible but no real idea
      return KOChance(undefined, undefined, move.timesUsed, true);
    }
    return KOChance(0, 0, move.timesUsed);
  }

  return {chance: 0, n: 0, text: ''};
}

function combine(damage: Damage) {
  // Fixed Damage
  if (typeof damage === 'number') return [damage];
  
  // Standard Damage
  if (damage.length > 2 && typeof damage[0] === 'number') {
    damage = damage as number[];
    if (damage[0] > damage[damage.length - 1]) damage = damage.slice().sort();
    return damage;
  }
  // Fixed Multi-hit Damage
  if (typeof damage[0] === 'number' && typeof damage[1] === 'number') {
    return [damage[0] + damage[1]];
  }
  // Multi-hit Damage
 
  // Reduce Distribution to be at most 256 elements, maintains min and max
  function reduce(dist: number[]): number[] {
    const MAX_LENGTH = 256;
    if (dist.length <= MAX_LENGTH) {
      return dist;
    }
    const reduced = [];
    reduced[0] = dist[0];
    reduced[MAX_LENGTH - 1] = dist[dist.length - 1];
    const scaleValue = dist.length / MAX_LENGTH; // Should always be 16
    for (let i = 1; i < MAX_LENGTH - 1; i++) {
      reduced[i] = dist[Math.round(i * scaleValue + scaleValue / 2)];
    }
    return reduced;
  }

  function combineTwo(dist1: number[], dist2: number[]): number[] {
    const combined = dist1.flatMap(val1 => dist2.map(val2 => val1 + val2)).sort((a, b) => a - b);
    return combined;
  }
  
  // Combine n distributions to return an approximation of sum with <= 256 elements
  // Accurate for <= 2 hits, should be within 1% otherwise
  function combineDistributions(dists: number[][]): number[] {
    let combined = [0];
    for (let i = 0; i < dists.length; i++) {
      combined = combineTwo(combined, dists[i]);
      combined = reduce(combined);
    }
    return combined;
  }

  const d = damage as number[][];
  return combineDistributions(d);
}

const TRAPPING = [
  'Bind', 'Clamp', 'Fire Spin', 'Infestation', 'Magma Storm', 'Sand Tomb',
  'Thunder Cage', 'Whirlpool', 'Wrap', 'G-Max Sandblast', 'G-Max Centiferno',
];

function getHazards(gen: Generation, defender: Pokemon, field: Field) {
  let damage = 0;
  let defenderSide = field.defenderSide;
  const texts: string[] = [];

  if (!affectedByHazards(defender, field)) {
    return {damage, texts};
  }
  if (defenderSide.isSR && !hasMagicGuard(defender, field)) {
    const rockType = gen.types.get('rock' as ID)!;
    const effectiveness =
      rockType.effectiveness[defender.types[0]]! *
      (defender.types[1] ? rockType.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Stealth Rock');
  }
  if (defenderSide.isDrakeyDrake && !hasMagicGuard(defender, field)) {
    const type = gen.types.get('dragon' as ID)!;
    const effectiveness = type.effectiveness[defender.types[0]]! * (defender.types[1] ? type.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 6);
    texts.push('Drakey Drake');
  }
  if (defenderSide.isMetalScraps && !hasMagicGuard(defender, field)) {
    const type = gen.types.get('steel' as ID)!;
    const effectiveness = type.effectiveness[defender.types[0]]! * (defender.types[1] ? type.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Metal Scraps');
  }
  if (defenderSide.stellarRocks && !hasMagicGuard(defender, field)) {
    if (defenderSide.stellarRocks === 1) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('1 layer of Stellar Rocks');
    } else if (defenderSide.stellarRocks === 2) {
      damage += Math.floor(defender.maxHP() / 6);
      texts.push('2 layers of Stellar Rocks');
    }
  }
  if (defenderSide.steelsurge && !hasMagicGuard(defender, field)) {
    const steelType = gen.types.get('steel' as ID)!;
    const effectiveness =
      steelType.effectiveness[defender.types[0]]! *
      (defender.types[1] ? steelType.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Steelsurge');
  }

  if (!hasMagicGuard(defender, field) && isGrounded(defender, field)) {
    if (defenderSide.spikes === 1) {
      damage += Math.floor(defender.maxHP() / 8);
      if (gen.num === 2) {
        texts.push('Spikes');
      } else {
        texts.push('1 layer of Spikes');
      }
    } else if (defenderSide.spikes === 2) {
      damage += Math.floor(defender.maxHP() / 6);
      texts.push('2 layers of Spikes');
    } else if (defenderSide.spikes === 3) {
      damage += Math.floor(defender.maxHP() / 4);
      texts.push('3 layers of Spikes');
    }
  }

  if (isNaN(damage)) {
    damage = 0;
  }

  return {damage, texts};
}

function getEndOfTurn(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
) {
  let damage = 0;
  const texts = [];

  if (field.hasWeather('Sun', 'Harsh Sunshine')) {
    if (defender.hasAbility('Dry Skin', 'Solar Power')) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push(defender.ability + ' damage');
    }
  } else if (field.hasWeather('Rain', 'Heavy Rain', 'Harsh Typhoon')) {
    if (defender.hasAbility('Dry Skin')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('Dry Skin recovery');
    } else if (defender.hasAbility('Rain Dish', 'Healing Droplets', 'Healing Droplets++')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Rain Dish recovery');
    } else if (defender.hasAbility('Hydrochasm Surge++') && defender.abilityOn) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('Hydrochasm Surge++ phase 2 recovery');
    }
  } else if (field.hasWeather('Sand', 'Raging Sandstorm')) {
    if (
      !defender.hasType('Rock', 'Ground', 'Steel') &&
      !hasMagicGuard(defender, field) &&
      !defender.hasAbility('Overcoat', 'Sand Force', 'Sand Rush', 'Sand Veil') &&
      !defender.hasItem('Safety Goggles')
    ) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 2 ? 8 : 16));
      texts.push('sandstorm damage');
    }
  } else if (field.hasWeather('Hail', 'Snow', 'Violent Blizzard')) {
    if (defender.hasAbility('Ice Body')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Ice Body recovery');
    } else if (
      !defender.hasType('Ice') &&
      !hasMagicGuard(defender, field) &&
      !defender.hasAbility('Overcoat', 'Snow Cloak') &&
      !defender.hasItem('Safety Goggles') &&
      field.hasWeather('Hail')
    ) {
      damage -= Math.floor(defender.maxHP() / 16);
      texts.push('hail damage');
    }
  } else if (field.hasWeather('Sun', 'Harsh Sunshine', 'Sand', 'Raging Sandstorm') && defender.hasAbility('Hydrochasm Surge', 'Hydrochasm Surge++')) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push(defender.ability + ' damage');
  }

  const loseItem = move.named('Knock Off') && !defender.hasAbility('Sticky Hold');
  const healBlock = move.named('Psychic Noise') &&
    !(
      // suppression conditions
      attacker.hasAbility('Sheer Force') ||
      defender.hasItem('Covert Cloak') ||
      defender.hasAbility('Shield Dust', 'Aroma Veil')
    );
  if (defender.hasItem('Leftovers') && !loseItem && !healBlock) {
    damage += Math.floor(defender.maxHP() / 16);
    texts.push('Leftovers recovery');
  } else if (defender.hasItem('Black Sludge') && !loseItem) {
    if (defender.hasType('Poison')) {
      if (!healBlock) {
        damage += Math.floor(defender.maxHP() / 16);
        texts.push('Black Sludge recovery');
      }
    } else if (!hasMagicGuard(defender, field)) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push('Black Sludge damage');
    }
  } else if (defender.hasItem('Sticky Barb')) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Sticky Barb damage');
  }

  if (field.defenderSide.isSeeded) {
    if (!hasMagicGuard(defender, field)) {
      // 1/16 in gen 1, 1/8 in gen 2 onwards
      damage -= Math.floor(defender.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('Leech Seed damage');
    }
  }

  if (field.attackerSide.isSeeded && !hasMagicGuard(attacker, field)) {
    let recovery = Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
    if (defender.hasItem('Big Root') || defender.hasAbility('Deep Roots')) recovery = Math.floor(recovery * 1.3);
    if (attacker.hasAbility('Liquid Ooze')) {
      damage -= recovery;
      texts.push('Liquid Ooze damage');
    } else if (!healBlock) {
      damage += recovery;
      texts.push('Leech Seed recovery');
    }
  }

  if (field.hasTerrain('Grassy')) {
    if (isGrounded(defender, field) && !healBlock) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Grassy Terrain recovery');
    }
  } else if (field.hasTerrain('Dream World') && defender.hasType('Normal', 'Psychic')) {
    //essentials normally does math.floor with integer mechanics
    //but dream world uses a decimal and the pbRecoverHP function uses .round
    damage += Math.round(defender.maxHP() / 12.5);
    texts.push('Dream World recovery');
  } else if (
    field.hasTerrain('Terror Realm') &&
    (defender.hasStatus('slp') || defender.hasAbility('Comatose', 'Awakening')) &&
    !defender.hasType('Ghost', 'Dark') &&
    !hasMagicGuard(defender, field)
  ) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Terror Realm damage');
  }

  if (defender.hasStatus('psn')) {
    if (defender.hasAbility('Poison Heal', 'Reqieum Di Diavolo')) {
      if (!healBlock) {
        damage += Math.floor(defender.maxHP() / 8);
        texts.push('Poison Heal', 'Reqieum Di Diavolo');
      }
    } else if (!hasMagicGuard(defender, field)) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 1 ? 16 : 8));
      texts.push('poison damage');
    }
  } else if (defender.hasStatus('tox')) {
    if (defender.hasAbility('Poison Heal', 'Reqieum Di Diavolo')) {
      if (!healBlock) {
        damage += Math.floor(defender.maxHP() / 8);
        texts.push('Poison Heal', 'Reqieum Di Diavolo');
      }
    } else if (!hasMagicGuard(defender, field)) {
      texts.push('toxic damage');
    }
  } else if (defender.hasStatus('brn')) {
    if (defender.hasAbility('Heatproof')) {
      damage -= Math.floor(defender.maxHP() / (gen.num > 6 ? 32 : 16));
      texts.push('reduced burn damage');
    } else if (!hasMagicGuard(defender, field)) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 1 || gen.num > 6 ? 16 : 8));
      texts.push('burn damage');
    }
  } else if (defender.hasStatus('fbt')) {
    damage -= Math.floor(defender.maxHP() / 16);
    texts.push('frostbite damage');
  } else if (
    (defender.hasStatus('slp') || defender.hasAbility('Comatose', 'Awakening')) &&
    attacker.hasAbility('isBadDreams') &&
    !hasMagicGuard(defender, field)
  ) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Bad Dreams');
  }

  if (!hasMagicGuard(defender, field) && TRAPPING.includes(move.name)) {
    if (attacker.hasItem('Binding Band')) {
      damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 6) : Math.floor(defender.maxHP() / 8);
      texts.push('trapping damage');
    } else {
      damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 8) : Math.floor(defender.maxHP() / 16);
      texts.push('trapping damage');
    }
  }
  if (field.defenderSide.isSaltCure && !hasMagicGuard(defender, field)) {
    const isWeakType = defender.hasType('Water', 'Steel') ||
      (defender.teraType && ['Water', 'Steel'].includes(defender.teraType));
    damage -= Math.floor(defender.maxHP() / (isWeakType ? 4 : 8));
    texts.push('Salt Cure');
  }
  if (field.defenderSide.isColdTherapy && !hasMagicGuard(defender, field)) {
    const isWeakType = defender.hasType('Dragon', 'Ice') ||
      (defender.teraType && ['Dragon', 'Ice'].includes(defender.teraType));
    damage -= Math.floor(defender.maxHP() / (isWeakType ? 4 : 8));
    texts.push('Cold Therapy');
  }
  if (field.defenderSide.isSpookySpook && !hasMagicGuard(defender, field)) {
    const isResistType = defender.hasType('Dark', 'Bug') ||
      (defender.teraType && ['Dark', 'Bug'].includes(defender.teraType));
    damage -= Math.floor(defender.maxHP() / (isResistType ? 10 : 5));
    texts.push('Spooky Spook');
  }
  if (field.defenderSide.isMindflay && !hasMagicGuard(defender, field)) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Mindflay');
  }
  if (!defender.hasType('Fire') && !hasMagicGuard(defender, field) &&
      (move.named('Fire Pledge (Grass Pledge Boosted)', 'Grass Pledge (Fire Pledge Boosted)'))) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Sea of Fire damage');
  }

  if (!hasMagicGuard(defender, field) && !defender.hasType('Grass') &&
      (field.defenderSide.vinelash || move.named('G-Max Vine Lash'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Vine Lash damage');
  }

  if (!hasMagicGuard(defender, field) && !defender.hasType('Fire') &&
      (field.defenderSide.wildfire || move.named('G-Max Wildfire'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Wildfire damage');
  }

  if (!hasMagicGuard(defender, field) && !defender.hasType('Water') &&
      (field.defenderSide.cannonade || move.named('G-Max Cannonade'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Cannonade damage');
  }

  if (!hasMagicGuard(defender, field) && !defender.hasType('Rock') &&
      (field.defenderSide.volcalith || move.named('G-Max Volcalith'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Volcalith damage');
  }

  return {damage, texts};
}

function computeKOChance(
  damage: number[],
  hp: number,
  eot: number,
  hits: number,
  timesUsed: number,
  maxHP: number,
  toxicCounter: number
) {
  let toxicDamage = 0;
  if (toxicCounter > 0) {
    toxicDamage = Math.floor((toxicCounter * maxHP) / 16);
    toxicCounter++;
  }
  const n = damage.length;
  if (hits === 1) {
    // ignore end of turn healing for the hit that KOs
    // so that the pokemon doesnt "revive" from being KO'd
    // since recovery happens before toxic damage (and therefore always reduces toxic damage),
    // if the net healing is greater than zero, toxicDamage should also be set to zero.
    if (eot - toxicDamage > 0) {
      eot = 0;
      toxicDamage = 0;
    }
    for (let i = 0; i < n; i++) {
      if (damage[n - 1] - eot + toxicDamage < hp) return 0;
      if (damage[i] - eot + toxicDamage >= hp) {
        return (n - i) / n;
      }
    }
  }

  let sum = 0;
  let lastc = 0;
  for (let i = 0; i < n; i++) {
    let c;
    if (i === 0 || damage[i] !== damage[i - 1]) {
      c = computeKOChance(
        damage,
        hp - damage[i] + eot - toxicDamage,
        eot,
        hits - 1,
        timesUsed,
        maxHP,
        toxicCounter
      );
    } else {
      c = lastc;
    }
    if (c === 1) {
      sum += n - i;
      break;
    } else {
      sum += c;
    }
    lastc = c;
  }
  return sum / n;
}

function predictTotal(
  damage: number,
  eot: number,
  hits: number,
  timesUsed: number,
  toxicCounter: number,
  maxHP: number
) {
  let toxicDamage = 0;
  // hits - 1 is used in this for loop, as well as in the total = ...  calcs later
  // the last turn of eot damage is calculated separately
  // since if the damage is less than 0 (healing)
  // we want to exclude that from the calculations
  // since on the last turn the pokemon has been ko'd by the attack
  // and should not be able to heal after fainting
  let lastTurnEot = eot;
  if (toxicCounter > 0) {
    for (let i = 0; i < hits - 1; i++) {
      toxicDamage += Math.floor(((toxicCounter + i) * maxHP) / 16);
    }
    lastTurnEot -= Math.floor(((toxicCounter + (hits - 1)) * maxHP) / 16);
  }
  let total = 0;
  if (hits > 1 && timesUsed === 1) {
    total = damage * hits - eot * (hits - 1) + toxicDamage;
  } else {
    total = damage - eot * (hits - 1) + toxicDamage;
  }
  // if the net eot health gain is negative for the last turn, include it in the total
  if (lastTurnEot < 0) total -= lastTurnEot;
  return total;
}

function squashMultihit(gen: Generation, d: number[], hits: number, err = true) {
  if (d.length === 1) {
    return [d[0] * hits];
  } else if (gen.num === 1) {
    const r = [];
    for (let i = 0; i < d.length; i++) {
      r[i] = d[i] * hits;
    }
    return r;
  } else if (d.length === 16) {
    switch (hits) {
    case 2:
      return [
        2 * d[0], d[2] + d[3], d[4] + d[4], d[4] + d[5], d[5] + d[6], d[6] + d[6],
        d[6] + d[7], d[7] + d[7], d[8] + d[8], d[8] + d[9], d[9] + d[9], d[9] + d[10],
        d[10] + d[11], d[11] + d[11], d[12] + d[13], 2 * d[15],
      ];
    case 3:
      return [
        3 * d[0], d[3] + d[3] + d[4], d[4] + d[4] + d[5], d[5] + d[5] + d[6],
        d[5] + d[6] + d[6], d[6] + d[6] + d[7], d[6] + d[7] + d[7], d[7] + d[7] + d[8],
        d[7] + d[8] + d[8], d[8] + d[8] + d[9], d[8] + d[9] + d[9], d[9] + d[9] + d[10],
        d[9] + d[10] + d[10], d[10] + d[11] + d[11], d[11] + d[12] + d[12], 3 * d[15],
      ];
    case 4:
      return [
        4 * d[0], 4 * d[4], d[4] + d[5] + d[5] + d[5], d[5] + d[5] + d[6] + d[6],
        4 * d[6], d[6] + d[6] + d[7] + d[7], 4 * d[7], d[7] + d[7] + d[7] + d[8],
        d[7] + d[8] + d[8] + d[8], 4 * d[8], d[8] + d[8] + d[9] + d[9], 4 * d[9],
        d[9] + d[9] + d[10] + d[10], d[10] + d[10] + d[10] + d[11], 4 * d[11], 4 * d[15],
      ];
    case 5:
      return [
        5 * d[0], d[4] + d[4] + d[4] + d[5] + d[5], d[5] + d[5] + d[5] + d[5] + d[6],
        d[5] + d[6] + d[6] + d[6] + d[6], d[6] + d[6] + d[6] + d[6] + d[7],
        d[6] + d[6] + d[7] + d[7] + d[7], 5 * d[7], d[7] + d[7] + d[7] + d[8] + d[8],
        d[7] + d[7] + d[8] + d[8] + d[8], 5 * d[8], d[8] + d[8] + d[8] + d[9] + d[9],
        d[8] + d[9] + d[9] + d[9] + d[9], d[9] + d[9] + d[9] + d[9] + d[10],
        d[9] + d[10] + d[10] + d[10] + d[10], d[10] + d[10] + d[11] + d[11] + d[11], 5 * d[15],
      ];
    case 10:
      return [
        10 * d[0], 10 * d[4], 3 * d[4] + 7 * d[5], 5 * d[5] + 5 * d[6], 10 * d[6],
        5 * d[6] + 5 * d[7], 10 * d[7], 7 * d[7] + 3 * d[8], 3 * d[7] + 7 * d[8], 10 * d[8],
        5 * d[8] + 5 * d[9], 4 * d[9], 5 * d[9] + 5 * d[10], 7 * d[10] + 3 * d[11], 10 * d[11],
        10 * d[15],
      ];
    default:
      error(err, `Unexpected # of hits: ${hits}`);
      return d;
    }
  } else if (d.length === 39) {
    switch (hits) {
    case 2:
      return [
        2 * d[0], 2 * d[7], 2 * d[10], 2 * d[12], 2 * d[14], d[15] + d[16],
        2 * d[17], d[18] + d[19], d[19] + d[20], 2 * d[21], d[22] + d[23],
        2 * d[24], 2 * d[26], 2 * d[28], 2 * d[31], 2 * d[38],
      ];
    case 3:
      return [
        3 * d[0], 3 * d[9], 3 * d[12], 3 * d[13], 3 * d[15], 3 * d[16],
        3 * d[17], 3 * d[18], 3 * d[20], 3 * d[21], 3 * d[22], 3 * d[23],
        3 * d[25], 3 * d[26], 3 * d[29], 3 * d[38],
      ];
    case 4:
      return [
        4 * d[0], 2 * d[10] + 2 * d[11], 4 * d[13], 4 * d[14], 2 * d[15] + 2 * d[16],
        2 * d[16] + 2 * d[17], 2 * d[17] + 2 * d[18], 2 * d[18] + 2 * d[19],
        2 * d[19] + 2 * d[20], 2 * d[20] + 2 * d[21], 2 * d[21] + 2 * d[22],
        2 * d[22] + 2 * d[23], 4 * d[24], 4 * d[25], 2 * d[27] + 2 * d[28], 4 * d[38],
      ];
    case 5:
      return [
        5 * d[0], 5 * d[11], 5 * d[13], 5 * d[15], 5 * d[16], 5 * d[17],
        5 * d[18], 5 * d[19], 5 * d[19], 5 * d[20], 5 * d[21], 5 * d[22],
        5 * d[23], 5 * d[25], 5 * d[27], 5 * d[38],
      ];
    case 10:
      return [
        10 * d[0], 10 * d[11], 10 * d[13], 10 * d[15], 10 * d[16], 10 * d[17],
        10 * d[18], 10 * d[19], 10 * d[19], 10 * d[20], 10 * d[21], 10 * d[22],
        10 * d[23], 10 * d[25], 10 * d[27], 10 * d[38],
      ];
    default:
      error(err, `Unexpected # of hits: ${hits}`);
      return d;
    }
  } else if (d.length === 256) {
    if (hits > 1) {
      error(err, `Unexpected # of hits for Parental Bond: ${hits}`);
    }
    // FIXME: Come up with a better Parental Bond approximation
    const r: number[] = [];
    for (let i = 0; i < 16; i++) {
      let val = 0;
      for (let j = 0; j < 16; j++) {
        val += d[i + j];
      }
      r[i] = Math.round(val / 16);
    }
    return r;
  } else {
    error(err, `Unexpected # of possible damage values: ${d.length}`);
    return d;
  }
}

function buildDescription(description: RawDesc, attacker: Pokemon, defender: Pokemon) {
  const [attackerLevel, defenderLevel] = getDescriptionLevels(attacker, defender);
  let output = '';
  if (description.attackBoost) {
    if (description.attackBoost > 0) {
      output += '+';
    }
    output += description.attackBoost + ' ';
  }
  output = appendIfSet(output, attackerLevel);
  output = appendIfSet(output, description.attackEVs);
  output = appendIfSet(output, description.attackerItem);
  output = appendIfSet(output, description.attackerAbility);
  output = appendIfSet(output, description.rivalry);
  if (description.isBurned) {
    output += 'burned ';
  }
  if (description.isFrostbitten) {
    output += 'frostbitten ';
  }
  if (description.alliesFainted) {
    output += Math.min(5, description.alliesFainted) +
      ` ${description.alliesFainted === 1 ? 'ally' : 'allies'} fainted `;
  }
  if (description.attackerTera) {
    output += `Tera ${description.attackerTera} `;
  }

  if (description.isStellarFirstUse) {
    output += '(First Use) ';
  }

  if (description.isBeadsOfRuin) {
    output += 'Beads of Ruin ';
  }
  if (description.isSwordOfRuin) {
    output += 'Sword of Ruin ';
  }
  output += description.attackerName + ' ';
  if (description.isCharge) {
    output += 'Charge ';
  }
  if (description.isHelpingHand) {
    output += 'Helping Hand ';
  }
  if (description.isFlowerGiftAttacker) {
    output += 'with an ally\'s Flower Gift ';
  }
  if (description.isBattery) {
    output += 'Battery boosted ';
  }
  if (description.isPowerSpot) {
    output += 'Power Spot boosted ';
  }
  if (description.isSwitching) {
    output += 'switching boosted ';
  }
  output += description.moveName + ' ';
  if (description.moveBP && description.moveType) {
    output += '(' + description.moveBP + ' BP ' + description.moveType + ') ';
  } else if (description.moveBP) {
    output += '(' + description.moveBP + ' BP) ';
  } else if (description.moveType) {
    output += '(' + description.moveType + ') ';
  }
  if (description.hits) {
    output += '(' + description.hits + ' hits) ';
  }
  output = appendIfSet(output, description.moveTurns);
  output += 'vs. ';
  if (description.defenseBoost) {
    if (description.defenseBoost > 0) {
      output += '+';
    }
    output += description.defenseBoost + ' ';
  }
  output = appendIfSet(output, defenderLevel);
  output = appendIfSet(output, description.HPEVs);
  if (description.defenseEVs) {
    output += '/ ' + description.defenseEVs + ' ';
  }
  output = appendIfSet(output, description.defenderItem);
  output = appendIfSet(output, description.defenderAbility);
  if (description.isTabletsOfRuin) {
    output += 'Tablets of Ruin ';
  }
  if (description.isVesselOfRuin) {
    output += 'Vessel of Ruin ';
  }
  if (description.isProtected) {
    output += 'protected ';
  }
  if (description.isDefenderDynamaxed) {
    output += 'Dynamax ';
  }
  if (description.defenderTera) {
    output += `Tera ${description.defenderTera} `;
  }
  output += description.defenderName;
  if (description.weather && description.terrain) {
    // do nothing
  } else if (description.weather) {
    output += ' in ' + description.weather;
  } else if (description.terrain) {
    output += ' in ' + description.terrain + ' Terrain';
  }
  if (description.isReflect) {
    output += ' through Reflect';
  } else if (description.isLightScreen) {
    output += ' through Light Screen';
  }
  if (description.isFlowerGiftDefender) {
    output += ' with an ally\'s Flower Gift';
  }
  if (description.isFriendGuard) {
    output += ' with an ally\'s Friend Guard';
  }
  if (description.isAuroraVeil) {
    output += ' through Aurora Veil';
  }
  if (description.isCritical) {
    output += ' on a critical hit';
  }
  if (description.isWonderRoom) {
    output += ' in Wonder Room';
  }
  return output;
}

function getDescriptionLevels(attacker: Pokemon, defender: Pokemon) {
  if (attacker.level !== defender.level) {
    return [
      attacker.level === 100 ? '' : `Lvl ${attacker.level}`,
      defender.level === 100 ? '' : `Lvl ${defender.level}`,
    ];
  }
  // There's an argument for showing any level thats not 100, but VGC and LC players
  // probably would rather not see level cruft in their calcs
  const elide = [100, 50, 5].includes(attacker.level);
  const level = elide ? '' : `Lvl ${attacker.level}`;
  return [level, level];
}

function serializeText(arr: string[]) {
  if (arr.length === 0) {
    return '';
  } else if (arr.length === 1) {
    return arr[0];
  } else if (arr.length === 2) {
    return arr[0] + ' and ' + arr[1];
  } else {
    let text = '';
    for (let i = 0; i < arr.length - 1; i++) {
      text += arr[i] + ', ';
    }
    return text + 'and ' + arr[arr.length - 1];
  }
}

function appendIfSet(str: string, toAppend?: string) {
  return toAppend ? `${str}${toAppend} ` : str;
}

function toDisplay(notation: string, a: number, b: number, f = 1) {
  return notation === '%' ? Math.floor((a * (1000 / f)) / b) / 10 : Math.floor((a * (48 / f)) / b);
}
