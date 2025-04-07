if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function (searchElement, fromIndex) { // eslint-disable-line no-extend-native
		var k;
		if (this == null) {
			throw new TypeError('"this" equals null or n is undefined');
		}
		var O = Object(this);
		var len = O.length >>> 0;
		if (len === 0) {
			return -1;
		}
		var n = +fromIndex || 0;
		if (Math.abs(n) === Infinity) {
			n = 0;
		}
		if (n >= len) {
			return -1;
		}
		k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
		while (k < len) {
			if (k in O && O[k] === searchElement) {
				return k;
			}
			k++;
		}
		return -1;
	};
}

function startsWith(string, target) {
	return (string || '').slice(0, target.length) === target;
}

function endsWith(string, target) {
	return (string || '').slice(-target.length) === target;
}

var LEGACY_STATS_RBY = ["hp", "at", "df", "sl", "sp"];
var LEGACY_STATS_GSC = ["hp", "at", "df", "sa", "sd", "sp"];
var LEGACY_STATS = [[], LEGACY_STATS_RBY, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC, LEGACY_STATS_GSC];
var HIDDEN_POWER_REGEX = /Hidden Power (\w*)/;

var CALC_STATUS = {
	'Healthy': '',
	'Paralyzed': 'par',
	'Poisoned': 'psn',
	'Badly Poisoned': 'tox',
	'Burned': 'brn',
	'Asleep': 'slp',
	'Frostbitten': 'fbt'
};

function legacyStatToStat(st) {
	switch (st) {
	case 'hp':
		return "hp";
	case 'at':
		return "atk";
	case 'df':
		return "def";
	case 'sa':
		return "spa";
	case 'sd':
		return "spd";
	case 'sp':
		return "spe";
	case 'sl':
		return "spc";
	}
}

// input field validation
var bounds = {
	"level": [0, 120],
	"base": [1, 255],
	"evs": [0, 252],
	"ivs": [0, 31],
	"dvs": [0, 15],
	"move-bp": [0, 65535]
};
for (var bounded in bounds) {
	attachValidation(bounded, bounds[bounded][0], bounds[bounded][1]);
}
function attachValidation(clazz, min, max) {
	$("." + clazz).keyup(function () {
		validate($(this), min, max);
	});
}
function validate(obj, min, max) {
	obj.val(Math.max(min, Math.min(max, ~~obj.val())));
}

$("input:radio[name='format']").change(function () {
	var gameType = $("input:radio[name='format']:checked").val();
	if (gameType === 'Singles') {
		$("input:checkbox[name='ruin']:checked").prop("checked", false);
	}
	$(".format-specific." + gameType.toLowerCase()).each(function () {
		if ($(this).hasClass("gen-specific") && !$(this).hasClass("g" + gen)) {
			return;
		}
		$(this).show();
	});
	$(".format-specific").not("." + gameType.toLowerCase()).hide();
});

var defaultLevel = 120;
$("input:radio[name='defaultLevel']").change(function () {
	defaultLevel = $("input:radio[name='defaultLevel']:checked").val();
	$("#levelL1").val(defaultLevel);
	$("#levelR1").val(defaultLevel);
	$("#levelL1").trigger("change");
	$("#levelR1").trigger("change");
});

// auto-calc stats and current HP on change
$(".level").bind("keyup change", function () {
	var poke = $(this).closest(".poke-info");
	calcHP(poke);
	calcStats(poke);
});
$(".nature").bind("keyup change", function () {
	calcStats($(this).closest(".poke-info"));
});
$(".hp .base, .hp .evs, .hp .ivs").bind("keyup change", function () {
	calcHP($(this).closest(".poke-info"));
});
$(".at .base, .at .evs, .at .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'at');
});
$(".df .base, .df .evs, .df .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'df');
});
$(".sa .base, .sa .evs, .sa .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'sa');
});
$(".sd .base, .sd .evs, .sd .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'sd');
});
$(".sp .base, .sp .evs, .sp .ivs").bind("keyup change", function () {
	calcStat($(this).closest(".poke-info"), 'sp');
});
$(".evs").bind('keyup change', function () {
	totalEVs($(this).closest(".poke-info"));
});
$(".sl .base").keyup(function () {
	calcStat($(this).closest(".poke-info"), 'sl');
});
$(".at .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'at');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".df .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'df');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".sa .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'sa');
	poke.find(".sd .dvs").val($(this).val());
	calcStat(poke, 'sd');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".sp .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'sp');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});
$(".sl .dvs").keyup(function () {
	var poke = $(this).closest(".poke-info");
	calcStat(poke, 'sl');
	poke.find(".hp .dvs").val(getHPDVs(poke));
	calcHP(poke);
});

function getForcedTeraType(pokemonName) {
	/*
	if (startsWith(pokemonName, "Ogerpon-Cornerstone")) {
		return "Rock";
	} else if (startsWith(pokemonName, "Ogerpon-Hearthflame")) {
		return "Fire";
	} else if (pokemonName === "Ogerpon" || startsWith(pokemonName, "Ogerpon-Teal")) {
		return "Grass";
	} else if (startsWith(pokemonName, "Ogerpon-Wellspring")) {
		return "Water";
	} else if (startsWith(pokemonName, "Terapagos")) {
		return "Stellar";
	}*/
	return null;
}

function getHPDVs(poke) {
	return (~~poke.find(".at .dvs").val() % 2) * 8 +
(~~poke.find(".df .dvs").val() % 2) * 4 +
(~~poke.find(".sp .dvs").val() % 2) * 2 +
(~~poke.find(gen === 1 ? ".sl .dvs" : ".sa .dvs").val() % 2);
}

function calcStats(poke) {
	for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
		calcStat(poke, LEGACY_STATS[gen][i]);
	}
}

function calcCurrentHP(poke, max, percent, skipDraw) {
	var current = Math.round(Number(percent) * Number(max) / 100);
	poke.find(".current-hp").val(current);
	if (!skipDraw) drawHealthBar(poke, max, current);
	return current;
}
function calcPercentHP(poke, max, current, skipDraw) {
	var percent = Math.round(100 * Number(current) / Number(max));
	if (percent === 0 && current > 0) {
		percent = 1;
	} else if (percent === 100 & current < max) {
		percent = 99;
	}

	poke.find(".percent-hp").val(percent);
	if (!skipDraw) drawHealthBar(poke, max, current);
	return percent;
}
function drawHealthBar(poke, max, current) {
	var fillPercent = 100 * current / max;
	var fillColor = fillPercent > 50 ? "green" : fillPercent > 20 ? "yellow" : "red";

	var healthbar = poke.find(".hpbar");
	healthbar.addClass("hp-" + fillColor);
	var unwantedColors = ["green", "yellow", "red"];
	unwantedColors.splice(unwantedColors.indexOf(fillColor), 1);
	for (var i = 0; i < unwantedColors.length; i++) {
		healthbar.removeClass("hp-" + unwantedColors[i]);
	}
	healthbar.css("background", "linear-gradient(to right, " + fillColor + " " + fillPercent + "%, white 0%");
}
// TODO: these HP inputs should really be input type=number with min=0, step=1, constrained by max=maxHP or 100
$(".current-hp").keyup(function () {
	var max = $(this).parent().children(".max-hp").text();
	validate($(this), 0, max);
	var current = $(this).val();
	calcPercentHP($(this).parent(), max, current);
});
$(".percent-hp").keyup(function () {
	var max = $(this).parent().children(".max-hp").text();
	validate($(this), 0, 100);
	var percent = $(this).val();
	calcCurrentHP($(this).parent(), max, percent);
});

$(".abilityToggle").on("change", function() {
	var pokeInfo = $(this).closest(".poke-info");
	var id = pokeInfo.attr('id');
	var oppoInfo = id === "p1" ? $("#p2") : $("#p1");
	if (storeBoosts['ability' + id]) {
		storeBoosts['ability' + id].apply();
		storeBoosts['ability' + id] = false;
	}
	if (storeBoosts['multiAbility' + id]) {
		storeBoosts['multiAbility' + id].apply();
		storeBoosts['multiAbility' + id] = false;
	}
	if ($(this).is(':checked')) {
		var ability = pokeInfo.find(".ability").val();
		switch (ability) {
			case "Intimidate":
				lowerStatStage(oppoInfo, 'at', 1, 'ability' + id, true);
				break;
			case 'Intrepid Sword':
				raiseStatStage(pokeInfo, 'at', 1, 'ability' + id);
				break;
			case 'Dauntless Shield':
				raiseStatStage(pokeInfo, 'df', 1, 'ability' + id);
				break;
			case "Mesmerize":
				lowerStatStage(oppoInfo, 'sa', 1, 'ability' + id, true);
				break;
			case "Ha Ha You\'re Weak":
				lowerStatStage(oppoInfo, 'at', 6, 'multiAbility' + id);
				lowerStatStage(oppoInfo, 'df', 6, 'multiAbility' + id);
				lowerStatStage(oppoInfo, 'sa', 6, 'multiAbility' + id);
				lowerStatStage(oppoInfo, 'sd', 6, 'multiAbility' + id);
				lowerStatStage(oppoInfo, 'sp', 6, 'multiAbility' + id);
				break;
		}
	}
	
});

var formChangeAbilities = [
	'Lightning Speed', 'Distortion', 'Killing Joke', 'Killing Joke2', 'Abyssal Veil', 'Abyssal Veil ++',
	'Requiem Di Diavolo', 'Crescendo', 'Darkness Boost', 'Darkness Boost2', 'Ya Estas Cocinado'
];

function getFormFromAbility(ability, name) {
	switch (ability) {
		case 'Ya Estas Cocinado':
			if (name.includes('Basculegion')) {
				return 'Basculegion-Iron-Muerte';
			}
			return name;
		case 'Lightning Speed':
		case 'Distortion':
			if (name.includes('Melmetal')) {
				return 'Melmetal-Plane';
			}
			return name;
		case 'Killing Joke':
		case 'Killing Joke2':
			if (name.includes('Gengar')) {
				return 'Gengar-Forsaken';
			}
			return name;
		case 'Abyssal Veil':
		case 'Abyssal Veil ++':
			if (name.includes('Zoroark')) {
				return 'Zoroark-Edgefox';
			}
			return name;
		case 'Requiem Di Diavolo':
			if (name.includes('Gliscor')) {
				return 'Gliscor-Devil-DJ';
			}
			return name;
		case 'Crescendo':
			if (name.includes('Whismur')) {
				return 'Whismur-Fluffy';
			}
			return name;
		case 'Darkness Boost':
		case 'Darkness Boost2':
			if (name.includes('Tyranitar')) {
				return 'Tyranitar-Dark';
			}
			return name;
		default:
			return name;
	}
}

