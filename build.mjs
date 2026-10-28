// Static multi-locale site generator for Realtor Finder.
// `node build.mjs` -> dist/. Per market: a hub /<id>/ + privacy + support, and a
// per-country landing /<id>/<cc>/. hreflang: privacy/support cluster across markets;
// each market's landing (hub + its country pages) is its own reciprocal cluster
// (hub = base language, country = language-REGION). Plus sitemap/robots/llms.txt +
// JSON-LD, so Google and AI engines index & cite every country and language.
//
// Bodies/FAQ/nav/privacy/support are localized per base language via STR (en/es/vi/zh/ar/bs);
// en is the fallback for the English markets (ph/kh/mm/lk/pk/af/ka). The root picker stays English.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

const { baseUrl, contactEmail, markets } = JSON.parse(
  await readFile(new URL('./data/markets.json', import.meta.url)),
);
const BASE = baseUrl.replace(/\/$/, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const appUrl = (m) => `https://apps.apple.com/app/id${m.appleId}`;
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
const ORG = { '@type': 'Organization', name: 'kahvilavalas', url: `${BASE}/`, email: contactEmail };
const langBase = (m) => m.lang.split('-')[0]; // zh-Hant -> zh, es -> es
const countryHreflang = (m, c) => `${langBase(m)}-${c.cc.toUpperCase()}`;

// --- UI/body strings per base language. en is the fallback; ph/kh/mm/lk/pk/af/ka use it. ---
const STR = {
  en: {
    cta: 'Download on the App Store', whatItDoes: 'What it does', chooseCountry: 'Choose your country',
    introP: (w) => `Search public real-estate listings by area in ${esc(w)}, then contact several agents at once — the app opens your phone's default messaging app with the agents' numbers pre-filled. No account, no sign-up, nothing stored on any server.`,
    bullets: ['Search agents by apartment or area name', 'Pick the agents you want from the results', 'Group message / call / WhatsApp handoff — you send, from your own device'],
    navHome: 'Home', navPrivacy: 'Privacy', navSupport: 'Support', navAll: 'All regions',
    privTitle: 'Privacy Policy', updated: 'last updated', questions: 'Questions:',
    privLead: (a) => `<strong>${esc(a)} collects no data.</strong> The app stores nothing on our servers and we do not operate any backend that receives your information.`,
    locH: 'Location', locP: 'If you grant location permission, your approximate or precise location is used <strong>on your device only</strong>, to pre-select the nearest supported search area. It is never transmitted to us.',
    listH: 'Listings & contact', listP: "Searches fetch publicly available listings from third-party real-estate portals over HTTPS. When you choose to contact agents, the app opens your device's default Messages, phone, or messaging app with the recipients pre-filled. Messages are sent by you, from your device. The app does not send on your behalf and does not save contacts.",
    trackH: 'No tracking, no ads', trackP: 'The app contains no advertising SDKs, no analytics, and no third-party trackers.', contactH: 'Contact',
    supportWord: 'Support', howH: 'How to use',
    steps: ['Search by an apartment or area name.', 'Select the agents you want from the results.', 'Tap to open your default Messages / phone / messaging app with the numbers filled in, and send.'],
    faqH: 'FAQ', helpLine: (e) => `Email <a href="mailto:${e}">${e}</a> and we'll help.`,
    freeTail: 'Free iOS app, no account, nothing stored.',
    ldDesc: (w) => `Search listings by area and contact several agents at once in ${w}. No account, nothing stored, no ads.`,
    faq: (w) => [
      ['Do I need an account?', 'No. There is no login or sign-up.'],
      ['Is it free?', 'Yes, it is free and contains no ads.'],
      ['Is my data stored?', 'No. Everything runs on your device; nothing is kept on a server.'],
      ['Who sends the messages?', 'You do, from your own device. The app only pre-fills them.'],
      ['Which area does this cover?', `This version covers ${w}. Other regions have their own version — see All regions.`],
      ['How do I contact several agents at once?', 'Select the agents you want from the search results; the app opens your default Messages app with all their numbers pre-filled (group SMS).'],
    ],
  },
  es: {
    cta: 'Descárgala en el App Store', whatItDoes: 'Qué hace', chooseCountry: 'Elige tu país',
    introP: (w) => `Busca anuncios inmobiliarios públicos por zona en ${esc(w)} y contacta con varios agentes a la vez: la app abre la app de mensajes de tu teléfono con los números de los agentes ya rellenados. Sin cuenta, sin registro, sin guardar nada en ningún servidor.`,
    bullets: ['Busca agentes por nombre de edificio o zona', 'Elige los agentes que quieras de los resultados', 'Mensaje grupal / llamada / WhatsApp — tú envías, desde tu propio dispositivo'],
    navHome: 'Inicio', navPrivacy: 'Privacidad', navSupport: 'Soporte', navAll: 'Todas las regiones',
    privTitle: 'Política de privacidad', updated: 'última actualización', questions: 'Preguntas:',
    privLead: (a) => `<strong>${esc(a)} no recopila ningún dato.</strong> La app no almacena nada en nuestros servidores y no operamos ningún backend que reciba tu información.`,
    locH: 'Ubicación', locP: 'Si concedes permiso de ubicación, tu ubicación aproximada o precisa se usa <strong>solo en tu dispositivo</strong>, para preseleccionar la zona de búsqueda compatible más cercana. Nunca se nos transmite.',
    listH: 'Anuncios y contacto', listP: 'Las búsquedas obtienen anuncios disponibles públicamente de portales inmobiliarios de terceros mediante HTTPS. Cuando decides contactar con agentes, la app abre la app de mensajes, teléfono o mensajería de tu dispositivo con los destinatarios ya rellenados. Los mensajes los envías tú, desde tu dispositivo. La app no envía en tu nombre ni guarda contactos.',
    trackH: 'Sin seguimiento, sin anuncios', trackP: 'La app no contiene SDK de publicidad, ni analíticas, ni rastreadores de terceros.', contactH: 'Contacto',
    supportWord: 'Soporte', howH: 'Cómo usarla',
    steps: ['Busca por el nombre de un edificio o zona.', 'Selecciona los agentes que quieras de los resultados.', 'Toca para abrir la app de mensajes / teléfono / mensajería con los números ya rellenados, y envía.'],
    faqH: 'Preguntas frecuentes', helpLine: (e) => `Escríbenos a <a href="mailto:${e}">${e}</a> y te ayudaremos.`,
    freeTail: 'App gratis para iOS, sin cuenta, sin guardar nada.',
    ldDesc: (w) => `Busca anuncios por zona y contacta con varios agentes a la vez en ${w}. Sin cuenta, sin guardar nada, sin anuncios.`,
    faq: (w) => [
      ['¿Necesito una cuenta?', 'No. No hay inicio de sesión ni registro.'],
      ['¿Es gratis?', 'Sí, es gratis y no tiene anuncios.'],
      ['¿Se guardan mis datos?', 'No. Todo funciona en tu dispositivo; no se guarda nada en ningún servidor.'],
      ['¿Quién envía los mensajes?', 'Tú, desde tu propio dispositivo. La app solo los rellena.'],
      ['¿Qué zona cubre?', `Esta versión cubre ${w}. Otras regiones tienen su propia versión — consulta Todas las regiones.`],
      ['¿Cómo contacto con varios agentes a la vez?', 'Selecciona los agentes que quieras en los resultados; la app abre tu app de mensajes con todos sus números ya rellenados (SMS grupal).'],
    ],
  },
  vi: {
    cta: 'Tải trên App Store', whatItDoes: 'Ứng dụng làm gì', chooseCountry: 'Chọn quốc gia',
    introP: (w) => `Tìm tin bất động sản công khai theo khu vực tại ${esc(w)}, rồi liên hệ nhiều môi giới cùng lúc — ứng dụng mở app nhắn tin mặc định của bạn với số của các môi giới đã điền sẵn. Không tài khoản, không đăng ký, không lưu gì trên máy chủ.`,
    bullets: ['Tìm môi giới theo tên tòa nhà hoặc khu vực', 'Chọn những môi giới bạn muốn từ kết quả', 'Nhắn tin nhóm / gọi / chuyển sang WhatsApp — bạn gửi, từ thiết bị của mình'],
    navHome: 'Trang chủ', navPrivacy: 'Quyền riêng tư', navSupport: 'Hỗ trợ', navAll: 'Tất cả khu vực',
    privTitle: 'Chính sách quyền riêng tư', updated: 'cập nhật lần cuối', questions: 'Thắc mắc:',
    privLead: (a) => `<strong>${esc(a)} không thu thập dữ liệu.</strong> Ứng dụng không lưu gì trên máy chủ của chúng tôi và chúng tôi không vận hành máy chủ nào nhận thông tin của bạn.`,
    locH: 'Vị trí', locP: 'Nếu bạn cấp quyền vị trí, vị trí gần đúng hoặc chính xác của bạn chỉ được dùng <strong>trên thiết bị của bạn</strong>, để chọn sẵn khu vực tìm kiếm được hỗ trợ gần nhất. Nó không bao giờ được gửi cho chúng tôi.',
    listH: 'Tin đăng & liên hệ', listP: 'Tìm kiếm lấy tin đăng công khai từ các cổng bất động sản bên thứ ba qua HTTPS. Khi bạn chọn liên hệ môi giới, ứng dụng mở app Tin nhắn / điện thoại / nhắn tin mặc định với người nhận đã điền sẵn. Tin nhắn do bạn gửi, từ thiết bị của bạn. Ứng dụng không gửi thay bạn và không lưu danh bạ.',
    trackH: 'Không theo dõi, không quảng cáo', trackP: 'Ứng dụng không có SDK quảng cáo, không phân tích, không trình theo dõi bên thứ ba.', contactH: 'Liên hệ',
    supportWord: 'Hỗ trợ', howH: 'Cách dùng',
    steps: ['Tìm theo tên tòa nhà hoặc khu vực.', 'Chọn những môi giới bạn muốn từ kết quả.', 'Chạm để mở app Tin nhắn / điện thoại / nhắn tin với số đã điền sẵn, rồi gửi.'],
    faqH: 'Câu hỏi thường gặp', helpLine: (e) => `Gửi email tới <a href="mailto:${e}">${e}</a> và chúng tôi sẽ hỗ trợ.`,
    freeTail: 'Ứng dụng iOS miễn phí, không tài khoản, không lưu gì.',
    ldDesc: (w) => `Tìm tin theo khu vực và liên hệ nhiều môi giới cùng lúc tại ${w}. Không tài khoản, không lưu gì, không quảng cáo.`,
    faq: (w) => [
      ['Tôi có cần tài khoản không?', 'Không. Không có đăng nhập hay đăng ký.'],
      ['Có miễn phí không?', 'Có, miễn phí và không có quảng cáo.'],
      ['Dữ liệu của tôi có được lưu không?', 'Không. Mọi thứ chạy trên thiết bị của bạn; không có gì lưu trên máy chủ.'],
      ['Ai gửi tin nhắn?', 'Bạn, từ thiết bị của mình. Ứng dụng chỉ điền sẵn.'],
      ['Ứng dụng phủ khu vực nào?', `Phiên bản này phủ ${w}. Các khu vực khác có phiên bản riêng — xem Tất cả khu vực.`],
      ['Làm sao liên hệ nhiều môi giới cùng lúc?', 'Chọn các môi giới bạn muốn từ kết quả; ứng dụng mở app Tin nhắn mặc định với tất cả số đã điền sẵn (SMS nhóm).'],
    ],
  },
  zh: {
    cta: '在 App Store 下載', whatItDoes: '功能介紹', chooseCountry: '選擇地區',
    introP: (w) => `按地區搜尋${esc(w)}的公開房地產放盤，然後一次過聯絡多位代理 — 應用程式會開啟你手機的預設訊息程式，並自動填入代理的電話號碼。無需帳戶、無需註冊，伺服器不儲存任何資料。`,
    bullets: ['以屋苑或地區名稱搜尋代理', '從結果中揀選你想聯絡的代理', '群組訊息／致電／WhatsApp 交接 — 由你用自己的裝置發送'],
    navHome: '首頁', navPrivacy: '私隱', navSupport: '支援', navAll: '所有地區',
    privTitle: '私隱政策', updated: '最後更新', questions: '查詢：',
    privLead: (a) => `<strong>${esc(a)} 不收集任何資料。</strong>應用程式不會在我們的伺服器儲存任何東西，我們亦沒有任何接收你資料的後端。`,
    locH: '位置', locP: '若你授予位置權限，你的大概或精確位置只會<strong>在你的裝置上</strong>使用，用來預先選取最近的支援搜尋地區。絕不會傳送給我們。',
    listH: '放盤與聯絡', listP: '搜尋會透過 HTTPS 從第三方房地產平台取得公開放盤。當你選擇聯絡代理時，應用程式會開啟你裝置的預設訊息、電話或通訊程式，並預先填入收件人。訊息由你用自己的裝置發送。應用程式不會代你發送，也不會儲存聯絡人。',
    trackH: '無追蹤、無廣告', trackP: '應用程式不含廣告 SDK、分析工具或第三方追蹤器。', contactH: '聯絡',
    supportWord: '支援', howH: '使用方法',
    steps: ['以屋苑或地區名稱搜尋。', '從結果中揀選你想聯絡的代理。', '輕按開啟預設訊息／電話／通訊程式（已填入號碼），然後發送。'],
    faqH: '常見問題', helpLine: (e) => `電郵至 <a href="mailto:${e}">${e}</a>，我們樂意協助。`,
    freeTail: '免費 iOS 應用程式，無需帳戶，不儲存任何資料。',
    ldDesc: (w) => `按地區搜尋放盤，一次過聯絡多位代理（${w}）。無需帳戶、不儲存資料、無廣告。`,
    faq: (w) => [
      ['需要帳戶嗎？', '不需要。沒有登入或註冊。'],
      ['免費嗎？', '是，免費而且沒有廣告。'],
      ['會儲存我的資料嗎？', '不會。一切都在你的裝置上運行，伺服器不儲存任何資料。'],
      ['訊息由誰發送？', '由你用自己的裝置發送。應用程式只負責預先填入。'],
      ['覆蓋哪個地區？', `此版本覆蓋${w}。其他地區有各自的版本 — 請見所有地區。`],
      ['如何一次過聯絡多位代理？', '從搜尋結果中揀選你想聯絡的代理；應用程式會開啟你的預設訊息程式，並填入所有號碼（群組 SMS）。'],
    ],
  },
  ar: {
    cta: 'حمّله من App Store', whatItDoes: 'ماذا يفعل التطبيق', chooseCountry: 'اختر دولتك',
    introP: (w) => `ابحث عن عقارات معلن عنها للعموم حسب المنطقة في ${esc(w)}، ثم تواصل مع عدة وسطاء دفعة واحدة — يفتح التطبيق تطبيق الرسائل الافتراضي في هاتفك مع أرقام الوسطاء معبأة مسبقًا. بدون حساب، بدون تسجيل، ولا يُخزَّن أي شيء على أي خادم.`,
    bullets: ['ابحث عن الوسطاء باسم العقار أو المنطقة', 'اختر الوسطاء الذين تريدهم من النتائج', 'رسالة جماعية / اتصال / تحويل إلى واتساب — أنت من يرسل، من جهازك'],
    navHome: 'الرئيسية', navPrivacy: 'الخصوصية', navSupport: 'الدعم', navAll: 'كل المناطق',
    privTitle: 'سياسة الخصوصية', updated: 'آخر تحديث', questions: 'للاستفسارات:',
    privLead: (a) => `<strong>${esc(a)} لا يجمع أي بيانات.</strong> لا يخزّن التطبيق أي شيء على خوادمنا ولا نشغّل أي خادم خلفي يستقبل معلوماتك.`,
    locH: 'الموقع', locP: 'إذا منحت إذن الموقع، يُستخدم موقعك التقريبي أو الدقيق <strong>على جهازك فقط</strong>، لاختيار أقرب منطقة بحث مدعومة مسبقًا. ولا يُرسَل إلينا أبدًا.',
    listH: 'العقارات والتواصل', listP: 'تجلب عمليات البحث عقارات متاحة للعموم من بوابات عقارية تابعة لأطراف ثالثة عبر HTTPS. وعندما تختار التواصل مع الوسطاء، يفتح التطبيق تطبيق الرسائل أو الهاتف الافتراضي في جهازك مع المستلمين معبأين مسبقًا. الرسائل تُرسَل منك، من جهازك. لا يرسل التطبيق نيابة عنك ولا يحفظ جهات الاتصال.',
    trackH: 'بلا تتبع، بلا إعلانات', trackP: 'لا يحتوي التطبيق على أي حزم إعلانات أو تحليلات أو أدوات تتبع تابعة لأطراف ثالثة.', contactH: 'اتصل بنا',
    supportWord: 'الدعم', howH: 'طريقة الاستخدام',
    steps: ['ابحث باسم عقار أو منطقة.', 'اختر الوسطاء الذين تريدهم من النتائج.', 'انقر لفتح تطبيق الرسائل / الهاتف الافتراضي مع الأرقام معبأة، ثم أرسل.'],
    faqH: 'الأسئلة الشائعة', helpLine: (e) => `راسلنا على <a href="mailto:${e}">${e}</a> وسنساعدك.`,
    freeTail: 'تطبيق iOS مجاني، بدون حساب، ولا يُخزَّن أي شيء.',
    ldDesc: (w) => `ابحث عن العقارات حسب المنطقة وتواصل مع عدة وسطاء دفعة واحدة في ${w}. بدون حساب، لا يُخزَّن شيء، بلا إعلانات.`,
    faq: (w) => [
      ['هل أحتاج إلى حساب؟', 'لا. لا يوجد تسجيل دخول أو اشتراك.'],
      ['هل هو مجاني؟', 'نعم، مجاني وبدون إعلانات.'],
      ['هل تُخزَّن بياناتي؟', 'لا. كل شيء يعمل على جهازك؛ ولا يُحفَظ أي شيء على أي خادم.'],
      ['من يرسل الرسائل؟', 'أنت، من جهازك. التطبيق يعبّئها فقط.'],
      ['أي منطقة يغطيها؟', `تغطي هذه النسخة ${w}. وللمناطق الأخرى نسخ خاصة بها — انظر كل المناطق.`],
      ['كيف أتواصل مع عدة وسطاء دفعة واحدة؟', 'اختر الوسطاء الذين تريدهم من نتائج البحث؛ يفتح التطبيق تطبيق الرسائل الافتراضي مع كل أرقامهم معبأة (رسالة SMS جماعية).'],
    ],
  },
  bs: {
    cta: 'Preuzmi na App Store', whatItDoes: 'Šta aplikacija radi', chooseCountry: 'Odaberite državu',
    introP: (w) => `Pretražujte javne oglase za nekretnine po području u ${esc(w)}, pa kontaktirajte više agenata odjednom — aplikacija otvara zadanu aplikaciju za poruke na vašem telefonu s već unesenim brojevima agenata. Bez naloga, bez registracije, ništa se ne pohranjuje na serveru.`,
    bullets: ['Pretražujte agente po nazivu zgrade ili područja', 'Odaberite agente koje želite iz rezultata', 'Grupna poruka / poziv / WhatsApp — vi šaljete, sa svog uređaja'],
    navHome: 'Početna', navPrivacy: 'Privatnost', navSupport: 'Podrška', navAll: 'Sve regije',
    privTitle: 'Politika privatnosti', updated: 'posljednje ažuriranje', questions: 'Pitanja:',
    privLead: (a) => `<strong>${esc(a)} ne prikuplja podatke.</strong> Aplikacija ne pohranjuje ništa na našim serverima i ne koristimo nikakav backend koji prima vaše podatke.`,
    locH: 'Lokacija', locP: 'Ako date dozvolu za lokaciju, vaša približna ili tačna lokacija koristi se <strong>samo na vašem uređaju</strong>, za predodabir najbliže podržane oblasti pretrage. Nikada se ne prenosi nama.',
    listH: 'Oglasi i kontakt', listP: 'Pretrage dohvaćaju javno dostupne oglase s portala za nekretnine trećih strana putem HTTPS-a. Kada odlučite kontaktirati agente, aplikacija otvara zadanu aplikaciju za poruke, telefon ili razmjenu poruka s već unesenim primaocima. Poruke šaljete vi, sa svog uređaja. Aplikacija ne šalje u vaše ime i ne pohranjuje kontakte.',
    trackH: 'Bez praćenja, bez reklama', trackP: 'Aplikacija ne sadrži reklamne SDK-ove, analitiku ni pratioce trećih strana.', contactH: 'Kontakt',
    supportWord: 'Podrška', howH: 'Kako koristiti',
    steps: ['Pretražite po nazivu zgrade ili područja.', 'Odaberite agente koje želite iz rezultata.', 'Dodirnite da otvorite zadanu aplikaciju za poruke / telefon s unesenim brojevima, pa pošaljite.'],
    faqH: 'Česta pitanja', helpLine: (e) => `Pišite na <a href="mailto:${e}">${e}</a> i pomoći ćemo.`,
    freeTail: 'Besplatna iOS aplikacija, bez naloga, ništa se ne pohranjuje.',
    ldDesc: (w) => `Pretražujte oglase po području i kontaktirajte više agenata odjednom u ${w}. Bez naloga, ništa se ne pohranjuje, bez reklama.`,
    faq: (w) => [
      ['Trebam li nalog?', 'Ne. Nema prijave ni registracije.'],
      ['Je li besplatno?', 'Da, besplatno je i bez reklama.'],
      ['Pohranjuju li se moji podaci?', 'Ne. Sve radi na vašem uređaju; ništa se ne čuva na serveru.'],
      ['Ko šalje poruke?', 'Vi, sa svog uređaja. Aplikacija ih samo popunjava.'],
      ['Koje područje pokriva?', `Ova verzija pokriva ${w}. Druge regije imaju svoju verziju — pogledajte Sve regije.`],
      ['Kako kontaktirati više agenata odjednom?', 'Odaberite agente koje želite iz rezultata; aplikacija otvara zadanu aplikaciju za poruke sa svim brojevima (grupni SMS).'],
    ],
  },
};
const tr = (m) => STR[langBase(m)] || STR.en;

// privacy/support cluster: one page per market, across all markets. x-default -> English (af).
function alternates(kind) {
  const path = (m) => `${BASE}/${m.id}/${kind ? kind + '.html' : ''}`;
  const links = markets.map((m) => `  <link rel="alternate" hreflang="${m.hreflang}" href="${path(m)}">`);
  links.push(`  <link rel="alternate" hreflang="x-default" href="${BASE}/af/${kind}.html">`);
  return links.join('\n');
}

// landing cluster for ONE market: its hub + every country page, reciprocal. x-default -> hub.
function landingAlternates(m) {
  const links = [`  <link rel="alternate" hreflang="${langBase(m)}" href="${BASE}/${m.id}/">`];
  for (const c of m.countries) {
    links.push(`  <link rel="alternate" hreflang="${countryHreflang(m, c)}" href="${BASE}/${m.id}/${c.cc}/">`);
  }
  links.push(`  <link rel="alternate" hreflang="x-default" href="${BASE}/${m.id}/">`);
  return links.join('\n');
}

function head({ m, title, desc, canonical, alt, jsonld }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
${alt}
${jsonld ? jsonld.map(ld).join('\n') : ''}`;
}

const STYLE = `<style>
  :root { --fg:#111; --muted:#555; --bg:#fff; --accent:#0a7cff; --card:#f5f6f8; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme=light]){ --fg:#eee; --muted:#aaa; --bg:#111; --card:#1c1d21; } }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:720px;margin:0 auto;padding:48px 16px}
  h1{font-size:1.9rem;line-height:1.2;margin:0 0 .3em} h2{margin:1.6em 0 .4em} h3{margin:1.4em 0 .2em}
  .tag{color:var(--muted);font-size:1.15rem;margin:0 0 1.5em}
  a{color:var(--accent)} .muted{color:var(--muted)} ul{padding-inline-start:1.2em}
  .cta{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;
    padding:12px 22px;border-radius:10px;font-weight:600;margin:.5em 0}
  nav{margin-top:3em;padding-top:1.2em;border-top:1px solid var(--card);font-size:.9rem}
  footer{margin-top:2.5em;color:var(--muted);font-size:.85rem}
</style>`;

function page({ m, title, desc, body, canonical, alt, jsonld }) {
  return `<!doctype html>
<html lang="${m.lang}" dir="${m.dir}">
<head>
${head({ m, title, desc, canonical, alt, jsonld })}
${STYLE}
</head>
<body>
<main>
${body}
<nav>
  <a href="${BASE}/${m.id}/">${esc(tr(m).navHome)}</a> ·
  <a href="${BASE}/${m.id}/privacy.html">${esc(tr(m).navPrivacy)}</a> ·
  <a href="${BASE}/${m.id}/support.html">${esc(tr(m).navSupport)}</a> ·
  <a href="${BASE}/">${esc(tr(m).navAll)}</a>
</nav>
<footer>© 2026 kahvilavalas · <a href="mailto:${contactEmail}">${contactEmail}</a></footer>
</main>
</body>
</html>
`;
}

// --- FAQ single source -> visible <h3> HTML + FAQPage JSON-LD ---
const faq = (m, where) => tr(m).faq(where);
const faqHtml = (m, where) => faq(m, where).map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n');
const faqLd = (m, where) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faq(m, where).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});

// SoftwareApplication for a hub (place = region) or a country page (place = country).
const softwareLd = ({ m, name, desc, url, inLanguage, areaServed }) => ({
  '@context': 'https://schema.org', '@type': 'SoftwareApplication',
  name, description: desc, applicationCategory: 'BusinessApplication', operatingSystem: 'iOS',
  url, downloadUrl: appUrl(m), inLanguage,
  ...(areaServed ? { areaServed: { '@type': 'Country', name: areaServed } } : {}),
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: ORG,
});

const intro = (m, where) => {
  const s = tr(m);
  return `<p>${s.introP(where)}</p>
<ul>
${s.bullets.map((b) => `  <li>${esc(b)}</li>`).join('\n')}
</ul>`;
};

function hubBody(m) {
  const s = tr(m);
  const list = m.countries.length > 1
    ? `<h2>${esc(s.chooseCountry)}</h2>\n<ul>\n${m.countries.map((c) => `  <li><a href="${BASE}/${m.id}/${c.cc}/">${esc(c.name)}</a></li>`).join('\n')}\n</ul>`
    : '';
  return `<h1>${esc(m.appName)}</h1>
<p class="tag">${esc(m.tagline)}</p>
<a class="cta" href="${appUrl(m)}">${esc(s.cta)}</a>
<h2>${esc(s.whatItDoes)}</h2>
${intro(m, m.region)}
${list}`;
}

function countryBody(m, c) {
  const s = tr(m);
  return `<h1>${esc(m.appName)} — ${esc(c.name)}</h1>
<p class="tag">${esc(m.tagline)} · ${esc(c.name)}</p>
<a class="cta" href="${appUrl(m)}">${esc(s.cta)}</a>
<h2>${esc(s.whatItDoes)}</h2>
${intro(m, c.name)}`;
}

const privacyBody = (m) => {
  const s = tr(m);
  return `<h1>${esc(s.privTitle)}</h1>
<p class="muted">${esc(m.appName)} · ${esc(s.updated)} ${m.id === 'ka' ? '2026-10-14' : '2026-10-09'}</p>
<p>${s.privLead(m.appName)}</p>
${m.id === 'ka' ? `<p>This policy covers the Google Play app <strong>უძრავი ქონების აგენტები</strong> (package <code>com.kahvilavalas.realtorfinder.ka</code>), also named <strong>${esc(m.appName)}</strong> on this website. The app is published by <strong>kahvilavalas</strong>.</p>` : ''}
<h2>${esc(s.locH)}</h2>
<p>${s.locP}</p>
<h2>${esc(s.listH)}</h2>
<p>${esc(s.listP)}</p>
<h2>${esc(s.trackH)}</h2>
<p>${esc(s.trackP)}</p>
<h2>${esc(s.contactH)}</h2>
<p>${esc(s.questions)} <a href="mailto:${contactEmail}">${contactEmail}</a></p>`;
};

const supportBody = (m) => {
  const s = tr(m);
  return `<h1>${esc(s.supportWord)} — ${esc(m.appName)}</h1>
<h2>${esc(s.howH)}</h2>
<ol>
${s.steps.map((st) => `  <li>${esc(st)}</li>`).join('\n')}
</ol>
<h2>${esc(s.faqH)}</h2>
${faqHtml(m, m.region)}
<h2>${esc(s.contactH)}</h2>
<p>${s.helpLine(contactEmail)}</p>`;
};

function rootPage() {
  const rows = markets
    .map((m) => `  <li><a href="${m.id}/">${esc(m.appName)}</a> <span class="muted">${esc(m.region)}</span></li>`)
    .join('\n');
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Realtor Finder', url: `${BASE}/`, publisher: ORG },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: markets.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.appName, url: `${BASE}/${m.id}/` })) },
  ];
  const altRoot = [
    ...markets.map((m) => `  <link rel="alternate" hreflang="${langBase(m)}" href="${BASE}/${m.id}/">`),
    `  <link rel="alternate" hreflang="x-default" href="${BASE}/">`,
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Realtor Finder — contact real estate agents at once</title>
<meta name="description" content="Realtor Finder: free iOS apps to search listings by area and contact several real estate agents at once. No account, nothing stored. Pick your country.">
<link rel="canonical" href="${BASE}/">
<meta property="og:type" content="website">
<meta property="og:title" content="Realtor Finder">
<meta property="og:url" content="${BASE}/">
${altRoot}
${jsonld.map(ld).join('\n')}
${STYLE}
</head>
<body><main>
<h1>Realtor Finder</h1>
<p>Free iOS apps to search real-estate listings by area and contact several agents at once. Choose your region:</p>
<ul>
${rows}
</ul>
</main></body></html>
`;
}

function sitemap(allUrls) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
}

function robots() {
  const bots = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];
  const blocks = bots.map((b) => `User-agent: ${b}\nAllow: /`).join('\n\n');
  return `${blocks}\n\nUser-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`;
}

