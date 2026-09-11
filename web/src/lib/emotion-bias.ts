// СГЕНЕРИРОВАНО tools/build-emotion-bias.mjs — не править руками.
//
// Приоритет при ничьей в подборе парфюма. Когда несколько парфюмов
// оказываются на одинаковом расстоянии от предпочтений пользователя,
// выбирается тот, чьи оси ближе к эмоции, которую человек искал.
//
// Значения не назначены вручную: профиль эмоции — это средний профиль
// архетипов, взвешенный по весам её ответа из answer-weights.json,
// а смещение — отклонение этого профиля от среднего по каталогу.
// Положительное значение означает "при прочих равных бери выше по этой оси".

export interface AxisBias {
  sweet: number;
  raw: number;
  projection: number;
}

export const EMOTION_BIAS: Record<string, AxisBias> = {
  "Q_EMO__CALM": {
    "sweet": -0.168,
    "raw": 0.1415,
    "projection": -0.3016
  },
  "Q_EMO__ENERGY": {
    "sweet": 0.2302,
    "raw": -0.127,
    "projection": 0.5456
  },
  "Q_EMO__COZY": {
    "sweet": 0.869,
    "raw": -0.5923,
    "projection": -0.0863
  },
  "Q_EMO__MYST": {
    "sweet": -0.2143,
    "raw": 0.4167,
    "projection": -0.1667
  },
  "Q_EMO__FOCUS": {
    "sweet": -0.3948,
    "raw": -0.1548,
    "projection": 0.1845
  },
  "Q_EMO__SEXY": {
    "sweet": -0.0357,
    "raw": 0.0595,
    "projection": 0.1071
  },
  "Q_EMO__PLAY": {
    "sweet": 0.1815,
    "raw": -0.0923,
    "projection": 0.2262
  },
  "Q_CALM__TEA_HERBS": {
    "sweet": 0.3482,
    "raw": -0.4256,
    "projection": -0.0446
  },
  "Q_CALM__LINENS": {
    "sweet": 0.0357,
    "raw": -0.2381,
    "projection": -0.0238
  },
  "Q_CALM__COOL_AIR": {
    "sweet": -0.531,
    "raw": 0.5786,
    "projection": -0.0738
  },
  "Q_CALM__FIREPLAC": {
    "sweet": -0.1476,
    "raw": 0.5619,
    "projection": -0.2238
  },
  "Q_CALM__HOT_SHOW": {
    "sweet": 0.6815,
    "raw": -0.5714,
    "projection": -0.003
  },
  "Q_CALM__MILK_SOFT": {
    "sweet": 0.7024,
    "raw": -0.5714,
    "projection": -0.0738
  },
  "Q_CALM__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_ENERGY__CITRUS": {
    "sweet": -0.1476,
    "raw": -0.0214,
    "projection": 0.1929
  },
  "Q_ENERGY__COLD_SHOW": {
    "sweet": -0.5268,
    "raw": 0.7202,
    "projection": 0.0387
  },
  "Q_ENERGY__COFFEE": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_ENERGY__MUSIC": {
    "sweet": 0.7302,
    "raw": -0.2659,
    "projection": 0.3651
  },
  "Q_ENERGY__HERBS": {
    "sweet": -0.2643,
    "raw": 0.1119,
    "projection": 0.0429
  },
  "Q_ENERGY__HOT_SPICE": {
    "sweet": -0.1935,
    "raw": 0.4286,
    "projection": -0.1905
  },
  "Q_ENERGY__SUN_HEAT": {
    "sweet": 1.0079,
    "raw": -0.627,
    "projection": 0.3651
  },
  "Q_ENERGY__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_COZY__WARM_SKIN": {
    "sweet": 0.7024,
    "raw": -0.5714,
    "projection": -0.0738
  },
  "Q_COZY__BAKING": {
    "sweet": 0.6468,
    "raw": -0.5714,
    "projection": 0.1151
  },
  "Q_COZY__FIREPLAC": {
    "sweet": -0.1476,
    "raw": 0.5619,
    "projection": -0.2238
  },
  "Q_COZY__BLANKET": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_COZY__BUBBLE": {
    "sweet": 0.1357,
    "raw": -0.1381,
    "projection": 0.0095
  },
  "Q_COZY__HOT_CHOC": {
    "sweet": 0.6468,
    "raw": -0.5714,
    "projection": 0.1151
  },
  "Q_COZY__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_MYST__SMOKE": {
    "sweet": -0.081,
    "raw": 0.5452,
    "projection": -0.0071
  },
  "Q_MYST__OLD_BOOK": {
    "sweet": -0.0893,
    "raw": -0.0714,
    "projection": -0.2183
  },
  "Q_MYST__ANTIQU": {
    "sweet": -0.0198,
    "raw": 0.1786,
    "projection": -0.246
  },
  "Q_MYST__OLD_PLACES": {
    "sweet": -0.381,
    "raw": 0.8452,
    "projection": -0.1905
  },
  "Q_MYST__STARS": {
    "sweet": -0.0476,
    "raw": 0.3119,
    "projection": -0.1071
  },
  "Q_MYST__MYST_SPICE": {
    "sweet": -0.2143,
    "raw": 0.0119,
    "projection": 0.0595
  },
  "Q_MYST__UNFAMIL": {
    "sweet": -0.1865,
    "raw": 0.1091,
    "projection": -0.121
  },
  "Q_MYST__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_SEXY__ESPRESSO": {
    "sweet": -0.3185,
    "raw": 0.0119,
    "projection": 0.1845
  },
  "Q_SEXY__JAZZ": {
    "sweet": 0.1524,
    "raw": -0.1048,
    "projection": -0.2238
  },
  "Q_SEXY__SMOK_SEX": {
    "sweet": -0.2698,
    "raw": 0.7341,
    "projection": -0.246
  },
  "Q_SEXY__LEATH_SEX": {
    "sweet": -0.1643,
    "raw": 0.2119,
    "projection": 0.0762
  },
  "Q_SEXY__SALT_SEX": {
    "sweet": -0.0685,
    "raw": 0.3036,
    "projection": 0.1637
  },
  "Q_SEXY__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_FOCUS__CLEAN_AIR": {
    "sweet": -0.5893,
    "raw": 0.0119,
    "projection": 0.0179
  },
  "Q_FOCUS__LIBRARY": {
    "sweet": -0.0643,
    "raw": -0.1048,
    "projection": -0.3571
  },
  "Q_FOCUS__TEA": {
    "sweet": 0.0774,
    "raw": -0.3839,
    "projection": -0.2321
  },
  "Q_FOCUS__ICE_WATER": {
    "sweet": -0.631,
    "raw": 0.3036,
    "projection": 0.1429
  },
  "Q_FOCUS__COFFEE": {
    "sweet": -0.2976,
    "raw": -0.2381,
    "projection": 0.2679
  },
  "Q_FOCUS__LEMON_PEEL": {
    "sweet": -0.5893,
    "raw": 0.0119,
    "projection": 0.0179
  },
  "Q_FOCUS__NO_SMELL": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_FOCUS__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  },
  "Q_PLAY__BUBBLE": {
    "sweet": 0.9524,
    "raw": -0.6131,
    "projection": 0.1845
  },
  "Q_PLAY__ADVENT": {
    "sweet": -0.7143,
    "raw": 1.1786,
    "projection": -0.0238
  },
  "Q_PLAY__BRIGHT_CITR": {
    "sweet": 0.244,
    "raw": -0.3214,
    "projection": 0.6429
  },
  "Q_PLAY__FRUIT": {
    "sweet": 0.3065,
    "raw": -0.1339,
    "projection": 0.0804
  },
  "Q_PLAY__GREEN_FRESH": {
    "sweet": -0.631,
    "raw": 0.4008,
    "projection": 0.004
  },
  "Q_PLAY__FLIRT": {
    "sweet": -0.2976,
    "raw": -0.2381,
    "projection": 0.2679
  },
  "Q_PLAY__OTHER": {
    "sweet": 0,
    "raw": 0,
    "projection": 0
  }
};