function abilityChange(pokeInfo) {
	var ability = pokeInfo.find(".ability").val();
	var id = pokeInfo.attr('id');

	for (var i = 1; i <= 4; i++) {
		var moveSelector = ".move" + i;
		var moveHits = 3;

		var moveName = pokeInfo.find(moveSelector).find(".select2-chosen").text();
		var move = moves[moveName] || moves['(No Move)'];
		if (move.multiaccuracy) {
			moveHits = move.multihit;
		} else if (ability === 'Skill Link') {
			moveHits = 5;
		} else if (pokeInfo.find(".item").val() === 'Loaded Dice' || ability === 'Rapid Fire') {
			moveHits = 4;
		}
		pokeInfo.find(moveSelector).find(".move-hits").val(moveHits);
	}
	
	if (storeBoosts['ability' + id]) {
		storeBoosts['ability' + id].apply();
		storeBoosts['ability' + id] = false;
	}
	if (storeBoosts['multiAbility' + id]) {
		storeBoosts['multiAbility' + id].apply();
		storeBoosts['multiAbility' + id] = false;
	}
	switch (ability) {
		case 'Download':
			var oppoInfo = id === "p1" ? $("#p2") : $("#p1");
			var df = Number(oppoInfo.find(".df .total").text());
			var sd = Number(oppoInfo.find(".sd .total").text());
			if (sd > df) {
				raiseStatStage(pokeInfo, 'at', 1, 'ability' + id);
			} else {
				raiseStatStage(pokeInfo, 'sa', 1, 'ability' + id);
			}
			break;
		case 'Heavenly Shield':
			var oppoInfo = id === "p1" ? $("#p2") : $("#p1");
			var at = Number(oppoInfo.find(".at .total").text());
			var sa = Number(oppoInfo.find(".sa .total").text());
			if (at > sa) {
				raiseStatStage(pokeInfo, 'df', 1, 'ability' + id);
			} else {
				raiseStatStage(pokeInfo, 'sd', 1, 'ability' + id);
			}
			break;
		case 'Embody Aspect (Teal)':
			raiseStatStage(pokeInfo, 'sp', 1, 'ability' + id);
			break;
		case 'Embody Aspect (Cornerstone)':
			raiseStatStage(pokeInfo, 'df', 1, 'ability' + id);
			break;
		case 'Embody Aspect (Hearthflame)':
			raiseStatStage(pokeInfo, 'at', 1, 'ability' + id);
			break;
		case 'Embody Aspect (Wellspring)':
			raiseStatStage(pokeInfo, 'sd', 1, 'ability' + id);
			break;
		case 'Darkness Boost':
		case 'Darkness Boost2':
			raiseStatStage(pokeInfo, 'sp', 12, 'ability' + id);
			break;
		case 'Untouchable':
			raiseStatStage(pokeInfo, 'sp', 6, 'ability' + id);
			break;
		case 'Untouchable2':
			raiseStatStage(pokeInfo, 'sp', 2, 'ability' + id);
			break;
		case 'Hydrochasm Surge++':
			raiseStatStage(pokeInfo, 'df', 1, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sd', 1, 'multiAbility' + id);
			break;
		case 'X Pickup':
			raiseStatStage(pokeInfo, 'at', 6, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sp', 6, 'multiAbility' + id);
			break;
		case 'X Pickup2':
			raiseStatStage(pokeInfo, 'at', 3, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sp', 3, 'multiAbility' + id);
			break;
		case 'Power of Friendship':
			raiseStatStage(pokeInfo, 'sa', 2, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sp', 2, 'multiAbility' + id);
			break;
		case 'Showtime':
			raiseStatStage(pokeInfo, 'at', 6, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'df', 6, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sa', 6, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sd', 6, 'multiAbility' + id);
			raiseStatStage(pokeInfo, 'sp', 6, 'multiAbility' + id);
			break;
	}

	var TOGGLE_ABILITIES = ['Flash Fire', 'Intimidate', 'Minus', 'Plus', 'Slow Start', 'Unburden', 'Stakeout', 'Teraform Zero', 'Lighten', 'Mesmerize', 'Ha Ha You\'re Weak', 'Ambusher', 'Intrepid Sword', 'Dauntless Shield'];

	if (TOGGLE_ABILITIES.includes(ability)) {
		pokeInfo.find(".abilityToggle").show();
		pokeInfo.find(".abilityToggle").change();
	} else {
		pokeInfo.find(".abilityToggle").hide();
	}
	
	var boostedStat = pokeInfo.find(".boostedStat");
	if (["Quark Drive", "Ya Estas Cocinado", "Protosynthesis", "Aquamynthesis", "Spendthrift"].includes(ability)) {
		boostedStat.show();
	} else {
		boostedStat.val("");
		boostedStat.hide();
	}

	if (["Supreme Overlord", "Ya Estas Cocinado", "Stacked Odds"].includes(ability)) {
		pokeInfo.find(".alliesFainted").show();
	} else {
		pokeInfo.find(".alliesFainted").val('0');
		pokeInfo.find(".alliesFainted").hide();
	}
	
	if (ability === 'Gravity Surge') {
		$("#gravity").prop("checked", true);
	}
	
	//form change
	if (formChangeAbilities.includes(ability)) {
		var pokemonName = pokeInfo.find('.forme').parent().is(':visible') ? pokeInfo.find('.forme').val() : '';
		var newForm = getFormFromAbility(ability, pokemonName)
		if (newForm !== pokemonName) {
			pokeInfo.find('.forme').val(getFormFromAbility(ability, pokemonName));
			pokeInfo.find('.forme').change();
		}
	}
	
	if (ability === 'Golden Hour') {
		pokeInfo.find('.type2').val('Omnitype'); //technically essentials uses a 3rd tpye but fuck that
	}
}

$(".ability").bind("keyup change", function() {
	var pokeInfo = $(this).closest(".poke-info");
	var oppoInfo = pokeInfo.attr('id') === "p1" ? $("#p2") : $("#p1");
	//reset weather and terrain before ability check if not set manually
	if (!lastManualWeather) {
		autosetWeather("None", 0);
	}
	if (!lastManualTerrain) {
		autosetTerrain("None", 0);
	}
	abilityChange(pokeInfo);
	abilityChange(oppoInfo);
	
	//get weather and terrain oppo first so this poke overrides
	//then check QP after weather and terrain check
	autosetWeather(oppoInfo.find(".ability").val(), 0);
	autosetTerrain(oppoInfo.find(".ability").val(), 0);
	autosetWeather(pokeInfo.find(".ability").val(), 0);
	autosetTerrain(pokeInfo.find(".ability").val(), 0);
	autosetQP(pokeInfo);
	autosetQP(oppoInfo);
});

function autosetQP(pokemon) {
	var currentWeather = $("input:radio[name='weather']:checked").val();
	var currentTerrain = $("input:checkbox[name='terrain']:checked").val() || "No terrain";

	var item = pokemon.find(".item").val();
	var ability = pokemon.find(".ability").val();
	var boostedStat = pokemon.find(".boostedStat").val();

	if (!boostedStat || boostedStat === "auto") {
		if (
			(item === "Booster Energy" && ["Quark Drive", "Ya Estas Cocinado", "Protosynthesis", "Aquamynthesis"].includes(ability)) ||
			(ability === "Protosynthesis" && ["Sun", "Harsh Sunshine"].includes(currentWeather)) ||
			(["Quark Drive", "Ya Estas Cocinado"].includes(ability) && ["Electric", "Faraday Cage"].includes(currentTerrain)) ||
			(ability === "Aquamynthesis" && ["Rain", "Heavy Rain", "Harsh Typhoon"].includes(currentWeather)) ||
			(ability === "Spendthrift" && item === "Big Nugget")
		) {
			pokemon.find(".boostedStat").val("auto");
		} else {
			pokemon.find(".boostedStat").val("");
		}
	}
}

$("input[name='weather']").change(function () {
	var allPokemon = $('.poke-info');
	allPokemon.each(function () {
		autosetQP($(this));
	});
	
	var weather = $("input:radio[name='weather']:checked").val();
	var terrain = $("input:checkbox[name='terrain']:checked").val();
	if (terrain === "Frozen Kingdom" && weather !== "Snow") {
		autosetTerrain("None", 0);
	}
	
	lastManualWeather = weather;
});

var lastManualWeather = "";
var lastAutoWeather = ["", ""];
function autosetWeather(ability, i) {
	if ($('.locked-weather').length) {
		return;
	}
	var currentWeather = $("input:radio[name='weather']:checked").val();
	if (lastAutoWeather.indexOf(currentWeather) === -1) {
		lastAutoWeather[1 - i] = "";
	}
	switch (ability) {
		case "None":
			lastAutoWeather[i] = "";
			$("#clear").prop("checked", true);
			break;
		case "Drought":
		case "Orichalcum Pulse":
		case "Khepri":
			lastAutoWeather[i] = "Sun";
			$("#sun").prop("checked", true);
			break;
		case "Drizzle":
		case "Healing Droplets":
		case "Healing Droplets++":
			lastAutoWeather[i] = "Rain";
			$("#rain").prop("checked", true);
			break;
		case "Swarm Shell":
		case "Swarm Shell2":
		case "Sand Stream":
			lastAutoWeather[i] = "Sand";
			$("#sand").prop("checked", true);
			break;
		case "Snow Warning":
		case "Frozen Kingdom":
			if (gen >= 9) {
				lastAutoWeather[i] = "Snow";
				$("#snow").prop("checked", true);
			} else {
				lastAutoWeather[i] = "Hail";
				$("#hail").prop("checked", true);
			}
			break;
		case "Desolate Land":
			lastAutoWeather[i] = "Harsh Sunshine";
			$("#harsh-sunshine").prop("checked", true);
			break;
		case "Primordial Sea":
			lastAutoWeather[i] = "Heavy Rain";
			$("#heavy-rain").prop("checked", true);
			break;
		case "Delta Stream":
		case "Dragon Fear":
			lastAutoWeather[i] = "Strong Winds";
			$("#strong-winds").prop("checked", true);
			break;
		case "Hydrochasm Surge":
		case "Hydrochasm Surge++":
			lastAutoWeather[i] = "Harsh Typhoon";
			$("#harsh-typhoon").prop("checked", true);
			break;
		case "Frozen Tundra":
			lastAutoWeather[i] = "Violent Blizzard";
			$("#violent-blizzard").prop("checked", true);
			break;
		case "Barren Desert":
			lastAutoWeather[i] = "Raging Sandstorm";
			$("#raging-sandstorm").prop("checked", true);
			break;
	}
	var terrain = $("input:checkbox[name='terrain']:checked").val();
	var weather = $("input:radio[name='weather']:checked").val();
	if (terrain === "Frozen Kingdom" && weather !== "Snow") {
		autosetTerrain("None", 0);
	}
	if (currentWeather !== weather) {
		lastManualWeather = false;
	}
}

$("input[name='terrain']").change(function () {
	var allPokemon = $('.poke-info');
	allPokemon.each(function () {
		autosetQP($(this));
	});
	lastManualTerrain = $("input:checkbox[name='terrain']:checked").val();
});

var lastManualTerrain = "";
var lastAutoTerrain = ["", ""];
function autosetTerrain(ability, i) {
	var currentTerrain = $("input:checkbox[name='terrain']:checked").val() || "No terrain";
	lastManualTerrain = false;
	if (lastAutoTerrain.indexOf(currentTerrain) === -1) {
		lastAutoTerrain[1 - i] = "";
	}
	var lastTerrain = $("input:checkbox[name='terrain']:checked");
	// terrain input uses checkbox instead of radio, need to uncheck all first
	if (ability !== 'Frozen Kingdom' || !$("input:radio[name='weather']:checked").is('.locked-weather') || weather === 'Snow') {
		$("input:checkbox[name='terrain']:checked").prop("checked", false);
	
		switch (ability) {
			case "None":
				lastAutoTerrain[i] = "";
				break;
			case "Electric Surge":
			case "Lightning Speed":
			case "Hadron Engine":
				lastAutoTerrain[i] = "Electric";
				$("#electric").prop("checked", true);
				break;
			case "Grassy Surge":
			case "Healing Droplets":
			case "Healing Droplets++":
				lastAutoTerrain[i] = "Grassy";
				$("#grassy").prop("checked", true);
				break;
			case "Misty Surge":
				lastAutoTerrain[i] = "Misty";
				$("#misty").prop("checked", true);
				break;
			case "Psychic Surge":
			case "Killing Joke2":
				lastAutoTerrain[i] = "Psychic";
				$("#psychic").prop("checked", true);
				break;
			case "Draconic Soul":
				lastAutoTerrain[i] = "Dragonic Soul";
				$("#dragonic-soul").prop("checked", true);
				break;
			case "Terror Realm":
				lastAutoTerrain[i] = "Terror Realm";
				$("#terror-realm").prop("checked", true);
				break;
			case "Dream World":
				lastAutoTerrain[i] = "Dream World";
				$("#dream-world").prop("checked", true);
				break;
			case "Faraday Cage":
				lastAutoTerrain[i] = "Faraday Cage";
				$("#faraday-cage").prop("checked", true);
				break;
			case "Frozen Kingdom":
				lastAutoTerrain[i] = "Frozen Kingdom";
				$("#frozen-kingdom").prop("checked", true);
				break;
			default:
				//if ability did not change terrain, recheck previous terrain and keep manual terrain
				lastTerrain.prop("checked", true);
				lastManualTerrain = lastTerrain.val();
		}
		var weather = $("input:radio[name='weather']:checked").val();
		var terrain = $("input:checkbox[name='terrain']:checked").val();
		if (currentTerrain === "Frozen Kingdom" && terrain !== "Frozen Kingdom" && weather === 'Snow') {
			autosetWeather("None", 0);
		}
	}
}

$(".item").bind("keyup change", function () {
	autosetStatus("#" + $(this).closest(".poke-info").attr('id'), $(this).val());
});

var lastManualStatus = {"#p1": "Healthy"};
var lastAutoStatus = {"#p1": "Healthy"};
function autosetStatus(p, item) {
	var currentStatus = $(p + " .status").val();
	if (currentStatus !== lastAutoStatus[p]) {
		lastManualStatus[p] = currentStatus;
	}
	if (item === "Flame Orb") {
		lastAutoStatus[p] = "Burned";
		$(p + " .status").val("Burned");
		$(p + " .status").change();
	} else if (item === "Toxic Orb") {
		lastAutoStatus[p] = "Badly Poisoned";
		$(p + " .status").val("Badly Poisoned");
		$(p + " .status").change();
	} else if (item === "Frost Orb") {
		lastAutoStatus[p] = "Frostbitten";
		$(p + " .status").val("Frostbitten");
		$(p + " .status").change();
	} else {
		lastAutoStatus[p] = "Healthy";
		if (currentStatus !== lastManualStatus[p]) {
			$(p + " .status").val(lastManualStatus[p]);
			$(p + " .status").change();
		}
	}
}

$(".status").bind("keyup change", function () {
	if ($(this).val() === 'Badly Poisoned') {
		$(this).parent().children(".toxic-counter").show();
	} else {
		$(this).parent().children(".toxic-counter").hide();
	}
});

$(".teraType").change(function () {
	var pokeObj = $(this).closest(".poke-info");
	var checked = pokeObj.find(".teraToggle").prop("checked");
	stellarButtonsVisibility(pokeObj, $(this).val() === "Stellar" && checked);
});

$(".role").change(function () {
	var roleName = $(this).val();
	var pokeObj = $(this).closest(".poke-info");

	if (roleName !== 'None') {
		pokeObj.find(".rank").show();
	} else {
		pokeObj.find(".rank").hide();
	}
})

var lockerMove = "";
// auto-update move details on select
$(".move-selector").change(function () {
	var moveName = $(this).val();
	var move = moves[moveName] || moves['(No Move)'];
	var moveGroupObj = $(this).parent();
	moveGroupObj.children(".move-bp").val(moveName === 'Present' ? 40 : move.bp);
	var m = moveName.match(HIDDEN_POWER_REGEX);
	if (m) {
		var pokeObj = $(this).closest(".poke-info");
		var pokemon = createPokemon(pokeObj);
		var actual = calc.Stats.getHiddenPower(GENERATION, pokemon.ivs);
		if (actual.type !== m[1]) {
			var hpIVs = calc.Stats.getHiddenPowerIVs(GENERATION, m[1]);
			if (hpIVs && gen < 7) {
				for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
					var legacyStat = LEGACY_STATS[gen][i];
					var stat = legacyStatToStat(legacyStat);
					pokeObj.find("." + legacyStat + " .ivs").val(hpIVs[stat] !== undefined ? hpIVs[stat] : 31);
					pokeObj.find("." + legacyStat + " .dvs").val(hpIVs[stat] !== undefined ? calc.Stats.IVToDV(hpIVs[stat]) : 15);
				}
				if (gen < 3) {
					var hpDV = calc.Stats.getHPDV({
						atk: pokeObj.find(".at .ivs").val(),
						def: pokeObj.find(".df .ivs").val(),
						spe: pokeObj.find(".sp .ivs").val(),
						spc: pokeObj.find(".sa .ivs").val()
					});
					pokeObj.find(".hp .ivs").val(calc.Stats.DVToIV(hpDV));
					pokeObj.find(".hp .dvs").val(hpDV);
				}
				pokeObj.change();
				moveGroupObj.children(".move-bp").val(gen >= 6 ? 60 : 70);
			}
		} else {
			moveGroupObj.children(".move-bp").val(actual.power);
		}
	} else if (gen >= 2 && gen <= 6 && HIDDEN_POWER_REGEX.test($(this).attr('data-prev'))) {
		// If this selector was previously Hidden Power but now isn't, reset all IVs/DVs to max.
		var pokeObj = $(this).closest(".poke-info");
		for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
			var legacyStat = LEGACY_STATS[gen][i];
			pokeObj.find("." + legacyStat + " .ivs").val(31);
			pokeObj.find("." + legacyStat + " .dvs").val(15);
		}
	}
	$(this).attr('data-prev', moveName);
	moveGroupObj.children(".move-type").val(move.type);
	moveGroupObj.children(".move-cat").val(move.category);
	moveGroupObj.children(".move-crit").prop("checked", move.willCrit === true);

	var stat = move.category === 'Special' ? 'spa' : 'atk';
	var dropsStats =
		move.self && move.self.boosts && move.self.boosts[stat] && move.self.boosts[stat] < 0;
	if (Array.isArray(move.multihit) || (!isNaN(move.multihit) && move.multiaccuracy)) {
		moveGroupObj.children(".stat-drops").hide();
		moveGroupObj.children(".move-hits").empty();
		if (!isNaN(move.multihit)) {
			for (var i = 1; i <= move.multihit; i++) {
				moveGroupObj.children(".move-hits").append("<option value=" + i + ">" + i + " hits</option>");
			}
		} else {
			for (var i = 1; i <= move.multihit[1]; i++) {
				moveGroupObj.children(".move-hits").append("<option value=" + i + ">" + i + " hits</option>");
			}
		}
		moveGroupObj.children(".move-hits").show();
		var pokemon = $(this).closest(".poke-info");

		var moveHits = 3;
		if (move.multiaccuracy) {
			moveHits = move.multihit;
		} else if (pokemon.find('.ability').val() === 'Skill Link') {
			moveHits = 5;
		} else if (pokemon.find(".item").val() === 'Loaded Dice' || ability === 'Rapid Fire') {
			moveHits = 4;
		}

		moveGroupObj.children(".move-hits").val(moveHits);
	} else if (dropsStats) {
		moveGroupObj.children(".move-hits").hide();
		moveGroupObj.children(".stat-drops").show();
	} else {
		moveGroupObj.children(".move-hits").hide();
		moveGroupObj.children(".stat-drops").hide();
	}
	moveGroupObj.children(".move-z").prop("checked", false);
});

function checkBoostItem(pokeInfo) {
	var itemName = pokeInfo.find(".item").val();
	var id = pokeInfo.attr('id');
	if (storeBoosts['selfItem' + id]) {
		storeBoosts['selfItem' + id].apply();
		storeBoosts['selfItem' + id] = false;
	}
	if (itemName.includes('Seed')) {
		var terrain = $("input:checkbox[name='terrain']:checked").val();
		var seed = itemName.split(' ', 1)[0];
		if (terrain === seed || (seed === "Electric" && terrain === "Faraday Cage")) {
			switch (seed) {
				case "Grassy":
				case "Electric":
					raiseStatStage(pokeInfo, 'df', 1, 'selfItem' + id);
					break;
				case "Misty":
				case "Psychic":
					raiseStatStage(pokeInfo, 'sd', 1, 'selfItem' + id);
			}
		}
	}
}

$(".item").change(function () {
	var itemName = $(this).val();
	var pokeInfo = $(this).closest('.poke-info');
	var $metronomeControl = pokeInfo.find('.metronome');
	if (itemName === "Metronome") {
		$metronomeControl.show();
	} else {
		$metronomeControl.hide();
	}

	for (var i = 1; i <= 4; i++) {
		var moveSelector = ".move" + i;
		var moveHits = 3;

		var moveName = pokeInfo.find(moveSelector).find(".select2-chosen").text();
		var move = moves[moveName] || moves['(No Move)'];
		if (move.multiaccuracy) {
			moveHits = move.multihit;
		} else if (pokeInfo.find(".ability").val() === 'Skill Link') {
			moveHits = 5;
		} else if (pokeInfo.find(".item").val() === 'Loaded Dice' || ability === 'Rapid Fire') {
			moveHits = 4;
		}
		pokeInfo.find(moveSelector).find(".move-hits").val(moveHits);
	}
	
	checkBoostItem(pokeInfo);
	
	pokeInfo.find(".ability").change();//in case item change affects ability effects
});

function smogonAnalysis(pokemonName) {
	var generation = ["rb", "gs", "rs", "dp", "bw", "xy", "sm", "ss", "sv"][gen - 1];
	return "https://smogon.com/dex/" + generation + "/pokemon/" + pokemonName.toLowerCase() + "/";
}

// auto-update set details on select
$(".set-selector").change(function () {
	var fullSetName = $(this).val();
	var pokemonName = fullSetName.substring(0, fullSetName.indexOf(" ("));
	var setName = fullSetName.substring(fullSetName.indexOf("(") + 1, fullSetName.lastIndexOf(")"));
	var pokemon = pokedex[pokemonName];
	if (pokemon) {
		var pokeObj = $(this).closest(".poke-info");
		var isAutoTera = false;
		if (stickyMoves.getSelectedSide() === pokeObj.prop("id")) {
			stickyMoves.clearStickyMove();
		}
		pokeObj.find(".teraToggle").prop("checked", isAutoTera);
		pokeObj.find(".max").prop("checked", false);
		stellarButtonsVisibility(pokeObj, 0);
		pokeObj.find(".boostedStat").val("");
		pokeObj.find(".analysis").attr("href", smogonAnalysis(pokemonName));
		pokeObj.find(".type1").val(pokemon.types[0]);
		pokeObj.find(".type2").val(pokemon.types[1]);
		pokeObj.find(".hp .base").val(pokemon.bs.hp);
		var i;
		for (i = 0; i < LEGACY_STATS[gen].length; i++) {
			pokeObj.find("." + LEGACY_STATS[gen][i] + " .base").val(pokemon.bs[LEGACY_STATS[gen][i]]);
		}
		pokeObj.find(".boost").val(0);
		pokeObj.find(".percent-hp").val(100);
		pokeObj.find(".status").val("Healthy");
		$(".status").change();
		var moveObj;
		var abilityObj = pokeObj.find(".ability");
		var itemObj = pokeObj.find(".item");
		var randset = false;
		if ($("#randoms").prop("checked")) {
			if (gen >= 8) {
				// The Gens 8 and 9 randdex contains information for multiple Random Battles formats for each Pokemon.
				// Duraludon, for example, has data for Randoms, Doubles Randoms, and Baby Randoms.
				// Therefore, the information for only the format chosen should be used.
				randset = randdex[pokemonName][setName];
			} else {
				randset = randdex[pokemonName];
			}
		}
		var mySetDex = pokeObj.find('.trainer-sets').prop('checked') ?
			TRAINERDEX_PATHWAYS[pokeObj.find('input.trainer-selector').val()] : setdex;
		var regSets = pokemonName in mySetDex && setName in mySetDex[pokemonName];

		if (randset) {
			var listItems = randset.items ? randset.items : [];
			var listAbilities = randset.abilities ? randset.abilities : [];
			if (gen >= 3) $(this).closest('.poke-info').find(".ability-pool").show();
			$(this).closest('.poke-info').find(".extraSetAbilities").text(listAbilities.join(', '));
			if (gen >= 2) $(this).closest('.poke-info').find(".item-pool").show();
			$(this).closest('.poke-info').find(".extraSetItems").text(listItems.join(', '));
			if (gen !== 8 && gen !== 1) {
				$(this).closest('.poke-info').find(".role-pool").show();
				if (gen >= 9) $(this).closest('.poke-info').find(".tera-type-pool").show();
			}
			var listRoles = randset.roles ? Object.keys(randset.roles) : [];
			$(this).closest('.poke-info').find(".extraSetRoles").text(listRoles.join(', '));
			var listTeraTypes = [];
			if (randset.roles && gen >= 9) {
				for (var roleName in randset.roles) {
					var role = randset.roles[roleName];
					for (var q = 0; q < role.teraTypes.length; q++) {
						if (listTeraTypes.indexOf(role.teraTypes[q]) === -1) {
							listTeraTypes.push(role.teraTypes[q]);
						}
					}
				}
			}
			pokeObj.find(".teraType").val(listTeraTypes[0] || getForcedTeraType(pokemonName) || pokemon.types[0]);
			$(this).closest('.poke-info').find(".extraSetTeraTypes").text(listTeraTypes.join(', '));
		} else {
			$(this).closest('.poke-info').find(".ability-pool").hide();
			$(this).closest('.poke-info').find(".item-pool").hide();
			$(this).closest('.poke-info').find(".role-pool").hide();
			$(this).closest('.poke-info').find(".tera-type-pool").hide();
		}
		if (regSets || randset) {
			var set = regSets ? correctHiddenPower(mySetDex[pokemonName][setName]) : randset;
			if (regSets) {
				pokeObj.find(".teraType").val(set.teraType || getForcedTeraType(pokemonName) || pokemon.types[0]);
			}
			pokeObj.find(".level").val(set.level === undefined ? 120 : set.level);
			pokeObj.find(".hp .evs").val((set.evs && set.evs.hp !== undefined) ? set.evs.hp : 0);
			pokeObj.find(".hp .ivs").val((set.ivs && set.ivs.hp !== undefined) ? set.ivs.hp : 31);
			pokeObj.find(".hp .dvs").val((set.dvs && set.dvs.hp !== undefined) ? set.dvs.hp : 15);
			for (i = 0; i < LEGACY_STATS[gen].length; i++) {
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .evs").val(
					(set.evs && set.evs[LEGACY_STATS[gen][i]] !== undefined) ?
						set.evs[LEGACY_STATS[gen][i]] : ($("#randoms").prop("checked") ? 84 : 0));
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .ivs").val(
					(set.ivs && set.ivs[LEGACY_STATS[gen][i]] !== undefined) ? set.ivs[LEGACY_STATS[gen][i]] : 31);
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .dvs").val(
					(set.dvs && set.dvs[LEGACY_STATS[gen][i]] !== undefined) ? set.dvs[LEGACY_STATS[gen][i]] : 15);
			}
			setSelectValueIfValid(pokeObj.find(".nature"), set.nature, "Hardy");
			var abilityFallback = (typeof pokemon.abilities !== "undefined") ? pokemon.abilities[0] : "";
			if ($("#randoms").prop("checked")) {
				setSelectValueIfValid(abilityObj, randset.abilities && randset.abilities[0], abilityFallback);
				setSelectValueIfValid(itemObj, randset.items && randset.items[0], "");
			} else {
				setSelectValueIfValid(abilityObj, set.ability, abilityFallback);
				setSelectValueIfValid(itemObj, set.item, "");
			}
			var setMoves = set.moves;
			if (randset) {
				if (gen === 8 || gen === 1) {
					setMoves = randset.moves;
				} else {
					setMoves = [];
					for (var role in randset.roles) {
						for (var q = 0; q < randset.roles[role].moves.length; q++) {
							var moveName = randset.roles[role].moves[q];
							if (setMoves.indexOf(moveName) === -1) setMoves.push(moveName);
						}
					}
				}
			}
			var moves = selectMovesFromRandomOptions(setMoves);
			for (i = 0; i < 4; i++) {
				moveObj = pokeObj.find(".move" + (i + 1) + " select.move-selector");
				moveObj.attr('data-prev', moveObj.val());
				setSelectValueIfValid(moveObj, moves[i], "(No Move)");
				moveObj.change();
			}
			if (randset) {
				$(this).closest('.poke-info').find(".move-pool").show();
				$(this).closest('.poke-info').find(".extraSetMoves").html(formatMovePool(setMoves));
			}
		} else {
			pokeObj.find(".teraType").val(getForcedTeraType(pokemonName) || pokemon.types[0]);
			pokeObj.find(".level").val(defaultLevel);
			pokeObj.find(".hp .evs").val(0);
			pokeObj.find(".hp .ivs").val(31);
			pokeObj.find(".hp .dvs").val(15);
			for (i = 0; i < LEGACY_STATS[gen].length; i++) {
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .evs").val(0);
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .ivs").val(31);
				pokeObj.find("." + LEGACY_STATS[gen][i] + " .dvs").val(15);
			}
			pokeObj.find(".nature").val("Hardy");
			setSelectValueIfValid(abilityObj, pokemon.abilities[0], "");
			if (startsWith(pokemonName, "Ogerpon-") && !startsWith(pokemonName, "Ogerpon-Teal")) {
				itemObj.val(pokemonName.split("-")[1] + " Mask");
			} else {
				itemObj.val("");
			}
			for (i = 0; i < 4; i++) {
				moveObj = pokeObj.find(".move" + (i + 1) + " select.move-selector");
				moveObj.attr('data-prev', moveObj.val());
				moveObj.val("(No Move)");
				moveObj.change();
			}
			if ($("#randoms").prop("checked")) {
				$(this).closest('.poke-info').find(".move-pool").hide();
			}
		}
		totalEVs(pokeObj);
		if (typeof getSelectedTiers === "function") { // doesn't exist when in 1vs1 mode
			var format = getSelectedTiers()[0];
			var is50lvl = startsWith(format, "VGC") || startsWith(format, "Battle Spot");
			//var isDoubles = format === 'Doubles' || has50lvl; *TODO*
			if (format === "LC") pokeObj.find(".level").val(5);
			if (is50lvl) pokeObj.find(".level").val(50);
			//if (isDoubles) field.gameType = 'Doubles'; *TODO*
		}
		var formeObj = $(this).siblings().find(".forme").parent();
		itemObj.prop("disabled", false);
		var baseForme;
		if (pokemon.baseSpecies && pokemon.baseSpecies !== pokemon.name) {
			baseForme = pokedex[pokemon.baseSpecies];
		}
		//do this before any ability checks to avoid double procs
		var id = pokeObj.attr('id');
		var oppoID = id === "p1" ? "p2" : "p1";
		for (i in storeBoosts) {
			if (storeBoosts[i]) {
				var boostID = storeBoosts[i].pokeInfo.attr('id');
				if (i.includes(id) && boostID === oppoID) {
					storeBoosts[i].apply(); //removes intim on switch out
				}
				if (boostID === id || i.includes(id)) {
					delete storeBoosts[i]; //remove drop negation for pokemon already intimidated by oppo
				}
			}
		}
		//showFormes includes ability check
		if (pokemon.otherFormes) {
			showFormes(formeObj, pokemonName, pokemon, pokemonName);
		} else if (baseForme && baseForme.otherFormes) {
			showFormes(formeObj, pokemonName, baseForme, pokemon.baseSpecies);
		} else {
			formeObj.hide();
		}
		calcHP(pokeObj);
		calcStats(pokeObj);
		abilityObj.change();
		itemObj.change();
		if (pokemon.gender === "N") {
			pokeObj.find(".gender").parent().hide();
			pokeObj.find(".gender").val("");
		} else pokeObj.find(".gender").parent().show();
	}
});

