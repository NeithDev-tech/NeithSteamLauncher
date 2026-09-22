(() => {
  'use strict';

  const STORAGE_KEY = 'neith_language';
  const supported = new Set(['es', 'en']);

  const ES_TO_EN = {
    'Neith Steam Launcher — Web oficial': 'Neith Steam Launcher — Official Website',
    'Logros': 'Achievements',
    'Juegos Gratis': 'Free Games',
    'Cuentas': 'Accounts',
    'INICIAR SESIÓN': 'SIGN IN',
    'MI CUENTA': 'MY ACCOUNT',
    'CERRAR SESIÓN': 'SIGN OUT',
    'REGISTRARSE': 'REGISTER',
    'Descargar': 'Download',
    'OPTIMIZA. JUEGA.': 'OPTIMIZE. PLAY.',
    'CONSIGUE MÁS.': 'GET MORE.',
    'La plataforma todo en uno para potenciar tu experiencia en Steam. Automatiza, optimiza, desbloquea y descubre sin límites.': 'The all-in-one platform built to power up your Steam experience. Automate, optimize, unlock and discover without limits.',
    'DESCARGAR ÚLTIMA VERSIÓN': 'DOWNLOAD LATEST VERSION',
    'EXPLORAR NEITH': 'EXPLORE NEITH',
    'SEGURO': 'SAFE',
    'DE POR VIDA': 'FOREVER',
    'TODO EN UNO': 'ALL IN ONE',
    'PARA STEAM': 'FOR STEAM',
    'PERFILES QUE NO PARAN DE CRECER': 'PROFILES THAT NEVER STOP GROWING',
    '[ CROMOS: FARMED ]': '[ CARDS: FARMED ]',
    'El launcher real': 'The real launcher',
    'Diseñado alrededor de Neith, no de una plantilla': 'Designed around Neith, not a template',
    'Cada módulo reacciona como un sistema activo: animaciones funcionales, feedback visual y una identidad gaming premium que mantiene la interfaz clara y rápida.': 'Every module behaves like an active system: functional animations, visual feedback and a premium gaming identity that keeps the interface clean and fast.',
    'Sesiones de boost automatizadas con control visual de actividad, progreso y estado en tiempo real.': 'Automated boost sessions with visual control of activity, progress and real-time status.',
    'RAM LIBERADA': 'RAM FREED',
    'Optimización instantánea para liberar memoria, priorizar procesos y preparar el sistema para jugar con máxima fluidez.': 'Instant optimization to free memory, prioritize processes and prepare your system for maximum gaming smoothness.',
    'MODO TURBO': 'TURBO MODE',
    'Visualiza tu progreso, completa objetivos y convierte cada desbloqueo en una pieza visible de tu perfil gamer.': 'Track your progress, complete goals and turn every unlock into a visible part of your gaming profile.',
    '100% COMPLETO': '100% COMPLETE',
    'Cambia entre perfiles, organiza favoritos y centraliza accesos para gestionar tu ecosistema Steam sin fricción.': 'Switch profiles, organize favorites and centralize access to manage your Steam ecosystem without friction.',
    'SWAP INSTANTÁNEO': 'INSTANT SWAP',
    'RADAR EN VIVO': 'LIVE RADAR',
    'Escaneando': 'Scanning',
    'Detecta promociones temporales y oportunidades gratuitas con avisos rápidos y seguimiento visual en tiempo real.': 'Detect limited-time promotions and free opportunities with fast alerts and real-time visual tracking.',
    'RADAR ACTIVO': 'RADAR ACTIVE',
    'Biblioteca': 'Library',
    'Carátulas, filtros y detalles organizados en una cuadrícula visual preparada para escritorio y portátil.': 'Covers, filters and details organized in a visual grid built for desktop and laptop.',
    'ELIGE TU NIVEL DE ACCESO': 'CHOOSE YOUR ACCESS LEVEL',
    'Empieza gratis y activa el núcleo Premium cuando quieras. Tu estado se vincula a tu Neith ID.': 'Start free and activate the Premium core whenever you want. Your status is linked to your Neith ID.',
    'Acceso a las funciones esenciales del ecosistema Neith.': 'Access the essential features of the Neith ecosystem.',
    'Biblioteca y gestión básica': 'Library and basic management',
    'Cuentas y navegación principal': 'Accounts and main navigation',
    'Actualizaciones oficiales': 'Official updates',
    'Acceso a promociones de juegos': 'Access to game promotions',
    'CREAR CUENTA FREE': 'CREATE FREE ACCOUNT',
    'Desbloquea automatización avanzada y el rendimiento VIP del launcher.': 'Unlock advanced automation and VIP launcher performance.',
    'Hour Boost 24/7 ilimitado': 'Unlimited 24/7 Hour Boost',
    'Desbloqueador y farmeo automático de cromos': 'Achievement unlocker and automatic card farming',
    'Boost PC extremo': 'Extreme PC Boost',
    'Estado Premium sincronizado con tu cuenta': 'Premium status synced with your account',
    'ACTIVAR PREMIUM': 'ACTIVATE PREMIUM',
    'Última versión oficial': 'Latest official version',
    'Descarga Neith': 'Download Neith',
    'Instala la versión estable más reciente desde el canal oficial.': 'Install the latest stable release from the official channel.',
    'Descargar desde GitHub': 'Download from GitHub',
    'Neith Steam Launcher · experiencia gaming premium para Windows.': 'Neith Steam Launcher · premium gaming experience for Windows.',
    'Producto': 'Product',
    'Recursos': 'Resources',
    'Documentación': 'Documentation',
    'Oficial': 'Official',
    'Última versión': 'Latest version',
    'NEITH CORE: ONLINE': 'NEITH CORE: ONLINE',
    'SERVERS: ACTIVE': 'SERVERS: ACTIVE',
    'Radar inteligente de oportunidades': 'Smart opportunity radar',
    'PROTOCOLO DE JUEGOS GRATIS NEITH': 'NEITH FREE GAMES PROTOCOL',
    'Neith convierte las promociones temporales en una ruta clara: detecta oportunidades, ordena la información importante, avisa de la caducidad y te lleva directamente a la reclamación antes de que desaparezcan.': 'Neith turns temporary promotions into a clear route: it detects opportunities, organizes the important information, warns you about expiry and takes you straight to the claim before they disappear.',
    'DETECTA → FILTRA → AVISA → RECLAMA': 'DETECT → FILTER → ALERT → CLAIM',
    'DETECTA': 'DETECT',
    'RADAR MULTITIENDA': 'MULTI-STORE RADAR',
    'El sistema reúne oportunidades gratuitas de distintas tiendas y las presenta en una sola zona, sin obligarte a revisar cada plataforma por separado.': 'The system gathers free opportunities from different stores and presents them in one place, without forcing you to check each platform separately.',
    'FILTRA': 'FILTER',
    'INFORMACIÓN LIMPIA': 'CLEAN INFORMATION',
    'Precio anterior, ahorro, tienda, estado y tiempo restante quedan organizados para que puedas decidir de un vistazo qué promoción te interesa.': 'Previous price, savings, store, status and remaining time are organized so you can decide at a glance which promotion interests you.',
    'NÚCLEO RADAR': 'RADAR CORE',
    'VIGILANCIA ACTIVA': 'ACTIVE MONITORING',
    'AVISA': 'ALERT',
    'CADUCIDAD VISIBLE': 'VISIBLE EXPIRY',
    'Las promociones muestran su ventana de tiempo para que las oportunidades urgentes destaquen antes de terminar.': 'Promotions show their time window so urgent opportunities stand out before they end.',
    'TIEMPO RESTANTE': 'TIME REMAINING',
    'RECLAMA': 'CLAIM',
    'A TU BIBLIOTECA': 'TO YOUR LIBRARY',
    'Cuando una oferta te interesa, Neith mantiene la acción de reclamación y el estado del juego claramente visibles para cerrar el proceso rápidamente.': 'When an offer interests you, Neith keeps the claim action and game status clearly visible so you can complete the process quickly.',
    'LISTO PARA RECLAMAR': 'READY TO CLAIM',
    'Capturas reales del launcher': 'Real launcher captures',
    'CENTRO DE CONTROL DE JUEGOS GRATIS': 'FREE GAMES COMMAND CENTER',
    'La interfaz real de Neith es la protagonista. La vista principal reúne el radar completo y, debajo, puedes revisar ejemplos reales de promociones detectadas con su tienda, ahorro, estado y acciones disponibles.': 'Neith\'s real interface takes center stage. The main view brings together the full radar and, below it, you can review real examples of detected promotions with their store, savings, status and available actions.',
    'INTERFAZ REAL': 'REAL INTERFACE',
    'OFERTAS DETECTADAS': 'DETECTED OFFERS',
    'ACCESO DIRECTO': 'DIRECT ACCESS',
    'RADAR CENTRALIZADO': 'CENTRALIZED RADAR',
    'La pantalla principal concentra tiendas, filtros, promociones activas y estado de reclamación en una sola vista.': 'The main screen brings stores, filters, active promotions and claim status together in a single view.',
    'FICHAS DE PROMOCIÓN REALES': 'REAL PROMOTION CARDS',
    'Cada juego mantiene imagen, tienda, ahorro, tiempo restante y botones de acción sin perder claridad.': 'Each game keeps its image, store, savings, remaining time and action buttons without losing clarity.',
    'LECTURA RÁPIDA': 'QUICK READING',
    'El diseño prioriza la información que realmente importa para decidir antes de que una promoción termine.': 'The design prioritizes the information that really matters so you can decide before a promotion ends.',
    'NEITH // JUEGOS GRATIS': 'NEITH // FREE GAMES',
    'PANTALLA PRINCIPAL DEL LAUNCHER': 'LAUNCHER MAIN SCREEN',
    'Juegos Gratis — pantalla principal real del launcher': 'Free Games — real launcher main screen',
    'Pantalla principal real de Juegos Gratis en Neith': 'Real Free Games main screen in Neith',
    'VISTA PRINCIPAL': 'MAIN VIEW',
    'Radar completo, filtros, tiendas y promociones en una sola pantalla.': 'Complete radar, filters, stores and promotions on one screen.',
    'Mindcop — promoción gratuita detectada': 'Mindcop — free promotion detected',
    'Ficha real de Mindcop detectada en Juegos Gratis': 'Real Mindcop card detected in Free Games',
    'Mindcop · Gratis': 'Mindcop · Free',
    'Precio, ahorro, caducidad y reclamación directa presentados sin ruido visual.': 'Price, savings, expiry and direct claim presented without visual noise.',
    'ESTADO RECLAMADO': 'CLAIMED STATUS',
    'Shogun Showdown — promoción reclamada': 'Shogun Showdown — claimed promotion',
    'Ficha real de Shogun Showdown reclamada en Juegos Gratis': 'Real Shogun Showdown card claimed in Free Games',
    'Neith diferencia de forma inmediata una oportunidad disponible de otra ya añadida a tu biblioteca.': 'Neith immediately distinguishes an available opportunity from one already added to your library.',
    'Deadshot — promoción detectada en Steam': 'Deadshot — promotion detected on Steam',
    'Ficha real de Deadshot detectada en Steam': 'Real Deadshot card detected on Steam',
    'Deadshot · Reclamado': 'Deadshot · Claimed',
    'Las promociones de Steam comparten la misma jerarquía visual para mantener toda la sección consistente.': 'Steam promotions share the same visual hierarchy to keep the whole section consistent.',
    'TIENDAS': 'STORES',
    'MÚLTIPLES FUENTES': 'MULTIPLE SOURCES',
    'ESTADO': 'STATUS',
    'ACTUALIZADO': 'UPDATED',
    'ACCIÓN': 'ACTION',
    'RECLAMACIÓN DIRECTA': 'DIRECT CLAIM',
    'Galería de Juegos Gratis': 'Free Games Gallery',
    'NEITH // GALERÍA DE JUEGOS GRATIS': 'NEITH // FREE GAMES GALLERY',
    'CAPTURA REAL': 'REAL CAPTURE',
    'Imagen anterior': 'Previous image',
    'Imagen siguiente': 'Next image',
    'Cerrar visor': 'Close viewer',
    'Captura ampliada de Juegos Gratis': 'Enlarged Free Games capture',
    'CLIC EN LA IMAGEN PARA AMPLIAR · ESC PARA CERRAR': 'CLICK THE IMAGE TO ENLARGE · ESC TO CLOSE',
    'PANEL DE CONTROL': 'CONTROL PANEL',
    'MATRIZ DE CUENTAS': 'ACCOUNT MATRIX',
    'PANTALLA PRINCIPAL': 'MAIN SCREEN',
    'CUENTAS STEAM': 'STEAM ACCOUNTS',
    'Cambio de perfil premium': 'Premium profile switching',
    'Selector visual de cuentas para entrar al módulo de logros con rapidez.': 'Visual account selector to enter the achievements module quickly.',
    'DETALLE DE LOGROS': 'ACHIEVEMENT DETAIL',
    'La vista central de Logros con rareza, filtros y objetivos del juego.': 'The central Achievements view with rarity, filters and game goals.',
    'Logros — pantalla principal real del módulo': 'Achievements — real main screen of the module',
    'NEITH // LOGROS': 'NEITH // ACHIEVEMENTS',
    'NEITH // GALERÍA DE LOGROS': 'NEITH // ACHIEVEMENTS GALLERY',
    'PROTOCOLO BOOST DE NEITH': 'NEITH BOOST PROTOCOL',
    'NÚCLEO ACTIVO': 'ENGINE ONLINE',
    'MODO JUEGO': 'GAME MODE',
    'ASCENSIÓN DE LOGROS NEITH': 'NEITH ACHIEVEMENT ASCENSION',
    'NÚCLEO DE TROFEOS': 'TROPHY CORE',
    'ASCENSIÓN ACTIVA': 'ASCENSION ONLINE',
    'LECTURA EN VIVO': 'LIVE READING',
    'CENTRO DE CONTROL DE HOUR BOOST': 'HOUR BOOST COMMAND DECK',
    'CENTRO DE CONTROL DE BOOST PC': 'BOOST PC COMMAND DECK',
    'CENTRO DE CONTROL DE LOGROS': 'ACHIEVEMENT COMMAND DECK',
    'Secuencia de progresión': 'Progression sequence',
    'NEITH ACHIEVEMENT ASCENSION': 'NEITH ACHIEVEMENT ASCENSION',
    'Después de mostrar la interfaz real, esta secuencia explica cómo se vive el progreso dentro de Logros: descubres objetivos, haces seguimiento, completas hitos y acabas enseñando tu perfil como una vitrina premium.': 'After showing the real interface, this sequence explains how progress works inside Achievements: you discover goals, track them, complete milestones and finish by showing off your profile like a premium showcase.',
    'DESCUBRE → RASTREA → COMPLETA → PRESUME': 'DISCOVER → TRACK → COMPLETE → SHOWCASE',
    'DESCUBRE': 'DISCOVER',
    'RADAR DE OBJETIVOS': 'GOAL RADAR',
    'Neith detecta tus juegos, expone qué logros quedan pendientes y convierte cada colección en una ruta visual de progreso.': 'Neith detects your games, shows which achievements remain pending and turns each collection into a visual route of progress.',
    'RASTREA': 'TRACK',
    'SEGUIMIENTO PRECISO': 'PRECISE TRACKING',
    'El progreso, la rareza y los cromos quedan conectados en una lectura clara para saber qué merece atención en cada perfil.': 'Progress, rarity and cards are connected in a clear view so you always know what deserves attention in each profile.',
    'COMPLETA': 'COMPLETE',
    '100% EN MARCHA': '100% IN PROGRESS',
    'Cuando un objetivo cae, el sistema ilumina el avance y convierte el desbloqueo en parte visible de tu historial premium.': 'When a target falls, the system lights up the progress and turns the unlock into a visible part of your premium history.',
    'PRESUME': 'SHOWCASE',
    'VITRINA DE PERFIL': 'PROFILE SHOWCASE',
    'La colección final se muestra como una tarjeta de prestigio: logros, cromos y progreso convertidos en identidad gamer.': 'The final collection is displayed like a prestige card: achievements, cards and progress turned into gamer identity.',
    'TROPHY CORE': 'TROPHY CORE',
    'ASCENSION ONLINE': 'ASCENSION ONLINE'
  ,
    'NÚCLEO NEITH: ACTIVO': 'NEITH CORE: ONLINE',
    'SERVIDORES: ACTIVOS': 'SERVERS: ACTIVE',
    'NEITH // BIBLIOTECA ACTIVA': 'NEITH // ACTIVE LIBRARY',
    'NÚCLEO DE CUENTA': 'ACCOUNT CORE',
    'BOOST ACTIVO': 'BOOSTING ACTIVE',
    'MOTOR NEITH ACTIVO': 'NEITH ENGINE ACTIVE',
    'RENDIMIENTO ACTIVO': 'PERFORMANCE ONLINE',
    'LISTO PARA CARGAR': 'READY TO LOAD',
    'SINCRONIZACIÓN STEAM ACTIVA': 'STEAM SYNC ONLINE',
    '[ 100% COMPLETADO ]': '[ 100% ACHIEVED ]',
    '[ CROMOS: OBTENIDOS ]': '[ CROMOS: FARMED ]',
    'NEITH ID // NÚCLEO PRIVADO': 'NEITH ID // PRIVATE CORE',
    'NEITH MEMBERSHIP // NÚCLEO DE ACCESO': 'NEITH MEMBERSHIP // ACCESS CORE',
    '24/7 ACTIVO': '24/7 ONLINE',
    'INTERFAZ REAL, SIN MAQUETAS': 'INTERFAZ REAL, NO MOCKUPS',
    'REGISTRO EN VIVO': 'LIVE LOGS',
    'NÚCLEO NEITH ACTIVO': 'NEITH CORE ONLINE',
    'NÚCLEO DE IDENTIDAD': 'IDENTITY CORE',
    'MONITOR DE MATRIZ DE IDENTIDAD': 'IDENTITY MATRIX MONITOR',
    'MONITOR DEL SISTEMA EN VIVO': 'LIVE SYSTEM MONITOR',
    'NEITH // NÚCLEO DE CUENTAS': 'NEITH // ACCOUNTS CORE',
    'NEITH // PRINCIPAL': 'NEITH // MAIN',
    'MÓDULO // 01': 'MODULE // 01',
    'MÓDULO // 02': 'MODULE // 02',
    'MÓDULO // 03': 'MODULE // 03',
    'SEÑAL EN TIEMPO REAL': 'REAL-TIME SIGNAL',
    'MATRIZ DE RENDER // ACTIVA': 'RENDER MATRIX // ACTIVE',
    'CAPA DE SEGURIDAD // ACTIVA': 'SECURITY LAYER // ONLINE',
    'BASE DE DATOS FAQ // v1.0': 'FAQ DATABASE // v1.0',
    'SISTEMA LISTO': 'SYSTEM READY',
    'NODO ACTIVO': 'ACTIVE NODE',
    'ÍNDICE ACTIVO': 'INDEX ONLINE',
    'NODO DE SOPORTE NEITH // CONSOLA DEL SISTEMA': 'NEITH SUPPORT NODE // SYSTEM CONSOLE',
    'NEITH // NÚCLEO DE HARDWARE': 'NEITH // HARDWARE CORE',
    'CARGA EN SEGUNDO PLANO': 'BACKGROUND LOAD',
    'PRIORIDAD DEL JUEGO': 'GAME THREAD PRIORITY',
    'canal de telemetría sincronizado': 'live telemetry channel synchronized',
    '[NÚCLEO]': '[CORE]',
    'ACTIVO': 'ONLINE',
    'PRINCIPAL': 'MAIN'
,

    'Promociones reales verificadas': 'Verified real promotions',
    'JUEGOS GRATIS AHORA': 'FREE GAMES RIGHT NOW',
    'Descubre los juegos que puedes conseguir gratis en este momento. Neith comprueba promociones activas y las muestra aquí como escaparate; para acceder a ellas debes entrar en Juegos Gratis desde el launcher.': 'Discover the games you can get for free right now. Neith checks active promotions and displays them here as a showcase; to access them you must open Free Games inside the launcher.',
    'ACTUALIZADO': 'UPDATED',
    'COMPROBANDO OFERTAS...': 'CHECKING OFFERS...',
    'GRATIS AHORA': 'FREE NOW',
    'NEITH // EN DIRECTO': 'NEITH // LIVE',
    'Buscando juegos gratis reales...': 'Finding real free games...',
    'VALOR HABITUAL': 'REGULAR VALUE',
    'AHORA': 'NOW',
    'GRATIS': 'FREE',
    'LA OFERTA TERMINA EN': 'OFFER ENDS IN',
    'DÍAS': 'DAYS',
    'HORAS': 'HOURS',
    'MINUTOS': 'MINUTES',
    'SEGUNDOS': 'SECONDS',
    '✓ OFERTA VERIFICADA': '✓ VERIFIED OFFER',
    '◉ DETECTADO POR NEITH': '◉ DETECTED BY NEITH',
    'DISPONIBLE EN NEITH LAUNCHER': 'AVAILABLE IN NEITH LAUNCHER',
    'Abre Juegos Gratis dentro de Neith para acceder a esta promoción.': 'Open Free Games inside Neith to access this promotion.',
    'Los datos se actualizan automáticamente. Neith no permite reclamar juegos desde esta web.': 'Data updates automatically. Neith does not allow games to be claimed from this website.',
    'DATOS EN TIEMPO REAL': 'REAL-TIME DATA',
    'TAMBIÉN GRATIS AHORA': 'ALSO FREE RIGHT NOW',
    'Selecciona un juego para verlo en el escaparate.': 'Select a game to view it in the spotlight.',
    'Datos de promociones:': 'Promotion data:',
    'NO HAY OFERTAS VERIFICADAS AHORA MISMO': 'NO VERIFIED OFFERS RIGHT NOW',
    'Neith seguirá comprobando las promociones disponibles automáticamente.': 'Neith will keep checking available promotions automatically.',
    'NO SE PUDIERON COMPROBAR LAS OFERTAS': 'OFFERS COULD NOT BE CHECKED',
    'La conexión de datos en tiempo real no está disponible. Vuelve a intentarlo más tarde.': 'The real-time data connection is unavailable. Please try again later.',
    'OFERTA FINALIZADA': 'OFFER ENDED'
  ,
    'Automatización, boost y optimización avanzada vinculados a tu Neith ID.': 'Automatización, boosting y optimización avanzada vinculados a tu Neith ID.',
    'Boost activo': 'Boosting activo',
    'NÚCLEO NEITH': 'NEITH CORE',
    'FAQ / Consola del sistema — Neith Steam Launcher': 'FAQ / System Console — Neith Steam Launcher',
    'NEITH://NÚCLEO/COMPATIBILIDAD': 'NEITH://CORE/COMPATIBILITY',
    'NEITH://NÚCLEO/DESCARGA': 'NEITH://CORE/DOWNLOAD',
    'NEITH://NÚCLEO/IDENTIDAD': 'NEITH://CORE/IDENTITY'
  };

  const EN_TO_ES = Object.fromEntries(Object.entries(ES_TO_EN).map(([es, en]) => [en, es]));

  const pageMeta = {
    es: {
      title: 'Neith Steam Launcher — Web oficial',
      description: 'Launcher gaming premium para cuentas, biblioteca, Hour Boost, Boost PC, logros y juegos gratis.'
    },
    en: {
      title: 'Neith Steam Launcher — Official Website',
      description: 'Premium gaming launcher for accounts, library, Hour Boost, Boost PC, achievements and free games.'
    }
  };

  let currentLanguage = 'es';
  let mutating = false;

  function replaceTextNode(node, map) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    const trimmed = raw.trim();
    const replacement = map[trimmed];
    if (!replacement || replacement === trimmed) return;
    const left = raw.match(/^\s*/)?.[0] || '';
    const right = raw.match(/\s*$/)?.[0] || '';
    node.nodeValue = left + replacement + right;
  }

  function translateTree(root, language) {
    const map = language === 'en' ? ES_TO_EN : EN_TO_ES;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => replaceTextNode(node, map));
  }

  function translateAttributes(language) {
    const map = language === 'en' ? ES_TO_EN : EN_TO_ES;
    document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => {
      ['title', 'aria-label', 'placeholder'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (value && map[value]) el.setAttribute(attr, map[value]);
      });
    });
  }

  function updateMeta(language) {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const isHome = /neithlauncher\.com\/?$/.test(canonical);
    if (isHome) {
      const meta = pageMeta[language];
      document.title = meta.title;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute('content', meta.description);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', meta.title);
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) ogDescription.setAttribute('content', meta.description);
    }
    document.documentElement.lang = language;
  }

  function updateButtons(language) {
    document.querySelectorAll('.lang-flag').forEach(btn => {
      const active = btn.dataset.lang === language;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setLanguage(language, persist = true) {
    if (!supported.has(language)) language = 'es';
    if (language === currentLanguage && document.documentElement.lang === language) {
      updateButtons(language);
      return;
    }
    mutating = true;
    translateTree(document.body, language);
    translateAttributes(language);
    updateMeta(language);
    currentLanguage = language;
    updateButtons(language);
    if (persist) localStorage.setItem(STORAGE_KEY, language);
    requestAnimationFrame(() => { mutating = false; });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.lang-flag[data-lang]');
    if (!button) return;
    setLanguage(button.dataset.lang, true);
  });

  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = supported.has(saved) ? saved : 'es';
    currentLanguage = 'es';
    setLanguage(initial, false);

    const observer = new MutationObserver(mutations => {
      if (mutating || currentLanguage !== 'en') return;
      mutating = true;
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) replaceTextNode(node, ES_TO_EN);
          else if (node.nodeType === Node.ELEMENT_NODE) translateTree(node, 'en');
        });
        if (mutation.type === 'characterData') replaceTextNode(mutation.target, ES_TO_EN);
      }
      requestAnimationFrame(() => { mutating = false; });
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
  });
})();
