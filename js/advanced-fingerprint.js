/**
 * ADVANCED BOT DETECTION FINGERPRINT SCRIPT
 * Captura TODAS as informações possíveis do navegador/dispositivo
 * Especialmente otimizado para detectar bots do TikTok
 * Versão: 1.0.0
 */

(function() {
  'use strict';

  // Configuração
  const CONFIG = {
    API_ENDPOINT: 'https://api.fycloak.com/api/v2/bot-detection/collect-full',
    DEBUG: false,
    TRACKING_DURATION: 10000, // 10 segundos de tracking
  };

  // Estado global
  const STATE = {
    fingerprint_id: null,
    session_id: null,
    start_time: Date.now(),
    mouse_movements: [],
    mouse_clicks: 0,
    mouse_scrolls: 0,
    keyboard_events: 0,
    interactions_started: false,
    first_interaction_time: null
  };

  // Gerar IDs únicos
  function generateId() {
    return 'fp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  STATE.fingerprint_id = generateId();
  STATE.session_id = sessionStorage.getItem('fp_session') || generateId();
  sessionStorage.setItem('fp_session', STATE.session_id);

  /**
   * ========================================================================
   * CANVAS FINGERPRINTING (múltiplos métodos)
   * ========================================================================
   */
  function getCanvasFingerprints() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 220;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');

      // Teste 1: Canvas com texto
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('BrowserFP 🤖🎯', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('BrowserFP 🤖🎯', 4, 17);
      const canvas_text_hash = hashString(canvas.toDataURL());

      // Teste 2: Canvas com emojis
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText('😀😃😄😁🤖🎯', 2, 15);
      const canvas_emoji_hash = hashString(canvas.toDataURL());

      // Teste 3: Canvas com geometria
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgb(255,0,255)';
      ctx.beginPath();
      ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgb(0,255,255)';
      ctx.beginPath();
      ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      const canvas_geometry_hash = hashString(canvas.toDataURL());

      // Hash geral do canvas
      const canvas_hash = hashString(canvas_text_hash + canvas_emoji_hash + canvas_geometry_hash);

      return {
        canvas_hash,
        canvas_text_hash,
        canvas_emoji_hash,
        canvas_geometry_hash
      };
    } catch (e) {
      return {
        canvas_hash: '',
        canvas_text_hash: '',
        canvas_emoji_hash: '',
        canvas_geometry_hash: '',
        error: e.message
      };
    }
  }

  /**
   * ========================================================================
   * WEBGL FINGERPRINTING (informações detalhadas)
   * ========================================================================
   */
  function getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) {
        return { webgl_supported: false };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

      const webgl_data = {
        webgl_vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        webgl_renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        webgl_version: gl.getParameter(gl.VERSION),
        webgl_shading_language_version: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        webgl_max_texture_size: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        webgl_max_vertex_attribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        webgl_max_viewport_dims: gl.getParameter(gl.MAX_VIEWPORT_DIMS).join('x'),
        webgl_extensions: gl.getSupportedExtensions() || []
      };

      // Criar hash dos parâmetros WebGL
      const params = [
        gl.getParameter(gl.ALPHA_BITS),
        gl.getParameter(gl.BLUE_BITS),
        gl.getParameter(gl.DEPTH_BITS),
        gl.getParameter(gl.GREEN_BITS),
        gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
        gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
        gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        gl.getParameter(gl.MAX_VARYING_VECTORS),
        gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
        gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
        gl.getParameter(gl.RED_BITS),
        gl.getParameter(gl.STENCIL_BITS)
      ].join(',');

      webgl_data.webgl_params_hash = hashString(params);
      webgl_data.webgl_hash = hashString(JSON.stringify(webgl_data));

      return webgl_data;
    } catch (e) {
      return {
        webgl_supported: false,
        error: e.message
      };
    }
  }

  /**
   * ========================================================================
   * AUDIO FINGERPRINTING
   * ========================================================================
   */
  function getAudioFingerprint() {
    return new Promise((resolve) => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          return resolve({ audio_hash: '', audio_codecs: [] });
        }

        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const analyser = context.createAnalyser();
        const gainNode = context.createGain();
        const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

        gainNode.gain.value = 0; // Silencioso
        oscillator.type = 'triangle';
        oscillator.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(0);

        scriptProcessor.onaudioprocess = function(event) {
          const output = event.outputBuffer.getChannelData(0);
          const hash = hashString(Array.from(output.slice(0, 30)).join(','));

          oscillator.stop();
          scriptProcessor.disconnect();
          context.close();

          // Detectar codecs de áudio suportados
          const audio = document.createElement('audio');
          const codecs = [
            'audio/ogg; codecs="vorbis"',
            'audio/mpeg',
            'audio/wav; codecs="1"',
            'audio/x-m4a',
            'audio/aac'
          ].filter(codec => audio.canPlayType(codec) !== '');

          resolve({
            audio_hash: hash,
            audio_codecs: codecs
          });
        };

        // Timeout de segurança
        setTimeout(() => {
          try {
            oscillator.stop();
            context.close();
          } catch (e) {}
          resolve({ audio_hash: '', audio_codecs: [] });
        }, 1000);

      } catch (e) {
        resolve({ audio_hash: '', audio_codecs: [], error: e.message });
      }
    });
  }

  /**
   * ========================================================================
   * FONTS DETECTION
   * ========================================================================
   */
  function getAvailableFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
      'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
      'Impact', 'Lucida Console', 'Tahoma', 'Helvetica', 'Century Gothic',
      'Calibri', 'Segoe UI', 'Roboto', 'Ubuntu', 'Monaco'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '72px monospace';
    const baseWidths = {};

    baseFonts.forEach(font => {
      ctx.font = `72px ${font}`;
      baseWidths[font] = ctx.measureText('mmmmmmmmmmlli').width;
    });

    const availableFonts = [];
    testFonts.forEach(font => {
      baseFonts.forEach(baseFont => {
        ctx.font = `72px "${font}", ${baseFont}`;
        const width = ctx.measureText('mmmmmmmmmmlli').width;
        if (width !== baseWidths[baseFont]) {
          if (!availableFonts.includes(font)) {
            availableFonts.push(font);
          }
        }
      });
    });

    return {
      fonts_available: availableFonts,
      fonts_hash: hashString(availableFonts.join(','))
    };
  }

  /**
   * ========================================================================
   * PLUGINS DETECTION
   * ========================================================================
   */
  function getPlugins() {
    try {
      const plugins = [];
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name);
      }
      return {
        plugins,
        plugins_count: plugins.length,
        plugins_hash: hashString(plugins.join(','))
      };
    } catch (e) {
      return {
        plugins: [],
        plugins_count: 0,
        plugins_hash: ''
      };
    }
  }

  /**
   * ========================================================================
   * MEDIA DEVICES
   * ========================================================================
   */
  function getMediaDevices() {
    return new Promise((resolve) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return resolve({
          media_devices: [],
          media_devices_count: 0,
          has_camera: false,
          has_microphone: false,
          has_speaker: false
        });
      }

      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const deviceTypes = devices.map(d => d.kind);
          resolve({
            media_devices: deviceTypes,
            media_devices_count: devices.length,
            has_camera: deviceTypes.includes('videoinput'),
            has_microphone: deviceTypes.includes('audioinput'),
            has_speaker: deviceTypes.includes('audiooutput')
          });
        })
        .catch(() => {
          resolve({
            media_devices: [],
            media_devices_count: 0,
            has_camera: false,
            has_microphone: false,
            has_speaker: false
          });
        });
    });
  }

  /**
   * ========================================================================
   * BATTERY API
   * ========================================================================
   */
  function getBatteryInfo() {
    return new Promise((resolve) => {
      if (!navigator.getBattery) {
        return resolve({ battery_charging: false, battery_level: 0 });
      }

      navigator.getBattery()
        .then(battery => {
          resolve({
            battery_charging: battery.charging,
            battery_level: battery.level
          });
        })
        .catch(() => {
          resolve({ battery_charging: false, battery_level: 0 });
        });
    });
  }

  /**
   * ========================================================================
   * NETWORK INFORMATION
   * ========================================================================
   */
  function getNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) {
      return {
        network_effective_type: '',
        network_downlink: 0,
        network_rtt: 0,
        network_save_data: false,
        connection_type: 'unknown'
      };
    }

    return {
      network_effective_type: connection.effectiveType || '',
      network_downlink: connection.downlink || 0,
      network_rtt: connection.rtt || 0,
      network_save_data: connection.saveData || false,
      connection_type: connection.type || 'unknown'
    };
  }

  /**
   * ========================================================================
   * WEBRTC LOCAL IPs
   * ========================================================================
   */
  function getWebRTCIPs() {
    return new Promise((resolve) => {
      const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

      if (!RTCPeerConnection) {
        return resolve({
          webrtc_support: false,
          webrtc_public_ip: '',
          webrtc_local_ips: []
        });
      }

      const ips = [];
      const pc = new RTCPeerConnection({ iceServers: [] });

      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate || !event.candidate.candidate) {
          pc.close();
          return resolve({
            webrtc_support: true,
            webrtc_public_ip: ips.find(ip => !ip.startsWith('192.') && !ip.startsWith('10.')) || '',
            webrtc_local_ips: ips
          });
        }

        const candidate = event.candidate.candidate;
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = ipRegex.exec(candidate);

        if (match && !ips.includes(match[1])) {
          ips.push(match[1]);
        }
      };

      // Timeout
      setTimeout(() => {
        pc.close();
        resolve({
          webrtc_support: true,
          webrtc_public_ip: ips.find(ip => !ip.startsWith('192.') && !ip.startsWith('10.')) || '',
          webrtc_local_ips: ips
        });
      }, 2000);
    });
  }

  /**
   * ========================================================================
   * HEADLESS/AUTOMATION DETECTION
   * ========================================================================
   */
  function detectAutomation() {
    const suspicions = [];

    // Webdriver
    if (navigator.webdriver) suspicions.push('webdriver');

    // PhantomJS
    if (window.callPhantom || window._phantom) suspicions.push('phantom');

    // Selenium
    if (window.document.documentElement.getAttribute('webdriver')) suspicions.push('selenium_attr');
    if (window.document.$cdc_asdjflasutopfhvcZLmcfl_) suspicions.push('selenium_cdc');

    // Puppeteer/Playwright
    if (navigator.plugins.length === 0 && !navigator.webdriver) suspicions.push('no_plugins');

    // Headless Chrome
    if (/HeadlessChrome/.test(navigator.userAgent)) suspicions.push('headless_chrome');
    if (!window.chrome) suspicions.push('missing_chrome');

    return {
      headless_detected: suspicions.includes('headless_chrome'),
      automation_detected: suspicions.length > 0,
      webdriver_detected: suspicions.includes('webdriver'),
      phantom_detected: suspicions.includes('phantom'),
      selenium_detected: suspicions.includes('selenium_attr') || suspicions.includes('selenium_cdc'),
      puppeteer_detected: suspicions.includes('no_plugins'),
      suspicion_reasons: suspicions
    };
  }

  /**
   * ========================================================================
   * TIKTOK DETECTION (específico)
   * ========================================================================
   */
  function detectTikTok() {
    const ua = navigator.userAgent;
    const markers = [];

    // Marcadores comuns do TikTok
    if (/tiktok/i.test(ua)) markers.push('tiktok_string');
    if (/musical\.ly/i.test(ua)) markers.push('musically');
    if (/bytedance/i.test(ua)) markers.push('bytedance');

    // WebView detection
    const isWebView = /wkwebview/i.test(ua.toLowerCase());

    // Versão do app (se disponível)
    const versionMatch = ua.match(/tiktok[\/\s]+([\d\.]+)/i);
    const appVersion = versionMatch ? versionMatch[1] : '';

    return {
      tiktok_webview_detected: isWebView && (markers.length > 0 || /tiktok/i.test(document.referrer)),
      tiktok_app_version: appVersion,
      tiktok_user_agent_markers: markers
    };
  }

  /**
   * ========================================================================
   * USER-AGENT PARSING
   * ========================================================================
   */
  function parseUserAgent() {
    const ua = navigator.userAgent;
    const browserData = {
      browser_name: 'unknown',
      browser_version: '',
      browser_major_version: 0,
      engine_name: '',
      engine_version: '',
      os_name: 'unknown',
      os_version: '',
      device_type: 'unknown',
      device_vendor: '',
      device_model: ''
    };

    // Browser detection
    if (/Chrome/.test(ua) && !/Chromium/.test(ua) && !/Edg/.test(ua)) {
      browserData.browser_name = 'Chrome';
      browserData.browser_version = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
      browserData.browser_name = 'Safari';
      browserData.browser_version = ua.match(/Version\/([\d.]+)/)?.[1] || '';
    } else if (/Firefox/.test(ua)) {
      browserData.browser_name = 'Firefox';
      browserData.browser_version = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
    } else if (/Edg/.test(ua)) {
      browserData.browser_name = 'Edge';
      browserData.browser_version = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
    }

    browserData.browser_major_version = parseInt(browserData.browser_version.split('.')[0]) || 0;

    // Engine detection
    if (/AppleWebKit/.test(ua)) {
      browserData.engine_name = /Blink/.test(ua) ? 'Blink' : 'WebKit';
      browserData.engine_version = ua.match(/AppleWebKit\/([\d.]+)/)?.[1] || '';
    } else if (/Gecko/.test(ua)) {
      browserData.engine_name = 'Gecko';
      browserData.engine_version = ua.match(/rv:([\d.]+)/)?.[1] || '';
    }

    // OS detection
    if (/Windows/.test(ua)) {
      browserData.os_name = 'Windows';
      browserData.os_version = ua.match(/Windows NT ([\d.]+)/)?.[1] || '';
    } else if (/Mac OS/.test(ua)) {
      browserData.os_name = 'macOS';
      browserData.os_version = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
    } else if (/Android/.test(ua)) {
      browserData.os_name = 'Android';
      browserData.os_version = ua.match(/Android ([\d.]+)/)?.[1] || '';
    } else if (/iOS|iPhone|iPad/.test(ua)) {
      browserData.os_name = 'iOS';
      browserData.os_version = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
    } else if (/Linux/.test(ua)) {
      browserData.os_name = 'Linux';
    }

    // Device type
    if (/Mobile|Android|iPhone/.test(ua)) {
      browserData.device_type = 'mobile';
    } else if (/Tablet|iPad/.test(ua)) {
      browserData.device_type = 'tablet';
    } else {
      browserData.device_type = 'desktop';
    }

    return browserData;
  }

  /**
   * ========================================================================
   * PERFORMANCE METRICS
   * ========================================================================
   */
  function getPerformanceMetrics() {
    if (!window.performance || !window.performance.timing) {
      return {
        performance_navigation_type: 0,
        performance_timing: {}
      };
    }

    const timing = window.performance.timing;
    return {
      performance_navigation_type: window.performance.navigation?.type || 0,
      performance_timing: {
        dns_lookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcp_connection: timing.connectEnd - timing.connectStart,
        request_time: timing.responseStart - timing.requestStart,
        response_time: timing.responseEnd - timing.responseStart,
        dom_processing: timing.domComplete - timing.domLoading,
        page_load: timing.loadEventEnd - timing.navigationStart
      }
    };
  }

  /**
   * ========================================================================
   * HASH FUNCTION (simples e rápida)
   * ========================================================================
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * ========================================================================
   * TRACKING DE COMPORTAMENTO DO USUÁRIO
   * ========================================================================
   */
  function setupBehaviorTracking() {
    // Mouse movements (amostragem a cada 100ms)
    let lastSample = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastSample > 100) {
        STATE.mouse_movements.push({ x: e.clientX, y: e.clientY, t: now - STATE.start_time });
        lastSample = now;

        if (!STATE.interactions_started) {
          STATE.interactions_started = true;
          STATE.first_interaction_time = now;
        }
      }
    }, { passive: true });

    // Mouse clicks
    document.addEventListener('click', () => {
      STATE.mouse_clicks++;
      if (!STATE.interactions_started) {
        STATE.interactions_started = true;
        STATE.first_interaction_time = Date.now();
      }
    }, { passive: true });

    // Scrolls
    document.addEventListener('scroll', () => {
      STATE.mouse_scrolls++;
      if (!STATE.interactions_started) {
        STATE.interactions_started = true;
        STATE.first_interaction_time = Date.now();
      }
    }, { passive: true });

    // Keyboard
    document.addEventListener('keydown', () => {
      STATE.keyboard_events++;
      if (!STATE.interactions_started) {
        STATE.interactions_started = true;
        STATE.first_interaction_time = Date.now();
      }
    }, { passive: true });
  }

  /**
   * ========================================================================
   * CALCULAR BOT SCORE
   * ========================================================================
   */
  function calculateBotScore(fingerprintData) {
    let score = 0;
    const reasons = [];

    // Automação detectada (+0.8)
    if (fingerprintData.automation_detected) {
      score += 0.8;
      reasons.push('automation_detected');
    }

    // WebView do TikTok (+0.6)
    if (fingerprintData.tiktok_webview_detected) {
      score += 0.6;
      reasons.push('tiktok_webview');
    }

    // Headless (+0.9)
    if (fingerprintData.headless_detected) {
      score += 0.9;
      reasons.push('headless_browser');
    }

    // Sem plugins (+0.3)
    if (fingerprintData.plugins_count === 0) {
      score += 0.3;
      reasons.push('no_plugins');
    }

    // Pouca ou nenhuma interação (+0.5)
    const interactionTime = fingerprintData.time_to_interact;
    if (interactionTime === 0 || interactionTime > 5000) {
      score += 0.5;
      reasons.push('low_interaction');
    }

    // Muito rápido na página (+0.4)
    if (fingerprintData.page_load_time < 100) {
      score += 0.4;
      reasons.push('too_fast');
    }

    // Sem movimentos de mouse (+0.3)
    if (fingerprintData.mouse_movements_count === 0) {
      score += 0.3;
      reasons.push('no_mouse_movement');
    }

    return {
      bot_score: Math.min(score, 1.0),
      is_bot: score >= 0.7,
      suspicion_reasons: reasons
    };
  }

  /**
   * ========================================================================
   * COLETAR TODOS OS DADOS
   * ========================================================================
   */
  async function collectAllFingerprints() {
    CONFIG.DEBUG && console.log('[Fingerprint] Iniciando coleta completa...');

    // Coletar dados síncronos
    const canvasData = getCanvasFingerprints();
    const webglData = getWebGLFingerprint();
    const fontsData = getAvailableFonts();
    const pluginsData = getPlugins();
    const automationData = detectAutomation();
    const tiktokData = detectTikTok();
    const browserData = parseUserAgent();
    const performanceData = getPerformanceMetrics();
    const networkData = getNetworkInfo();

    // Coletar dados assíncronos
    const [audioData, mediaDevices, batteryInfo, webrtcIPs] = await Promise.all([
      getAudioFingerprint(),
      getMediaDevices(),
      getBatteryInfo(),
      getWebRTCIPs()
    ]);

    // Coletar parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const url_parameters = {};
    urlParams.forEach((value, key) => {
      url_parameters[key] = value;
    });

    // Calcular tempos
    const page_load_time = Date.now() - STATE.start_time;
    const time_to_interact = STATE.first_interaction_time ? (STATE.first_interaction_time - STATE.start_time) : 0;

    // Montar objeto completo
    const fingerprintData = {
      fingerprint_id: STATE.fingerprint_id,
      session_id: STATE.session_id,

      // Timing
      page_load_time,
      time_to_interact,

      // Screen
      screen_width: screen.width,
      screen_height: screen.height,
      screen_color_depth: screen.colorDepth,
      screen_pixel_ratio: window.devicePixelRatio || 1,
      available_screen_width: screen.availWidth,
      available_screen_height: screen.availHeight,
      inner_width: window.innerWidth,
      inner_height: window.innerHeight,
      outer_width: window.outerWidth,
      outer_height: window.outerHeight,
      screen_orientation: screen.orientation?.type || '',

      // Navigator
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages || [navigator.language],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezone_offset: new Date().getTimezoneOffset(),
      hardware_concurrency: navigator.hardwareConcurrency || 0,
      device_memory: navigator.deviceMemory || 0,
      max_touch_points: navigator.maxTouchPoints || 0,

      // JavaScript features
      javascript_enabled: true,
      javascript_version: detectJavaScriptVersion(),
      cookies_enabled: navigator.cookieEnabled,
      do_not_track: navigator.doNotTrack === '1',

      // Storage
      local_storage_enabled: testStorage('localStorage'),
      session_storage_enabled: testStorage('sessionStorage'),
      indexed_db_enabled: !!window.indexedDB,

      // Touch
      touch_support: 'ontouchstart' in window,
      touch_points: navigator.maxTouchPoints || 0,
      max_touch_points_device: navigator.maxTouchPoints || 0,

      // Comportamento
      mouse_movements_count: STATE.mouse_movements.length,
      mouse_clicks_count: STATE.mouse_clicks,
      mouse_scroll_count: STATE.mouse_scrolls,
      keyboard_events_count: STATE.keyboard_events,
      keyboard_layout: detectKeyboardLayout(),

      // URL parameters
      url_parameters,
      click_id: url_parameters.click_id || '',
      fbclid: url_parameters.fbclid || '',
      ttclid: url_parameters.ttclid || '',
      gclid: url_parameters.gclid || '',

      // Headers (simulados)
      referer: document.referrer,
      accept_language: navigator.language,
      accept_encoding: 'gzip, deflate, br',
      upgrade_insecure_requests: 1,

      // Cookies
      cookies: document.cookie.split(';').map(c => c.trim().split('=')[0]),
      cookie_count: document.cookie ? document.cookie.split(';').length : 0,

      // Merge de todos os dados coletados
      ...canvasData,
      ...webglData,
      ...audioData,
      ...fontsData,
      ...pluginsData,
      ...automationData,
      ...tiktokData,
      ...browserData,
      ...performanceData,
      ...networkData,
      ...mediaDevices,
      ...batteryInfo,
      ...webrtcIPs
    };

    // Calcular bot score
    const botAnalysis = calculateBotScore(fingerprintData);
    Object.assign(fingerprintData, botAnalysis);

    CONFIG.DEBUG && console.log('[Fingerprint] Coleta completa:', fingerprintData);

    return fingerprintData;
  }

  /**
   * ========================================================================
   * HELPERS
   * ========================================================================
   */
  function detectJavaScriptVersion() {
    // Testar features ES6+
    try {
      eval('const x = () => {};');
      eval('async function test() {}');
      return 'ES2017+';
    } catch (e) {
      try {
        eval('const x = () => {};');
        return 'ES2015+';
      } catch (e) {
        return 'ES5';
      }
    }
  }

  function testStorage(type) {
    try {
      const storage = window[type];
      const test = '__test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  function detectKeyboardLayout() {
    // Simplificado - baseado no idioma
    const lang = navigator.language.split('-')[0];
    const layouts = {
      'en': 'QWERTY',
      'pt': 'QWERTY',
      'fr': 'AZERTY',
      'de': 'QWERTZ',
      'ru': 'ЙЦУКЕН'
    };
    return layouts[lang] || 'QWERTY';
  }

  /**
   * ========================================================================
   * ENVIAR DADOS PARA O BACKEND
   * ========================================================================
   */
  async function sendFingerprintData(fingerprintData) {
    try {
      // Obter metadados da página
      const campaign_id = window.FYCLOAK_CAMPAIGN_ID || parseInt(document.querySelector('[data-campaign-id]')?.dataset.campaignId);
      const user_id = window.FYCLOAK_USER_ID || parseInt(document.querySelector('[data-user-id]')?.dataset.userId);
      const subdomain = window.location.hostname;

      if (!campaign_id) {
        CONFIG.DEBUG && console.warn('[Fingerprint] campaign_id não encontrado');
        return;
      }

      const payload = {
        campaign_id,
        user_id,
        subdomain,
        fingerprint_id: fingerprintData.fingerprint_id,
        fingerprint_data: fingerprintData
      };

      CONFIG.DEBUG && console.log('[Fingerprint] Enviando para:', CONFIG.API_ENDPOINT);

      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      CONFIG.DEBUG && console.log('[Fingerprint] Resposta do servidor:', result);

    } catch (error) {
      console.error('[Fingerprint] Erro ao enviar dados:', error);
    }
  }

  /**
   * ========================================================================
   * INICIALIZAÇÃO
   * ========================================================================
   */
  async function init() {
    CONFIG.DEBUG && console.log('[Fingerprint] Iniciando bot detection avançado v1.0.0');

    // Configurar tracking de comportamento
    setupBehaviorTracking();

    // Aguardar um tempo para coletar interações do usuário
    await new Promise(resolve => setTimeout(resolve, CONFIG.TRACKING_DURATION));

    // Coletar todos os fingerprints
    const fingerprintData = await collectAllFingerprints();

    // Enviar para o backend
    await sendFingerprintData(fingerprintData);

    CONFIG.DEBUG && console.log('[Fingerprint] Processo completo!');
  }

  // Iniciar quando a página carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expor globalmente para debug
  if (CONFIG.DEBUG) {
    window.FYCLOAK_BOT_DETECTION = {
      collectAllFingerprints,
      STATE
    };
  }

})();