function formatMovePool(moves) {
	var formatted = [];
	for (var i = 0; i < moves.length; i++) {
		formatted.push(isKnownDamagingMove(moves[i]) ? moves[i] : '<i>' + moves[i] + '</i>');
	}
	return formatted.join(', ');
}

function isKnownDamagingMove(move) {
	var m = GENERATION.moves.get(calc.toID(move));
	return m && m.basePower;
}

function selectMovesFromRandomOptions(moves) {
	var selected = [];

	var nonDamaging = [];
	for (var i = 0; i < moves.length; i++) {
		if (isKnownDamagingMove(moves[i])) {
			selected.push(moves[i]);
			if (selected.length >= 4) break;
		} else {
			nonDamaging.push(moves[i]);
		}
	}

	while (selected.length < 4 && nonDamaging.length) {
		selected.push(nonDamaging.pop());
	}

	return selected;
}

function showFormes(formeObj, pokemonName, pokemon, baseFormeName) {
	var formes = pokemon.otherFormes.slice();
	formes.unshift(baseFormeName);

	var defaultForme = formes.indexOf(pokemonName);
	if (defaultForme < 0) defaultForme = 0;

	var formeOptions = getSelectOptions(formes, false, defaultForme);
	formeObj.children("select").find("option").remove().end().append(formeOptions).change();
	formeObj.show();
}

