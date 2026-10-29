/* Elenco dei paesi: nomi italiani generati con Intl.DisplayNames,
   bandiere emoji costruite dai codici ISO 3166-1 alpha-2. */
(function () {
  "use strict";

  const CODES = `
    AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
    BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
    CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
    DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
    GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
    HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
    KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY
    MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
    NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY
    QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
    TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
    UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
  `.trim().split(/\s+/);

  const FALLBACK_NAMES = {
    IT: "Italia",
    US: "Stati Uniti",
    GB: "Regno Unito",
    FR: "Francia",
    DE: "Germania",
    ES: "Spagna",
    PT: "Portogallo",
    CH: "Svizzera",
    AT: "Austria",
    NL: "Paesi Bassi",
    BE: "Belgio",
    SE: "Svezia",
    NO: "Norvegia",
    DK: "Danimarca",
    FI: "Finlandia",
    JP: "Giappone",
    CN: "Cina",
    IN: "India",
    BR: "Brasile",
    AR: "Argentina",
    MX: "Messico",
    CA: "Canada",
    AU: "Australia",
    NZ: "Nuova Zelanda",
    GR: "Grecia",
    TR: "Turchia",
    EG: "Egitto",
    MA: "Marocco",
    ZA: "Sudafrica",
    KR: "Corea del Sud"
  };

  let displayNames = null;
  try {
    if (typeof Intl !== "undefined" && Intl.DisplayNames) {
      displayNames = new Intl.DisplayNames(["it"], { type: "region" });
    }
  } catch (error) {
    displayNames = null;
  }

  function flagFor(code) {
    const upper = String(code || "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) return "🌍";
    return upper.replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
  }

  function nameFor(code) {
    let name = null;
    try {
      name = displayNames ? displayNames.of(code) : null;
    } catch (error) {
      name = null;
    }
    if (!name || name === code) name = FALLBACK_NAMES[code] || code;
    return name;
  }

  const list = CODES
    .map((code) => ({ code, name: nameFor(code), flag: flagFor(code) }))
    .filter((country) => country.name && country.name !== country.code)
    .sort((a, b) => a.name.localeCompare(b.name, "it"));

  const byCode = {};
  list.forEach((country) => {
    byCode[country.code] = country;
  });

  window.FiorituraCountries = {
    list,
    byCode,
    flag: flagFor,
    name: (code) => (byCode[code] ? byCode[code].name : nameFor(code))
  };
})();
