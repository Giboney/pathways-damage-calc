//rage fist, cave in, avalanche, last respects,
//money moves treasure drop, golden land
//if ability changes move bp add ability to desc but not bp
//if move changes bp bc of move effect add move bp to desc
//if move changes bp bc of other effect add effect to desc but not bp


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
  getMoveEffectivenessPathways,
  getStabModPathways,
  getQPBoostedStatPathways,
  getModifiedStatPathways,
  computeFinalStatsPathways,
  getAuraCrystalAtMod,
  getAuraCrystalDR,
} from './util';



export function calculateBasePowerPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  hasAteAbilityTypeChange: boolean,
  desc: RawDesc,
  hit = 1,
) {
  const turnOrder = attacker.stats.spe > defender.stats.spe ? 'first' : 'last';

  let basePower = move.bp;
  if (move.named('Return', 'Frustration', 'Pika Papow', 'Veevee Volley', 'Rio Rush', 'Zozo Zania', 'Cleffa Cluffle', 'Nido Needle', 'Axy Axe', 'Bonbon Bash', 'Cubby Cuddle', 'Skully Scare', 'Nymble Nibble', 'Deedee Duster', 'Cucu Crush', 'Purr Pressure', 'Bray Bravery')) {
    basePower = 102;
    desc.moveBP = basePower;
  }

  //could also be an if else block
  switch (move.name) {
    case 'Payback':
      basePower = move.bp * (turnOrder === 'last' ? 2 : 1);
      desc.moveBP = basePower;
      break;
    case 'Bolt Beak':
    case 'Fishious Rend':
      basePower = move.bp * (turnOrder !== 'last' ? 2 : 1);
      desc.moveBP = basePower;
      break;
    case 'Pursuit':
      const switching = field.defenderSide.isSwitching === 'out';
      basePower = move.bp * (switching ? 2 : 1);
      if (switching) desc.isSwitching = 'out';
      desc.moveBP = basePower;
      break;
    case 'Electro Ball':
      const r = Math.floor(attacker.stats.spe / defender.stats.spe);
      basePower = r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40;
      if (defender.stats.spe === 0) basePower = 40;
      desc.moveBP = basePower;
      break;
    case 'Gyro Ball':
      basePower = Math.min(150, Math.floor((25 * defender.stats.spe) / attacker.stats.spe) + 1);
      if (attacker.stats.spe === 0) basePower = 1;
      desc.moveBP = basePower;
      break;
    case 'Punishment':
      basePower = Math.min(200, 60 + 20 * countBoosts(gen, defender.boosts));
      desc.moveBP = basePower;
      break;
    case 'Low Kick':
    case 'Grass Knot':
      const w = getWeight(defender, desc, 'defender');
      basePower = w >= 200 ? 120 : w >= 100 ? 100 : w >= 50 ? 80 : w >= 25 ? 60 : w >= 10 ? 40 : 20;
      desc.moveBP = basePower;
      break;
    case 'Hex':
    case 'Infernal Parade':
    case 'Holy Water':
      // Hex deals double damage to Pokemon with Comatose (ih8ih8sn0w)
      if (defender.status || defender.hasAbility('Comatose', 'Awakening')) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Barb Barrage':
    case 'Venoshock':
      if (defender.hasStatus('psn', 'tox')) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Heavy Slam':
    case 'Heat Crash':
      const wr =
          getWeight(attacker, desc, 'attacker') /
          getWeight(defender, desc, 'defender');
      basePower = wr >= 5 ? 120 : wr >= 4 ? 100 : wr >= 3 ? 80 : wr >= 2 ? 60 : 40;
      desc.moveBP = basePower;
      break;
    case 'Stored Power':
    case 'Power Trip':
      basePower = 20 + 20 * countBoosts(gen, attacker.boosts);
      desc.moveBP = basePower;
      break;
    case 'Assurance':
      basePower = move.bp * (defender.hasAbility('Parental Bond (Child)') ? 2 : 1);
      // NOTE: desc.attackerAbility = 'Parental Bond' will already reflect this boost
      break;
    case 'Wake-Up Slap':
      // Wake-Up Slap deals double damage to Pokemon with Comatose (ih8ih8sn0w)
      basePower = move.bp * (defender.hasStatus('slp') || defender.hasAbility('Comatose') ? 2 : 1);
      desc.moveBP = basePower;
      break;
    case 'Smelling Salts':
      basePower = move.bp * (defender.hasStatus('par') ? 2 : 1);
      desc.moveBP = basePower;
      break;
    case 'Weather Bomb':
    case 'Weather Ball':
      if (field.hasWeather('Harsh Typhoon', 'Sand', 'Raging Sandstorm', 'Snow', 'Violent Blizzard') ||
          (field.hasWeather('Sun', 'Harsh Sunshine', 'Rain', 'Heavy Rain') && !attacker.hasItem('Utility Umbrella'))) {
        basePower *= 2;
      }
      desc.moveBP = basePower;
      break;
    case 'Terrain Pulse':
    case 'Terrain Blast':
      if (field.hasTerrain('Dragonic Soul', 'Terror Realm', 'Dream World', 'Faraday Cage', 'Frozen Kingdom') ||
          (field.hasTerrain('Electric', 'Grassy', 'Misty', 'Psychic') && !isGrounded(attacker, field))) {
        basePower *= 2;
      }
      desc.moveBP = basePower;
      break;
    case 'Rising Voltage':
      basePower = move.bp * ((isGrounded(defender, field) && field.hasTerrain('Electric')) ? 2 : 1);
      desc.moveBP = basePower;
      break;
    case 'Psyblade':
      if (field.hasTerrain('Electric')) {
        basePower *= 1.5;
        desc.moveBP = basePower;
        desc.terrain = field.terrain;
      }
      break;
    case 'Fling':
      basePower = getFlingPower(attacker.item);
      desc.moveBP = basePower;
      desc.attackerItem = attacker.item;
      break;
    case 'Dragon Energy':
    case 'Eruption':
    case 'Water Spout':
      basePower = Math.max(1, Math.floor((150 * attacker.curHP()) / attacker.maxHP()));
      desc.moveBP = basePower;
      break;
    case 'Flail':
    case 'Reversal':
      const p = Math.floor((48 * attacker.curHP()) / attacker.maxHP());
      basePower = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20;
      desc.moveBP = basePower;
      break;
    case 'Natural Gift':
      if (attacker.item?.endsWith('Berry')) {
        const gift = getNaturalGift(gen, attacker.item)!;
        basePower = gift.p;
        desc.attackerItem = attacker.item;
        desc.moveBP = move.bp;
      } else {
        basePower = move.bp;
      }
      break;
    case 'Nature Power':
      move.category = 'Special';
      move.secondaries = true;

      // Nature Power cannot affect Dark-types if it is affected by Prankster
      if (attacker.hasAbility('Prankster') && defender.types.includes('Dark')) {
        basePower = 0;
        desc.moveName = 'Nature Power';
        desc.attackerAbility = 'Prankster';
        break;
      }
      switch (field.terrain) {
        case 'Electric':
        case 'Faraday Cage':
          basePower = 90;
          desc.moveName = 'Thunderbolt';
          break;
        case 'Grassy':
          basePower = 90;
          desc.moveName = 'Energy Ball';
          break;
        case 'Misty':
          basePower = 95;
          desc.moveName = 'Moonblast';
          break;
        case 'Psychic':
        case 'Dream World':
          // Nature Power does not affect grounded Pokemon if it is affected by
          // Prankster and there is Psychic Terrain active
          if (attacker.hasAbility('Prankster') && isGrounded(defender, field) || field.terrain !== 'Dream World') {
            basePower = 0;
            desc.attackerAbility = 'Prankster';
          } else {
            basePower = 90;
            desc.moveName = 'Psychic';
          }
          break;
        case 'Dragonic Soul':
          basePower = 85;
          desc.moveName = 'Dragon Pulse';
          move.secondaries = false;
          break;
        case 'Terror Realm':
          basePower = 80;
          desc.moveName = 'Dark Pulse';
          break;
        case 'Frozen Kingdom':
          basePower = 90;
          desc.moveName = 'Ice Beam';
          break;
        default:
          basePower = 80;
          desc.moveName = 'Tri Attack';
      }
      break;
    case 'Water Shuriken':
      basePower = attacker.named('Greninja-Ace') ? 20 : 15;
      desc.moveBP = basePower;
      break;
    // Triple moves damage increases after each consecutive hit (20, 40, 60)
    case 'Triple Dig':
    case 'Triple Dive':
    case 'Triple Kick':
    case 'Triple Axel':
      basePower = hit * 20;
      desc.moveBP = move.hits === 2 ? 60 : move.hits === 3 ? 120 : 20;
      break;
    case 'Crush Grip':
    case 'Wring Out':
      basePower = 100 * Math.floor((defender.curHP() * 4096) / defender.maxHP());
      basePower = Math.floor(Math.floor((120 * basePower + 2048 - 1) / 4096) / 100) || 1;
      desc.moveBP = basePower;
      break;
    case 'Hard Press':
      basePower = 100 * Math.floor((defender.curHP() * 4096) / defender.maxHP());
      basePower = Math.floor(Math.floor((100 * basePower + 2048 - 1) / 4096) / 100) || 1;
      desc.moveBP = basePower;
      break;
    case 'Tera Blast':
      basePower = attacker.teraType === 'Stellar' ? 100 : 80;
      desc.moveBP = basePower;
      break;
    case 'Justified Blow':
      basePower = Math.min(105, Math.max(5, Math.round((attacker.lightAura - attacker.darkAura) * 2.1)));
      if (attacker.alignment === 'Shiny') basePower *= 1.5;
      desc.moveBP = basePower;
      break;
    case 'Ill Intent':
      basePower = Math.min(105, Math.max(5, Math.round((attacker.darkAura - attacker.lightAura) * 2.1)));
      if (attacker.alignment === 'Shadow') basePower *= 1.5;
      desc.moveBP = basePower;
      break;
    case 'Unbiased Assault':
      if (attacker.lightAura === attacker.darkAura) {
        basePower = Math.min(105, Math.max(5, Math.round((attacker.lightAura + attacker.darkAura) * 1.75)));
        if (attacker.alignment === 'Neutral') basePower *= 1.5;
      } else {
        basePower = 0;
      }
      desc.moveBP = basePower;
      break;
    case 'Facade':
    case 'Brilliant Bravado':
      if (attacker.hasStatus('brn', 'par', 'psn', 'tox', 'fbt')) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Armageddon':
      if (defender.hasStatus('brn')) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Ragnarok':
      if (defender.hasStatus('par')) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Hydro Steam':
      if (field.weather === 'Sun') {
        basePower *= 3; //essentials moment
        desc.weather = field.weather;
      }
      break;
    case 'Grav Apple':
    case 'Singularity':
    case 'Graviton Hammer':
    case 'Gravity Flux':
      if (field.isGravity) {
        basePower *= 1.5;
        desc.moveBP = basePower;
      }
      break;
    case 'Behemoth Bash':
    case 'Behemoth Blade':
    case 'Dynamax Cannon':
    case 'Origin Pulse [M]':
      if (defender.isDynamaxed) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Mirage Cutter':
      if (field.weather) {
        switch (field.weather) {
          case 'Sun':
          case 'Harsh Sunshine':
            basePower *= 2.4;
            break;
          case 'Rain':
          case 'Heavy Rain':
          case 'Harsh Typhoon':
            basePower *= 0.8;
            break;
          default:
            basePower *= 1.2;
        }
        desc.weather = field.weather;
      }
      if (attacker.named('Greninja-Venturing')) {
        basePower /= 2;
        move.hits = 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Knock Off':
      const item = gen.items.get(toID(defender.item))!;
      let resistedKnockOffDamage = (
        (!defender.item || isQPActive(defender, field)) ||
        (!!item.megaEvolves && defender.name.includes(item.megaEvolves)) ||
        (defender.named('Dialga-Origin') && defender.hasItem('Adamant Crystal')) ||
        (defender.named('Palkia-Origin') && defender.hasItem('Lustrous Globe')) ||
        // Griseous Core for gen 9, Griseous Orb otherwise
        (defender.name.includes('Giratina-Origin') && defender.item.includes('Griseous')) ||
        (defender.name.includes('Arceus') && defender.item.includes('Plate')) ||
        (defender.name.includes('Genesect') && defender.item.includes('Drive')) ||
        (defender.named('Groudon', 'Groudon-Primal') && defender.hasItem('Red Orb')) ||
        (defender.named('Kyogre', 'Kyogre-Primal') && defender.hasItem('Blue Orb')) ||
        (defender.name.includes('Silvally') && defender.item.includes('Memory')) ||
        defender.item.includes(' Z') ||
        (defender.named('Zacian') && defender.hasItem('Rusted Sword')) ||
        (defender.named('Zamazenta') && defender.hasItem('Rusted Shield')) ||
        (defender.name.includes('Ogerpon-Cornerstone') && defender.hasItem('Cornerstone Mask')) ||
        (defender.name.includes('Ogerpon-Hearthflame') && defender.hasItem('Hearthflame Mask')) ||
        (defender.name.includes('Ogerpon-Wellspring') && defender.hasItem('Wellspring Mask')) ||
        (defender.named('Venomicon-Epilogue') && defender.hasItem('Vile Vial'))
      );
      if (!resistedKnockOffDamage) {
        basePower = Math.round(basePower * 1.5);
        desc.moveBP = basePower;
      }
      break;
    case 'Brine':
      if (defender.curHP() <= defender.maxHP() / 2) {
        basePower *= 2;
        desc.moveBP = basePower;
      }
      break;
    case 'Expanding Force':
      if (isGrounded(attacker, field) && field.hasTerrain('Psychic')) {
        move.target = 'allAdjacentFoes';
        basePower *= 1.5;
        desc.moveBP = basePower;
      }
      break;
    case 'Misty Explosion':
      if (isGrounded(attacker, field) && field.hasTerrain('Misty')) {
        basePower *= 1.5;
        desc.moveBP = basePower;
      }
      break;
    case 'Collision Course':
    case 'Electro Drift':
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
      ) : 1;
      if (type1Effectiveness * type2Effectiveness >= 2) {
        basePower *= 1.3; //essentials moment
        desc.moveBP = basePower;
      }
      break;
    case 'Bulldoze':
      if (field.hasTerrain('Grassy')) {
        basePower = Math.round(basePower * 0.5);
        desc.terrain = field.terrain;
      }
  }
  
  if (basePower === 0) {
    return 0;
  }
  
  if (move.named(
    'Breakneck Blitz', 'Bloom Doom', 'Inferno Overdrive', 'Hydro Vortex', 'Gigavolt Havoc',
    'Subzero Slammer', 'Supersonic Skystrike', 'Savage Spin-Out', 'Acid Downpour', 'Tectonic Rage',
    'Continental Crush', 'All-Out Pummeling', 'Shattered Psyche', 'Never-Ending Nightmare',
    'Devastating Drake', 'Black Hole Eclipse', 'Corkscrew Crash', 'Twinkle Tackle'
  ) || move.isMax) {
    // show z-move power in description
    desc.moveBP = move.bp;
  }
  
  const bpMod = calculateBPModsPathways(
    gen,
    attacker,
    defender,
    move,
    field,
    desc,
    basePower,
    hasAteAbilityTypeChange,
    turnOrder
  );
  
  return Math.max(Math.round(basePower * bpMod), 1);
}