function stellarButtonsVisibility(pokeObj, vis) {
	var fullSetName = pokeObj.find("input.set-selector").val();
	var pokemonName = fullSetName.substring(0, fullSetName.indexOf(" ("));
	var moveObjs = [
		pokeObj.find(".move1"),
		pokeObj.find(".move2"),
		pokeObj.find(".move3"),
		pokeObj.find(".move4")
	];
	if (vis && !startsWith(pokemonName, 'Terapagos')) {
		for (var i = 0; i < moveObjs.length; i++) {
			var moveObj = moveObjs[i];
			moveObj.find(".move-stellar").prop("checked", true);
			moveObj.find(".stellar-btn").show();
		}
		return;
	}
	for (var i = 0; i < moveObjs.length; i++) {
		var moveObj = moveObjs[i];
		moveObj.find(".move-stellar").prop("checked", false);
		moveObj.find(".stellar-btn").hide();
	}
}

function setSelectValueIfValid(select, value, fallback) {
	select.val(!value ? fallback : select.children("option[value='" + value + "']").length ? value : fallback);
}

$(".teraToggle").change(function () {
	var pokeObj = $(this).closest(".poke-info");
	stellarButtonsVisibility(pokeObj, pokeObj.find(".teraType").val() === "Stellar" && this.checked);
	var forme = $(this).parent().siblings().find(".forme");
	var curForme = forme.val();
	if (forme.is(":hidden")) return;
	var container = $(this).closest(".info-group").siblings();
	// Ogerpon and Terapagos mechs
	/*if (startsWith(curForme, "Ogerpon")) {
		if (
			curForme !== "Ogerpon" && !endsWith(curForme, "Tera") &&
			container.find(".item").val() !== curForme.split("-")[1] + " Mask"
		) return;
		if (this.checked) {
			var newForme = curForme === "Ogerpon" ? "Ogerpon-Teal-Tera" : curForme + "-Tera";
			forme.val(newForme);
			container.find(".ability").val("Embody Aspect (" + newForme.split("-")[1] + ")");
			return;
		}
		if (!endsWith(curForme, "Tera")) return;
		var newForme = curForme === "Ogerpon-Teal-Tera" ? "Ogerpon" : curForme.slice(0, -5);
		forme.val(newForme);
		container.find(".ability").val(pokedex[newForme].abilities[0]);
	} else if (startsWith(curForme, "Terapagos")) {
		if (this.checked) {
			var newForme = "Terapagos-Stellar";

			forme.val(newForme);
			container.find(".ability").val(pokedex[newForme].abilities[0]);

			for (var property in pokedex[newForme].bs) {
				var baseStat = container.find("." + property).find(".base");
				baseStat.val(pokedex[newForme].bs[property]);
				baseStat.keyup();
			}
			return;
		}

		if (!endsWith(curForme, "Stellar")) return;
		var newForme = "Terapagos-Terastal";

		forme.val(newForme);
		container.find(".ability").val(pokedex[newForme].abilities[0]);
		for (var property in pokedex[newForme].bs) {
			var baseStat = container.find("." + property).find(".base");
			baseStat.val(pokedex[newForme].bs[property]);
			baseStat.keyup();
		}
	}*/
});

$(".forme").change(function () {
	var altForme = pokedex[$(this).val()];
	var pokeInfo = $(this).closest(".poke-info");
	var fullSetName = pokeInfo.find("input.set-selector").val();
	var pokemonName = fullSetName.substring(0, fullSetName.indexOf(" ("));
	var setName = fullSetName.substring(fullSetName.indexOf("(") + 1, fullSetName.lastIndexOf(")"));

	$(this).parent().siblings().find(".type1").val(altForme.types[0]);
	$(this).parent().siblings().find(".type2").val(altForme.types[1] ? altForme.types[1] : "");
	for (var i = 0; i < LEGACY_STATS[9].length; i++) {
		var baseStat = pokeInfo.find("." + LEGACY_STATS[9][i]).find(".base");
		baseStat.val(altForme.bs[LEGACY_STATS[9][i]]);
		baseStat.keyup();
	}
	var isRandoms = $("#randoms").prop("checked");
	var pokemonSets = $(this).closest('.poke-info').find('.trainer-sets').prop('checked') ?
		TRAINERDEX_PATHWAYS[$(this).closest('.poke-info').find('input.trainer-selector').val()][pokemonName] : setdex[pokemonName];
	var chosenSet = pokemonSets && pokemonSets[setName];
	var isAltForme = $(this).val() !== pokemonName;
	if (isAltForme && abilities.indexOf(altForme.abilities[0]) !== -1 && !formChangeAbilities.includes(pokeInfo.find(".ability").val())) {
		pokeInfo.find(".ability").val(altForme.abilities[0]);
	} else if (chosenSet) {
		if (!isRandoms) {
			pokeInfo.find(".abilities").val(chosenSet.ability);
		} else {
			pokeInfo.find(".ability").val(chosenSet.abilities[0]);
		}
	}
	pokeInfo.find(".ability").keyup();
	if (startsWith($(this).val(), "Ogerpon-") && !startsWith($(this).val(), "Ogerpon-Teal")) {
		pokeInfo.find(".item").val($(this).val().split("-")[1] + " Mask").keyup();
	} else {
		pokeInfo.find(".item").prop("disabled", false);
	}
});

