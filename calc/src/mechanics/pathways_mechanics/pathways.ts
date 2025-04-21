//PATHWAYS DAMAGE CALC IN Move_Usage_Calculations.rb -> def pbCalcDamage
//
//amaterasu?, tsukuyomi?
//
//SINFUL GLUTTONY take half of oppo atk def spa spd round down add to guzz stats subtract from your stats, also steal all boosts
//hydrochasm++ toggle second phase??
//NEUTRALIZING GAS IMMUNITY done i guess?
//pbs export?
//gender support for importing sets

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
  checkTeraformZero,
  checkWindRider,
  checkWonderRoom,
  countBoosts,
  getStatDescriptionText,
  getShellSideArmCategory,
  getWeight,
  handleFixedDamageMoves,
  isGrounded,
  isQPActive,
} from '../util';
import {
  getMoveEffectivenessPathways,
  getStabModPathways,
  getQPBoostedStatPathways,
  getAteAbilityType,
  getModifiedStatPathways,
  computeFinalStatsPathways,
  checkMultihitBoostPathways,
  getAuraCrystalAtMod,
  getAuraCrystalDR,
  getRoleDamageMod,
  getFinalDamagePathways,
  hasMagicGuard,
} from './util';
import {calculateBasePowerPathways} from './basePower';
import {calculateAttackPathways} from './attack';
import {calculateDefensePathways} from './defense';
import {calculateFinalModPathways} from './finalMod';

