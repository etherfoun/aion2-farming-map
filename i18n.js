/**
 * Aion 2 Altgard — Localization System (RU / EN)
 * Contains complete translations for UI, Map Zones, and Pet Species.
 */

const I18N = {
  currentLang: (function() {
    try {
      return localStorage.getItem('aion2_lang') || 'ru';
    } catch (e) {
      return 'ru';
    }
  })(),

  listeners: [],

  onChange(fn) {
    if (typeof fn === 'function') {
      this.listeners.push(fn);
    }
  },

  t(key, params) {
    const dict = this.translations[this.currentLang] || this.translations.ru;
    let text = dict[key] || (this.translations.ru && this.translations.ru[key]) || key;
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(p => {
        text = text.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
      });
    }
    return text;
  },

  getZoneName(canonicalName, lang) {
    const l = lang || this.currentLang;
    if (l === 'ru') {
      return this.zoneTranslations[canonicalName] || canonicalName;
    }
    return canonicalName;
  },

  getSpeciesName(canonicalName, lang) {
    const l = lang || this.currentLang;
    if (l === 'ru') {
      return this.speciesTranslations[canonicalName] || canonicalName;
    }
    return canonicalName;
  },

  setLanguage(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    this.currentLang = lang;
    try {
      localStorage.setItem('aion2_lang', lang);
    } catch (e) {}

    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      this.updateDOM();
    }

    this.listeners.forEach(fn => {
      try {
        fn(lang);
      } catch (e) {
        console.error('Error in i18n listener:', e);
      }
    });
  },

  updateDOM() {
    // 1. Text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    // 2. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // 3. Titles / tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // 4. Lang switcher active state
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
    });
  },

  translations: {
    ru: {
      docTitle: 'Aion 2 Altgard — Калькулятор топ-спотов фарма питомцев',
      appTitle: 'AION 2 • Altgard',
      appBadge: 'Spotter',
      appSubtitle: 'Интерактивный калькулятор топ-спотов фарма',
      sidebarToggleTitle: 'Свернуть / развернуть панель',

      // Onboarding Guide
      quickStartTitle: 'Быстрый старт',
      quickStartToggleTitle: 'Свернуть / развернуть подсказки',
      quickStartStep1: '1. Выберите питомца или жанр',
      quickStartStep2: '2. Настройте радиус спота или выберите пресет',
      quickStartStep3: '3. Нажмите на спот из топа для перехода на карте',

      // Step cards
      step1Title: 'Жанр и питомцы',
      step2Title: 'Зона и радиус',
      step3Title: 'Топ спотов',

      // Genre pills
      genreSectionLabel: 'Жанр питомца',
      genreAll: 'Все питомцы',
      genreMulti: 'Мульти-споты',

      // Pure pets toggle
      purePetsOnlyTitle: 'Только спавны питомцев',
      purePetsCount: '{count} активных меток спавна',
      allPetsCount: 'Все спавны видов-питомцев ({count})',

      // Mob select
      mobsSectionLabel: 'Выбор конкретных питомцев',
      mobsAllIndicator: 'Все',
      mobsSelectedIndicator: '{count} выбр.',
      mobSearchPlaceholder: 'Поиск питомца по названию...',
      searchClearTitle: 'Очистить поиск',
      btnSelectAllMobs: 'Выбрать всех',
      btnClearMobs: 'Сбросить',
      btnHideSelectedMobs: 'Скрыть выбр.',
      excludeCollectedLabel: 'Исключать собранных из расчёта',
      noMobsFound: 'Питомцев не найдено',
      restorePetTitle: 'Вернуть питомца на карту',
      collectPetTitle: 'Отметить как собранного (скрыть)',

      // Zone filter
      zoneSectionLabel: 'Локация / Зона',
      zoneAll: 'Вся карта Altgard',
      zoneHint: 'Фильтр поиска спотов по конкретной зоне',

      // Spot parameters
      radiusSectionLabel: 'Радиус пула спота',
      radiusMeters: '{val} м',
      radiusHint: 'Дистанция сбора мобов для одновременного фарма',
      presetSolo: '60м',
      presetDefault: '80м',
      presetWide: '120м',
      minMobsSectionLabel: 'Мин. питомцев на споте',
      minMobsHint: 'Минимум мобов для образования спота',

      // Map layers
      mapLayersSectionLabel: 'Отображение на карте',
      toggleMobMarkers: 'Точки спавна мобов',
      toggleZones: 'Зоны и полигоны карты',
      toggleCircles: 'Окружности радиуса спотов',

      // Spots leaderboard
      spotsSectionLabel: 'Топ профитных спотов',
      spotsCountBadge: '{count} спотов',
      noSpotsFound: 'Нет доступных спотов под выбранные параметры (все питомцы собраны или не подходят)',
      emptyStateTitle: 'Споты не найдены',
      emptyStateDesc: 'Под текущие параметры не найдено скоплений питомцев.',
      emptyStateTip1: 'Попробуйте уменьшить «Мин. питомцев на споте» (до 1–2)',
      emptyStateTip2: 'Попробуйте увеличить «Радиус пула спота» (например, 120м)',
      emptyStateTip3: 'Проверьте список собранных (возможно, нужные питомцы скрыты)',
      spotCardTitle: 'Спот #{rank}',
      spotCardMobsCount: '{count} питомцев',
      spotCardMapCoords: 'Карта: {lat}, {lng}',
      copyBtn: 'Копировать',

      // HUD
      btnCollectedLabel: 'Собранные',
      btnCollected: 'Собранные ({count})',
      btnCollectedTitle: 'Открыть список собранных питомцев',
      btnFitMap: 'Центрировать',
      btnFitMapTitle: 'Показать всю карту',
      cursorHUDInitial: 'Курсор: X: ----, Y: ----',
      cursorHUD: 'Курсор: [{lat}, {lng}]',

      // Popups
      markerCoords: 'Координаты: {lat}, {lng}',
      btnHidePin: 'Скрыть точку',
      btnHideSpecies: 'Скрыть весь вид',
      popupSpeciesInRadius: 'Этого вида в радиусе {radius}м: {count}',
      popupTotalNearby: 'Всего рядом: {count}',
      popupOtherSpeciesTitle: 'Другие виды рядом:',
      tooltipSpeciesCount: 'Этого вида в радиусе {radius}м: {count}',
      tooltipTotalNearby: 'Всего рядом: {count}',
      badgeTitleSame: '{name}: {count} в радиусе {radius}м',
      badgeTitleMixed: '{name}: {same} (всего рядом: {total}) в радиусе {radius}м',
      spotPopupTitle: 'Спот #{rank}',
      spotPopupMobsCount: '({count} питомцев)',
      spotPopupComposition: 'Состав питомцев (R = {radius}м):',
      hidePetInPopupTitle: 'Скрыть питомца (собран)',

      // Collected Modal
      modalTitle: 'Собранные питомцы',
      modalSubtext: 'Питомцы и точки, скрытые из отображения и расчёта спотов:',
      modalEmpty: 'Вы ещё не скрыли ни одного питомца',
      modalSpeciesHeader: 'Скрытые виды питомцев ({count}):',
      modalPinsHeader: 'Скрытые отдельные метки ({count}):',
      modalPinLabel: 'Метка ID #{pinId}',
      modalRestoreBtn: 'Вернуть',
      modalResetAllBtn: 'Вернуть всех (сбросить)',
      modalCloseBtn: 'Закрыть',

      // Toasts
      toastCopied: 'Координаты скопированы',
      toastCopiedCoords: 'Координаты [{coords}] скопированы',
      toastSpeciesRestored: 'Питомец [{name}] возвращен',
      toastSpeciesHidden: 'Питомец [{name}] скрыт (собран)',
      toastPinRestored: 'Метка #{pinId} возвращена',
      toastPinHidden: 'Точка [{name}] скрыта как собранная',
      toastAllRestored: 'Все питомцы и метки возвращены на карту',
      toastSelectFirst: 'Сначала выберите питомцев чекбоксами',
      toastHiddenCount: 'Скрыто питомцев: {count}'
    },

    en: {
      docTitle: 'Aion 2 Altgard — Spot Farm Optimizer',
      appTitle: 'AION 2 • Altgard',
      appBadge: 'Spotter',
      appSubtitle: 'Interactive Top Farm Spots Calculator',
      sidebarToggleTitle: 'Collapse / expand sidebar',

      // Onboarding Guide
      quickStartTitle: 'Quick Start Guide',
      quickStartToggleTitle: 'Collapse / expand guide',
      quickStartStep1: '1. Choose pet species or genre',
      quickStartStep2: '2. Adjust radius or pick preset',
      quickStartStep3: '3. Click top spot to jump to map',

      // Step cards
      step1Title: 'Genre & Pets',
      step2Title: 'Zone & Radius',
      step3Title: 'Top Spots',

      // Genre pills
      genreSectionLabel: 'Pet Genre',
      genreAll: 'All Pets',
      genreMulti: 'Multi-genre Spots',

      // Pure pets toggle
      purePetsOnlyTitle: 'Dedicated Pet Spawns Only',
      purePetsCount: '{count} active spawn pins',
      allPetsCount: 'All species spawns ({count})',

      // Mob select
      mobsSectionLabel: 'Specific Pets Selection',
      mobsAllIndicator: 'All',
      mobsSelectedIndicator: '{count} sel.',
      mobSearchPlaceholder: 'Search pet by name...',
      searchClearTitle: 'Clear search',
      btnSelectAllMobs: 'Select All',
      btnClearMobs: 'Reset',
      btnHideSelectedMobs: 'Hide Selected',
      excludeCollectedLabel: 'Exclude collected from calculation',
      noMobsFound: 'No pets found',
      restorePetTitle: 'Restore pet to map',
      collectPetTitle: 'Mark as collected (hide)',

      // Zone filter
      zoneSectionLabel: 'Location / Zone',
      zoneAll: 'All Altgard Map',
      zoneHint: 'Filter spots inside a specific map area',

      // Spot parameters
      radiusSectionLabel: 'Spot Cluster Radius',
      radiusMeters: '{val} m',
      radiusHint: 'Mob pull distance for concurrent farming',
      presetSolo: '60m',
      presetDefault: '80m',
      presetWide: '120m',
      minMobsSectionLabel: 'Min. Pets per Spot',
      minMobsHint: 'Minimum mobs required to form a spot',

      // Map layers
      mapLayersSectionLabel: 'Map Display Layers',
      toggleMobMarkers: 'Pet Spawn Markers',
      toggleZones: 'Zones & Polygons',
      toggleCircles: 'Spot Radius Circles',

      // Spots leaderboard
      spotsSectionLabel: 'Top Farming Spots',
      spotsCountBadge: '{count} spots',
      noSpotsFound: 'No available spots for the selected parameters (all pets collected or do not match)',
      emptyStateTitle: 'No spots found',
      emptyStateDesc: 'No pet clusters match your current filter settings.',
      emptyStateTip1: 'Try reducing «Min. Pets per Spot» (e.g. to 1–2)',
      emptyStateTip2: 'Try increasing «Spot Cluster Radius» (e.g. 120m preset)',
      emptyStateTip3: 'Check collected pets list (they might be hidden)',
      spotCardTitle: 'Spot #{rank}',
      spotCardMobsCount: '{count} pets',
      spotCardMapCoords: 'Map: {lat}, {lng}',
      copyBtn: 'Copy',

      // HUD
      btnCollectedLabel: 'Collected',
      btnCollected: 'Collected ({count})',
      btnCollectedTitle: 'Open collected pets list',
      btnFitMap: 'Reset View',
      btnFitMapTitle: 'Show whole map',
      cursorHUDInitial: 'Cursor: X: ----, Y: ----',
      cursorHUD: 'Cursor: [{lat}, {lng}]',

      // Popups
      markerCoords: 'Coordinates: {lat}, {lng}',
      btnHidePin: 'Hide Pin',
      btnHideSpecies: 'Hide Species',
      popupSpeciesInRadius: 'This species within {radius}m: {count}',
      popupTotalNearby: 'Total nearby: {count}',
      popupOtherSpeciesTitle: 'Other species nearby:',
      tooltipSpeciesCount: 'This species within {radius}m: {count}',
      tooltipTotalNearby: 'Total nearby: {count}',
      badgeTitleSame: '{name}: {count} within {radius}m',
      badgeTitleMixed: '{name}: {same} (total nearby: {total}) within {radius}m',
      spotPopupTitle: 'Spot #{rank}',
      spotPopupMobsCount: '({count} pets)',
      spotPopupComposition: 'Pet Composition (R = {radius}m):',
      hidePetInPopupTitle: 'Hide pet (collected)',

      // Collected Modal
      modalTitle: 'Collected Pets',
      modalSubtext: 'Pets and pins hidden from display and spot calculation:',
      modalEmpty: "You haven't hidden any pets yet",
      modalSpeciesHeader: 'Hidden pet species ({count}):',
      modalPinsHeader: 'Hidden individual pins ({count}):',
      modalPinLabel: 'Pin ID #{pinId}',
      modalRestoreBtn: 'Restore',
      modalResetAllBtn: 'Restore All (Reset)',
      modalCloseBtn: 'Close',

      // Toasts
      toastCopied: 'Coordinates copied',
      toastCopiedCoords: 'Coordinates [{coords}] copied',
      toastSpeciesRestored: 'Pet [{name}] restored',
      toastSpeciesHidden: 'Pet [{name}] hidden (collected)',
      toastPinRestored: 'Pin #{pinId} restored',
      toastPinHidden: 'Pin [{name}] hidden as collected',
      toastAllRestored: 'All pets and pins restored to the map',
      toastSelectFirst: 'Please select pets with checkboxes first',
      toastHiddenCount: 'Hidden pets: {count}'
    }
  },

  zoneTranslations: {
    'Safe Haven': 'Убежище',
    'Dredgion Crash Site': 'Место крушения Дерадикона',
    "Galorik's Inspection Area": 'Зона досмотра Галорика',
    'Quai Campsite': 'Лагерь Куая',
    'Gravekeeper Camp': 'Лагерь могильщика',
    'Temporary Retreat': 'Временное убежище',
    "Watcher's Tent": 'Палатка наблюдателя',
    'Creion Campsite': 'Лагерь Крейона',
    'Mire Campsite': 'Болотный лагерь',
    'Calderon Canyon': 'Каньон Кальдерон',
    'Nameless Cemetery': 'Безымянное кладбище',
    'Neglected Crematorium': 'Заброшенный крематорий',
    'Temporary Investigation Base': 'Временная исследовательская база',
    'Searcher Rock': 'Скала Искателя',
    'Canyon Dispatch Area': 'Пост каньона',
    'Tranein Pond': 'Пруд Транеин',
    "Munin's Bridge": 'Мост Мунина',
    'Minushan Site': 'Стоянка Минушана',
    "Victorious Daeva's Statue": 'Статуя победоносного даэва',
    'Sanctum Outpost': 'Аванпост Элизиума',
    'Fang Hideout': 'Убежище Клыков',
    'Silent Hill': 'Безмолвный холм',
    'Tranein Highland': 'Нагорье Транеин',
    'Faded Stump': 'Увядший пень',
    "Odar's Shade": 'Тень Одара',
    'Dranactus': 'Дранактус',
    'Moslan Forest': 'Лес Мослан',
    "Elim's Rest": 'Покой элима',
    'Forest Hideout': 'Лесное убежище',
    'Collapsed Chasm': 'Обвалившаяся расселина',
    'Briskwind Shelter': 'Укрытие свежего ветра',
    'Nornir Assembly': 'Собрание Норнир',
    'Hidden Cave': 'Скрытая пещера',
    'Battlescar Mound': 'Курган боевых шрамов',
    "North Laborer's Tent": 'Северная палатка рабочих',
    "South Laborer's Tent": 'Южная палатка рабочих',
    'Uruthumheim': 'Урутумхейм',
    'Abandoned Site': 'Заброшенное место',
    'Purifying Forest': 'Очищающий лес',
    'Guide Rest Stop': 'Привал проводника',
    'Healing Spring': 'Исцеляющий источник',
    'Destroyed Ruins': 'Разрушенные руины',
    'Shulak Street Stall': 'Лавка шураков',
    'Mahindel Cliff': 'Утёс Махиндел',
    'Steel Hammer Base': 'База Стального молота',
    'Steel Hammer Workcamp': 'Лагерь Стального молота',
    'Abandoned Campsite': 'Заброшенный лагерь',
    'Basfelt Ruins': 'Руины Басфельта',
    'Basfelt Waterfall': 'Водопад Басфельта',
    'Graverobber Campsite': 'Лагерь расхитителей гробниц',
    'Steel Hammer Merchants HQ': 'Штаб торговцев Стального молота',
    'Mahindel River': 'Река Махиндел',
    'Western Gribade Highland': 'Западное плато Грибад',
    'Fafnite Deposit': 'Месторождение фафнита',
    "Idun's Lake": 'Озеро Идун',
    'Eastern Gribade Highland': 'Восточное плато Грибад',
    "Amunta's Hideout": 'Убежище Амунты',
    "Zemurru's Tomb": 'Гробница Земурру',
    'Secret Rendezvous Point': 'Тайное место встречи',
    'Black Claw Village': 'Деревня Черного когтя',
    "Kumrica's Cellar": 'Погреб Кумрики',
    "Muqaka's Quarters": 'Покои Мукаки',
    'Collapsed Hall Of Fame': 'Обрушившийся зал славы',
    'Fissure Cave': 'Пещера расселины',
    'Immortal Isle': 'Остров Бессмертных',
    "Guide's Dwelling": 'Жилище проводника',
    'Steel Hammer Temporary Trading Post': 'Временный торговый пост Стального молота',
    'Lagta Fortress': 'Крепость Лагта',
    'Outskirts Stall': 'Окраинная лавка',
    'Impetusium Square': 'Площадь Импетизиума',
    'Southern Gribade Highland': 'Южное плато Грибад',
    'Spirit Isle': 'Остров духов',
    'Altgard': 'Альтгард'
  },

  speciesTranslations: {
    'Decomposed Lupyllini': 'Разложившийся люфилини',
    'Modified Lupyllini': 'Модифицированный люфилини',
    'Dratona': 'Дратона',
    'Drakan Watcher': 'Дракан-наблюдатель',
    'Mumu Warrior': 'Воин муму',
    'Kerubar': 'Керубар',
    'Kuru Worker': 'Рабочий куру',
    'Mumu Worker': 'Рабочий муму',
    'Kerubiel': 'Керубиэль',
    'Kuru Tinkerer': 'Мастер куру',
    'Varg Berserker': 'Берсерк варгов',
    'Kerubian': 'Керубиан',
    'Kuru Overseer': 'Смотритель куру',
    'Manduri Trebuchet Worker': 'Мандури-катапультист',
    'Biruta Herbalist': 'Травник бирута',
    'Biruta': 'Бирута',
    'Elite Manduri Fighter': 'Элитный боец мандури',
    'Dracuni Herbalist': 'Травник дракуни',
    'Manduri Fighter': 'Боец мандури',
    'Addicted Shulak Cart Worker': 'Зависимый шурак-погонщик',
    'Klaw Scout': 'Разведчик клавов',
    'Papis': 'Папис',
    'Withered Branch Spider': 'Паук сухих ветвей',
    'Kailin': 'Кайлин',
    'Young Kailin': 'Молодой кайлин',
    'Slink': 'Слинк',
    'Starturtle': 'Звездная черепаха',
    'Ashen Spider': 'Пепельный паук',
    'Aberrant Bee': 'Мутировавшая пчела',
    'Young Slink': 'Молодой слинк',
    'Potcrab': 'Панцирный краб',
    'Brax': 'Бракс',
    'Aberrant Tog': 'Мутировавший тог',
    'Sylphen': 'Сильфен',
    'Young Ursus': 'Молодой урсус',
    'Ursus': 'Урсус',
    'Tamed Karnif': 'Прирученный карниф',
    'Airon': 'Айрон',
    'Crasaur': 'Кразавр',
    'Aberrant Coradon': 'Мутировавший корадон',
    'Drakan Watchdog': 'Сторожевой пес драканов',
    'Unstable Spider': 'Нестабильный паук',
    'Aberrant Zaif': 'Мутировавший заиф',
    'Armadon': 'Армадон',
    'Tayga': 'Тайга',
    'Eternal Coradon': 'Вечный корадон',
    'Tog': 'Тог',
    'Skyray': 'Небесный скат',
    'Giant Sparkie': 'Гигантская искорка',
    'Fossa': 'Фосса',
    'Scorpion': 'Скорпион',
    'Mutated Aberrant Odyle Spider': 'Мутировавший одиловый паук',
    'Vivel': 'Вивель',
    'Cadaver Insectoid': 'Трупный инсектоид',
    'Basilisk': 'Василиск',
    'Mutated Ursus': 'Мутировавший урсус',
    'Rafflesia': 'Раффлезия',
    'Agrint': 'Агринт',
    'Nepenthes': 'Непентес',
    'Magic Gravi': 'Магический грави',
    'Superior Water Spirit': 'Высший дух воды',
    'Superior Fire Spirit': 'Высший дух огня',
    'Mutated Forest Guardian': 'Мутировавший страж леса',
    'Superior Earth Spirit': 'Высший дух земли',
    'Superior Wind Spirit': 'Высший дух ветра',
    'Intermediate Water Spirit': 'Средний дух воды',
    'Intermediate Fire Spirit': 'Средний дух огня',
    'Odyle Stone Spirit': 'Одиловый дух камня',
    'Zelophi': 'Зелофи',
    'Large Leaf Gravi': 'Широколистный грави',
    'Black Spirit': 'Черный дух',
    'Ashen Dionae': 'Пепельная дионея',
    'Forest Spirit': 'Дух леса',
    'Mutated Forest Spirit': 'Мутировавший дух леса',
    'Lesser Wind Spirit': 'Младший дух ветра',
    'Stone Spirit': 'Дух камня',
    'Intermediate Earth Spirit': 'Средний дух земли',
    'Intermediate Wind Spirit': 'Средний дух ветра',
    'Gravi': 'Грави',
    'Thin Agrint': 'Тонкий агринт',
    'Lesser Fire Spirit': 'Младший дух огня',
    'Ashen Agrint': 'Пепельный агринт',
    'Drakan Probe': 'Зонд драканов',
    'Cadaver Cleaner': 'Трупный падальщик',
    'Duduka Worker': 'Рабочий дудука',
    'Duduka Trebuchet Worker': 'Дудука-катапультист',
    'Drana Mutant Brute': 'Мутант-громила драны',
    'Mudthorn': 'Грязевой шип',
    'Poison Blood': 'Ядовитая кровь',
    'Swarm': 'Рой',
    'Faded Mutant': 'Увядший мутант',
    'Vigilant Oculazen': 'Бдительный окулазен',
    'Drana Mutant': 'Мутант драны',
    'Blue Kalgolem': 'Синий калголем',
    'Soulless Corpse Gnat': 'Бездушная трупная мошка',
    'Drana Slime': 'Слизь драны',
    'Faded Floater': 'Увядший летун',
    'Oculazen': 'Окулазен',
    'Faded Predator': 'Увядший хищник',
    'Faded Mutant Brute': 'Увядший мутант-громила',
    'Distorted Mutant': 'Искаженный мутант',
    'Drana Predator': 'Хищник драны',
    'Congealed Drana': 'Загустевшая драна',
    'Kalgolem': 'Калголем',
    'Forest Monster': 'Лесное чудовище',
    'Slime': 'Слизь',
    'Parasite Swarm': 'Рой паразитов',
    'Drakana Kalgolem': 'Драканский калголем',
    'Faded Drana': 'Увядшая драна'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18N;
}