function correctHiddenPower(pokemon) {
	// After Gen 7 bottlecaps means you can have a HP without perfect IVs
	// Level 100 is elided from sets so if its undefined its level 100
	if (gen >= 7 && (!pokemon.level || pokemon.level >= 100)) return pokemon;

	// Convert the legacy stats table to a useful one, and also figure out if all are maxed
	var ivs = {};
	var maxed = true;
	for (var i = 0; i <= LEGACY_STATS[9].length; i++) {
		var s = LEGACY_STATS[9][i];
		var iv = ivs[legacyStatToStat(s)] = (pokemon.ivs && pokemon.ivs[s]) || 31;
		if (iv !== 31) maxed = false;
	}

	var expected = calc.Stats.getHiddenPower(GENERATION, ivs);
	for (var i = 0; i < pokemon.moves.length; i++) {
		var m = pokemon.moves[i].match(HIDDEN_POWER_REGEX);
		if (!m) continue;
		// The Pokemon has Hidden Power and is not maxed but the types don't match we don't
		// want to attempt to reconcile the user's IVs so instead just correct the HP type
		if (!maxed && expected.type !== m[1]) {
			pokemon.moves[i] = "Hidden Power " + expected.type;
		} else {
			// Otherwise, use the default preset hidden power IVs that PS would use
			var hpIVs = calc.Stats.getHiddenPowerIVs(GENERATION, m[1]);
			if (!hpIVs) continue; // some impossible type was specified, ignore
			pokemon.ivs = pokemon.ivs || {hp: 31, at: 31, df: 31, sa: 31, sd: 31, sp: 31};
			pokemon.dvs = pokemon.dvs || {hp: 15, at: 15, df: 15, sa: 15, sd: 15, sp: 15};
			for (var stat in hpIVs) {
				pokemon.ivs[calc.Stats.shortForm(stat)] = hpIVs[stat];
				pokemon.dvs[calc.Stats.shortForm(stat)] = calc.Stats.IVToDV(hpIVs[stat]);
			}
			if (gen < 3) {
				pokemon.dvs.hp = calc.Stats.getHPDV({
					atk: pokemon.ivs.at || 31,
					def: pokemon.ivs.df || 31,
					spe: pokemon.ivs.sp || 31,
					spc: pokemon.ivs.sa || 31
				});
				pokemon.ivs.hp = calc.Stats.DVToIV(pokemon.dvs.hp);
			}
		}
	}
	return pokemon;
}

function createPokemon(pokeInfo) {
	if (typeof pokeInfo === "string") { // in this case, pokeInfo is the id of an individual setOptions value whose moveset's tier matches the selected tier(s)
		var name = pokeInfo.substring(0, pokeInfo.indexOf(" ("));
		var setName = pokeInfo.substring(pokeInfo.indexOf("(") + 1, pokeInfo.lastIndexOf(")"));
		var isRandoms = $("#randoms").prop("checked");
		var set = $('#' + pokeInfo + ' .trainer-sets').prop('checked') ?
			TRAINERDEX_PATHWAYS[$('#' + pokeInfo + ' input.trainer-selector').val()][name][setName] : setdex[name][setName];

		var ivs = {};
		var evs = {};
		for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
			var legacyStat = LEGACY_STATS[gen][i];
			var stat = legacyStatToStat(legacyStat);

			ivs[stat] = (gen >= 3 && set.ivs && typeof set.ivs[legacyStat] !== "undefined") ? set.ivs[legacyStat] : 31;
			evs[stat] = (set.evs && typeof set.evs[legacyStat] !== "undefined") ? set.evs[legacyStat] : 0;
		}
		var moveNames = set.moves;
		if (isRandoms && (gen !== 8 && gen !== 1)) {
			moveNames = [];
			for (var role in set.roles) {
				for (var q = 0; q < set.roles[role].moves.length; q++) {
					var moveName = set.roles[role].moves[q];
					if (moveNames.indexOf(moveName) === -1) moveNames.push(moveName);
				}
			}
		}

		var pokemonMoves = [];
		for (var i = 0; i < 4; i++) {
			var moveName = moveNames[i];
			pokemonMoves.push(new calc.Move(gen, moves[moveName] ? moveName : "(No Move)", {ability: ability, item: item}));
		}

		if (isRandoms) {
			pokemonMoves = pokemonMoves.filter(function (move) {
				return move.category !== "Status";
			});
		}

		return new calc.Pokemon(gen, name, {
			level: set.level,
			ability: set.ability,
			abilityOn: true,
			item: set.item && typeof set.item !== "undefined" && (set.item === "Eviolite" || set.item.indexOf("ite") < 0) ? set.item : "",
			nature: set.nature,
			ivs: ivs,
			evs: evs,
			moves: pokemonMoves
		});
	} else {
		var setName = pokeInfo.find("input.set-selector").val();
		var name;
		if (setName.indexOf("(") === -1) {
			name = setName;
		} else {
			var pokemonName = setName.substring(0, setName.indexOf(" ("));
			var species = pokedex[pokemonName];
			name = (species.otherFormes || (species.baseSpecies && species.baseSpecies !== pokemonName)) ? pokeInfo.find(".forme").val() : pokemonName;
		}

		var baseStats = {};
		var ivs = {};
		var evs = {};
		var boosts = {};
		for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
			var stat = legacyStatToStat(LEGACY_STATS[gen][i]);
			baseStats[stat === 'spc' ? 'spa' : stat] = ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .base").val();
			ivs[stat] = gen > 2 ? ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .ivs").val() : ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .dvs").val() * 2 + 1;
			evs[stat] = ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .evs").val();
			boosts[stat] = ~~pokeInfo.find("." + LEGACY_STATS[gen][i] + " .boost").val();
		}
		if (gen === 1) baseStats.spd = baseStats.spa;

		var ability = pokeInfo.find(".ability").val();
		var item = pokeInfo.find(".item").val();
		var isDynamaxed = pokeInfo.find(".max").prop("checked");
		var teraType = pokeInfo.find(".teraToggle").is(":checked") ? pokeInfo.find(".teraType").val() : undefined;
		var opts = {
			ability: ability,
			item: item,
			isDynamaxed: isDynamaxed,
			teraType: teraType,
			species: name,
		};

		// Pathways Stuff
		var light_aura = Number(pokeInfo.find(".lightaura").val());
		var dark_aura = Number(pokeInfo.find(".darkaura").val());
		var alignment = pokeInfo.find(".alignment").val();

		var roleName = pokeInfo.find(".role").val();
		var roleRank = undefined;
		if (roleName !== 'None') {
			roleRank = pokeInfo.find(".rank").val();
		}

		pokeInfo.isDynamaxed = isDynamaxed;
		calcHP(pokeInfo);
		var curHP = ~~pokeInfo.find(".current-hp").val();
		// FIXME the Pokemon constructor expects non-dynamaxed HP
		if (isDynamaxed) curHP = Math.floor(curHP / 2);
		var types = [pokeInfo.find(".type1").val(), pokeInfo.find(".type2").val()];
		return new calc.Pokemon(gen, name, {
			level: ~~pokeInfo.find(".level").val(),
			ability: ability,
			abilityOn: pokeInfo.find(".abilityToggle").is(":checked"),
			item: item,
			gender: pokeInfo.find(".gender").is(":visible") ? getGender(pokeInfo.find(".gender").val()) : "N",
			nature: pokeInfo.find(".nature").val(),
			ivs: ivs,
			evs: evs,
			isDynamaxed: isDynamaxed,
			alliesFainted: parseInt(pokeInfo.find(".alliesFainted").val()),
			boostedStat: pokeInfo.find(".boostedStat").val() || undefined,
			teraType: teraType,
			boosts: boosts,
			curHP: curHP,
			status: CALC_STATUS[pokeInfo.find(".status").val()],
			toxicCounter: pokeInfo.find(".status").val() === 'Badly Poisoned' ? ~~pokeInfo.find(".toxic-counter").val() : 0,
			moves: [
				getMoveDetails(pokeInfo.find(".move1"), opts),
				getMoveDetails(pokeInfo.find(".move2"), opts),
				getMoveDetails(pokeInfo.find(".move3"), opts),
				getMoveDetails(pokeInfo.find(".move4"), opts),
			],
			roleName: roleName,
			roleRank: roleRank,
			lightAura: light_aura,
			darkAura: dark_aura,
			alignment: alignment,
			overrides: {
				baseStats: baseStats,
				types: types
			}
		});
	}
}

function getGender(gender) {
	if (!gender || gender === 'genderless' || gender === 'N') return 'N';
	if (gender.toLowerCase() === 'male' || gender === 'M') return 'M';
	return 'F';
}

function getMoveDetails(moveInfo, opts) {
	var moveName = moveInfo.find("select.move-selector").val();
	var isZMove = gen > 6 && moveInfo.find("input.move-z").prop("checked");
	var isCrit = moveInfo.find(".move-crit").prop("checked");
	var isStellarFirstUse = moveInfo.find(".move-stellar").prop("checked");
	var hits = +moveInfo.find(".move-hits").val();
	var timesUsed = +moveInfo.find(".stat-drops").val();
	var timesUsedWithMetronome = moveInfo.find(".metronome").is(':visible') ? +moveInfo.find(".metronome").val() : 1;
	var overrides = {
		basePower: +moveInfo.find(".move-bp").val(),
		type: moveInfo.find(".move-type").val()
	};
	if (moveName === 'Tera Blast') {
		// custom logic for stellar type tera blast
		var isStellar = opts.teraType === 'Stellar';
		var statDrops = moveInfo.find('.stat-drops');
		var dropsStats = statDrops.is(':visible');
		if (isStellar !== dropsStats) {
			// update stat drop dropdown here
			if (isStellar) statDrops.show(); else statDrops.hide();
		}
		if (isStellar) overrides.self = {boosts: {atk: -1, spa: -1}};
	}
	if (gen >= 4) overrides.category = moveInfo.find(".move-cat").val();
	return new calc.Move(gen, moveName, {
		ability: opts.ability, item: opts.item, useZ: isZMove, species: opts.species, isCrit: isCrit, hits: hits,
		isStellarFirstUse: isStellarFirstUse, timesUsed: timesUsed, timesUsedWithMetronome: timesUsedWithMetronome,
		overrides: overrides, useMax: opts.isDynamaxed
	});
}

function createField() {
	var gameType = $("input:radio[name='format']:checked").val();
	var isBeadsOfRuin = $("#beads").prop("checked");
	var isTabletsOfRuin = $("#tablets").prop("checked");
	var isSwordOfRuin = $("#sword").prop("checked");
	var isVesselOfRuin = $("#vessel").prop("checked");
	var isMagicRoom = $("#magicroom").prop("checked");
	var isWonderRoom = $("#wonderroom").prop("checked");
	var isGravity = $("#gravity").prop("checked");
	var isSR = [$("#srL").prop("checked"), $("#srR").prop("checked")];
	var weather;
	var spikes;
	if (gen === 2) {
		spikes = [$("#gscSpikesL").prop("checked") ? 1 : 0, $("#gscSpikesR").prop("checked") ? 1 : 0];
		weather = $("input:radio[name='gscWeather']:checked").val();
	} else {
		weather = $("input:radio[name='weather']:checked").val();
		spikes = [~~$("input:radio[name='spikesL']:checked").val(), ~~$("input:radio[name='spikesR']:checked").val()];
	}
	var steelsurge = [$("#steelsurgeL").prop("checked"), $("#steelsurgeR").prop("checked")];
	var vinelash = [$("#vinelashL").prop("checked"), $("#vinelashR").prop("checked")];
	var wildfire = [$("#wildfireL").prop("checked"), $("#wildfireR").prop("checked")];
	var cannonade = [$("#cannonadeL").prop("checked"), $("#cannonadeR").prop("checked")];
	var volcalith = [$("#volcalithL").prop("checked"), $("#volcalithR").prop("checked")];
	var terrain = ($("input:checkbox[name='terrain']:checked").val()) ? $("input:checkbox[name='terrain']:checked").val() : "";
	var isReflect = [$("#reflectL").prop("checked"), $("#reflectR").prop("checked")];
	var isLightScreen = [$("#lightScreenL").prop("checked"), $("#lightScreenR").prop("checked")];
	var isProtected = [$("#protectL").prop("checked"), $("#protectR").prop("checked")];
	var isSeeded = [$("#leechSeedL").prop("checked"), $("#leechSeedR").prop("checked")];
	var isForesight = [$("#foresightL").prop("checked"), $("#foresightR").prop("checked")];
	var isHelpingHand = [$("#helpingHandL").prop("checked"), $("#helpingHandR").prop("checked")];
	var isTailwind = [$("#tailwindL").prop("checked"), $("#tailwindR").prop("checked")];
	var isFlowerGift = [$("#flowerGiftL").prop("checked"), $("#flowerGiftR").prop("checked")];
	var isFriendGuard = [$("#friendGuardL").prop("checked"), $("#friendGuardR").prop("checked")];
	var isAuroraVeil = [$("#auroraVeilL").prop("checked"), $("#auroraVeilR").prop("checked")];
	var isBattery = [$("#batteryL").prop("checked"), $("#batteryR").prop("checked")];
	var isPowerSpot = [$("#powerSpotL").prop("checked"), $("#powerSpotR").prop("checked")];
	// TODO: support switching in as well!
	var isSwitchingOut = [$("#switchingL").prop("checked"), $("#switchingR").prop("checked")];
	// my additions
	var isCharge = [$("#chargeL").prop("checked"), $("#chargeR").prop("checked")];
	var isSaltCure = [$("#cureL").prop("checked"), $("#cureR").prop("checked")];
	var isSpookySpook = [$("#spookL").prop("checked"), $("#spookR").prop("checked")];
	var isColdTherapy = [$("#coldL").prop("checked"), $("#coldR").prop("checked")];
	var isMetalScraps = [$("#metalScrapsL").prop("checked"), $("#metalScrapsR").prop("checked")];
	var stellarRocks = [~~$("input:radio[name='stellarRocksL']:checked").val(), ~~$("input:radio[name='stellarRocksR']:checked").val()];
	var isDrakeyDrake = [$("#drakeyDrakeL").prop("checked"), $("#drakeyDrakeR").prop("checked")];

	var createSide = function (i) {
		return new calc.Side({
			spikes: spikes[i],
			isSR: isSR[i],
			steelsurge: steelsurge[i],
			vinelash: vinelash[i],
			wildfire: wildfire[i],
			cannonade: cannonade[i],
			volcalith: volcalith[i],
			isReflect: isReflect[i],
			isLightScreen: isLightScreen[i],
			isProtected: isProtected[i],
			isSeeded: isSeeded[i],
			isForesight: isForesight[i],
			isTailwind: isTailwind[i],
			isHelpingHand: isHelpingHand[i],
			isFlowerGift: isFlowerGift[i],
			isFriendGuard: isFriendGuard[i],
			isAuroraVeil: isAuroraVeil[i],
			isBattery: isBattery[i],
			isPowerSpot: isPowerSpot[i],
			isSwitching: isSwitchingOut[i] ? 'out' : undefined,
			isCharge: isCharge[i], // additions
			isSaltCure: isSaltCure[i],
			isSpookySpook: isSpookySpook[i],
			isColdTherapy: isColdTherapy[i],
			isMetalScraps: isMetalScraps[i],
			isDrakeyDrake: isDrakeyDrake[i],
			stellarRocks: stellarRocks[i]
		});
	};
	return new calc.Field({
		gameType: gameType,
		weather: weather,
		terrain: terrain,
		isMagicRoom: isMagicRoom,
		isWonderRoom: isWonderRoom,
		isGravity: isGravity,
		isBeadsOfRuin: isBeadsOfRuin,
		isTabletsOfRuin: isTabletsOfRuin,
		isSwordOfRuin: isSwordOfRuin,
		isVesselOfRuin: isVesselOfRuin,
		attackerSide: createSide(0),
		defenderSide: createSide(1)
	});
}

