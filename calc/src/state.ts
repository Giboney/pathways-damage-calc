import type * as I from './data/interface';

export namespace State {
  export interface Pokemon {
    name: I.SpeciesName;
    level?: number;
    ability?: I.AbilityName;
    abilityOn?: boolean;
    isDynamaxed?: boolean;
    dynamaxLevel?: number;
    isSaltCure?: boolean;
    alliesFainted?: number;
    boostedStat?: I.StatIDExceptHP | 'auto';
    item?: I.ItemName;
    gender?: I.GenderName;
    nature?: I.NatureName;
    ivs?: Partial<I.StatsTable>;
    evs?: Partial<I.StatsTable>;
    boosts?: Partial<I.StatsTable>;
    originalCurHP?: number;
    status?: I.StatusName | '';
    teraType?: I.TypeName;
    toxicCounter?: number;
    moves?: I.MoveName[];
    roleName?: I.RoleName;
    roleRank?: I.RoleRank;
    lightAura?: number;
    darkAura?: number;
    alignment?: I.Alignment;
    overrides?: Partial<I.Specie>;
  }

  export interface Move {
    name: I.MoveName;
    useZ?: boolean;
    useMax?: boolean;
    isCrit?: boolean;
    isStellarFirstUse?: boolean;
    hits?: number;
    timesUsed?: number;
    timesUsedWithMetronome?: number;
    overrides?: Partial<I.Move>;
  }

  export interface Field {
    gameType: I.GameType;
    weather?: I.Weather;
    terrain?: I.Terrain;
    isMagicRoom?: boolean;
    isWonderRoom?: boolean;
    isGravity?: boolean;
    isAuraBreak?: boolean;
    isFairyAura?: boolean;
    isDarkAura?: boolean;
    isBeadsOfRuin?: boolean;
    isSwordOfRuin?: boolean;
    isTabletsOfRuin?: boolean;
    isVesselOfRuin?: boolean;
    attackerSide: Side;
    defenderSide: Side;
  }

  export interface Side {
    spikes?: number;
    steelsurge?: boolean;
    vinelash?: boolean;
    wildfire?: boolean;
    cannonade?: boolean;
    volcalith?: boolean;
    isSR?: boolean;
    isReflect?: boolean;
    isLightScreen?: boolean;
    isProtected?: boolean;
    isSeeded?: boolean;
    isForesight?: boolean;
    isTailwind?: boolean;
    isHelpingHand?: boolean;
    isFlowerGift?: boolean;
    isFriendGuard?: boolean;
    isAuroraVeil?: boolean;
    isBattery?: boolean;
    isPowerSpot?: boolean;
    isSwitching?: 'out' | 'in';
    //my additions
    isCharge?: boolean;
    isMetalScraps?: boolean;
    stellarRocks?: number;
    isDrakeyDrake?: boolean;
    isColdTherapy?: boolean;
    isSaltCure?: boolean;
    isSpookySpook?: boolean;
    isMindflay?: boolean;
  }
}