function llms() {
  const apps = markets.map((m) => {
    const head = `- [${m.region}](${BASE}/${m.id}/): ${m.appName} — iOS App Store id${m.appleId}`;
    if (m.countries.length <= 1) return head;
    const subs = m.countries.map((c) => `  - [${c.name}](${BASE}/${m.id}/${c.cc}/)`).join('\n');
    return `${head}\n${subs}`;
  }).join('\n');
  return `# Realtor Finder

> Free iOS apps to search real-estate listings by area and contact several agents
> at once. No account, no sign-up, nothing stored on any server, no ads. Messages
> are sent by the user from their own device. 14 regional apps, per-country pages.

## Apps by region and country
${apps}

## Each app includes
- A privacy policy (\`/<region>/privacy.html\`): no data collected, on-device only.
- Support & FAQ (\`/<region>/support.html\`): how it works, account/data/messaging questions.

## Contact
${contactEmail}
`;
}

const out = new URL('./dist/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const urls = [`${BASE}/`];
let files = 0;
for (const m of markets) {
  const s = tr(m);
  const lalt = landingAlternates(m);
  await mkdir(new URL(`./${m.id}/`, out), { recursive: true });
  // market hub
  await writeFile(new URL(`./${m.id}/index.html`, out), page({
    m, title: m.appName, desc: `${m.tagline} — ${m.region}. ${s.freeTail}`,
    body: hubBody(m), canonical: `${BASE}/${m.id}/`, alt: lalt,
    jsonld: [softwareLd({ m, name: m.appName, desc: s.ldDesc(m.region), url: `${BASE}/${m.id}/`, inLanguage: langBase(m) })],
  }));
  // privacy + support (market level, cross-market cluster)
  await writeFile(new URL(`./${m.id}/privacy.html`, out), page({
    m, title: `${s.privTitle} — ${m.appName}`, desc: `${s.privTitle} — ${m.appName}.`,
    body: privacyBody(m), canonical: `${BASE}/${m.id}/privacy.html`, alt: alternates('privacy'),
  }));
  await writeFile(new URL(`./${m.id}/support.html`, out), page({
    m, title: `${s.supportWord} — ${m.appName}`, desc: `${s.supportWord} — ${m.appName}.`,
    body: supportBody(m), canonical: `${BASE}/${m.id}/support.html`, alt: alternates('support'), jsonld: [faqLd(m, m.region)],
  }));
  urls.push(`${BASE}/${m.id}/`, `${BASE}/${m.id}/privacy.html`, `${BASE}/${m.id}/support.html`);
  files += 3;
  // per-country landing pages
  for (const c of m.countries) {
    await mkdir(new URL(`./${m.id}/${c.cc}/`, out), { recursive: true });
    await writeFile(new URL(`./${m.id}/${c.cc}/index.html`, out), page({
      m, title: `${m.appName} — ${c.name}`, desc: `${m.tagline} · ${c.name}. ${s.freeTail}`,
      body: countryBody(m, c), canonical: `${BASE}/${m.id}/${c.cc}/`, alt: lalt,
      jsonld: [softwareLd({ m, name: `${m.appName} — ${c.name}`, desc: s.ldDesc(c.name), url: `${BASE}/${m.id}/${c.cc}/`, inLanguage: countryHreflang(m, c), areaServed: c.name })],
    }));
    urls.push(`${BASE}/${m.id}/${c.cc}/`);
    files += 1;
  }
}
// One consolidated iOS product; existing regional pages continue to serve Android users.
const unified = { id: 'unified', lang: 'en', dir: 'ltr', appName: 'Agent Connect' };
const unifiedPages = {
  'index.html': ['Agent Connect', `<h1>Agent Connect</h1>
<p>Find property listings and contact local agents in one iPhone app. Choose from 28 supported countries and territories, then choose your interface language independently.</p>
<p>Local sources, agent terminology and contact options adapt to your selected country. No account, ads or automatic message sending.</p>
<p>The consolidated iOS app is being prepared for App Store review. Regional Android apps remain separate.</p>
<h2>Supported countries and territories</h2><p>Argentina, Bahrain, Bosnia and Herzegovina, Cambodia, Colombia, Costa Rica, Dominican Republic, Egypt, El Salvador, Georgia, Guatemala, Honduras, Hong Kong, Kenya, Mexico, Myanmar, Nicaragua, Nigeria, Pakistan, Panama, Paraguay, Philippines, Qatar, Saudi Arabia, Sri Lanka, United Arab Emirates, Uruguay and Vietnam.</p>`],
  'privacy.html': ['Privacy Policy — Agent Connect', `<h1>Privacy Policy — Agent Connect</h1><p>Updated 2026-10-24. Published by kahvilavalas. This policy covers the consolidated iOS app, bundle ID <code>com.kahvilavalas.realtorfinder.ka</code>, including its localized names such as Contactos Inmobiliarios.</p>
<h2>Data and preferences</h2><p>We do not operate an app backend that collects your personal information. The app saves only your chosen country and interface language on your device. It does not persist listing results or contact details, and it does not access your address book. Reinstalling the app resets its local preferences.</p>
<h2>Location</h2><p>Location access is optional and is used to suggest a supported area when you request it. Coordinates may be processed by the operating system geocoding service to identify the area; they are not sent to us.</p>
<h2>Third-party services</h2><p>Searches request public listings directly from property portals over HTTPS. These services receive normal network request information, such as your IP address and the area or search query sent to them, and operate under their own privacy policies.</p>
<p>Contact buttons open your phone or messaging app with recipients filled in. You write and send messages yourself. We do not send messages on your behalf or receive their contents.</p>
<h2>No tracking or advertising</h2><p>No advertising SDKs, analytics or tracking SDKs are included.</p>
<h2>Contact</h2><p><a href="mailto:${contactEmail}">${contactEmail}</a></p>`],
  'ads-privacy.html': ['Privacy Policy — Advertising Version', `<h1>Privacy Policy — Advertising Version</h1>
<p>Updated 2026-10-28. Published by kahvilavalas. This policy applies to the advertising-enabled Agent SMS: Contact Realtors (formerly Agent Connect) / 부동산 중개사 연락하기 iOS app (<code>com.kahvilavalas.realtorfinder.ka</code>) and Realtor Finder regional Android apps (<code>com.kahvilavalas.realtorfinder.ar, .es, .esco, .esar, .vi, .hk, .ph, .kh, .mm, .lk, .pk, .af, .ka, .sr</code>). Existing builds without advertising remain covered by their existing privacy policies.</p>
<h2>Search and contact information</h2><p>We do not operate an app backend or require an account. Search results and contact details are held in memory, not saved by the app. Country and interface language preferences are saved locally where supported. Contact buttons open your phone or messaging app; you write and send messages yourself. The app does not access your address book.</p>
<h2>Location and property portals</h2><p>Location access is optional and helps select a supported area. The operating system geocoding service may process coordinates. Searches request public listings directly from property portals, which receive your IP address and requested area or query under their own policies.</p>
<h2>Google AdMob advertising</h2><p>The advertising version uses Google Mobile Ads and Google User Messaging Platform (UMP) to show non-personalized banners on search loading screens and in search results, optional rewarded ads for additional searches, and manage consent. Google may process IP addresses (including approximate location), device identifiers where permitted, ad interactions, and diagnostics for ad delivery, frequency limits, fraud prevention and measurement. Non-personalized ads still involve data processing. The app does not attach listing contacts, message contents, search queries or GPS coordinates to ad requests.</p>
<p>Google and its advertising services process data under the <a href="https://policies.google.com/privacy">Google Privacy Policy</a> and <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from apps</a>. We do not add a separate analytics SDK.</p>
<h2>Optional rewarded searches</h2><p>The first additional search is free. After that, watching a rewarded ad to completion grants two additional searches, including the current search. The app may search while the ad plays, but does not reveal the new results until the reward is earned and the ad closes. Closing without a reward retains the previous results. If an ad is unavailable, the current additional search continues free. Search credits and results are kept only in memory.</p>
<h2>Your choices</h2><p>UMP displays required consent messages before advertising is requested. Where available, open the app privacy menu and choose Ad privacy choices to manage or withdraw choices. Consent settings may be stored on the device by Google. Device privacy controls also apply. Search and contact functions continue when ads cannot be loaded. Data deletion and other rights concerning Google's processing are explained in Google's privacy controls and policy; contact us for questions about this app.</p>
<h2>Contact</h2><p><a href="mailto:${contactEmail}">${contactEmail}</a></p>`],
  'support.html': ['Support — Agent Connect', `<h1>Support — Agent Connect</h1>
<ol><li>Choose your country and interface language, then tap Continue.</li><li>Choose a supported city or area. Some sources use a portal filter instead.</li><li>Review the results and tap a contact button to open your messaging or phone app. You send messages yourself.</li><li>Use the globe button to change your country or language. Previous results are cleared when the search screen changes.</li></ol>
<h2>Settings and availability</h2><p>Your country and language preferences are saved on your device. Search results and contact details are not saved. No account is required. Some portals may be temporarily unavailable or restrict automated access; retry later or choose another supported area.</p>
<h2>Contact support</h2><p>Email <a href="mailto:${contactEmail}">${contactEmail}</a> with your selected country, app version and a description of the problem. Do not include private messages or unnecessary contact details.</p>`],
};
await mkdir(new URL('./unified/', out), { recursive: true });
for (const [file, [title, body]] of Object.entries(unifiedPages)) {
  const canonical = `${BASE}/unified/${file === 'index.html' ? '' : file}`;
  await writeFile(new URL(`./unified/${file}`, out), page({ m: unified, title, desc: title, body, canonical, alt: '' }));
  urls.push(canonical);
  files++;
}

await writeFile(new URL('./index.html', out), rootPage());
await writeFile(new URL('./sitemap.xml', out), sitemap(urls));
await writeFile(new URL('./robots.txt', out), robots());
await writeFile(new URL('./llms.txt', out), llms());
const countries = markets.reduce((n, m) => n + m.countries.length, 0);
console.log(`built ${files + 4} files: ${markets.length} markets, ${countries} country pages -> dist/`);