function calcHP(poke) {
	var total = calcStat(poke, "hp");
	var $maxHP = poke.find(".max-hp");

	var prevMaxHP = Number($maxHP.attr('data-prev')) || total;
	var $currentHP = poke.find(".current-hp");
	var prevCurrentHP = $currentHP.attr('data-set') ? Math.min(Number($currentHP.val()), prevMaxHP) : prevMaxHP;
	// NOTE: poke.find(".percent-hp").val() is a rounded value!
	var prevPercentHP = 100 * prevCurrentHP / prevMaxHP;

	$maxHP.text(total);
	$maxHP.attr('data-prev', total);

	var newCurrentHP = calcCurrentHP(poke, total, prevPercentHP);
	calcPercentHP(poke, total, newCurrentHP);

	$currentHP.attr('data-set', true);
}

function totalEVs(poke) {
	var totalEVs = 0;
	for (var i = 0; i < LEGACY_STATS[gen].length; i++) {
		var statName = LEGACY_STATS[gen][i];
		var stat = poke.find("." + statName);
		var evs = ~~stat.find(".evs").val();
		totalEVs += evs;
	}
	poke.find(".totalevs").find(".evs").text(totalEVs);
	return totalEVs;
}

function calcStat(poke, StatID) {
	var stat = poke.find("." + StatID);
	var base = ~~stat.find(".base").val();
	var level = ~~poke.find(".level").val();
	var nature, ivs, evs;
	if (gen < 3) {
		ivs = ~~stat.find(".dvs").val() * 2;
		evs = 252;
	} else {
		ivs = ~~stat.find(".ivs").val();
		evs = ~~stat.find(".evs").val();
		if (StatID !== "hp") nature = poke.find(".nature").val();
	}
	// Shedinja still has 1 max HP during the effect even if its Dynamax Level is maxed (DaWoblefet)
	var total = calc.calcStat(gen, legacyStatToStat(StatID), base, ivs, evs, level, nature);
	if (gen > 7 && StatID === "hp" && poke.isDynamaxed && total !== 1) {
		total *= 2;
	}
	stat.find(".total").text(total);
	if (!['hp', 'sp'].includes(StatID)) {
		abilityChange(poke.attr('id') === "p1" ? $("#p2") : $("#p1"));
	}
	return total;
}

var GENERATION = {
	'1': 1, 'rb': 1, 'rby': 1,
	'2': 2, 'gs': 2, 'gsc': 2,
	'3': 3, 'rs': 3, 'rse': 3, 'frlg': 3, 'adv': 3,
	'4': 4, 'dp': 4, 'dpp': 4, 'hgss': 4,
	'5': 5, 'bw': 5, 'bw2': 5, 'b2w2': 5,
	'6': 6, 'xy': 6, 'oras': 6,
	'7': 7, 'sm': 7, 'usm': 7, 'usum': 7,
	'8': 8, 'ss': 8,
	'9': 9, 'sv': 9
};

var SETDEX = [
	{},
	typeof SETDEX_RBY === 'undefined' ? {} : SETDEX_RBY,
	typeof SETDEX_GSC === 'undefined' ? {} : SETDEX_GSC,
	typeof SETDEX_ADV === 'undefined' ? {} : SETDEX_ADV,
	typeof SETDEX_DPP === 'undefined' ? {} : SETDEX_DPP,
	typeof SETDEX_BW === 'undefined' ? {} : SETDEX_BW,
	typeof SETDEX_XY === 'undefined' ? {} : SETDEX_XY,
	typeof SETDEX_SM === 'undefined' ? {} : SETDEX_SM,
	typeof SETDEX_SS === 'undefined' ? {} : SETDEX_SS,
	typeof SETDEX_SV === 'undefined' ? {} : SETDEX_SV,
	typeof SETDEX_PATHWAYS === 'undefined' ? {} : SETDEX_PATHWAYS,
];

/*
 * Converts an object that has the hierarchy Format -> Pokemon -> Sets
 * into one that has the hierarchy Pokemon -> Format -> Sets
 * An example for Gen 9 Duraludon would be:
 * {
 *		Randoms: {
 *			...
 *			Duraludon: {...},
 *			...
 *		},
 *		Doubles Randoms: {
 *			...
 *			Duraludon: {...},
 *			...
 *		},
 *		Baby Randoms: {
 *			...
 *			Duraludon: {...},
 *			...
 *		}
 * }
 * getting converted into:
 * {
 *		...
 *		Duraludon: {
 *			Randoms: {...},
 *			Doubles Randoms: {...},
 *			Baby Randoms: {...}
 *		}
 *		...
 * }
 */
function formatRandSets(gen) {
	var combined = {};

	for (var format in gen) {
		var formatSets = gen[format];
		for (var pokemon in formatSets) {
			var sets = formatSets[pokemon];
			if (!(pokemon in combined)) {
				combined[pokemon] = {};
			}
			combined[pokemon][format] = sets;
		}
	}

	return combined;
}

// Creates a single dictionary for Gen 8 & Gen 9 Random Battles formats
var GEN8RANDSETS = formatRandSets({
	"Randoms": typeof GEN8RANDOMBATTLE === 'undefined' ? {} : GEN8RANDOMBATTLE,
	"Doubles Randoms": typeof GEN8RANDOMDOUBLESBATTLE === 'undefined' ? {} : GEN8RANDOMDOUBLESBATTLE,
	"BDSP Randoms": typeof GEN8BDSPRANDOMBATTLE === 'undefined' ? {} : GEN8BDSPRANDOMBATTLE,
});

var GEN9RANDSETS = formatRandSets({
	"Randoms": typeof GEN9RANDOMBATTLE === 'undefined' ? {} : GEN9RANDOMBATTLE,
	"Doubles Randoms": typeof GEN9RANDOMDOUBLESBATTLE === 'undefined' ? {} : GEN9RANDOMDOUBLESBATTLE,
	"Baby Randoms": typeof GEN9BABYRANDOMBATTLE === 'undefined' ? {} : GEN9BABYRANDOMBATTLE,
});

var RANDDEX = [
	{},
	typeof GEN1RANDOMBATTLE === 'undefined' ? {} : GEN1RANDOMBATTLE,
	typeof GEN2RANDOMBATTLE === 'undefined' ? {} : GEN2RANDOMBATTLE,
	typeof GEN3RANDOMBATTLE === 'undefined' ? {} : GEN3RANDOMBATTLE,
	typeof GEN4RANDOMBATTLE === 'undefined' ? {} : GEN4RANDOMBATTLE,
	typeof GEN5RANDOMBATTLE === 'undefined' ? {} : GEN5RANDOMBATTLE,
	typeof GEN6RANDOMBATTLE === 'undefined' ? {} : GEN6RANDOMBATTLE,
	typeof GEN7RANDOMBATTLE === 'undefined' ? {} : GEN7RANDOMBATTLE,
	GEN8RANDSETS,
	GEN9RANDSETS,
	GEN9RANDSETS,
];
var gen, genWasChanged, notation, pokedex, setdex, randdex, typeChart, moves, abilities, items, calcHP, calcStat, GENERATION;

$(".gen").change(function () {
	/*eslint-disable */
	gen = ~~$(this).val() || 10;
	GENERATION = calc.Generations.get(gen);
	var params = new URLSearchParams(window.location.search);
	if (gen === 10) {
		params.delete('gen');
		params = '' + params;
		if (window.history && window.history.replaceState) {
			window.history.replaceState({}, document.title, window.location.pathname + (params.length ? '?' + params : ''));
		}
	} else {
		params.set('gen', gen);
		if (window.history && window.history.pushState) {
			params.sort();
			var path = window.location.pathname + '?' + params;
			window.history.pushState({}, document.title, path);
			gtag('config', 'UA-26211653-3', {'page_path': path});
		}
	}
	genWasChanged = true;
	/* eslint-enable */
	// declaring these variables with var here makes z moves not work; TODO
	pokedex = calc.SPECIES[gen];
	setdex = SETDEX[gen];
	randdex = RANDDEX[gen];
	if ('Aegislash' in randdex) randdex['Aegislash-Shield'] = randdex['Aegislash'];
	typeChart = calc.TYPE_CHART[gen];
	moves = calc.MOVES[gen];
	items = calc.ITEMS[gen];
	abilities = calc.ABILITIES[gen];
	clearField();
	$(".import-checkbox").prop("checked", false);
	loadDefaultLists('p1');
	loadDefaultLists('p2');
	$(".gen-specific.g" + gen).show();
	$(".gen-specific").not(".g" + gen).hide();
	var typeOptions = getSelectOptions(Object.keys(typeChart));
	$("select.type1, select.move-type").find("option").remove().end().append(typeOptions);
	$("select.teraType").find("option").remove().end().append(getSelectOptions(Object.keys(typeChart).slice(1)));
	$("select.type2").find("option").remove().end().append("<option value=\"\">(none)</option>" + typeOptions);
	var moveOptions = getSelectOptions(Object.keys(moves), true);
	$("select.move-selector").find("option").remove().end().append(moveOptions);
	var abilityOptions = getSelectOptions(abilities, true);
	$("select.ability").find("option").remove().end().append("<option value=\"\">(other)</option>" + abilityOptions);
	var itemOptions = getSelectOptions(items, true);
	$("select.item").find("option").remove().end().append("<option value=\"\">(none)</option>" + itemOptions);

	var roleNames = Object.values(calc.ROLES_BY_ID).map(function(role) {return role["name"]});
	var roleOptions = getSelectOptions(roleNames);
	$("select.role").find("option").remove().end().append(roleOptions);

	$(".set-selector").val(getFirstValidSetOption().id);
	$(".set-selector").change();
});

function getFirstValidSetOption(sets) {
	var options = getSetOptions(sets);
	// NB: The first set is never valid, so we start searching after it.
	for (var i = 1; i < options.length; i++) {
		if (options[i].id && options[i].id.indexOf('(Blank Set)') === -1) return options[i];
	}
	return undefined;
}

$(".notation").change(function () {
	notation = $(this).val();
});