export function calculateBPModsPathways(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  desc: RawDesc,
  basePower: number,
  hasAteAbilityTypeChange: boolean,
  turnOrder: string
) {
  let bpMod = 1;

  //pbBaseDamageMultiplier (Essentials is dumb)
  if (move.named('Solar Beam', 'Solar Blade') && field.weather && !field.hasWeather('Sun', 'Harsh Sunshine')) {
    bpMod *= 0.5;
    desc.weather = field.weather;
  } else if (move.named('Acrobatics') && (attacker.hasItem('Flying Gem') || !attacker.item || isQPActive(attacker, field))) {
    bpMod *= 2;
    desc.moveBP = basePower * 2;
  }

  if (field.attackerSide.isCharge && move.hasType('Electric')) {
    bpMod *= 2;
    desc.isCharge = true;
  }
  if (field.attackerSide.isHelpingHand) {
    bpMod *= 1.5;
    desc.isHelpingHand = true;
  }

  // Field effects
  if (isGrounded(attacker, field) && (
    (field.hasTerrain('Electric') && move.hasType('Electric')) ||
    (field.hasTerrain('Grassy') && move.hasType('Grass')) ||
    (field.hasTerrain('Psychic') && move.hasType('Psychic'))
  )) {
    bpMod *= 1.3;
    desc.terrain = field.terrain;
  } else if (
    (field.hasTerrain('Dragonic Soul') && move.hasType('Dragon')) ||
    (field.hasTerrain('Terror Realm') && move.hasType('Ghost', 'Dark')) ||
    (field.hasTerrain('Faraday Cage') && move.hasType('Electric')) ||
    (field.hasTerrain('Frozen Kingdom') && move.hasType('Ice'))
  ) {
    bpMod *= 1.5;
    desc.terrain = field.terrain;
  } else if (field.hasTerrain('Dream World') && defender.hasType('Psychic', 'Normal')) {
    bpMod *= 0.75;
    desc.terrain = field.terrain;
  } else if (isGrounded(defender, field) && field.hasTerrain('Misty') && move.hasType('Dragon')) {
    bpMod *= 0.5;
    desc.terrain = field.terrain;
  }

  // Abilities
  // Use BasePower after moves with custom BP to determine if Technician should boost
  //attacker ability
  if (
    (attacker.hasAbility('Stakeout') && attacker.abilityOn) ||
    (attacker.hasAbility('Water Bubble', 'Hydrochasm Surge++') && move.hasType('Water')) ||
    (attacker.hasAbility('Killing Joke2') && field.hasTerrain('Psychic')) ||
    attacker.hasAbility('Sword of Damocles', 'Legendary Aura') ||
    (attacker.hasAbility('Requiem Di Diavolo') && move.flags.sound)
  ) {
    bpMod *= 2;
    desc.attackerAbility = attacker.ability;
  } else if (
    (attacker.hasAbility('Technician') && basePower <= 60) ||
    (attacker.hasAbility('Flare Boost') && attacker.hasStatus('brn') && move.category === 'Special') ||
    (attacker.hasAbility('Toxic Boost') && attacker.hasStatus('psn', 'tox') && move.category === 'Physical') ||
    (attacker.hasAbility('Mega Launcher') && move.flags.pulse) ||
    (attacker.hasAbility('Strong Jaw') && move.flags.bite) ||
    (attacker.hasAbility('Steely Spirit') && move.hasType('Steel')) ||
    (attacker.hasAbility('Sharpness') && move.flags.slicing) ||
    (attacker.hasAbility('Demolition Expert') && move.flags.bullet) ||
    (attacker.hasAbility('Gorilla Tactics', 'Bull Rush') && move.category === 'Physical' && !move.isZ && !move.isMax) ||
    (attacker.hasAbility('Screamer') && move.flags.sound) ||
    (attacker.hasAbility('Dragon\'s Maw') && move.hasType('Dragon')) ||
    (attacker.hasAbility('Transistor') && move.hasType('Electric')) ||
    (attacker.hasAbility('Iron Fist', 'Distortion', 'Lightning Speed') && move.flags.punch) ||
    (attacker.hasAbility('Beary Broken', 'Abyssal Veil', 'Abyssal Veil ++')) ||
    (attacker.hasAbility('Dragon DNA') && !attacker.hasType('Dragon') && move.hasType('Dragon')) ||
    (attacker.hasAbility('Sharpshooter') && move.flags.shot) ||
    (attacker.hasAbility('Blademaster') && move.flags.blade) ||
    (attacker.hasAbility('Dirty Deeds') && move.hasType('Dark')) ||
    (attacker.hasAbility('Clean Heart') && move.hasType('Fairy')) ||
    (attacker.hasAbility('Iron Heel') && move.flags.kicking) ||
    (attacker.hasAbility('Steelworker') && move.hasType('Steel')) ||
    (attacker.hasAbility('Rocky Payload') && move.hasType('Rock')) ||
    (attacker.hasAbility('Angel Tears') && move.hasType('Water', 'Fairy'))
  ) {
    bpMod *= 1.5;
    desc.attackerAbility = attacker.ability;
  } else if (
    (attacker.hasAbility('Ya Estas Cocinado') && move.flags.contact)
  ) {
    bpMod *= 4 / 3;
    desc.attackerAbility = attacker.ability;
  } else if (
    (attacker.hasAbility('Dreadful') && defender.status) ||
    (attacker.hasAbility('Divine Mandate', 'Hydrochasm Surge', 'Hydrochasm Surge++') && move.hasType('Flying', 'Fairy')) ||
    (attacker.hasAbility('Neurotoxicity') && move.hasType('Electric', 'Poison')) ||
    (attacker.hasAbility('Analytic') && (turnOrder !== 'first' || field.defenderSide.isSwitching === 'out')) ||
    (attacker.hasAbility('Sheer Force') && move.secondaries && !move.isMax) ||
    (attacker.hasAbility('Sand Force', 'Desert Devil') && field.hasWeather('Sand', 'Raging Sandstorm') && move.hasType('Rock', 'Ground', 'Steel')) ||
    (attacker.hasAbility('Forest Spirits') && move.hasType('Grass', 'Fairy')) ||
    (attacker.hasAbility('Primal Fury') && move.hasType('Bug', 'Flying')) ||
    (attacker.hasAbility('Tough Claws') && move.flags.contact) ||
    (attacker.hasAbility('Punk Rock') && move.flags.sound)
  ) {
    bpMod *= 1.3;
    desc.attackerAbility = attacker.ability;
  } else if (
    (attacker.hasAbility('Ambusher') && attacker.abilityOn) ||
    (attacker.hasAbility('First Blood') && defender.curHP() >= defender.maxHP() * 0.75) ||
    (attacker.hasAbility('Stealth Bomber') && move.flags.bullet) ||
    (attacker.hasAbility('Rivalry') && attacker.gender !== 'N' && attacker.gender === defender.gender)
  ) {
    bpMod *= 1.25;
    desc.attackerAbility = attacker.ability;
  } else if (
    (!move.isMax && hasAteAbilityTypeChange) ||
    (attacker.hasAbility('Reckless') && (move.recoil || move.hasCrashDamage))
  ) {
    bpMod *= 1.2;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Rivalry') && ![attacker.gender, defender.gender].includes('N') && attacker.gender !== defender.gender) {
    bpMod *= 0.75;
    desc.attackerAbility = attacker.ability;
  } else if (attacker.hasAbility('Parental Bond (Child)')) {
    bpMod *= 0.25;
  }
  if (attacker.hasAbility('Hydrochasm Surge') && attacker.named('Swampert-Stalking-Tide') && move.category === 'Special') {
    bpMod *= 1.3; //hydrochasm double up, IR ability uses atmods fsr
    desc.attackerAbility = attacker.ability;
  }
  
  //defender ability
  if (defender.hasAbility('Dry Skin') && move.hasType('Fire')) {
    bpMod *= 1.25;
    desc.defenderAbility = defender.ability;
  } else if (
    (defender.hasAbility('Awakening') && move.hasType('Rock', 'Ice', 'Steel', 'Dragon', 'Electric')) ||
    (defender.hasAbility('Heatproof') && move.hasType('Fire')) ||
    (defender.hasAbility('Ferrite Scales') && move.hasType('Rock', 'Ice')) ||
    (defender.hasAbility('Thick Fat') && move.hasType('Fire', 'Ice')) ||
    (defender.hasAbility('Druidcraft') && move.hasType('Bug', 'Ice', 'Flying')) ||
    (defender.hasAbility('Purifying Salt') && move.hasType('Ghost')) ||
    (defender.hasAbility('Burn Out2') && move.hasType('Ice')) ||
    (defender.hasAbility('Sinful Gluttony') && move.hasType('Dragon', 'Fairy'))
  ) {
    bpMod *= 0.5;
    desc.defenderAbility = defender.ability;
  }
  //aura abilities XYZ
  let abilities = [attacker, defender];
  if (
    (abilities.some(e => e.hasAbility('Fairy Aura')) && move.hasType('Fairy')) ||
    (abilities.some(e => e.hasAbility('Dark Aura')) && move.hasType('Dark'))
  ) {
    if (abilities.some(e => e.hasAbility('Aura Break'))) {
      bpMod *= 2 / 3;
      desc.defenderAbility = 'Aura Break';
    } else {
      bpMod *= 4 / 3;
      desc.attackerAbility = move.type + ' Aura';
    }
  }

  // Items
  //attacker item
  if (
    ((!move.isZ && !move.isMax) &&
     ((attacker.hasItem('Choice Band') && move.category === 'Physical') ||
      (attacker.hasItem('Choice Specs') && move.category === 'Special'))
    ) ||
    (attacker.hasItem('Sword and Boots') && move.flags.slicing)
  ) {
    bpMod *= 1.5;
    desc.attackerItem = attacker.item;
  } else if (attacker.hasItem(`${move.type} Gem`)) {
    bpMod *= 1.3;
    desc.attackerItem = attacker.item;
  } else if (
    ((attacker.hasItem('Adamant Orb') && attacker.name.includes('Dialga')) && move.hasType('Steel', 'Dragon')) ||
    ((attacker.hasItem('Lustrous Globe') && attacker.name.includes('Palkia')) && move.hasType('Water', 'Dragon')) ||
    ((attacker.hasItem('Griseous Orb') && attacker.name.includes('Giratina')) && move.hasType('Ghost', 'Dragon')) ||
    (attacker.item && move.hasType(getItemBoostType(attacker.item))) ||
    (attacker.name.includes('Ogerpon-Cornerstone') && attacker.hasItem('Cornerstone Mask')) ||
    (attacker.name.includes('Ogerpon-Hearthflame') && attacker.hasItem('Hearthflame Mask')) ||
    (attacker.name.includes('Ogerpon-Wellspring') && attacker.hasItem('Wellspring Mask')) ||
    (attacker.hasItem('Curious Bat') && move.flags.bashing) ||
    (attacker.hasItem('Katana') && move.flags.blade) ||
    (attacker.hasItem('Punching Glove') && move.flags.punch)
  ) {
    bpMod *= 1.2;
    desc.attackerItem = attacker.item;
  } else if (
    (attacker.hasItem('Muscle Band') && move.category === 'Physical') ||
    (attacker.hasItem('Wise Glasses') && move.category === 'Special')
  ) {
    bpMod *= 1.1;
    desc.attackerItem = attacker.item;
  } else if (attacker.hasItem('Aura Crystal')) {
    bpMod *= getAuraCrystalAtMod(attacker);
    desc.attackerItem = attacker.item;
  }
  //defender item
  if (defender.hasItem('Aura Crystal')) {
    bpMod *= getAuraCrystalDR(defender);
    desc.defenderItem = defender.item;
  }
  
  return bpMod;
}