export function calculatePathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
) {
  // #region Initial

  checkAirLock(attacker, field);
  checkAirLock(defender, field);
  checkTeraformZero(attacker, field);
  checkTeraformZero(defender, field);
  checkForecast(attacker, field.weather);
  checkForecast(defender, field.weather);
  checkItem(attacker, field.isMagicRoom);
  checkItem(defender, field.isMagicRoom);
  checkWonderRoom(attacker, field.isWonderRoom);
  checkWonderRoom(defender, field.isWonderRoom);

  computeFinalStatsPathways(attacker, defender, field, 'def', 'spd', 'spe');

  checkWindRider(attacker, field.attackerSide);
  checkWindRider(defender, field.defenderSide);

  if (move.named('Meteor Beam', 'Electro Shot')) {
    attacker.boosts.spa +=
      attacker.hasAbility('Simple') ? 2
      : attacker.hasAbility('Contrary') ? -1
      : 1;
    // restrict to +- 6
    attacker.boosts.spa = Math.min(6, Math.max(-6, attacker.boosts.spa));
  }

  computeFinalStatsPathways(attacker, defender, field, 'atk', 'spa');

  checkInfiltrator(attacker, field.defenderSide);
  checkInfiltrator(defender, field.attackerSide);

  const desc: RawDesc = {
    attackerName: attacker.name,
    moveName: move.name,
    defenderName: defender.name,
    isDefenderDynamaxed: defender.isDynamaxed,
    isWonderRoom: field.isWonderRoom,
  };

  // only display tera type if it applies
  if (attacker.teraType !== 'Stellar' || move.name === 'Tera Blast' || move.isStellarFirstUse) {
    // tera blast has special behavior with tera stellar
    desc.isStellarFirstUse = attacker.name !== 'Terapagos-Stellar' && move.name === 'Tera Blast' &&
      attacker.teraType === 'Stellar' && move.isStellarFirstUse;
    desc.attackerTera = attacker.teraType;
  }
  if (defender.teraType !== 'Stellar') desc.defenderTera = defender.teraType;

  if (move.named('Photon Geyser', 'Light That Burns the Sky') ||
      (move.named('Tera Blast') && attacker.teraType)) {
    move.category = attacker.stats.atk > attacker.stats.spa ? 'Physical' : 'Special';
  }

  const result = new Result(gen, attacker, defender, move, field, 0, desc);

  if (move.category === 'Status' && !move.named('Nature Power')) {
    return result;
  }

  if (move.flags.punch && attacker.hasItem('Punching Glove')) {
    desc.attackerItem = attacker.item;
    move.flags.contact = 0;
  }
  
  if (move.named('Shell Side Arm') &&
    getShellSideArmCategory(attacker, defender) === 'Physical') {
    move.flags.contact = 1;
  }
  
  const breaksProtect = (
    move.breaksProtect || move.isZ || move.isMax ||
    (attacker.hasAbility('Unseen Fist') && move.flags.contact) ||
    (attacker.hasAbility('Killing Joke'))
  );

  if (field.defenderSide.isProtected && !breaksProtect) {
    desc.isProtected = true;
    return result;
  }

  if (move.name === 'Pain Split') {
    const average = Math.floor((attacker.curHP() + defender.curHP()) / 2);
    const damage = Math.max(0, defender.curHP() - average);
    result.damage = damage;
    return result;
  }

  const defenderIgnoresAbility = defender.hasAbility(
    'Full Metal Body',
    'Prism Armor',
    'Shadow Shield'
  );

  const attackerIgnoresAbility = attacker.hasAbility('Mold Breaker', 'Teravolt', 'Turboblaze', 'Hydrochasm Surge++');
  const moveIgnoresAbility = move.named(
    'G-Max Drum Solo',
    'G-Max Fire Ball',
    'G-Max Hydrosnipe',
    'Light That Burns the Sky',
    'Menacing Moonraze Maelstrom',
    'Moongeist Beam',
    'Photon Geyser',
    'Searing Sunraze Smash',
    'Sunsteel Strike'
  );
  if (!defenderIgnoresAbility && !defender.hasAbility('Poison Heal') &&
    (attackerIgnoresAbility || moveIgnoresAbility)) {
    if (attackerIgnoresAbility) desc.attackerAbility = attacker.ability;
    if (defender.hasItem('Ability Shield')) {
      desc.defenderItem = defender.item;
    } else {
      defender.ability = '' as AbilityName;
    }
  }

  const ignoresNeutralizingGas = [
    'As One (Glastrier)', 'As One (Spectrier)', 'Battle Bond', 'Comatose',
    'Disguise', 'Gulp Missile', 'Ice Face', 'Multitype', 'Neutralizing Gas',
    'Power Construct', 'RKS System', 'Schooling', 'Shields Down',
    'Stance Change', 'Tera Shift', 'Zen Mode', 'Zero to Hero', 'Legendary Aura',
    'Hydrochasm Surge++', 'Golden Hour'
  ];

  if (attacker.hasAbility('Neutralizing Gas') &&
    !ignoresNeutralizingGas.includes(defender.ability || '')) {
    desc.attackerAbility = attacker.ability;
    defender.ability = '' as AbilityName;
  }

  if (defender.hasAbility('Neutralizing Gas') &&
    !ignoresNeutralizingGas.includes(attacker.ability || '')) {
    desc.defenderAbility = defender.ability;
    attacker.ability = '' as AbilityName;
  }

  // Merciless does not ignore Shell Armor, damage dealt to a poisoned Pokemon with Shell Armor
  // will not be a critical hit (UltiMario)
  const isCritical = (
    !defender.hasAbility('Battle Armor', 'Shell Armor', 'Hydrochasm Surge', 'Hydrochasm Surge++') &&
    (move.isCrit ||
     (attacker.hasAbility('Merciless') && defender.hasStatus('psn', 'tox')) ||
     (attacker.hasAbility('Basilisk') && move.hasType('Dragon') && defender.hasStatus('par'))
    ) &&
    move.timesUsed === 1 //whats this times used??
  );

  let type = move.type;
  if (move.originalName === 'Weather Ball' || move.originalName === 'Weather Bomb') {
    const holdingUmbrella = attacker.hasItem('Utility Umbrella');
    type =
      field.hasWeather('Sun', 'Harsh Sunshine') && !holdingUmbrella ? 'Fire'
      : field.hasWeather('Rain', 'Heavy Rain', 'Harsh Typhoon') && !holdingUmbrella ? 'Water'
      : field.hasWeather('Sand', 'Raging Sandstorm') ? 'Rock'
      : field.hasWeather('Hail', 'Snow', 'Violent Blizzard') ? 'Ice'
      : 'Normal';
    desc.weather = field.weather;
    desc.moveType = type;
  } else if (move.named('Judgment') && attacker.item && attacker.item.includes('Plate')) {
    type = getItemBoostType(attacker.item)!;
  } else if (move.originalName === 'Techno Blast' &&
    attacker.item && attacker.item.includes('Drive')) {
    type = getTechnoBlast(attacker.item)!;
    desc.moveType = type;
  } else if (move.originalName === 'Multi-Attack' &&
    attacker.item && attacker.item.includes('Memory')) {
    type = getMultiAttack(attacker.item)!;
    desc.moveType = type;
  } else if (move.named('Natural Gift') && attacker.item?.endsWith('Berry')) {
    const gift = getNaturalGift(gen, attacker.item)!;
    type = gift.t;
    desc.moveType = type;
    desc.attackerItem = attacker.item;
  } else if (
    move.named('Nature Power') ||
    move.originalName === 'Terrain Pulse' ||
    move.named('Terrain Blast')
  ) {
    const ground = move.originalName.includes('Terrain') && isGrounded(attacker, field);
    type =
      field.hasTerrain('Electric') && ground ? 'Electric'
      : field.hasTerrain('Grassy') && ground ? 'Grass'
      : field.hasTerrain('Misty') && ground ? 'Fairy'
      : field.hasTerrain('Psychic') && ground ? 'Psychic'
      : field.hasTerrain('Dragonic Soul') ? 'Dragon'
      : field.hasTerrain('Terror Realm') ? 'Dark'
      : field.hasTerrain('Dream World') ? 'Psychic'
      : field.hasTerrain('Faraday Cage') ? 'Electric'
      : field.hasTerrain('Frozen Kingdom') ? 'Ice'
      : 'Normal';
    desc.terrain = field.terrain;

    if (move.isMax) {
      desc.moveType = type;
    }

    // If the Nature Power user has the ability Prankster, it cannot affect
    // Dark-types or grounded foes if Psychic Terrain is active
    if (!(move.named('Nature Power') && attacker.hasAbility('Prankster')) &&
      ((defender.types.includes('Dark') ||
      (field.hasTerrain('Psychic') && isGrounded(defender, field))))) {
      desc.moveType = type;
    }
  } else if (move.originalName === 'Revelation Dance' || move.named('Wild Card')) {
    if (attacker.teraType) {
      type = attacker.teraType;
    } else {
      type = attacker.types[0];
    }
  } else if (move.named('Aura Wheel')) {
    if (attacker.named('Morpeko')) {
      type = 'Electric';
    } else if (attacker.named('Morpeko-Hangry')) {
      type = 'Dark';
    }
  } else if (move.named('Raging Bull')) {
    if (attacker.named('Tauros-Paldea-Combat')) {
      type = 'Fighting';
    } else if (attacker.named('Tauros-Paldea-Blaze')) {
      type = 'Fire';
    } else if (attacker.named('Tauros-Paldea-Aqua')) {
      type = 'Water';
    }
  } else if (move.named('Ivy Cudgel')) {
    if (attacker.name.includes('Ogerpon-Cornerstone')) {
      type = 'Rock';
    } else if (attacker.name.includes('Ogerpon-Hearthflame')) {
      type = 'Fire';
    } else if (attacker.name.includes('Ogerpon-Wellspring')) {
      type = 'Water';
    }
  } else if (
    move.named('Tera Starstorm') && attacker.name === 'Terapagos-Stellar'
  ) {
    move.target = 'allAdjacentFoes';
    type = 'Stellar';
  }

  let abilityTyping = getAteAbilityType(gen, attacker.ability, attacker.item, !!move.flags.sound);
  let hasAteAbilityTypeChange = false;
  const noTypeChange = move.named(
    'Revelation Dance',
    'Judgment',
    'Nature Power',
    'Techno Blast',
    'Multi-Attack',
    'Natural Gift',
    'Weather Ball',
    'Weather Bomb',
    'Terrain Pulse',
    'Terrain Blast',
    'Struggle',
  ) || (move.named('Tera Blast') && attacker.teraType);

  if (
    !move.isZ && !noTypeChange && abilityTyping &&
    ((type === 'Normal' || attacker.hasAbility('Normalize')) ||
    (attacker.hasAbility('Liquid Voice') && type !== 'Water'))
  ) {
    type = abilityTyping;
    hasAteAbilityTypeChange = !attacker.hasAbility('Liquid Voice');
    if (attacker.hasAbility('Primeval Gift')) {
      desc.attackerItem = attacker.item;
    }
    desc.attackerAbility = attacker.ability;
  }

  if (move.named('Tera Blast') && attacker.teraType) {
    type = attacker.teraType;
  }

  move.type = type;

  // FIXME: this is incorrect, should be move.flags.heal, not move.drain
  if (
    (attacker.hasAbility('Triage', 'Pure Prayer', 'Healing Droplets', 'Healing Droplets++') && move.drain) ||
    (attacker.hasAbility('Gale Wings') && move.hasType('Flying') && attacker.curHP() === attacker.maxHP()) ||
    (attacker.hasAbility('Spirit Call') && move.hasType('Ghost')) ||
    (move.named('Grassy Glide', 'Spirit Bloom') && field.hasTerrain('Grassy')) || //if IR ability with these it could proc armor tail incorrectly
    (move.named('Pin Shock') && field.hasTerrain('Electric')) ||
    (attacker.hasAbility('Bee Ware') && move.hasType('Bug')) ||
    (attacker.hasAbility('Lightning Fast') && field.hasTerrain('Electric'))
  ) {
    move.priority = 1;
    desc.attackerAbility = attacker.ability;
  }
  
  const type1Effectiveness = getMoveEffectivenessPathways(
    gen,
    attacker,
    defender,
    move,
    defender.types[0],
    field,
    desc
  );
  const type2Effectiveness = defender.types[1] ? getMoveEffectivenessPathways(
      gen,
      attacker,
      defender,
      move,
      defender.types[1],
      field,
      desc
    )
    : 1;
  let typeEffectiveness = type1Effectiveness * type2Effectiveness;
  if (move.hasType('Shadow')) typeEffectiveness = 2;
  
  if (typeEffectiveness === 0) {
    return result;
  }

  if ((move.named('Sky Drop') &&
        (defender.hasType('Flying') || defender.weightkg >= 200 || field.isGravity)) ||
      (move.named('Synchronoise') && !defender.hasType(attacker.types[0]) &&
        (!attacker.types[1] || !defender.hasType(attacker.types[1]))) ||
      (move.named('Dream Eater') &&
        (!(defender.hasStatus('slp') && !defender.hasAbility('Comatose', 'Awakening')))) ||
      (move.named('Steel Roller') && !field.terrain) ||
      (move.named('Poltergeist') && (!defender.item || isQPActive(defender, field)))
  ) {
    return result;
  }

  if (
    (field.hasWeather('Harsh Sunshine') && move.hasType('Water')) ||
    (field.hasWeather('Heavy Rain', 'Harsh Typhoon') && move.hasType('Fire')) ||
    (field.hasWeather('Raging Sandstorm', 'Harsh Typhoon') && move.hasType('Grass'))
  ) {
    desc.weather = field.weather;
    return result;
  }

  const turn2typeEffectiveness = typeEffectiveness;

  if (
    (defender.hasAbility('Wonder Guard') && typeEffectiveness <= 1) ||
    (move.hasType('Grass') && defender.hasAbility('Sap Sipper')) ||
    (move.hasType('Fire') && (defender.hasAbility('Flash Fire', 'Well-Baked Body') && !attacker.hasAbility('Crescendo'))) ||
    (move.hasType('Water') && defender.hasAbility('Dry Skin', 'Storm Drain', 'Water Absorb', 'Water Compaction', 'Fusion Core')) ||
    (move.hasType('Electric') && defender.hasAbility('Lightning Rod', 'Motor Drive', 'Volt Absorb', 'Turbo Engine')) ||
    (move.hasType('Ground') && !move.named('Thousand Arrows') && !defender.hasItem('Iron Ball') && !defender.hasType('Flying', 'Omnitype') &&
     (defender.hasAbility('Golden Hour', 'Levitate', 'Lightning Speed', 'Distortion', 'Witchcraft', 'Swarming'))) ||
    (move.flags.bullet && defender.hasAbility('Bulletproof')) ||
    (move.flags.sound && !move.named('Clangorous Soul') && defender.hasAbility('Soundproof', 'Screamer', 'Reqieum Di Diavolo')) ||
    (move.priority > 0 && defender.hasAbility('Queenly Majesty', 'Dazzling', 'Armor Tail')) ||
    (move.hasType('Ground') && defender.hasAbility('Earth Eater', 'Plasma Hellscape')) ||
    (move.flags.wind && defender.hasAbility('Wind Rider')) ||
    (move.hasType('Fairy') && defender.hasAbility('Misery After')) ||
    (move.hasType('Ice') && defender.hasAbility('Frost Drain')) ||
    (move.hasType('Bug') && defender.hasAbility('Fly Trap')) ||
    (move.hasType('Poison') && defender.hasAbility('Ferrite Scales')) ||
    (move.hasType('Dragon') && defender.hasAbility('Dragon Fear'))
  ) {
    desc.defenderAbility = defender.ability;
    return result;
  }

  if (move.hasType('Ground') && !move.named('Thousand Arrows') && !field.isGravity && defender.hasItem('Air Balloon')) {
    desc.defenderItem = defender.item;
    return result;
  }

  if (move.priority > 0 && field.hasTerrain('Psychic') && isGrounded(defender, field)) {
    desc.terrain = field.terrain;
    return result;
  }

  const weightBasedMove = move.named('Heat Crash', 'Heavy Slam', 'Low Kick', 'Grass Knot');
  if (defender.isDynamaxed && weightBasedMove) {
    return result;
  }

  desc.HPEVs = getStatDescriptionText(gen, defender, 'hp');

  const fixedDamage = handleFixedDamageMoves(attacker, move);
  if (fixedDamage) {
    if (attacker.hasAbility('Parental Bond')) {
      result.damage = [fixedDamage, fixedDamage];
      desc.attackerAbility = attacker.ability;
    } else {
      result.damage = fixedDamage;
    }
    return result;
  }

  if (move.named('Final Gambit')) {
    result.damage = attacker.curHP();
    return result;
  }

  if (move.named('Guardian of Alola')) {
    let zLostHP = Math.floor((defender.curHP() * 3) / 4);
    if (field.defenderSide.isProtected && attacker.item && attacker.item.includes(' Z')) {
      zLostHP = Math.ceil(zLostHP / 4 - 0.5);
    }
    result.damage = zLostHP;
    return result;
  }

  if (move.named('Nature\'s Madness')) {
    const lostHP = field.defenderSide.isProtected ? 0 : Math.floor(defender.curHP() / 2);
    result.damage = lostHP;
    return result;
  }

  if (move.named('Spectral Thief')) {
    let stat: StatID;
    for (stat in defender.boosts) {
      if (defender.boosts[stat] > 0) {
        attacker.boosts[stat] +=
          attacker.hasAbility('Contrary') ? -defender.boosts[stat]! : defender.boosts[stat]!;
        if (attacker.boosts[stat] > 6) attacker.boosts[stat] = 6;
        if (attacker.boosts[stat] < -6) attacker.boosts[stat] = -6;
        attacker.stats[stat] = getModifiedStatPathways(attacker.rawStats[stat]!, attacker.boosts[stat]!);
        defender.boosts[stat] = 0;
        defender.stats[stat] = defender.rawStats[stat];
      }
    }
  }

  if (move.hits > 1) {
    desc.hits = move.hits;
  }

  const turnOrder = attacker.stats.spe > defender.stats.spe ? 'first' : 'last';

  // #endregion
  // #region Base Power

  const basePower = calculateBasePowerPathways(
    gen,
    attacker,
    defender,
    move,
    field,
    hasAteAbilityTypeChange,
    desc
  );
  if (basePower === 0) {
    return result;
  }

  // #endregion
  // #region (Special) Attack
  const attack = calculateAttackPathways(gen, attacker, defender, move, field, desc, isCritical);
  const attackStat =
    move.named('Shell Side Arm') &&
    getShellSideArmCategory(attacker, defender) === 'Physical'
      ? 'atk'
      : move.named('Body Press', 'Wall Crash', 'Shield Bash', 'Mule Masher')
        ? 'def'
        : move.category === 'Special'
          ? 'spa'
          : 'atk';
  // #endregion
  // #region (Special) Defense

  const defense = calculateDefensePathways(gen, attacker, defender, move, field, desc, isCritical);
  const hitsPhysical = move.overrideDefensiveStat === 'def' || move.category === 'Physical' ||
    (move.named('Shell Side Arm') && getShellSideArmCategory(attacker, defender) === 'Physical');
  const defenseStat = hitsPhysical ? 'def' : 'spd';

  // #endregion

  const finalMod = calculateFinalModPathways(
    gen,
    attacker,
    defender,
    move,
    field,
    desc,
    isCritical,
    typeEffectiveness
  );

  const isSpread = field.gameType !== 'Singles' && ['allAdjacent', 'allAdjacentFoes'].includes(move.target);

  let childDamage: number[] | undefined;
  if (attacker.hasAbility('Parental Bond') && move.hits === 1 && !isSpread) {
    const child = attacker.clone();
    child.ability = 'Parental Bond (Child)' as AbilityName;
    checkMultihitBoostPathways(child, defender, move, field, desc);
    childDamage = calculatePathways(gen, child, defender, move, field).damage as number[];
    desc.attackerAbility = attacker.ability;
  }
  
  let vicious = 0;
  if (
    !hasMagicGuard(defender, field) && !defender.hasItem('Protective Pads') &&
    ((attacker.hasAbility('Vicious Edge') && move.flags.blade) ||
     (attacker.hasAbility('Vicious Claws') && move.flags.slicing))
  ) {
    vicious = Math.floor(defender.maxHP() / 8);
    desc.attackerAbility = attacker.ability;
  }

  const damage = getFinalDamagePathways(basePower, attack, defense, attacker.level, finalMod, vicious);
  
  result.damage = childDamage ? [damage, childDamage] : damage;

  desc.attackBoost = move.named('Foul Play', 'Rigged Game') ? defender.boosts[attackStat] : attacker.boosts[attackStat];

  //multihit here
  if ((move.dropsStats && move.timesUsed! > 1) || move.hits > 1) {
    // store boosts so intermediate boosts don't show.
    const origDefBoost = desc.defenseBoost;
    const origAtkBoost = desc.attackBoost;

    let numAttacks = 1;
    if (move.dropsStats && move.timesUsed! > 1) {
      desc.moveTurns = `over ${move.timesUsed} turns`;
      numAttacks = move.timesUsed!;
    } else {
      numAttacks = move.hits;
    }
    let usedItems = [false, false];
    let damageMatrix = [damage];
    for (let times = 1; times < numAttacks; times++) {
      usedItems = checkMultihitBoostPathways(attacker, defender, move,
        field, desc, usedItems[0], usedItems[1]);
      const newAttack = calculateAttackPathways(gen, attacker, defender, move,
        field, desc, isCritical);
      const newDefense = calculateDefensePathways(gen, attacker, defender, move,
        field, desc, isCritical);
      // Check if lost -ate ability. Typing stays the same, only boost is lost
      // Cannot be regained during multihit move and no Normal moves with stat drawbacks
      hasAteAbilityTypeChange = hasAteAbilityTypeChange &&
        attacker.hasAbility('Aerilate', 'Galvanize', 'Pixilate', 'Refrigerate', 'Normalize');

      if ((move.dropsStats && move.timesUsed! > 1)) {
        // Hack to make Tera Shell with multihit moves, but not over multiple turns
        typeEffectiveness = turn2typeEffectiveness;
        // Stellar damage boost applies for 1 turn, but all hits of multihit.
        //stabMod = getStellarStabMod(attacker, move, preStellarStabMod, times);
      }

      const newBasePower = calculateBasePowerPathways(
        gen,
        attacker,
        defender,
        move,
        field,
        hasAteAbilityTypeChange,
        desc,
        times + 1
      );
      const newFinalMod = calculateFinalModPathways(
        gen,
        attacker,
        defender,
        move,
        field,
        desc,
        isCritical,
        typeEffectiveness,
        times
      );

      let damageMultiplier = 0;
      damageMatrix[times] = getFinalDamagePathways(newBasePower, attack, defense, attacker.level, newFinalMod, 0);
    }
    result.damage = damageMatrix;
    
    desc.defenseBoost = origDefBoost;
    desc.attackBoost = origAtkBoost;
  }


  // #endregion

  return result;
}