function clearField() {
	$("#singles-format").prop("checked", true);
	$("#clear").prop("checked", true);
	$("#gscClear").prop("checked", true);
	$("#gravity").prop("checked", false);
	$("#srL").prop("checked", false);
	$("#srR").prop("checked", false);
	$("#spikesL0").prop("checked", true);
	$("#spikesR0").prop("checked", true);
	$("#gscSpikesL").prop("checked", false);
	$("#gscSpikesR").prop("checked", false);
	$("#steelsurgeL").prop("checked", false);
	$("#steelsurgeR").prop("checked", false);
	$("#vinelashL").prop("checked", false);
	$("#vinelashR").prop("checked", false);
	$("#wildfireL").prop("checked", false);
	$("#wildfireR").prop("checked", false);
	$("#cannonadeL").prop("checked", false);
	$("#cannonadeR").prop("checked", false);
	$("#volcalithL").prop("checked", false);
	$("#volcalithR").prop("checked", false);
	$("#reflectL").prop("checked", false);
	$("#reflectR").prop("checked", false);
	$("#lightScreenL").prop("checked", false);
	$("#lightScreenR").prop("checked", false);
	$("#protectL").prop("checked", false);
	$("#protectR").prop("checked", false);
	$("#leechSeedL").prop("checked", false);
	$("#leechSeedR").prop("checked", false);
	$("#foresightL").prop("checked", false);
	$("#foresightR").prop("checked", false);
	$("#helpingHandL").prop("checked", false);
	$("#helpingHandR").prop("checked", false);
	$("#tailwindL").prop("checked", false);
	$("#tailwindR").prop("checked", false);
	$("#friendGuardL").prop("checked", false);
	$("#friendGuardR").prop("checked", false);
	$("#auroraVeilL").prop("checked", false);
	$("#auroraVeilR").prop("checked", false);
	$("#batteryL").prop("checked", false);
	$("#batteryR").prop("checked", false);
	$("#switchingL").prop("checked", false);
	$("#switchingR").prop("checked", false);
	$("input:checkbox[name='terrain']").prop("checked", false);
	// my additions
	$("#chargeL").prop("checked", false);
	$("#chargeR").prop("checked", false);
	$("#cureL").prop("checked", false);
	$("#cureR").prop("checked", false);
	$("#spookL").prop("checked", false);
	$("#spookR").prop("checked", false);
	$("#coldL").prop("checked", false);
	$("#coldR").prop("checked", false);
	$("#metalScrapsL").prop("checked", false);
	$("#metalScrapsR").prop("checked", false);
	$("#stellarRocksL0").prop("checked", true);
	$("#stellarRocksR0").prop("checked", true);
	$("#drakeyDrakeL").prop("checked", false);
	$("#drakeyDrakeR").prop("checked", false);
}

$('.trainer-sets').on('change', function() {
	//reveal corresponding trainer select dropdown
	//deselect and hide imported sets options
	//load trainer list with select2
	var pokeInfo = $(this).closest(".poke-info");
	if ($(this).prop('checked')) {
		pokeInfo.find('.trainer-selector').show();
		if (localStorage.getItem('customsets')) {
			pokeInfo.find('.import-checkbox').prop('checked', false);
			pokeInfo.find('.importedSetsOptions').hide();
		}
		pokeInfo.find('.trainer-selector').select2({
			formatResult: function (trainer) {
				return trainer.text;
			},
			query: function (query) {
				var pageSize = 30;
				var results = [];
				var options = Object.keys(TRAINERDEX_PATHWAYS);
				for (var i = 0; i < options.length; i++) {
					var option = options[i];
					var trainerName = options[i].toUpperCase();
					if (!query.term || query.term.toUpperCase().split(" ").every(function (term) {
						return trainerName.indexOf(term) === 0 || trainerName.indexOf("-" + term) >= 0 || trainerName.indexOf(" " + term) >= 0;
					})) {
						results.push({text: option, id: option});
					}
				}
				query.callback({
					results: results.slice((query.page - 1) * pageSize, query.page * pageSize),
					more: results.length >= query.page * pageSize
				});
			},
			initSelection: function (element, callback) {
				var data = {text: Object.keys(TRAINERDEX_PATHWAYS)[0], id: Object.keys(TRAINERDEX_PATHWAYS)[0]};
				callback(data);
			}
		});
		pokeInfo.find('input.trainer-selector').val(Object.keys(TRAINERDEX_PATHWAYS)[0]);
		pokeInfo.find('.trainer-selector').change();
	} else {
		pokeInfo.find('.trainer-selector').hide();
		if (localStorage.getItem('customsets')) {
			pokeInfo.find('.importedSetsOptions').show();
		}
		loadDefaultLists(pokeInfo.attr('id'));
	}
});

$('.trainer-selector').on('change', function() {
	var pokeInfo = $(this).closest(".poke-info");
	var sets = TRAINERDEX_PATHWAYS[$(this).val()];
	loadCustomList(pokeInfo.attr('id'), sets);
	$(pokeInfo).find('.set-selector').val(getFirstValidSetOption(sets).id);
	$(pokeInfo).find('.set-selector').change();
});

function getSetOptions(sets) {
	var mySetDex, pokeNames
	if (sets) {
		mySetDex = sets;
		pokeNames = Object.keys(mySetDex);
	} else {
		mySetDex = setdex;
		pokeNames = Object.keys(pokedex);
		pokeNames.sort();
	}
	var setOptions = [];
	for (var i = 0; i < pokeNames.length; i++) {
		var pokeName = pokeNames[i];
		setOptions.push({
			pokemon: pokeName,
			text: pokeName
		});
		if ($("#randoms").prop("checked")) {
			if (pokeName in randdex) {
				if (gen >= 8) {
					// The Gen 8 and 9 randdex contains information for multiple Random Battles formats for each Pokemon.
					// Duraludon, for example, has data for Randoms, Doubles Randoms, and Baby Randoms.
					// Therefore, all of this information has to be populated within the set options.
					var randTypes = Object.keys(randdex[pokeName]);
					for (var j = 0; j < randTypes.length; j++) {
						var rand = randTypes[j];
						setOptions.push({
							pokemon: pokeName + (rand === "Randoms" ? "" : " (" + rand.split(' ')[0] + ")"),
							set: rand + ' Set',
							text: pokeName + " (" + rand + ")",
							id: pokeName + " (" + rand + ")"
						});
					}
				} else {
					setOptions.push({
						pokemon: pokeName,
						set: 'Randoms Set',
						text: pokeName + " (Randoms)",
						id: pokeName + " (Randoms)"
					});
				}
			}
		} else {
			if (pokeName in mySetDex) {
				var setNames = Object.keys(mySetDex[pokeName]);
				for (var j = 0; j < setNames.length; j++) {
					var setName = setNames[j];
					setOptions.push({
						pokemon: pokeName,
						set: setName,
						text: pokeName + " (" + setName + ")",
						id: pokeName + " (" + setName + ")",
						isCustom: mySetDex[pokeName][setName].isCustomSet || !!sets,
						nickname: mySetDex[pokeName][setName].nickname || ""
					});
				}
			}
			setOptions.push({
				pokemon: pokeName,
				set: "Blank Set",
				text: pokeName + " (Blank Set)",
				id: pokeName + " (Blank Set)"
			});
		}
	}
	return setOptions;
}

function getSelectOptions(arr, sort, defaultOption) {
	if (sort) {
		arr.sort();
	}
	var r = '';
	for (var i = 0; i < arr.length; i++) {
		r += '<option value="' + arr[i] + '" ' + (defaultOption === i ? 'selected' : '') + '>' + arr[i] + '</option>';
	}
	return r;
}

var stickyWeather = (function () {
	var lastClicked = '';
	$(".weather").click(function () {
		if (this.id === lastClicked) {
			$(this).toggleClass("locked-weather");
		} else {
			$('.locked-weather').removeClass('locked-weather');
		}
		lastClicked = this.id;
	});

	return {
		clearStickyWeather: function () {
			lastClicked = null;
			$('.locked-weather').removeClass('locked-weather');
		}
	};
})();

var stickyMoves = (function () {
	var lastClicked = 'resultMoveL1';
	$(".result-move").click(function () {
		if (this.id === lastClicked) {
			$(this).toggleClass("locked-move");
		} else {
			$('.locked-move').removeClass('locked-move');
		}
		lastClicked = this.id;
	});

	return {
		clearStickyMove: function () {
			lastClicked = null;
			$('.locked-move').removeClass('locked-move');
		},
		setSelectedMove: function (slot) {
			lastClicked = slot;
		},
		getSelectedSide: function () {
			if (lastClicked) {
				if (lastClicked.indexOf('resultMoveL') !== -1) {
					return 'p1';
				} else if (lastClicked.indexOf('resultMoveR') !== -1) {
					return 'p2';
				}
			}
			return null;
		}
	};
})();

function isPokeInfoGrounded(pokeInfo) {
	var teraType = pokeInfo.find(".teraToggle").is(":checked") ? pokeInfo.find(".teraType").val() : undefined;
	return $("#gravity").prop("checked") || (
		  teraType ? teraType !== "Flying" : pokeInfo.find(".type1").val() !== "Flying" &&
        teraType ? teraType !== "Flying" : pokeInfo.find(".type2").val() !== "Flying" &&
        pokeInfo.find(".ability").val() !== "Levitate" &&
        pokeInfo.find(".item").val() !== "Air Balloon"
	);
}

//NEW IDEA
//STORE BOOSTS IN BOOOSTS CLASS
//CREATE BOOSTS CLASS CACHE
//LOAD BOOSTS FROM CACHE BY NAME AS NEEDED

class Boosts {
	constructor(pokeInfo = false) {
		this.pokeInfo = pokeInfo;
		this.at = pokeInfo ? Number(this.pokeInfo.find(".at .boost").val()) : 0;
		this.df = pokeInfo ? Number(this.pokeInfo.find(".df .boost").val()) : 0;
		this.sa = pokeInfo ? Number(this.pokeInfo.find(".sa .boost").val()) : 0;
		this.sd = pokeInfo ? Number(this.pokeInfo.find(".sd .boost").val()) : 0;
		this.sp = pokeInfo ? Number(this.pokeInfo.find(".sp .boost").val()) : 0;
	}
	
	apply() {
		var boost = this.pokeInfo.find(".at .boost");
		boost.val(Math.min(Math.max(Number(boost.val()) + this.at, -6), 6));
		boost = this.pokeInfo.find(".df .boost");
		boost.val(Math.min(Math.max(Number(boost.val()) + this.df, -6), 6));
		boost = this.pokeInfo.find(".sa .boost");
		boost.val(Math.min(Math.max(Number(boost.val()) + this.sa, -6), 6));
		boost = this.pokeInfo.find(".sd .boost");
		boost.val(Math.min(Math.max(Number(boost.val()) + this.sd, -6), 6));
		boost = this.pokeInfo.find(".sp .boost");
		boost.val(Math.min(Math.max(Number(boost.val()) + this.sp, -6), 6));
	}
	
	minus(boosts) {
		this.at -= boosts.at;
		this.df -= boosts.df;
		this.sa -= boosts.sa;
		this.sd -= boosts.sd;
		this.sp -= boosts.sp;
		return this;
	}
	
	plus(boosts) {
		this.at += boosts.at;
		this.df += boosts.df;
		this.sa += boosts.sa;
		this.sd += boosts.sd;
		this.sp += boosts.sp;
		return this;
	}
	/*
	save() {
		this.at = Number(this.pokeInfo.find(".at .boost").val());
		this.df = Number(this.pokeInfo.find(".df .boost").val());
		this.sa = Number(this.pokeInfo.find(".sa .boost").val());
		this.sd = Number(this.pokeInfo.find(".sd .boost").val());
		this.sp = Number(this.pokeInfo.find(".sp .boost").val());
	}
	
	load() {
		this.pokeInfo.find(".at .boost").val(this.at);
		this.pokeInfo.find(".df .boost").val(this.df);
		this.pokeInfo.find(".sa .boost").val(this.sa);
		this.pokeInfo.find(".sd .boost").val(this.sd);
		this.pokeInfo.find(".sp .boost").val(this.sp);
	}*/
}

var storeBoosts = {};

function getTerrainEffects() {
	var className = $(this).prop("className").split(' ', 1)[0];
	var weather = $("input:radio[name='weather']:checked").val();
	var lastTerrain = false;
	if ($(this).is("input:checkbox[name='terrain']:checked")) {
		if ($(this).val() === 'Frozen Kingdom' && $("input:radio[name='weather']:checked").is('.locked-weather') && weather !== 'Snow') {
			$(this).prop('checked', false);
		} else {
			lastTerrain = $("input:checkbox[name='terrain']:checked").not(this).val();
			$("input:checkbox[name='terrain']").not(this).prop("checked", false);
		}
	}
	var terrainValue = $("input:checkbox[name='terrain']:checked").val();
	if (['type1', 'type2', 'teraType', 'teraToggle', 'item'].includes(className)) {
		var id = $(this).closest(".poke-info").prop("id");
		if (terrainValue === "Electric") {
			$("#" + id).find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#" + id)));
		} else if (terrainValue === "Misty") {
			$("#" + id).find(".status").prop("disabled", isPokeInfoGrounded($("#" + id)));
		}
	} else if (className === "ability") {
		if (terrainValue === "Electric") {
			$("#p1").find(".status").prop("disabled", false);
			$("#p2").find(".status").prop("disabled", false);
			$("#p1").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p1")));
			$("#p2").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p2")));
		} else if (terrainValue === "Misty") {
			$("#p1").find(".status").prop("disabled", isPokeInfoGrounded($("#p1")));
			$("#p2").find(".status").prop("disabled", isPokeInfoGrounded($("#p2")));
		} else {
			$("#p1").find("[value='Asleep']").prop("disabled", false);
			$("#p1").find(".status").prop("disabled", false);
			$("#p2").find("[value='Asleep']").prop("disabled", false);
			$("#p2").find(".status").prop("disabled", false);
		}
	} else {
		if (terrainValue === "Electric") {
			// need to enable status because it may be disabled by Misty Terrain before.
			$("#p1").find(".status").prop("disabled", false);
			$("#p2").find(".status").prop("disabled", false);
			$("#p1").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p1")));
			$("#p2").find("[value='Asleep']").prop("disabled", isPokeInfoGrounded($("#p2")));
		} else if (terrainValue === "Misty") {
			$("#p1").find(".status").prop("disabled", isPokeInfoGrounded($("#p1")));
			$("#p2").find(".status").prop("disabled", isPokeInfoGrounded($("#p2")));
		} else {
			$("#p1").find("[value='Asleep']").prop("disabled", false);
			$("#p1").find(".status").prop("disabled", false);
			$("#p2").find("[value='Asleep']").prop("disabled", false);
			$("#p2").find(".status").prop("disabled", false);
		}
	}
	//dream world sleep
	var typesP1 = [$("#p1").find(".type1").val(), $("#p1").find(".type2").val()];
	var typesP2 = [$("#p2").find(".type1").val(), $("#p2").find(".type2").val()];
	if (terrainValue === "Dream World") {
		if (typesP1.some((e) => ['Normal', 'Psychic'].includes(e))) {
			$("#p1").find(".status").val("Asleep");
			$("#p1" + " .status").change();
		} else if ($("#p1 .status").val() === "Asleep") {
			$("#p1").find(".status").val("Healthy");
			$("#p1").find(".status").change();
		}
		if (typesP2.some((e) => ['Normal', 'Psychic'].includes(e))) {
			$("#p2").find(".status").val("Asleep");
			$("#p2" + " .status").change();
		} else if ($("#p2 .status").val() === "Asleep") {
			$("#p2").find(".status").val("Healthy");
			$("#p2").find(".status").change();
		}
	} else if (lastTerrain === "Dream World") {
		if ($("#p1 .status").val() === "Asleep" || !$("#p1 .status").val()) {
			$("#p1").find(".status").val("Healthy");
			$("#p1").find(".status").change();
		}
		if ($("#p2 .status").val() === "Asleep" || !$("#p2 .status").val()) {
			$("#p2").find(".status").val("Healthy");
			$("#p2").find(".status").change();
		}
	}

	//frozen kingdom
	if (terrainValue === "Frozen Kingdom") {
		if (!typesP1.includes('Ice')) {
			if (storeBoosts['Frozen Kingdom1']) { //else speed will keep getting lowered on all terrain triggers
				storeBoosts['Frozen Kingdom1'].apply();
			}
			lowerStatStage($("#p1"), 'sp', 1, 'Frozen Kingdom1');
		}
		if (!typesP2.includes('Ice')) {
			if (storeBoosts['Frozen Kingdom2']) {
				storeBoosts['Frozen Kingdom2'].apply();
			}
			lowerStatStage($("#p2"), 'sp', 1, 'Frozen Kingdom2');
		}
		if (weather !== "Snow") {
			if ($(this).is("input:checkbox[name='terrain']:checked")) {
				stickyWeather.clearStickyWeather();
			}
			autosetWeather("Frozen Kingdom", 0);
		}
	} else {
		storeBoosts['Frozen Kingdom1'] = false;
		storeBoosts['Frozen Kingdom2'] = false;
		if (lastTerrain === "Frozen Kingdom" && weather === "Snow") {
			autosetWeather("None", 0);
		}
	}
	
	checkBoostItem($("#p1"));
	checkBoostItem($("#p2"));
}

function raiseStatStage(pokeInfo, stat, numStages, source) {
	var types = [pokeInfo.find(".type1").val(), pokeInfo.find(".type2").val()];
	var ability = pokeInfo.find(".ability").val();
	var item = pokeInfo.find(".item").val();
	var boosts = pokeInfo.find("." + stat + " .boost");
	
	var before = new Boosts(pokeInfo);
	if (ability !== "Dry-Aged") {
		if (ability === "Simple") {
			numStages *= 2;
		} else if (ability === "Contrary") {
			numStages *= -1;
		}
		boosts.val(Math.min(Number(boosts.val()) + numStages, 6));
	}
	var after = new Boosts(pokeInfo);
	if (!source.includes('multi') || !storeBoosts[source]) {
		storeBoosts[source] = before.minus(after);
	} else {
		var more = before.minus(after);
		storeBoosts[source].plus(more);
	}
}

function lowerStatStage(pokeInfo, stat, numStages, source, intim = false) {
	var types = [pokeInfo.find(".type1").val(), pokeInfo.find(".type2").val()];
	var ability = pokeInfo.find(".ability").val();
	var item = pokeInfo.find(".item").val();
	var id = pokeInfo.attr('id');
	var boosts = pokeInfo.find("." + stat + " .boost");
	if (ability === "Mirror Armor" && !source.includes('Frozen Kingdom')) {
		if (id === "p1") {
			boosts = $("#p2").find("." + stat + " .boost");
			id = "p2";
			ability = $("#p2 .ability").val();
			item = $("#p2 .item").val();
		} else if (id === "p2") {
			boosts = $("#p1").find("." + stat + " .boost");
			id = "p1";
			ability = $("#p1 .ability").val();
			item = $("#p1 .item").val();
		}
	}
	var dropImmune = ['Clear Body', 'White Smoke', 'Full Metal Body', 'Golden Hour', 'Moribund', 'Dry-Aged', 'Hydrochasm Surge', 'Hydrochasm Surge++', ].includes(ability) || (ability === "Flower Veil" && types.includes("Grass")) || ['Clear Amulet', 'White Herb'].includes(item);
	var intimImmune = dropImmune || ['Inner Focus', 'Own Tempo', 'Oblivious', 'Scrappy', 'Mind\'s Eye', 'Bird of Prey', 'Soul Ablaze', 'Fiery Spirit', 'Guard Dog'].includes(ability);
	
	var before = new Boosts($("#" + id));
	if (item === "Adrenaline Orb" && intim) {
		var sp = pokeInfo.find(".sp .boost")
		sp.val(Math.min(Number(sp.val()) + 1, 6));
	}
	if (!dropImmune) {
		if (ability === "Simple") {
			numStages *= 2;
		} else if (ability === "Contrary") {
			numStages *= -1;
		}
		if (!(ability === "Hyper Cutter" && boosts.hasClass("at")) && !(intim && intimImmune)) {
			boosts.val(Math.min(Math.max(Number(boosts.val()) - numStages, -6), 6));
			if (ability === "Defiant") {
				var at = pokeInfo.find(".at .boost")
				at.val(Math.min(Number(at.val()) + 2, 6));
			} else if (ability === "Competitive") {
				var sa = pokeInfo.find(".sa .boost")
				sa.val(Math.min(Number(sa.val()) + 2, 6));
			}
		}
		if (intim) {
			if (ability === "Guard Dog") {
				var at = pokeInfo.find(".at .boost")
				at.val(Math.min(Number(at.val()) + 1, 6));
			} else if (ability === "Rattled") {
				var sp = pokeInfo.find(".sp .boost")
				sp.val(Math.min(Number(sp.val()) + 1, 6));
			}
		}
	}
	var after = new Boosts($("#" + id));
	if (source.includes('multi') && storeBoosts[source]) {
		var more = before.minus(after);
		storeBoosts[source].plus(more);
	} else {
		storeBoosts[source] = before.minus(after);
	}
}

function loadDefaultLists(id) {
	$("#" + id + " .set-selector").select2({
		formatResult: function (object) {
			if ($("#randoms").prop("checked")) {
				return object.pokemon;
			} else {
				return object.set ? ("&nbsp;&nbsp;" + object.pokemon + " (" + object.set + ")") : ("<b>" + object.text + "</b>");
			}
		},
		query: function (query) {
			var pageSize = 30;
			var results = [];
			var options = getSetOptions();
			for (var i = 0; i < options.length; i++) {
				var option = options[i];
				var pokeName = option.pokemon.toUpperCase();
				var setName = option.set ? option.set.toUpperCase() : "";
				if ((!query.term || query.term.toUpperCase().split(" ").every(function (term) {
					return pokeName.indexOf(term) === 0 || pokeName.indexOf("-" + term) >= 0 || pokeName.indexOf(" " + term) >= 0 || setName.indexOf(term) === 0 || setName.indexOf("-" + term) >= 0 || setName.indexOf(" " + term) >= 0;
				}))) {
					if ($("#randoms").prop("checked")) {
						if (option.id) results.push(option);
					} else {
						results.push(option);
					}
				}
			}
			query.callback({
				results: results.slice((query.page - 1) * pageSize, query.page * pageSize),
				more: results.length >= query.page * pageSize
			});
		},
		initSelection: function (element, callback) {
			callback(getFirstValidSetOption());
		}
	});
}

function allPokemon(selector) {
	var allSelector = "";
	for (var i = 0; i < $(".poke-info").length; i++) {
		if (i > 0) {
			allSelector += ", ";
		}
		allSelector += "#p" + (i + 1) + " " + selector;
	}
	return allSelector;
}

function loadCustomList(id, sets) {
	$("#" + id + " .set-selector").select2({
		formatResult: function (set) {
			return (set.nickname ? set.pokemon + " (" + set.nickname + ")" : set.id);
		},
		query: function (query) {
			var pageSize = 30;
			var results = [];
			var options = !!sets ? getSetOptions(sets) : getSetOptions();
			for (var i = 0; i < options.length; i++) {
				var option = options[i];
				var pokeName = option.pokemon.toUpperCase();
				var setName = option.set ? option.set.toUpperCase() : option.set;
				if (option.isCustom && option.set && (!query.term || query.term.toUpperCase().split(" ").every(function (term) {
					return pokeName.indexOf(term) === 0 || pokeName.indexOf("-" + term) >= 0 || pokeName.indexOf(" " + term) >= 0 || setName.indexOf(term) === 0 || setName.indexOf("-" + term) >= 0 || setName.indexOf(" " + term) >= 0;
				}))) {
					results.push(option);
				}
			}
			query.callback({
				results: results.slice((query.page - 1) * pageSize, query.page * pageSize),
				more: results.length >= query.page * pageSize
			});
		},
		initSelection: function (element, callback) {
			var data = !!sets ? getFirstValidSetOption(sets) : getFirstValidSetOption();
			callback(data);
		}
	});
}

$(document).ready(function () {
	var params = new URLSearchParams(window.location.search);
	var g = GENERATION[params.get('gen')] || 10;
	$("#gen" + g).prop("checked", true);
	$("#gen" + g).change();
	$("#percentage").prop("checked", true);
	$("#percentage").change();
	$("#singles-format").prop("checked", true);
	$("#singles-format").change();
	$("#default-level-120").prop("checked", true);
	$("#default-level-120").change();
	loadDefaultLists('p1');
	loadDefaultLists('p2');
	$(".move-selector").select2({
		dropdownAutoWidth: true,
		matcher: function (term, text) {
			// 2nd condition is for Hidden Power
			return text.toUpperCase().indexOf(term.toUpperCase()) === 0 || text.toUpperCase().indexOf(" " + term.toUpperCase()) >= 0;
		}
	});
	$(".set-selector").val(getFirstValidSetOption().id);
	$(".set-selector").change();
	$(".terrain-trigger").bind("change keyup", getTerrainEffects);
});

/* Click-to-copy function */
$("#mainResult").click(function () {
	navigator.clipboard.writeText($("#mainResult").text()).then(function () {
		document.getElementById('tooltipText').style.visibility = 'visible';
		setTimeout(function () {
			document.getElementById('tooltipText').style.visibility = 'hidden';
		}, 1500);
	});
});
