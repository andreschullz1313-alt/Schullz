import { SensitivityTier } from '../data/studioData';
import { LanguageCode } from './types';

export interface DomainTranslations {
  categories: Record<string, string>;
  workTitles: Record<string, string>;
  quoteStyles: Record<string, string>;
  sizeTiers: string[];
  priceGroups: {
    group: string;
    items: { title: string; description: string }[];
  }[];
  anamneseQuestions: string[];
  storeProducts: { name: string; description: string }[];
  tierLabels: Record<SensitivityTier, { label: string; badgeText: string }>;
  bodyZones: Record<string, { name: string; detail: string }>;
  otherZone: string;
  painMap: {
    hudTitle: string;
    hudHint: string;
    webglUnavailableTitle: string;
    webglUnavailableBody: string;
    view360Label: string;
    view360Aria: string;
    presets: {
      frente: string;
      lado_dir: string;
      costas: string;
      lado_esq: string;
      reset: string;
    };
    autoSpinOn: string;
    autoSpinOff: string;
    highlightLabel: string;
    highlightAria: string;
    filters: {
      all: string;
      low: string;
      moderate: string;
      sensitive: string;
      blank: string;
    };
    legendAria: string;
    selectPrompt: string;
    scale0: string;
    scale50: string;
    scale100: string;
    detailDisclaimer: string;
    emptyPrompt: string;
    useZoneBtn: string;
    allRegionsTitle: string;
  };
  quote: {
    restrictedKicker: string;
    restrictedTitle: string;
    restrictedBody: string;
    goToLogin: string;
    kicker: string;
    title: string;
    styleLabel: string;
    zoneLabel: string;
    sizeLabel: string;
    couponLabel: string;
    couponPlaceholder: string;
    initialEstimate: string;
    startingFrom: string;
    discountApplied: string;
    yourName: string;
    whatsapp: string;
    describeIdea: string;
    ideaPlaceholder: string;
    photosTitle: string;
    photosDesc: string;
    photoLabels: [string, string, string];
    noPhotoSelected: string;
    anamneseTitle: string;
    anamneseAttention: string;
    anamneseNone: string;
    contractTitle: string;
    contractP1: string;
    contractP2Strong: string;
    contractP2: string;
    contractP3Strong: string;
    contractP3: string;
    contractNote: string;
    acceptTerms: string;
    signLabel: string;
    clearSign: string;
    savePdf: string;
    finalizeWa: string;
    toastNeedContact: string;
    toastNeedTerms: string;
    toastSaved: string;
    toastPdf: string;
    modalAria: string;
    modalTitle: string;
    modalBody: string;
    modalCodeLabel: string;
    openWa: string;
    waHello: string;
    waStyle: string;
    waRegion: string;
    waSize: string;
    waEstimate: string;
    waIdea: string;
    waAnamnese: string;
    waAnamneseEval: string;
    waAnamneseNone: string;
    waTermsSigned: string;
    pdfDocTitle: string;
    pdfIssuedAt: string;
    pdfClientSection: string;
    pdfClient: string;
    pdfCoupon: string;
    pdfNone: string;
    pdfSizeSelected: string;
    pdfTermsAccepted: string;
    pdfYes: string;
    pdfPending: string;
    pdfIdeaDesc: string;
    pdfNotInformed: string;
    pdfEstimateTitle: string;
    pdfEstimateNote: string;
    pdfAnamneseSection: string;
    pdfAnamneseNone: string;
    pdfPhotosSection: string;
    pdfPhotoNotSent: string;
    pdfContractSection: string;
    pdfContractP1: string;
    pdfContractP2: string;
    pdfContractP3: string;
    pdfDigitalSig: string;
    pdfSigRecorded: string;
    pdfSigPending: string;
    pdfSigLine: string;
    pdfFooter: string;
  };
  foldersHub: {
    kicker: string;
    title: string;
    lead: string;
    tabsAria: string;
    folderWord: string;
    openStatus: string;
    closedStatus: string;
    viewingNow: string;
    clickToOpen: string;
    nextFolder: string;
    folders: Record<
      'contato' | 'faq' | 'preparacao' | 'pos-tattoo',
      { title: string; subtitle: string; summary: string }
    >;
    contactKicker: string;
    privateStudio: string;
    visitUs: string;
    openMaps: string;
    aftercareKicker: string;
    aftercareTitle: string;
    aftercareLead: string;
    inStock: string;
    orderWhatsapp: string;
    waOrderPrefix: string;
  };
  faq: {
    kicker: string;
    title: string;
    lead: string;
    filterAria: string;
    categories: {
      todas: string;
      agendamento: string;
      dor: string;
      politicas: string;
    };
    waPrefill: string;
    stillDoubtsTitle: string;
    stillDoubtsBody: string;
    askWhatsapp: string;
    items: Record<string, { categoryLabel: string; question: string; answer: string; actionLabel?: string }>;
  };
  prep: {
    kicker: string;
    title: string;
    lead: string;
    pillar1Title: string;
    pillar1Body: string;
    pillar2Title: string;
    pillar2Body: string;
    progressLabel: string;
    resetBtn: string;
    filterAria: string;
    filters: {
      all: string;
      '48h': string;
      dia: string;
      saida: string;
    };
    doneBadge: string;
    nextHint: string;
    aftercareBtn: string;
    quoteBtn: string;
    steps: Record<string, { phaseLabel: string; categoryTag: string; title: string; detail: string }>;
  };
  healing: {
    kicker: string;
    title: string;
    lead: string;
    progressLabel: string;
    resetBtn: string;
    filterAria: string;
    filters: {
      all: string;
      '1-2': string;
      '3-14': string;
      '15-30': string;
    };
    doneBadge: string;
    steps: Record<string, { phaseLabel: string; title: string; detail: string }>;
  };
}

const EN_DOMAIN: DomainTranslations = {
  categories: {
    Todos: 'All',
    Lettering: 'Lettering',
    Realismo: 'Realism',
    Minimalista: 'Minimalist',
    Blackwork: 'Blackwork',
    Oriental: 'Oriental',
    Sketch: 'Sketch',
    Gótico: 'Gothic',
  },
  workTitles: {
    'Máscara da morte nas costas': 'Death mask on the back',
    'Fechamento com anjo e cruz': 'Angel & cross sleeve',
    'Máscara hannya com flores': 'Hannya mask with flowers',
    'Rosas e Medusa no antebraço': 'Roses & Medusa on forearm',
    'Guerreira viking no braço': 'Viking warrior on arm',
    'Fechamento com leão, águia e espartano': 'Lion, eagle & Spartan sleeve',
    'Frases espelhadas no antebraço': 'Mirrored phrases on forearm',
    'Zodíaco em fine line': 'Fine line zodiac',
    'Data 25.01.2026 com rosa': 'Date 25.01.2026 with rose',
    'Onda com Odoyá': 'Wave with Odoyá lettering',
    'Frase na costela': 'Ribcage quote lettering',
  },
  quoteStyles: {
    Realismo: 'Realism',
    Oriental: 'Oriental',
    Lettering: 'Lettering',
    Minimalista: 'Minimalist',
    Blackwork: 'Blackwork',
    Gótico: 'Gothic',
    Sketch: 'Sketch',
    Outro: 'Other',
  },
  sizeTiers: [
    'Mini 5–8 cm',
    'Mini 8–12 cm',
    'Piece 12–18 cm',
    'Medium (arm, thigh)',
    'Large, per session',
    'Full limb sleeve',
  ],
  priceGroups: [
    {
      group: 'By session time',
      items: [
        { title: '15 to 20 min', description: 'Short session for small pieces, covering fixed studio costs and sterile materials.' },
        { title: '30 to 60 min', description: 'Small to medium pieces with dedicated finishing time.' },
        { title: '2 to 4 hrs', description: 'Medium projects with shading, color, or multiple elements.' },
        { title: '6 to 8 hrs (full day)', description: 'Full-day session covering extensive coverage and intricate detail.' },
      ],
    },
    {
      group: 'Mini tattoos',
      items: [
        { title: '5 to 8 cm', description: 'Simple fine line, short word, or symbol.' },
        { title: '8 to 12 cm', description: 'More detail, shading, or two combined elements.' },
        { title: '12 to 18 cm', description: 'Transition piece between mini and medium size.' },
      ],
    },
    {
      group: 'Medium & large',
      items: [
        { title: 'Medium — single side', description: 'Forearm, upper arm, thigh, or calf.' },
        { title: 'Large — arms, back & legs', description: 'Outer or inner side, in one or more sessions.' },
      ],
    },
  ],
  anamneseQuestions: [
    'I have allergies (ink, latex, anesthetic)',
    'I have a history of keloids or poor healing',
    'I take continuous medication / blood thinners',
    'I have diabetes',
    'I am pregnant or breastfeeding',
    'This is my first tattoo (informational)',
  ],
  storeProducts: [
    { name: 'Healing ointment', description: 'Studio-recommended aftercare ointment. Apply a thin layer 2x/day starting day 3. 30 g jar.' },
    { name: 'Sunflower oil', description: '100 ml neutral sunflower oil for moisturizing skin after peeling finishes.' },
    { name: 'Protective film wrap', description: 'Transparent protective film roll (10 m), cut to fit your tattoo for early days.' },
  ],
  tierLabels: {
    low: { label: 'Green Zone (Low Pain)', badgeText: 'Green Zone · Low Pain' },
    moderate: { label: 'Yellow Zone (Moderate Pain)', badgeText: 'Yellow Zone · Moderate Pain' },
    high: { label: 'Red Zone (High Pain)', badgeText: 'Red Zone · High Pain' },
    extreme: { label: 'Red Zone (High Pain)', badgeText: 'Red Zone · High Pain' },
  },
  bodyZones: {
    'Braço externo': { name: 'Outer arm', detail: 'Green zone: generally one of the most tolerable areas to tattoo.' },
    'Ombro / deltoide': { name: 'Shoulder / deltoid', detail: 'Green zone: low pain, good muscle cushion, beginner-friendly.' },
    'Cabeça': { name: 'Head', detail: 'Green zone on studio map: lower average sensitivity (varies near bone).' },
    'Peito': { name: 'Chest', detail: 'Green zone on pectoral muscle; sensitivity rises near sternum and collarbones.' },
    'Antebraço externo': { name: 'Outer forearm', detail: 'Green zone: muscular area, very tolerable and popular for first tattoos.' },
    'Costas (parte alta)': { name: 'Upper back', detail: 'Green zone over shoulder blades and lats; spine centerline is more sensitive.' },
    'Coxa externa': { name: 'Outer thigh', detail: 'Green zone: wide, muscular, relatively comfortable for large pieces.' },
    'Panturrilha externa': { name: 'Outer calf', detail: 'Green zone over the posterior calf muscle.' },
    'Braço interno': { name: 'Inner arm', detail: 'Yellow zone: moderate sensitivity; inner skin and crease are more delicate.' },
    'Abdômen': { name: 'Abdomen', detail: 'Yellow zone: moderate sensitivity depending on breathing and muscle tension.' },
    'Coxa interna': { name: 'Inner thigh', detail: 'Yellow zone: inner thigh and shin have moderate sensitivity.' },
    'Lombar': { name: 'Lower back', detail: 'Yellow zone on lower back and flanks, increasing near the spine.' },
    'Pescoço (lateral)': { name: 'Neck (side)', detail: 'Red zone: thin, sensitive skin along the neck and collarbones.' },
    'Mãos e dedos': { name: 'Hands & fingers', detail: 'Red zone: bony area with little cushion and dense nerve endings.' },
    'Cotovelo': { name: 'Elbow', detail: 'Red zone: thin skin directly over the joint makes it quite sensitive.' },
    'Pescoço posterior': { name: 'Back of neck', detail: 'Red zone: nape and upper spine have high sensitivity.' },
    'Esterno': { name: 'Sternum', detail: 'Red zone: center of chest over the breastbone — high pain area.' },
    'Costelas': { name: 'Ribs', detail: 'Red zone: side torso over ribs with minimal muscle layer.' },
    'Joelho': { name: 'Knee', detail: 'Red zone: kneecap and back of the knee are high-sensitivity zones.' },
    'Pés e tornozelos': { name: 'Feet & ankles', detail: 'Red zone: thin coverage over bones and tendons.' },
    'Axila': { name: 'Armpit', detail: 'Red zone: very thin skin with high nerve concentration.' },
    'Virilha / zona genital': { name: 'Groin / pelvic area', detail: 'Red zone: extremely sensitive area requiring careful evaluation.' },
  },
  otherZone: 'Other area',
  painMap: {
    hudTitle: '360° 3D Model · Pain Map',
    hudHint: 'Drag to rotate 360° · Pinch/scroll to zoom · Tap any body area',
    webglUnavailableTitle: '3D view unavailable on this device',
    webglUnavailableBody: 'Use the region buttons below to check sensitivity levels and pick an area for your quote.',
    view360Label: '360° View:',
    view360Aria: '3D model 360° angle',
    presets: { frente: 'Front', lado_dir: 'Right Side', costas: 'Back', lado_esq: 'Left Side', reset: '3/4 Default' },
    autoSpinOn: 'Pause 360° spin',
    autoSpinOff: 'Spin 360°',
    highlightLabel: 'Highlight:',
    highlightAria: 'Filter areas by sensitivity',
    filters: { all: 'Full Map', low: 'Green Zone', moderate: 'Yellow Zone', sensitive: 'Red Zone', blank: 'Base Model' },
    legendAria: 'Sensitivity color legend',
    selectPrompt: 'Select an area on the 3D model',
    scale0: '0 — low pain',
    scale50: '50 — moderate pain',
    scale100: '100 — high pain',
    detailDisclaimer: 'Illustrative average sensitivity scale; individual experience varies with skin, technique, and session length.',
    emptyPrompt: 'Tap any colored area on the 3D body above or choose a region from the list below to view estimated pain intensity.',
    useZoneBtn: 'Use “{zone}” in quote',
    allRegionsTitle: 'All body regions (click to focus & compare)',
  },
  quote: {
    restrictedKicker: 'REGISTERED CLIENTS ONLY',
    restrictedTitle: 'Sign in to view prices and build your quote',
    restrictedBody: 'To protect custom quotes, price brackets, and your intake form, please sign in first under Login & Sign Up.',
    goToLogin: 'Go to Login & Sign Up',
    kicker: 'INSTANT QUOTE BUILDER',
    title: 'Build your tattoo quote.',
    styleLabel: 'Style',
    zoneLabel: 'Body placement',
    sizeLabel: 'Size',
    couponLabel: 'Coupon (optional)',
    couponPlaceholder: 'Invite code',
    initialEstimate: 'Initial estimate:',
    startingFrom: 'starting from {val}',
    discountApplied: '(20% off applied)',
    yourName: 'Your name',
    whatsapp: 'WhatsApp (with area code)',
    describeIdea: 'Describe your idea',
    ideaPlaceholder: 'Share elements, references, details, and whether it is a cover-up or first tattoo...',
    photosTitle: 'Placement photos (3 angles)',
    photosDesc: 'Upload three photos to help evaluate the available skin area.',
    photoLabels: ['Photo 1 — overview', 'Photo 2 — side view', 'Photo 3 — close-up detail'],
    noPhotoSelected: 'No photo selected',
    anamneseTitle: 'Quick health intake',
    anamneseAttention: 'Attention: {count} item(s) checked. The artist will review before scheduling.',
    anamneseNone: 'No restrictions reported.',
    contractTitle: 'Health intake & service agreement',
    contractP1: 'I declare that the health information provided is true, that I am 18 or older, and that I disclosed allergies, relevant conditions, and continuous medications. I understand tattoos are permanent, results vary by skin and aftercare, and I must follow studio aftercare instructions.',
    contractP2Strong: 'Booking & deposit:',
    contractP2: 'the deposit reserves your date and time. Studio policy: “DEPOSITS FOR APPOINTMENT BOOKING ARE NON-REFUNDABLE”, subject to applicable consumer law.',
    contractP3Strong: 'Data Protection (LGPD — Law 13.709/2018):',
    contractP3: 'your registration details, reference photos, health intake answers, and digital signature are kept confidential and used exclusively for project evaluation, procedure safety, and booking at Schullz Ink Tattoo, with no unauthorized third-party sharing.',
    contractNote: 'This form records client declarations and consent; it does not waive statutory consumer rights.',
    acceptTerms: 'I have read and accept the terms',
    signLabel: 'Sign below (finger or mouse)',
    clearSign: 'Clear signature',
    savePdf: 'Save as PDF',
    finalizeWa: 'Finish & send on WhatsApp',
    toastNeedContact: 'Enter your name and WhatsApp with area code',
    toastNeedTerms: 'Accept the terms and sign below',
    toastSaved: 'Quote saved to your account!',
    toastPdf: 'Opening print preview to save as PDF...',
    modalAria: 'Quote prepared',
    modalTitle: 'Quote saved successfully',
    modalBody: 'Your quote request and signed agreement (with LGPD data clause) are saved in your Client Area. You can download the PDF copy or send via WhatsApp.',
    modalCodeLabel: 'Your referral code:',
    openWa: 'Open WhatsApp',
    waHello: 'Hello! My name is {name}. I would like a tattoo quote:',
    waStyle: 'Style',
    waRegion: 'Placement',
    waSize: 'Size',
    waEstimate: 'Estimate',
    waIdea: 'Idea',
    waAnamnese: 'Intake',
    waAnamneseEval: 'items to review ({count})',
    waAnamneseNone: 'no restrictions',
    waTermsSigned: 'Terms signed: yes',
    pdfDocTitle: 'Quote & Intake Form',
    pdfIssuedAt: 'Issued on {date}',
    pdfClientSection: 'Client & Project Details',
    pdfClient: 'Client',
    pdfCoupon: 'Coupon applied',
    pdfNone: 'None',
    pdfSizeSelected: 'Selected size',
    pdfTermsAccepted: 'Terms accepted',
    pdfYes: 'Yes',
    pdfPending: 'Pending',
    pdfIdeaDesc: 'Idea description',
    pdfNotInformed: 'Not provided',
    pdfEstimateTitle: 'Initial Quote Estimate',
    pdfEstimateNote: 'Final price subject to photo review and design complexity.',
    pdfAnamneseSection: 'Health Intake Answers',
    pdfAnamneseNone: 'No restrictions or special conditions marked.',
    pdfPhotosSection: 'Placement Reference Photos',
    pdfPhotoNotSent: 'Not uploaded',
    pdfContractSection: 'Declarations, Agreement & Deposit Policy',
    pdfContractP1: 'I declare that the information provided is true, I am 18 or older, and I disclosed allergies and continuous medications. I understand tattooing is permanent and healing depends on skin and aftercare.',
    pdfContractP2: 'Booking & deposit: studio policy is “DEPOSITS FOR APPOINTMENT BOOKING ARE NON-REFUNDABLE”, subject to consumer protection laws.',
    pdfContractP3: 'Personal Data Protection (LGPD — Law 13.709/2018): registration data, photos, intake answers, and signature are processed confidentially solely for evaluation, safety, and booking at {studio}.',
    pdfDigitalSig: 'Digital signature',
    pdfSigRecorded: 'Recorded on form',
    pdfSigPending: 'Not signed yet',
    pdfSigLine: 'Client signature / confirmation',
    pdfFooter: 'Document generated by {studio} · Navegantes - SC · Protected under LGPD (Law 13.709/2018)',
  },
  foldersHub: {
    kicker: 'CLIENT HUB · ORGANIZED FOLDERS',
    title: 'Guides & Support Hub',
    lead: 'All essential studio material gathered in one place, organized 1 to 4. Choose a folder to open:',
    tabsAria: 'Organized studio folders',
    folderWord: 'Folder',
    openStatus: 'Open',
    closedStatus: 'Open',
    viewingNow: 'Viewing now',
    clickToOpen: 'Click to open',
    nextFolder: 'Next folder: {title}',
    folders: {
      contato: { title: 'Contact', subtitle: 'Instagram @andreschullz.ofc13, WhatsApp & Map', summary: 'Official posts, studio address in Navegantes - SC, and direct channels.' },
      faq: { title: 'FAQ', subtitle: 'Frequently asked questions & policies', summary: 'Booking, deposit rules, pain levels, and biosafety.' },
      preparacao: { title: 'Prep Guide', subtitle: 'Checklist before your tattoo session', summary: 'Hydration, meals, rest, and what to bring.' },
      'pos-tattoo': { title: 'Aftercare', subtitle: 'Healing shop & post-session guide', summary: 'Ointment, protective wrap, sunflower oil, and daily checklist.' },
    },
    contactKicker: 'FOLLOW THE INK · OFFICIAL POSTS',
    privateStudio: 'PRIVATE STUDIO',
    visitUs: 'Come visit us.',
    openMaps: 'Open in Google Maps',
    aftercareKicker: 'AFTERCARE SHOP & GUIDE',
    aftercareTitle: 'Take care of your tattoo',
    aftercareLead: 'Studio-selected healing kit. Pick up at the studio or arrange delivery via WhatsApp. PIX or cash.',
    inStock: '{count} in stock',
    orderWhatsapp: 'Order on WhatsApp',
    waOrderPrefix: 'Hello! I would like to order: ',
  },
  faq: {
    kicker: 'FREQUENTLY ASKED QUESTIONS',
    title: 'FAQ — Booking, Pain & Policies',
    lead: 'Direct answers on booking your session, pain tolerance by body area, and studio rules.',
    filterAria: 'Filter FAQ by topic',
    categories: { todas: 'All', agendamento: 'Booking', dor: 'Pain & Sensitivity', politicas: 'Studio Policies' },
    waPrefill: 'Hello! I have a question about booking / studio policies.',
    stillDoubtsTitle: 'Still have questions?',
    stillDoubtsBody: 'Message the studio directly on WhatsApp for cover-ups, scars, or custom large projects.',
    askWhatsapp: 'Ask on WhatsApp',
    items: {
      'como-agendar': {
        categoryLabel: 'Booking',
        question: 'How do booking and quote requests work?',
        answer: 'Sign in or register on the first tab, open Quote, pick your style, placement, and size, upload 3 photos of the area, fill out the health intake, and send via WhatsApp.',
        actionLabel: 'Go to Quote',
      },
      'preparo-sessao': {
        categoryLabel: 'Booking',
        question: 'What should I do before my session?',
        answer: 'Sleep well, eat a proper meal before arriving, and moisturize your skin days ahead. Avoid alcohol and intense sunburn 24–48 hours before.',
      },
      'duracao-sessao': {
        categoryLabel: 'Booking',
        question: 'How long does a session take and are designs exclusive?',
        answer: 'Short sessions take 15–60 min; medium projects 2–4 hours; full-day sleeves 6–8 hours. Every design is custom 1:1 and stencil-fitted before tattooing.',
      },
      'areas-menos-sensiveis': {
        categoryLabel: 'Pain & Sensitivity',
        question: 'Which body areas hurt less for a first tattoo?',
        answer: 'Areas with thicker muscle and less superficial bone tend to be gentler, such as outer forearm, shoulder/deltoid, outer calf, and outer thigh.',
        actionLabel: 'Open 3D Pain Map',
      },
      'areas-muito-sensiveis': {
        categoryLabel: 'Pain & Sensitivity',
        question: 'Why do ribs, sternum, hands, feet, and knees hurt more?',
        answer: 'They have thinner skin, less fat/muscle padding, direct bone proximity, and denser nerve endings. We take breaks whenever needed.',
        actionLabel: 'Compare on 3D Map',
      },
      'anestesico-pausas': {
        categoryLabel: 'Pain & Sensitivity',
        question: 'Can I use numbing cream or ask for breaks?',
        answer: 'Short breaks to breathe, hydrate, and stretch are normal. Any numbing cream must be approved by the artist beforehand as it can affect skin texture and ink retention.',
      },
      'politica-sinal': {
        categoryLabel: 'Studio Policies',
        question: 'What is the booking deposit and rescheduling policy?',
        answer: 'The deposit secures your exclusive date, time, and custom drawing. Studio policy: “DEPOSITS FOR APPOINTMENT BOOKING ARE NON-REFUNDABLE”, subject to consumer law.',
      },
      'idade-anamnese': {
        categoryLabel: 'Studio Policies',
        question: 'What is the minimum age and why is the health intake required?',
        answer: 'We only tattoo clients aged 18+. The intake checks allergies, keloids, diabetes, blood thinners, or pregnancy/breastfeeding for your safety.',
      },
      'biosseguranca-materiais': {
        categoryLabel: 'Studio Policies',
        question: 'Are studio needles and materials single-use?',
        answer: 'Yes, 100% of needles, cartridges, ink caps, and barrier covers are disposable and opened right in front of you.',
      },
      'clube-indicacao': {
        categoryLabel: 'Studio Policies',
        question: 'How does the 20% Referral Club discount work?',
        answer: 'Share your code or invite link with a friend and you both get 20% off once eligibility is confirmed by the studio.',
        actionLabel: 'View Referral Club',
      },
    },
  },
  prep: {
    kicker: 'BEFORE YOUR SESSION',
    title: 'Preparation Guide',
    lead: 'Pre-tattoo checklist so you arrive hydrated, fed, and rested for better comfort and ink retention.',
    pillar1Title: 'Hydrated body & skin',
    pillar1Body: 'Drink water regularly in the 48 hours before and on tattoo day. Hydrated skin takes ink with less irritation.',
    pillar2Title: 'Well-fed, never fasting',
    pillar2Body: 'Eat a solid meal 1–2 hours beforehand and bring a light snack to keep blood sugar steady.',
    progressLabel: '{done} of {total} prep steps completed ({pct}%)',
    resetBtn: 'Reset checklist',
    filterAria: 'Filter prep items by timing',
    filters: { all: 'All items', '48h': '48h–24h before', dia: 'Session day', saida: 'Before leaving' },
    doneBadge: '{phase} · Done',
    nextHint: 'All set for the big day? Check post-session aftercare instructions too.',
    aftercareBtn: 'View aftercare guide',
    quoteBtn: 'Go to Quote',
    steps: {
      'water-intake': { phaseLabel: '48h–24h before', categoryTag: 'Hydration', title: 'Drink plenty of water ahead of time (at least 2L/day)', detail: 'Good hydration keeps skin elastic and reduces dizziness during the session.' },
      'skin-moisturize': { phaseLabel: '48h–24h before', categoryTag: 'Hydration', title: 'Moisturize the area to be tattooed', detail: 'Apply unscented moisturizer on prior days (skip on session morning so skin is clean and dry).' },
      'no-alcohol-sun': { phaseLabel: '48h–24h before', categoryTag: 'Care', title: 'Avoid alcohol and intense sun exposure', detail: 'Alcohol thins the blood and increases bleeding; sunburned or peeling skin cannot be tattooed.' },
      'good-sleep': { phaseLabel: '48h–24h before', categoryTag: 'Rest', title: 'Get a solid night’s sleep (7–8 hours)', detail: 'Rest improves pain tolerance and keeps energy steady.' },
      'solid-meal': { phaseLabel: 'Session day', categoryTag: 'Nutrition', title: 'Eat a full meal 1–2 hours before your appointment', detail: 'Focus on carbs and protein. Never arrive on an empty stomach.' },
      'morning-water': { phaseLabel: 'Session day', categoryTag: 'Hydration', title: 'Drink water throughout the day before arriving', detail: 'Avoid excess coffee or energy drinks on an empty stomach.' },
      'clean-skin': { phaseLabel: 'Session day', categoryTag: 'Hygiene', title: 'Shower and arrive with clean skin, no lotions or oils', detail: 'Do not apply creams, perfumes, or numbing ointments on your own; prep is done at the studio.' },
      'snacks-bottle': { phaseLabel: 'Before leaving', categoryTag: 'Nutrition', title: 'Pack a water bottle and quick snack', detail: 'Bring fruit, a snack bar, chocolate, or sports drink for breaks during longer sessions.' },
      'clothes-docs': { phaseLabel: 'Before leaving', categoryTag: 'Logistics', title: 'Wear loose, dark clothes and bring photo ID', detail: 'Choose clothing that gives easy access without pressing on the area, plus valid ID (18+ only).' },
    },
  },
  healing: {
    kicker: 'HEALING GUIDE',
    title: 'Post-tattoo aftercare checklist',
    lead: 'Check off each step as your tattoo heals. Your progress stays saved on this device.',
    progressLabel: '{done} of {total} care steps completed ({pct}%)',
    resetBtn: 'Reset checklist',
    filterAria: 'Filter care steps by period',
    filters: { all: 'All days', '1-2': 'Days 1–2', '3-14': 'Days 3–14', '15-30': 'Days 15–30' },
    doneBadge: '{phase} · Done',
    steps: {
      'remove-wrap': { phaseLabel: 'Days 1 to 2', title: 'Remove or replace protective film as instructed', detail: 'Keep the initial wrap on for the time advised by the artist and replace cleanly if needed.' },
      'wash-gentle': { phaseLabel: 'Days 1 to 2', title: 'Wash gently with cool/lukewarm water & mild soap', detail: 'Clean 2–3 times daily using clean hands only — never scrub or use sponges.' },
      'dry-paper': { phaseLabel: 'Days 1 to 2', title: 'Pat dry gently with disposable paper towel', detail: 'Avoid regular bath towels during early days to prevent bacteria or lint.' },
      'apply-ointment': { phaseLabel: 'Days 3 to 14', title: 'Apply a thin layer of healing ointment 2x daily', detail: 'Start from day 3. Skin needs to breathe — never apply a thick glossy coat.' },
      'no-picking': { phaseLabel: 'Days 3 to 14', title: 'Do not scratch or pick scabs or peeling skin', detail: 'Peeling is normal. Pulling flakes can lift ink and leave patchy lines.' },
      'avoid-water-sun': { phaseLabel: 'Days 3 to 14', title: 'Avoid direct sun, ocean, pools, sauna & hot baths', detail: 'Keep the tattoo out of prolonged soaking and direct sunlight while healing.' },
      'loose-clothes': { phaseLabel: 'Days 3 to 14', title: 'Wear clean, loose clothing over the area', detail: 'Loose cotton prevents constant rubbing and keeps skin ventilated.' },
      'sunflower-oil': { phaseLabel: 'Days 15 to 30', title: 'Moisturize with sunflower oil once peeling finishes', detail: 'Once flaking is completely done, keep skin hydrated daily and use sunscreen.' },
    },
  },
};

export const DOMAIN_TRANSLATIONS: Record<LanguageCode, DomainTranslations> = {
  'pt-BR': {
    categories: {
      Todos: 'Todos',
      Lettering: 'Lettering',
      Realismo: 'Realismo',
      Minimalista: 'Minimalista',
      Blackwork: 'Blackwork',
      Oriental: 'Oriental',
      Sketch: 'Sketch',
      Gótico: 'Gótico',
    },
    workTitles: {
      'Máscara da morte nas costas': 'Máscara da morte nas costas',
      'Fechamento com anjo e cruz': 'Fechamento com anjo e cruz',
      'Máscara hannya com flores': 'Máscara hannya com flores',
      'Rosas e Medusa no antebraço': 'Rosas e Medusa no antebraço',
      'Guerreira viking no braço': 'Guerreira viking no braço',
      'Fechamento com leão, águia e espartano': 'Fechamento com leão, águia e espartano',
      'Frases espelhadas no antebraço': 'Frases espelhadas no antebraço',
      'Zodíaco em fine line': 'Zodíaco em fine line',
      'Data 25.01.2026 com rosa': 'Data 25.01.2026 com rosa',
      'Onda com Odoyá': 'Onda com Odoyá',
      'Frase na costela': 'Frase na costela',
    },
    quoteStyles: {
      Realismo: 'Realismo',
      Oriental: 'Oriental',
      Lettering: 'Lettering',
      Minimalista: 'Minimalista',
      Blackwork: 'Blackwork',
      Gótico: 'Gótico',
      Sketch: 'Sketch',
      Outro: 'Outro',
    },
    sizeTiers: [
      'Mini 5–8 cm',
      'Mini 8–12 cm',
      'Peça 12–18 cm',
      'Média (braço, coxa)',
      'Grande, por sessão',
      'Fechamento de membro',
    ],
    priceGroups: [
      {
        group: 'Por tempo',
        items: [
          { title: '15 a 20 min', description: 'Sessão curta para peças pequenas, já cobrindo custo fixo e materiais.' },
          { title: '30 a 60 min', description: 'Peças de tamanho pequeno a médio, com tempo para acabamento.' },
          { title: '2 a 4 hrs', description: 'Projetos médios com sombreado, cor ou mais de um elemento.' },
          { title: '6 a 8 hrs (diária completa)', description: 'Cobre praticamente todo o custo fixo do estúdio em uma única sessão.' },
        ],
      },
      {
        group: 'Mini tattoos',
        items: [
          { title: '5 a 8 cm', description: 'Traço simples, escrita curta ou símbolo.' },
          { title: '8 a 12 cm', description: 'Com mais detalhe, sombreado ou dois elementos.' },
          { title: '12 a 18 cm', description: 'Peça de transição entre mini e média.' },
        ],
      },
      {
        group: 'Médias e grandes',
        items: [
          { title: 'Médias — unilateral', description: 'Antebraço, braço, coxa ou panturrilha.' },
          { title: 'Grandes — braços, costas e pernas', description: 'Parte externa ou interna, em uma ou mais sessões.' },
        ],
      },
    ],
    anamneseQuestions: [
      'Tenho alergia (tinta, látex, anestésico)',
      'Tenho histórico de queloide ou cicatrização ruim',
      'Uso medicamentos contínuos / anticoagulantes',
      'Tenho diabetes',
      'Estou grávida ou amamentando',
      'Esta é minha primeira tattoo (informativo)',
    ],
    storeProducts: [
      { name: 'Pomada cicatrizante', description: 'Pomada pós-tatuagem indicada pelo estúdio. Camada fina 2x ao dia a partir do 3º dia. Pote de 30 g.' },
      { name: 'Óleo de girassol', description: 'Óleo de girassol 100 ml para hidratação da pele após a queda completa da casquinha. Fragrância neutra.' },
      { name: 'Curativo / filme protetor', description: 'Filme protetor transparente para os primeiros dias. Rolo com 10 metros, corta no tamanho da tattoo.' },
    ],
    tierLabels: {
      low: { label: 'Zona Verde (Dor Baixa)', badgeText: 'Zona Verde · Dor Baixa' },
      moderate: { label: 'Zona Amarela (Dor Média)', badgeText: 'Zona Amarela · Dor Média' },
      high: { label: 'Zona Vermelha (Dor Alta)', badgeText: 'Zona Vermelha · Dor Alta' },
      extreme: { label: 'Zona Vermelha (Dor Alta)', badgeText: 'Zona Vermelha · Dor Alta' },
    },
    bodyZones: {
      'Braço externo': { name: 'Braço externo', detail: 'Zona verde: em geral, uma das áreas mais toleráveis para tatuar.' },
      'Ombro / deltoide': { name: 'Ombro / deltoide', detail: 'Zona verde: pouca dor, boa área muscular e confortável para iniciantes.' },
      'Cabeça': { name: 'Cabeça', detail: 'Zona verde no mapa do estúdio: região superior com menor sensibilidade média (varia conforme proximidade óssea).' },
      'Peito': { name: 'Peito', detail: 'Zona verde na área muscular dos peitorais; a sensibilidade aumenta ao se aproximar do esterno e clavículas.' },
      'Antebraço externo': { name: 'Antebraço externo', detail: 'Zona verde: região muscular bastante tolerável e popular para primeira tattoo.' },
      'Costas (parte alta)': { name: 'Costas (parte alta)', detail: 'Zona verde sobre escápulas e dorsal lateral; apenas a linha central da coluna é mais sensível.' },
      'Coxa externa': { name: 'Coxa externa', detail: 'Zona verde: área ampla, muscular e relativamente tolerável para peças grandes.' },
      'Panturrilha externa': { name: 'Panturrilha externa', detail: 'Zona verde na massa muscular posterior da panturrilha.' },
      'Braço interno': { name: 'Braço interno', detail: 'Zona amarela: sensibilidade intermediária; a pele interna e dobra do braço tendem a ser mais delicadas.' },
      'Abdômen': { name: 'Abdômen', detail: 'Zona amarela: sensibilidade média, variando com respiração e tensão muscular.' },
      'Coxa interna': { name: 'Coxa interna', detail: 'Zona amarela: parte frontal/interna da coxa e canela têm sensibilidade média.' },
      'Lombar': { name: 'Lombar', detail: 'Zona amarela na faixa lombar e flancos, aumentando próximo à coluna vertebral.' },
      'Pescoço (lateral)': { name: 'Pescoço (lateral)', detail: 'Zona vermelha: pele fina e sensível na região frontal do pescoço e clavículas.' },
      'Mãos e dedos': { name: 'Mãos e dedos', detail: 'Zona vermelha: região óssea, com pouca cobertura e muitas terminações nervosas.' },
      'Cotovelo': { name: 'Cotovelo', detail: 'Zona vermelha: pele fina diretamente sobre a articulação torna a região bastante sensível.' },
      'Pescoço posterior': { name: 'Pescoço posterior', detail: 'Zona vermelha: nuca e linha central da coluna vertebral têm sensibilidade alta.' },
      'Esterno': { name: 'Esterno', detail: 'Zona vermelha: centro do peito sobre o osso do esterno, área de dor alta.' },
      'Costelas': { name: 'Costelas', detail: 'Zona vermelha: região lateral sobre as costelas com pouca camada muscular.' },
      'Joelho': { name: 'Joelho', detail: 'Zona vermelha: patela e dobra posterior do joelho são áreas de alta sensibilidade.' },
      'Pés e tornozelos': { name: 'Pés e tornozelos', detail: 'Zona vermelha: pouca cobertura sobre ossos e tendões; região bastante sensível.' },
      'Axila': { name: 'Axila', detail: 'Zona vermelha: pele extremamente fina e grande concentração nervosa.' },
      'Virilha / zona genital': { name: 'Virilha / zona genital', detail: 'Zona vermelha: linha da virilha extremamente sensível; exige avaliação cuidadosa.' },
    },
    otherZone: 'Outra região',
    painMap: {
      hudTitle: 'Modelo 3D 360° · Mapa da Dor',
      hudHint: 'Arraste para girar 360° · Pinça/scroll para zoom · Toque em qualquer região',
      webglUnavailableTitle: 'Visualização 3D indisponível neste dispositivo',
      webglUnavailableBody: 'Use os botões de regiões abaixo para consultar os níveis de sensibilidade e selecionar a área para o seu orçamento.',
      view360Label: 'Visão 360°:',
      view360Aria: 'Ângulo 360° do modelo 3D',
      presets: { frente: 'Frente', lado_dir: 'Lado Dir.', costas: 'Costas', lado_esq: 'Lado Esq.', reset: '3/4 Padrão' },
      autoSpinOn: 'Pausar giro 360°',
      autoSpinOff: 'Girar 360°',
      highlightLabel: 'Destacar:',
      highlightAria: 'Filtrar áreas por sensibilidade',
      filters: { all: 'Mapa Completo', low: 'Zona Verde', moderate: 'Zona Amarela', sensitive: 'Zona Vermelha', blank: 'Boneco Base' },
      legendAria: 'Legenda de cores de sensibilidade',
      selectPrompt: 'Selecione uma região no modelo 3D',
      scale0: '0 — dor baixa',
      scale50: '50 — dor média',
      scale100: '100 — dor alta',
      detailDisclaimer: 'Escala ilustrativa de sensibilidade média; a experiência individual pode variar conforme a pessoa, técnica e duração da sessão.',
      emptyPrompt: 'Toque em qualquer área colorida do corpo 3D acima ou escolha uma região na lista abaixo para ver a intensidade estimada de dor.',
      useZoneBtn: 'Usar “{zone}” no orçamento',
      allRegionsTitle: 'Todas as regiões do corpo (clique para focar e comparar)',
    },
    quote: {
      restrictedKicker: 'CONTEÚDO EXCLUSIVO PARA CLIENTES CADASTRADOS',
      restrictedTitle: 'Entre na sua conta para ver valores e montar seu orçamento',
      restrictedBody: 'Para proteger nossos orçamentos personalizados, faixas de preço e sua ficha de anamnese, acesse primeiro a aba de Login & Cadastro.',
      goToLogin: 'Ir para Login & Cadastro',
      kicker: 'ORÇAMENTO AUTOMÁTICO',
      title: 'Monte o seu orçamento.',
      styleLabel: 'Estilo',
      zoneLabel: 'Região do corpo',
      sizeLabel: 'Tamanho',
      couponLabel: 'Cupom (opcional)',
      couponPlaceholder: 'Código de convite',
      initialEstimate: 'Estimativa inicial:',
      startingFrom: 'a partir de {val}',
      discountApplied: '(20% off aplicado)',
      yourName: 'Seu nome',
      whatsapp: 'WhatsApp (com DDD)',
      describeIdea: 'Descreva a ideia',
      ideaPlaceholder: 'Conte os elementos, referências, detalhes e se é cobertura ou primeira tattoo...',
      photosTitle: 'Fotos da região (3 ângulos)',
      photosDesc: 'Envie três imagens para facilitar a avaliação da área disponível.',
      photoLabels: ['Foto 1 — visão geral', 'Foto 2 — visão lateral', 'Foto 3 — detalhe aproximado'],
      noPhotoSelected: 'Nenhuma foto selecionada',
      anamneseTitle: 'Anamnese rápida',
      anamneseAttention: 'Atenção: {count} item(ns) marcado(s). O tatuador vai avaliar antes de agendar.',
      anamneseNone: 'Sem restrições informadas.',
      contractTitle: 'Anamnese e contrato de prestação de serviço',
      contractP1: 'Declaro que as informações da anamnese são verdadeiras, que tenho 18 anos ou mais, que informei alergias, condições relevantes e medicamentos de uso contínuo, e que tive oportunidade de esclarecer minhas dúvidas antes do procedimento. Estou ciente de que a tatuagem é um procedimento permanente, que o resultado pode variar conforme pele, anatomia e cicatrização, e que devo seguir as orientações de cuidados fornecidas pelo estúdio.',
      contractP2Strong: 'Agendamento e sinal:',
      contractP2: 'o valor pago como sinal reserva data e horário. A política informada pelo estúdio é: “NÃO DEVOLVEMOS VALOR DE SINAL REFERENTE AO AGENDAMENTO”. A aplicação desta condição observará a legislação vigente e os direitos do consumidor.',
      contractP3Strong: 'Proteção de Dados (LGPD — Lei nº 13.709/2018):',
      contractP3: 'seus dados cadastrais, fotos da região, respostas da anamnese e assinatura digital são tratados com confidencialidade e finalidade exclusiva de atendimento, segurança do procedimento e execução deste contrato na Schullz Ink Tattoo, sem compartilhamento com terceiros não autorizados. Você pode solicitar acesso, correção ou exclusão dos dados pelos canais do estúdio.',
      contractNote: 'Este termo registra as declarações e o aceite do cliente; não elimina direitos previstos em lei nem substitui revisão jurídica do contrato.',
      acceptTerms: 'Li e aceito os termos',
      signLabel: 'Assine abaixo (dedo ou mouse)',
      clearSign: 'Limpar assinatura',
      savePdf: 'Salvar como PDF',
      finalizeWa: 'Finalizar e enviar no WhatsApp',
      toastNeedContact: 'Informe seu nome e WhatsApp com DDD',
      toastNeedTerms: 'Aceite o termo e assine no campo abaixo',
      toastSaved: 'Orçamento salvo na sua conta!',
      toastPdf: 'Abrindo visualização para salvar em PDF...',
      modalAria: 'Orçamento preparado',
      modalTitle: 'Orçamento salvo com sucesso',
      modalBody: 'Sua solicitação de orçamento e contrato assinado (com cláusula de proteção de dados LGPD) foram salvos na sua Área do Cliente. Você já pode baixar a cópia em PDF ou enviar pelo WhatsApp.',
      modalCodeLabel: 'Seu código de indicação:',
      openWa: 'Abrir WhatsApp',
      waHello: 'Olá! Sou {name}. Quero um orçamento:',
      waStyle: 'Estilo',
      waRegion: 'Região',
      waSize: 'Tamanho',
      waEstimate: 'Estimativa',
      waIdea: 'Ideia',
      waAnamnese: 'Anamnese',
      waAnamneseEval: 'itens para avaliar ({count})',
      waAnamneseNone: 'sem restrições',
      waTermsSigned: 'Termo assinado: sim',
      pdfDocTitle: 'Orçamento & Ficha',
      pdfIssuedAt: 'Emitido em {date}',
      pdfClientSection: 'Dados do Cliente e Projeto',
      pdfClient: 'Cliente',
      pdfCoupon: 'Cupom aplicado',
      pdfNone: 'Nenhum',
      pdfSizeSelected: 'Tamanho selecionado',
      pdfTermsAccepted: 'Termo aceito',
      pdfYes: 'Sim',
      pdfPending: 'Pendente',
      pdfIdeaDesc: 'Descrição da ideia',
      pdfNotInformed: 'Não informada',
      pdfEstimateTitle: 'Estimativa Inicial do Orçamento',
      pdfEstimateNote: 'Valor sujeito à avaliação final das fotos e complexidade do projeto.',
      pdfAnamneseSection: 'Respostas da Anamnese',
      pdfAnamneseNone: 'Nenhuma restrição ou condição especial assinalada.',
      pdfPhotosSection: 'Fotos de Referência da Região',
      pdfPhotoNotSent: 'Não enviada',
      pdfContractSection: 'Declarações, Contrato e Política de Sinal',
      pdfContractP1: 'Declaro que as informações fornecidas são verdadeiras, que tenho 18 anos ou mais e que informei alergias, condições relevantes e medicamentos de uso contínuo. Estou ciente de que a tatuagem é permanente, que o resultado pode variar conforme pele, anatomia e cicatrização, e que devo seguir as orientações de cuidados fornecidas pelo estúdio.',
      pdfContractP2: 'Agendamento e sinal: a política informada pelo estúdio é “NÃO DEVOLVEMOS VALOR DE SINAL REFERENTE AO AGENDAMENTO”, observada a legislação vigente e os direitos do consumidor.',
      pdfContractP3: 'Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018): Os dados cadastrais (nome, WhatsApp e e-mail), imagens de referência enviadas, respostas de saúde da ficha de anamnese e assinatura digital são tratados com sigilo exclusivamente para avaliação do projeto, segurança no atendimento, formalização deste contrato e agendamento na {studio}. É vedado o compartilhamento ou comercialização desses dados com terceiros sem consentimento expresso, assegurando-se ao titular os direitos de acesso, correção, revogação e eliminação conforme a LGPD.',
      pdfDigitalSig: 'Assinatura digital',
      pdfSigRecorded: 'Registrada no formulário',
      pdfSigPending: 'Ainda não assinada',
      pdfSigLine: 'Assinatura / confirmação do cliente',
      pdfFooter: 'Documento gerado pelo sistema {studio} · Navegantes - SC · Protegido pela LGPD (Lei nº 13.709/2018)',
    },
    foldersHub: {
      kicker: 'CENTRAL DO CLIENTE · PASTAS EM ORDEM ALFABÉTICA (A–Z)',
      title: 'Central de Guias & Suporte',
      lead: 'Todo o material essencial reunido em um só lugar, organizado de 1 a 4 em ordem alfabética. Selecione a pasta que deseja abrir:',
      tabsAria: 'Pastas organizadas em ordem alfabética',
      folderWord: 'Pasta',
      openStatus: 'Aberta',
      closedStatus: 'Abrir',
      viewingNow: 'Visualizando agora',
      clickToOpen: 'Clique para acessar',
      nextFolder: 'Próxima pasta: {title}',
      folders: {
        contato: { title: 'Contato', subtitle: 'Instagram @andreschullz.ofc13, WhatsApp e Mapa', summary: 'Posts oficiais, endereço em Navegantes - SC e canais diretos.' },
        faq: { title: 'FAQ', subtitle: 'Perguntas frequentes e regras do estúdio', summary: 'Dúvidas sobre sinal, dor, biossegurança e agendamento.' },
        preparacao: { title: 'Guia de Preparação', subtitle: 'Checklist antes da sua sessão de tatuagem', summary: 'Hidratação, alimentação, descanso e itens para levar.' },
        'pos-tattoo': { title: 'Pós-Tattoo', subtitle: 'Loja de cicatrização & guia pós-sessão', summary: 'Pomada, filme protetor, óleo de girassol e checklist diário.' },
      },
      contactKicker: 'SIGA A TINTA · POSTS OFICIAIS',
      privateStudio: 'ESTÚDIO PRIVADO',
      visitUs: 'Venha nos visitar.',
      openMaps: 'Abrir no Google Maps',
      aftercareKicker: 'LOJA & CUIDADOS PÓS-TATTOO',
      aftercareTitle: 'Cuide da sua tattoo',
      aftercareLead: 'Kit de cicatrização selecionado pelo estúdio. Retire no estúdio ou combine a entrega pelo WhatsApp. Pagamento no PIX ou dinheiro.',
      inStock: '{count} em estoque',
      orderWhatsapp: 'Pedir no WhatsApp',
      waOrderPrefix: 'Olá! Quero pedir: ',
    },
    faq: {
      kicker: 'DÚVIDAS FREQUENTES',
      title: 'FAQ — Agendamento, Dor & Políticas',
      lead: 'Respostas diretas sobre como agendar sua sessão, tolerância à dor em cada área do corpo e regras do estúdio.',
      filterAria: 'Filtrar perguntas frequentes por tema',
      categories: { todas: 'Todas', agendamento: 'Agendamento', dor: 'Dor e Sensibilidade', politicas: 'Políticas do Estúdio' },
      waPrefill: 'Olá! Tenho uma dúvida sobre agendamento / políticas do estúdio.',
      stillDoubtsTitle: 'Ainda ficou com alguma dúvida?',
      stillDoubtsBody: 'Fale diretamente com o estúdio no WhatsApp para tirar dúvidas sobre cobertura, cicatrizes ou projetos maiores.',
      askWhatsapp: 'Perguntar no WhatsApp',
      items: {
        'como-agendar': {
          categoryLabel: 'Agendamento',
          question: 'Como funciona o agendamento e o envio do orçamento?',
          answer: 'Primeiro faça seu login ou cadastro na aba inicial. Depois, acesse a aba Orçamento, escolha estilo, região do corpo e tamanho, envie 3 fotos da área desejada (visão geral, lateral e detalhe), preencha a anamnese e finalize enviando para o WhatsApp do estúdio.',
          actionLabel: 'Ir para Orçamento',
        },
        'preparo-sessao': {
          categoryLabel: 'Agendamento',
          question: 'O que devo fazer antes de ir para a minha sessão?',
          answer: 'Durma bem na noite anterior, alimente-se antes de chegar ao estúdio e hidrate a pele nos dias que antecedem a tatuagem. Evite bebidas alcoólicas e exposição solar intensa (queimadura de sol) nas 24 a 48 horas anteriores.',
        },
        'duracao-sessao': {
          categoryLabel: 'Agendamento',
          question: 'Quanto tempo dura uma sessão e desenhos exclusivos são feitos na hora?',
          answer: 'Sessões curtas levam de 15 a 60 minutos; projetos médios variam de 2 a 4 horas, e diárias completas ou fechamentos chegam a 6–8 horas. Cada peça é desenhada exclusivamente (1:1) e testamos o decalque no corpo antes de iniciar o traço.',
        },
        'areas-menos-sensiveis': {
          categoryLabel: 'Dor e Sensibilidade',
          question: 'Quais partes do corpo doem menos para quem vai fazer a primeira tattoo?',
          answer: 'Regiões com maior camada muscular e menos osso superficial costumam ser mais tranquilas, como antebraço externo, ombro/deltoide, panturrilha externa e coxa externa. Você pode conferir a escala de 0 a 100 no nosso modelo corporal 3D.',
          actionLabel: 'Abrir Mapa da Dor 3D',
        },
        'areas-muito-sensiveis': {
          categoryLabel: 'Dor e Sensibilidade',
          question: 'Por que costelas, esterno, mãos, pés e joelhos doem mais?',
          answer: 'Essas áreas possuem pele mais fina, menor camada de tecido adiposo ou muscular, proximidade direta com ossos e tendões, além de maior concentração de terminações nervosas. A sensação varia de pessoa para pessoa, e fazemos pausas quando necessário.',
          actionLabel: 'Comparar regiões no Mapa 3D',
        },
        'anestesico-pausas': {
          categoryLabel: 'Dor e Sensibilidade',
          question: 'Posso usar pomada anestésica ou pedir pausas durante a tattoo?',
          answer: 'Pausas breves para respirar, beber água e esticar o corpo fazem parte do atendimento. Já o uso de anestésicos tópicos deve ser avaliado previamente pelo tatuador e informado na anamnese, pois pode alterar a textura da pele e a fixação do pigmento.',
        },
        'politica-sinal': {
          categoryLabel: 'Políticas do Estúdio',
          question: 'Qual é a política de sinal e remarcação de horário?',
          answer: 'O valor pago como sinal garante a reserva exclusiva da data, do horário e da criação do seu desenho. Conforme informado no termo de serviço do estúdio: “NÃO DEVOLVEMOS VALOR DE SINAL REFERENTE AO AGENDAMENTO”, observada a legislação vigente e os direitos do consumidor.',
        },
        'idade-anamnese': {
          categoryLabel: 'Políticas do Estúdio',
          question: 'Qual a idade mínima e por que a ficha de anamnese é obrigatória?',
          answer: 'Atendemos apenas maiores de 18 anos. A anamnese garante sua segurança ao identificar alergias (tinta, látex, anestésico), histórico de queloide, diabetes, uso de anticoagulantes ou gestação/amamentação antes de iniciar o procedimento.',
        },
        'biosseguranca-materiais': {
          categoryLabel: 'Políticas do Estúdio',
          question: 'Os materiais utilizados no estúdio são descartáveis?',
          answer: 'Sim, 100% das agulhas, biqueiras/cartuchos, batoques e materiais de proteção de barreira são descartáveis e abertos na frente do cliente, seguindo rigorosamente as normas de biossegurança e higienização.',
        },
        'clube-indicacao': {
          categoryLabel: 'Políticas do Estúdio',
          question: 'Como funciona o desconto de 20% do Clube de Indicação?',
          answer: 'Ao compartilhar seu código ou link de convite com um amigo, vocês dois podem receber 20% de desconto após a confirmação de elegibilidade pela equipe do estúdio no orçamento.',
          actionLabel: 'Ver Clube de Indicação',
        },
      },
    },
    prep: {
      kicker: 'ANTES DA SESSÃO',
      title: 'Guia de Preparação',
      lead: 'Checklist pré-tattoo para você chegar bem hidratado, alimentado e descansado, garantindo mais conforto e melhor fixação do pigmento.',
      pillar1Title: 'Corpo e pele hidratados',
      pillar1Body: 'Beba água regularmente nas 48h anteriores e no dia da tattoo. Pele hidratada recebe a agulha com menos irritação.',
      pillar2Title: 'Bem alimentado, sem jejum',
      pillar2Body: 'Faça uma refeição firme até 2h antes e traga um lanche leve. Isso mantém a glicose estável e evita queda de pressão.',
      progressLabel: '{done} de {total} preparativos concluídos ({pct}%)',
      resetBtn: 'Reiniciar checklist',
      filterAria: 'Filtrar preparativos por momento',
      filters: { all: 'Todos os itens', '48h': '48h–24h antes', dia: 'No dia da sessão', saida: 'Na hora de sair' },
      doneBadge: '{phase} · Pronto',
      nextHint: 'Já deixou tudo pronto para o grande dia? Confira também os cuidados para depois da sessão.',
      aftercareBtn: 'Ver cuidados pós-tattoo',
      quoteBtn: 'Ir para Orçamento',
      steps: {
        'water-intake': { phaseLabel: '48h–24h antes', categoryTag: 'Hidratação', title: 'Beber bastante água nos dias anteriores (mínimo 2 L/dia)', detail: 'Manter o corpo bem hidratado deixa a pele mais elástica e receptiva ao pigmento, além de reduzir tonturas durante a sessão.' },
        'skin-moisturize': { phaseLabel: '48h–24h antes', categoryTag: 'Hidratação', title: 'Hidratar a pele da região que será tatuada', detail: 'Passe hidratante neutro nos dias que antecedem o horário (suspenda na manhã da sessão para chegar com a pele limpa e seca).' },
        'no-alcohol-sun': { phaseLabel: '48h–24h antes', categoryTag: 'Cuidados', title: 'Evitar bebidas alcoólicas e exposição solar intensa', detail: 'O álcool afina o sangue e aumenta o sangramento, atrapalhando a fixação da tinta. Pele queimada de sol ou descascando impede a tatuagem.' },
        'good-sleep': { phaseLabel: '48h–24h antes', categoryTag: 'Descanso', title: 'Garantir uma boa noite de sono (7 a 8 horas)', detail: 'Descansar bem melhora sua tolerância à dor e ajuda o organismo a responder com mais calma e energia durante o procedimento.' },
        'solid-meal': { phaseLabel: 'No dia da sessão', categoryTag: 'Alimentação', title: 'Fazer uma refeição completa 1h a 2h antes da sessão', detail: 'Priorize carboidratos e proteínas (ex.: arroz, feijão, carne/ovos ou sanduíche reforçado). Nunca venha tatuar em jejum para evitar queda de pressão.' },
        'morning-water': { phaseLabel: 'No dia da sessão', categoryTag: 'Hidratação', title: 'Tomar água ao longo do dia antes de chegar ao estúdio', detail: 'Evite exagerar em café ou energéticos em jejum, que podem acelerar os batimentos e causar desconforto; prefira água ou suco natural.' },
        'clean-skin': { phaseLabel: 'No dia da sessão', categoryTag: 'Higiene', title: 'Tomar banho e vir com a pele limpa, sem cremes ou óleos', detail: 'Não aplique loções, perfumes ou pomadas anestésicas por conta própria. A assepsia e a preparação final da pele são feitas no estúdio.' },
        'snacks-bottle': { phaseLabel: 'Na hora de sair', categoryTag: 'Alimentação', title: 'Levar garrafinha de água e um lanche rápido na mochila', detail: 'Para sessões médias ou longas, leve fruta, barrinha, chocolate ou isotônico para repor a glicose nas pausas com tranquilidade.' },
        'clothes-docs': { phaseLabel: 'Na hora de sair', categoryTag: 'Logística', title: 'Vestir roupas confortáveis, escuras e levar documento com foto', detail: 'Escolha peças largas que deem acesso fácil à área da tattoo sem apertar e traga um documento oficial (atendimento somente para 18+).' },
      },
    },
    healing: {
      kicker: 'GUIA DE CICATRIZAÇÃO',
      title: 'Checklist de cuidados pós-tattoo',
      lead: 'Marque cada etapa conforme você acompanha a recuperação da sua tatuagem. Seu progresso fica salvo neste dispositivo.',
      progressLabel: '{done} de {total} cuidados concluídos ({pct}%)',
      resetBtn: 'Reiniciar checklist',
      filterAria: 'Filtrar cuidados por período',
      filters: { all: 'Todos os dias', '1-2': 'Dias 1–2', '3-14': 'Dias 3–14', '15-30': 'Dias 15–30' },
      doneBadge: '{phase} · Concluído',
      steps: {
        'remove-wrap': { phaseLabel: 'Dias 1 a 2', title: 'Remover ou trocar o filme protetor conforme orientação', detail: 'Mantenha o curativo inicial pelo tempo indicado pelo tatuador e faça a troca limpa se necessário.' },
        'wash-gentle': { phaseLabel: 'Dias 1 a 2', title: 'Lavar com água fria ou morna e sabonete neutro', detail: 'Higienize suavemente 2 a 3 vezes ao dia usando apenas as mãos limpas, sem bucha ou esfregar.' },
        'dry-paper': { phaseLabel: 'Dias 1 a 2', title: 'Secar dando leves batidinhas com papel toalha descartável', detail: 'Evite toalhas de banho comuns nos primeiros dias para não transferir bactérias ou soltar fiapos.' },
        'apply-ointment': { phaseLabel: 'Dias 3 a 14', title: 'Aplicar camada fina de pomada cicatrizante 2x ao dia', detail: 'Comece a partir do 3º dia. A pele precisa respirar — nunca deixe excesso ou brilho espesso de creme.' },
        'no-picking': { phaseLabel: 'Dias 3 a 14', title: 'Não coçar nem arrancar casquinhas ou pelinhas', detail: 'A descamação é natural. Puxar casquinhas pode remover pigmento e causar falhas no traço.' },
        'avoid-water-sun': { phaseLabel: 'Dias 3 a 14', title: 'Evitar sol direto, mar, piscina, sauna e banhos muito quentes', detail: 'Mantenha a tatuagem longe de imersão prolongada e exposição solar direta durante a cicatrização.' },
        'loose-clothes': { phaseLabel: 'Dias 3 a 14', title: 'Usar roupas leves e limpas que não apertem o local', detail: 'Tecidos largos de algodão evitam atrito constante e ajudam a manter a região arejada.' },
        'sunflower-oil': { phaseLabel: 'Dias 15 a 30', title: 'Hidratar com óleo de girassol após a queda completa da casquinha', detail: 'Quando a pele não estiver mais descamando, mantenha a hidratação diária e passe a usar protetor solar.' },
      },
    },
  },
  en: EN_DOMAIN,
  es: {
    ...EN_DOMAIN,
    categories: { Todos: 'Todos', Lettering: 'Lettering', Realismo: 'Realismo', Minimalista: 'Minimalista', Blackwork: 'Blackwork', Oriental: 'Oriental', Sketch: 'Sketch', Gótico: 'Gótico' },
    workTitles: {
      'Máscara da morte nas costas': 'Máscara de la muerte en espalda',
      'Fechamento com anjo e cruz': 'Manga con ángel y cruz',
      'Máscara hannya com flores': 'Máscara hannya con flores',
      'Rosas e Medusa no antebraço': 'Rosas y Medusa en antebrazo',
      'Guerreira viking no braço': 'Guerrera vikinga en brazo',
      'Fechamento com leão, águia e espartano': 'Manga de león, águila y espartano',
      'Frases espelhadas no antebraço': 'Frases espejadas en antebrazo',
      'Zodíaco em fine line': 'Zodíaco en fine line',
      'Data 25.01.2026 com rosa': 'Fecha 25.01.2026 con rosa',
      'Onda com Odoyá': 'Ola con Odoyá',
      'Frase na costela': 'Frase en la costilla',
    },
    quoteStyles: { Realismo: 'Realismo', Oriental: 'Oriental', Lettering: 'Lettering', Minimalista: 'Minimalista', Blackwork: 'Blackwork', Gótico: 'Gótico', Sketch: 'Sketch', Outro: 'Otro' },
    sizeTiers: ['Mini 5–8 cm', 'Mini 8–12 cm', 'Pieza 12–18 cm', 'Mediana (brazo, muslo)', 'Grande, por sesión', 'Cierre completo'],
    priceGroups: [
      { group: 'Por tiempo', items: [
        { title: '15 a 20 min', description: 'Sesión corta para piezas pequeñas, cubriendo costo fijo y materiales.' },
        { title: '30 a 60 min', description: 'Piezas pequeñas a medianas con acabado detallado.' },
        { title: '2 a 4 hrs', description: 'Proyectos medianos con sombreado, color o varios elementos.' },
        { title: '6 a 8 hrs (jornada completa)', description: 'Sesión completa de día entero para piezas amplias.' },
      ]},
      { group: 'Mini tattoos', items: [
        { title: '5 a 8 cm', description: 'Trazo simple, palabra corta o símbolo.' },
        { title: '8 a 12 cm', description: 'Con más detalle, sombreado o dos elementos.' },
        { title: '12 a 18 cm', description: 'Pieza de transición entre mini y mediana.' },
      ]},
      { group: 'Medianas y grandes', items: [
        { title: 'Medianas — unilateral', description: 'Antebrazo, brazo, muslo o pantorrilla.' },
        { title: 'Grandes — brazos, espalda y piernas', description: 'Parte externa o interna, en una o más sesiones.' },
      ]},
    ],
    anamneseQuestions: [
      'Tengo alergias (tinta, látex, anestésico)',
      'Tengo historial de queloides o mala cicatrización',
      'Uso medicamentos continuos / anticoagulantes',
      'Tengo diabetes',
      'Estoy embarazada o amamantando',
      'Es mi primer tatuaje (informativo)',
    ],
    storeProducts: [
      { name: 'Pomada cicatrizante', description: 'Pomada post-tatuaje recomendada. Capa fina 2x al día desde el 3er día. Pote 30 g.' },
      { name: 'Aceite de girasol', description: 'Aceite de girasol 100 ml para hidratar la piel tras caer la cascarita.' },
      { name: 'Film protector', description: 'Rollo de film protector transparente (10 m) para los primeros días.' },
    ],
    tierLabels: {
      low: { label: 'Zona Verde (Dolor Bajo)', badgeText: 'Zona Verde · Dolor Bajo' },
      moderate: { label: 'Zona Amarilla (Dolor Medio)', badgeText: 'Zona Amarilla · Dolor Medio' },
      high: { label: 'Zona Roja (Dolor Alto)', badgeText: 'Zona Roja · Dolor Alto' },
      extreme: { label: 'Zona Roja (Dolor Alto)', badgeText: 'Zona Roja · Dolor Alto' },
    },
    bodyZones: {
      'Braço externo': { name: 'Brazo externo', detail: 'Zona verde: una de las áreas más tolerables para tatuar.' },
      'Ombro / deltoide': { name: 'Hombro / deltoides', detail: 'Zona verde: poco dolor y buena base muscular para principiantes.' },
      'Cabeça': { name: 'Cabeza', detail: 'Zona verde en el mapa del estudio: menor sensibilidad promedio.' },
      'Peito': { name: 'Pecho', detail: 'Zona verde en pectorales; aumenta cerca del esternón y clavículas.' },
      'Antebraço externo': { name: 'Antebrazo externo', detail: 'Zona verde: área muscular muy tolerable y popular para el primer tattoo.' },
      'Costas (parte alta)': { name: 'Espalda alta', detail: 'Zona verde en omóplatos; la línea de la columna es más sensible.' },
      'Coxa externa': { name: 'Muslo externo', detail: 'Zona verde: amplia, muscular y cómoda para piezas grandes.' },
      'Panturrilha externa': { name: 'Pantorrilla externa', detail: 'Zona verde sobre el músculo posterior de la pantorrilla.' },
      'Braço interno': { name: 'Brazo interno', detail: 'Zona amarilla: sensibilidad media; piel interna más delicada.' },
      'Abdômen': { name: 'Abdomen', detail: 'Zona amarilla: sensibilidad media según respiración y tensión.' },
      'Coxa interna': { name: 'Muslo interno', detail: 'Zona amarilla: parte interna del muslo y espinilla con sensibilidad media.' },
      'Lombar': { name: 'Lumbar', detail: 'Zona amarilla en zona lumbar y flancos.' },
      'Pescoço (lateral)': { name: 'Cuello (lateral)', detail: 'Zona roja: piel fina y sensible en cuello y clavículas.' },
      'Mãos e dedos': { name: 'Manos y dedos', detail: 'Zona roja: zona ósea con muchas terminaciones nerviosas.' },
      'Cotovelo': { name: 'Codo', detail: 'Zona roja: piel fina directamente sobre la articulación.' },
      'Pescoço posterior': { name: 'Nuca', detail: 'Zona roja: nuca y columna cervical de alta sensibilidad.' },
      'Esterno': { name: 'Esternón', detail: 'Zona roja: centro del pecho sobre el hueso, dolor alto.' },
      'Costelas': { name: 'Costillas', detail: 'Zona roja: zona lateral con poca capa muscular.' },
      'Joelho': { name: 'Rodilla', detail: 'Zona roja: rótula y parte posterior de alta sensibilidad.' },
      'Pés e tornozelos': { name: 'Pies y tobillos', detail: 'Zona roja: poca cobertura sobre huesos y tendones.' },
      'Axila': { name: 'Axila', detail: 'Zona roja: piel muy fina y alta concentración nerviosa.' },
      'Virilha / zona genital': { name: 'Ingle / zona genital', detail: 'Zona roja: sensibilidad extrema; requiere evaluación cuidadosa.' },
    },
    otherZone: 'Otra zona',
    painMap: {
      ...EN_DOMAIN.painMap,
      hudTitle: 'Modelo 3D 360° · Mapa de Dolor',
      hudHint: 'Arrastra para girar 360° · Zoom con pellizco/scroll · Toca una zona',
      webglUnavailableTitle: 'Vista 3D no disponible en este dispositivo',
      webglUnavailableBody: 'Usa los botones de abajo para consultar sensibilidad y elegir tu zona.',
      view360Label: 'Vista 360°:',
      presets: { frente: 'Frente', lado_dir: 'Lado Der.', costas: 'Espalda', lado_esq: 'Lado Izq.', reset: '3/4 Base' },
      autoSpinOn: 'Pausar giro 360°',
      autoSpinOff: 'Girar 360°',
      highlightLabel: 'Destacar:',
      filters: { all: 'Mapa Completo', low: 'Zona Verde', moderate: 'Zona Amarilla', sensitive: 'Zona Roja', blank: 'Modelo Base' },
      selectPrompt: 'Selecciona una zona en el modelo 3D',
      scale0: '0 — dolor bajo',
      scale50: '50 — dolor medio',
      scale100: '100 — dolor alto',
      detailDisclaimer: 'Escala ilustrativa de sensibilidad promedio; varía según la persona y la técnica.',
      emptyPrompt: 'Toca un área del cuerpo 3D o elige una zona de la lista abajo.',
      useZoneBtn: 'Usar “{zone}” en presupuesto',
      allRegionsTitle: 'Todas las regiones del cuerpo (clic para comparar)',
    },
    quote: {
      ...EN_DOMAIN.quote,
      restrictedKicker: 'SOLO CLIENTES REGISTRADOS',
      restrictedTitle: 'Inicia sesión para ver precios y armar tu presupuesto',
      restrictedBody: 'Accede primero a Acceso y Registro para desbloquear presupuestos y ficha médica.',
      goToLogin: 'Ir a Acceso y Registro',
      kicker: 'PRESUPUESTO AUTOMÁTICO',
      title: 'Arma tu presupuesto.',
      styleLabel: 'Estilo',
      zoneLabel: 'Región del cuerpo',
      sizeLabel: 'Tamaño',
      couponLabel: 'Cupón (opcional)',
      couponPlaceholder: 'Código de invitación',
      initialEstimate: 'Estimación inicial:',
      startingFrom: 'desde {val}',
      discountApplied: '(20% dto. aplicado)',
      yourName: 'Tu nombre',
      whatsapp: 'WhatsApp (con código de área)',
      describeIdea: 'Describe tu idea',
      ideaPlaceholder: 'Cuenta elementos, referencias, detalles y si es cobertura o primer tattoo...',
      photosTitle: 'Fotos de la zona (3 ángulos)',
      photosDesc: 'Sube tres imágenes para evaluar el área disponible.',
      photoLabels: ['Foto 1 — vista general', 'Foto 2 — vista lateral', 'Foto 3 — detalle cercano'],
      noPhotoSelected: 'Ninguna foto seleccionada',
      anamneseTitle: 'Anamnesis rápida',
      anamneseAttention: 'Atención: {count} ítem(s) marcado(s). El tatuador evaluará antes de agendar.',
      anamneseNone: 'Sin restricciones informadas.',
      contractTitle: 'Anamnesis y contrato de servicio',
      acceptTerms: 'Leí y acepto los términos',
      signLabel: 'Firma abajo (dedo o ratón)',
      clearSign: 'Limpiar firma',
      savePdf: 'Guardar como PDF',
      finalizeWa: 'Finalizar y enviar por WhatsApp',
      toastNeedContact: 'Ingresa tu nombre y WhatsApp',
      toastNeedTerms: 'Acepta los términos y firma abajo',
      toastSaved: '¡Presupuesto guardado en tu cuenta!',
      toastPdf: 'Abriendo vista previa para guardar en PDF...',
      modalTitle: 'Presupuesto guardado con éxito',
      openWa: 'Abrir WhatsApp',
    },
    foldersHub: {
      ...EN_DOMAIN.foldersHub,
      kicker: 'CENTRO DEL CLIENTE · CARPETAS',
      title: 'Centro de Guías y Soporte',
      lead: 'Todo el material esencial reunido en un solo lugar. Selecciona una carpeta:',
      folderWord: 'Carpeta',
      openStatus: 'Abierta',
      closedStatus: 'Abrir',
      viewingNow: 'Viendo ahora',
      clickToOpen: 'Clic para abrir',
      nextFolder: 'Siguiente carpeta: {title}',
      folders: {
        contato: { title: 'Contacto', subtitle: 'Instagram @andreschullz.ofc13, WhatsApp y Mapa', summary: 'Posts oficiales, dirección en Navegantes - SC y canales directos.' },
        faq: { title: 'FAQ', subtitle: 'Preguntas frecuentes y políticas', summary: 'Dudas sobre seña, dolor, bioseguridad y agenda.' },
        preparacao: { title: 'Guía de Preparación', subtitle: 'Checklist antes de tu sesión', summary: 'Hidratación, alimentación, descanso y qué llevar.' },
        'pos-tattoo': { title: 'Post-Tattoo', subtitle: 'Tienda de curación y guía', summary: 'Pomada, film protector, aceite de girasol y checklist diario.' },
      },
      privateStudio: 'ESTUDIO PRIVADO',
      visitUs: 'Ven a visitarnos.',
      openMaps: 'Abrir en Google Maps',
      aftercareKicker: 'TIENDA Y CUIDADOS POST-TATTOO',
      aftercareTitle: 'Cuida tu tatuaje',
      aftercareLead: 'Kit de curación seleccionado por el estudio. Retira en el estudio o coordina envío por WhatsApp.',
      inStock: '{count} en stock',
      orderWhatsapp: 'Pedir por WhatsApp',
      waOrderPrefix: '¡Hola! Quiero pedir: ',
    },
    faq: {
      ...EN_DOMAIN.faq,
      kicker: 'PREGUNTAS FRECUENTES',
      title: 'FAQ — Agenda, Dolor y Políticas',
      lead: 'Respuestas directas sobre cómo agendar, sensibilidad al dolor y reglas del estudio.',
      categories: { todas: 'Todas', agendamento: 'Agenda', dor: 'Dolor y Sensibilidad', politicas: 'Políticas' },
      stillDoubtsTitle: '¿Aún tienes dudas?',
      stillDoubtsBody: 'Escríbenos por WhatsApp para consultas sobre coberturas o proyectos grandes.',
      askWhatsapp: 'Preguntar por WhatsApp',
    },
    prep: {
      ...EN_DOMAIN.prep,
      kicker: 'ANTES DE LA SESIÓN',
      title: 'Guía de Preparación',
      lead: 'Checklist previo para llegar hidratado, alimentado y descansado.',
      pillar1Title: 'Cuerpo y piel hidratados',
      pillar2Title: 'Bien alimentado, sin ayuno',
      progressLabel: '{done} de {total} pasos completados ({pct}%)',
      resetBtn: 'Reiniciar checklist',
      filters: { all: 'Todos', '48h': '48h–24h antes', dia: 'Día de sesión', saida: 'Al salir' },
      doneBadge: '{phase} · Listo',
      aftercareBtn: 'Ver cuidados post-tattoo',
      quoteBtn: 'Ir a Presupuesto',
    },
    healing: {
      ...EN_DOMAIN.healing,
      kicker: 'GUÍA DE CICATRIZACIÓN',
      title: 'Checklist de cuidados post-tattoo',
      lead: 'Marca cada etapa mientras acompañas la recuperación de tu tatuaje.',
      progressLabel: '{done} de {total} cuidados completados ({pct}%)',
      resetBtn: 'Reiniciar checklist',
      filters: { all: 'Todos los días', '1-2': 'Días 1–2', '3-14': 'Días 3–14', '15-30': 'Días 15–30' },
      doneBadge: '{phase} · Listo',
    },
  },
  fr: {
    ...EN_DOMAIN,
    categories: { Todos: 'Tous', Lettering: 'Lettering', Realismo: 'Réalisme', Minimalista: 'Minimaliste', Blackwork: 'Blackwork', Oriental: 'Oriental', Sketch: 'Sketch', Gótico: 'Gothique' },
    workTitles: {
      'Máscara da morte nas costas': 'Masque de la mort sur le dos',
      'Fechamento com anjo e cruz': 'Manchette ange et croix',
      'Máscara hannya com flores': 'Masque Hannya et fleurs',
      'Rosas e Medusa no antebraço': 'Roses et Méduse sur avant-bras',
      'Guerreira viking no braço': 'Guerrière viking sur le bras',
      'Fechamento com leão, águia e espartano': 'Manchette lion, aigle et spartiate',
      'Frases espelhadas no antebraço': 'Phrases en miroir sur avant-bras',
      'Zodíaco em fine line': 'Zodiaque en fine line',
      'Data 25.01.2026 com rosa': 'Date 25.01.2026 avec rose',
      'Onda com Odoyá': 'Vague avec Odoyá',
      'Frase na costela': 'Phrase sur les côtes',
    },
    quoteStyles: { Realismo: 'Réalisme', Oriental: 'Oriental', Lettering: 'Lettering', Minimalista: 'Minimaliste', Blackwork: 'Blackwork', Gótico: 'Gothique', Sketch: 'Sketch', Outro: 'Autre' },
    tierLabels: {
      low: { label: 'Zone Verte (Douleur faible)', badgeText: 'Zone Verte · Douleur faible' },
      moderate: { label: 'Zone Jaune (Douleur moyenne)', badgeText: 'Zone Jaune · Douleur moyenne' },
      high: { label: 'Zone Rouge (Douleur élevée)', badgeText: 'Zone Rouge · Douleur élevée' },
      extreme: { label: 'Zone Rouge (Douleur élevée)', badgeText: 'Zone Rouge · Douleur élevée' },
    },
    otherZone: 'Autre zone',
    painMap: {
      ...EN_DOMAIN.painMap,
      hudTitle: 'Modèle 3D 360° · Carte de Douleur',
      hudHint: 'Glisser pour pivoter 360° · Zoomer · Toucher une zone',
      view360Label: 'Vue 360° :',
      presets: { frente: 'Face', lado_dir: 'Côté Droit', costas: 'Dos', lado_esq: 'Côté Gauche', reset: '3/4 Défaut' },
      autoSpinOn: 'Pause 360°',
      autoSpinOff: 'Rotation 360°',
      highlightLabel: 'Filtrer :',
      filters: { all: 'Carte complète', low: 'Zone Verte', moderate: 'Zone Jaune', sensitive: 'Zone Rouge', blank: 'Modèle neutre' },
      selectPrompt: 'Sélectionnez une zone sur le modèle 3D',
      useZoneBtn: 'Utiliser « {zone} » dans le devis',
      allRegionsTitle: 'Toutes les zones du corps',
    },
    quote: {
      ...EN_DOMAIN.quote,
      kicker: 'DEVIS AUTOMATIQUE',
      title: 'Créez votre devis.',
      styleLabel: 'Style',
      zoneLabel: 'Zone du corps',
      sizeLabel: 'Taille',
      couponLabel: 'Code promo (optionnel)',
      initialEstimate: 'Estimation initiale :',
      startingFrom: 'à partir de {val}',
      yourName: 'Votre nom',
      describeIdea: 'Décrivez votre idée',
      acceptTerms: 'J’ai lu et j’accepte les conditions',
      signLabel: 'Signez ci-dessous',
      clearSign: 'Effacer',
      savePdf: 'Enregistrer en PDF',
      finalizeWa: 'Finaliser sur WhatsApp',
      openWa: 'Ouvrir WhatsApp',
    },
    foldersHub: {
      ...EN_DOMAIN.foldersHub,
      title: 'Centre de Guides & Support',
      folderWord: 'Dossier',
      folders: {
        contato: { title: 'Contact', subtitle: 'Instagram @andreschullz.ofc13, WhatsApp & Carte', summary: 'Publications officielles et adresse à Navegantes - SC.' },
        faq: { title: 'FAQ', subtitle: 'Questions fréquentes', summary: 'Réservation, acompte, douleur et hygiène.' },
        preparacao: { title: 'Préparation', subtitle: 'Checklist avant la séance', summary: 'Hydratation, repas, repos et tenue.' },
        'pos-tattoo': { title: 'Soins', subtitle: 'Boutique & cicatrisation', summary: 'Crème, film protecteur et suivi quotidien.' },
      },
      visitUs: 'Venez nous voir.',
      openMaps: 'Ouvrir dans Google Maps',
      aftercareTitle: 'Prenez soin de votre tatouage',
      orderWhatsapp: 'Commander sur WhatsApp',
    },
  },
  de: {
    ...EN_DOMAIN,
    categories: { Todos: 'Alle', Lettering: 'Lettering', Realismo: 'Realismus', Minimalista: 'Minimalistisch', Blackwork: 'Blackwork', Oriental: 'Oriental', Sketch: 'Sketch', Gótico: 'Gotik' },
    quoteStyles: { Realismo: 'Realismus', Oriental: 'Oriental', Lettering: 'Lettering', Minimalista: 'Minimalistisch', Blackwork: 'Blackwork', Gótico: 'Gotik', Sketch: 'Sketch', Outro: 'Andere' },
    tierLabels: {
      low: { label: 'Grüne Zone (Geringer Schmerz)', badgeText: 'Grüne Zone · Gering' },
      moderate: { label: 'Gelbe Zone (Mittlerer Schmerz)', badgeText: 'Gelbe Zone · Mittel' },
      high: { label: 'Rote Zone (Hoher Schmerz)', badgeText: 'Rote Zone · Hoch' },
      extreme: { label: 'Rote Zone (Hoher Schmerz)', badgeText: 'Rote Zone · Hoch' },
    },
    otherZone: 'Andere Körperstelle',
    painMap: {
      ...EN_DOMAIN.painMap,
      hudTitle: '360° 3D-Modell · Schmerzkarte',
      hudHint: 'Ziehen zum Drehen · Zoomen · Bereich antippen',
      view360Label: '360°-Ansicht:',
      presets: { frente: 'Vorne', lado_dir: 'Rechts', costas: 'Hinten', lado_esq: 'Links', reset: '3/4 Standard' },
      autoSpinOn: '360° pausieren',
      autoSpinOff: '360° drehen',
      highlightLabel: 'Filter:',
      filters: { all: 'Gesamt', low: 'Grün', moderate: 'Gelb', sensitive: 'Rot', blank: 'Basis' },
      selectPrompt: 'Bereich am 3D-Modell auswählen',
      useZoneBtn: '„{zone}“ ins Angebot übernehmen',
      allRegionsTitle: 'Alle Körperregionen',
    },
    quote: {
      ...EN_DOMAIN.quote,
      kicker: 'ANGEBOTSRECHNER',
      title: 'Angebot erstellen.',
      styleLabel: 'Stil',
      zoneLabel: 'Körperstelle',
      sizeLabel: 'Größe',
      couponLabel: 'Gutschein (optional)',
      initialEstimate: 'Erste Schätzung:',
      startingFrom: 'ab {val}',
      yourName: 'Ihr Name',
      describeIdea: 'Idee beschreiben',
      acceptTerms: 'Bedingungen gelesen und akzeptiert',
      signLabel: 'Unten unterschreiben',
      clearSign: 'Löschen',
      savePdf: 'Als PDF speichern',
      finalizeWa: 'Per WhatsApp senden',
      openWa: 'WhatsApp öffnen',
    },
    foldersHub: {
      ...EN_DOMAIN.foldersHub,
      title: 'Ratgeber-Zentrale',
      folderWord: 'Ordner',
      folders: {
        contato: { title: 'Kontakt', subtitle: 'Instagram, WhatsApp & Karte', summary: 'Offizielle Beiträge und Studioadresse.' },
        faq: { title: 'FAQ', subtitle: 'Häufige Fragen', summary: 'Termine, Anzahlung, Schmerz und Hygiene.' },
        preparacao: { title: 'Vorbereitung', subtitle: 'Checkliste vor dem Termin', summary: 'Trinken, Essen, Schlaf und Kleidung.' },
        'pos-tattoo': { title: 'Pflege', subtitle: 'Heilungs-Shop & Guide', summary: 'Salbe, Schutzfolie und tägliche Pflege.' },
      },
      visitUs: 'Besuchen Sie uns.',
      openMaps: 'In Google Maps öffnen',
      aftercareTitle: 'Pflegen Sie Ihr Tattoo',
      orderWhatsapp: 'Per WhatsApp bestellen',
    },
  },
  it: {
    ...EN_DOMAIN,
    categories: { Todos: 'Tutti', Lettering: 'Lettering', Realismo: 'Realismo', Minimalista: 'Minimalista', Blackwork: 'Blackwork', Oriental: 'Orientale', Sketch: 'Sketch', Gótico: 'Gotico' },
    quoteStyles: { Realismo: 'Realismo', Oriental: 'Orientale', Lettering: 'Lettering', Minimalista: 'Minimalista', Blackwork: 'Blackwork', Gótico: 'Gotico', Sketch: 'Sketch', Outro: 'Altro' },
    tierLabels: {
      low: { label: 'Zona Verde (Dolore Basso)', badgeText: 'Zona Verde · Basso' },
      moderate: { label: 'Zona Gialla (Dolore Medio)', badgeText: 'Zona Gialla · Medio' },
      high: { label: 'Zona Rossa (Dolore Alto)', badgeText: 'Zona Rossa · Alto' },
      extreme: { label: 'Zona Rossa (Dolore Alto)', badgeText: 'Zona Rossa · Alto' },
    },
    otherZone: 'Altra zona',
    painMap: {
      ...EN_DOMAIN.painMap,
      hudTitle: 'Modello 3D 360° · Mappa del Dolore',
      hudHint: 'Trascina per ruotare 360° · Zoom · Tocca una zona',
      view360Label: 'Vista 360°:',
      presets: { frente: 'Fronte', lado_dir: 'Lato Dx', costas: 'Schiena', lado_esq: 'Lato Sx', reset: '3/4 Base' },
      autoSpinOn: 'Pausa 360°',
      autoSpinOff: 'Ruota 360°',
      highlightLabel: 'Evidenzia:',
      filters: { all: 'Completa', low: 'Zona Verde', moderate: 'Zona Gialla', sensitive: 'Zona Rossa', blank: 'Modello base' },
      selectPrompt: 'Seleziona una zona sul modello 3D',
      useZoneBtn: 'Usa “{zone}” nel preventivo',
      allRegionsTitle: 'Tutte le zone del corpo',
    },
    quote: {
      ...EN_DOMAIN.quote,
      kicker: 'PREVENTIVO AUTOMATICO',
      title: 'Crea il tuo preventivo.',
      styleLabel: 'Stile',
      zoneLabel: 'Zona del corpo',
      sizeLabel: 'Dimensione',
      couponLabel: 'Codice sconto (opzionale)',
      initialEstimate: 'Stima iniziale:',
      startingFrom: 'a partire da {val}',
      yourName: 'Il tuo nome',
      describeIdea: 'Descrivi la tua idea',
      acceptTerms: 'Ho letto e accetto i termini',
      signLabel: 'Firma qui sotto',
      clearSign: 'Cancella firma',
      savePdf: 'Salva in PDF',
      finalizeWa: 'Invia su WhatsApp',
      openWa: 'Apri WhatsApp',
    },
    foldersHub: {
      ...EN_DOMAIN.foldersHub,
      title: 'Centro Guide & Supporto',
      folderWord: 'Cartella',
      folders: {
        contato: { title: 'Contatti', subtitle: 'Instagram, WhatsApp & Mappa', summary: 'Post ufficiali e indirizzo a Navegantes - SC.' },
        faq: { title: 'FAQ', subtitle: 'Domande frequenti', summary: 'Prenotazione, acconto, dolore e sicurezza.' },
        preparacao: { title: 'Preparazione', subtitle: 'Checklist pre-sessione', summary: 'Idratazione, pasto, riposo e consigli.' },
        'pos-tattoo': { title: 'Post-Tattoo', subtitle: 'Negozio & guida guarigione', summary: 'Pomata, pellicola protettiva e cura giornaliera.' },
      },
      visitUs: 'Vieni a trovarci.',
      openMaps: 'Apri su Google Maps',
      aftercareTitle: 'Prenditi cura del tuo tattoo',
      orderWhatsapp: 'Ordina su WhatsApp',
    },
  },
  ja: {
    ...EN_DOMAIN,
    categories: { Todos: 'すべて', Lettering: 'レタリング', Realismo: 'リアリズム', Minimalista: 'ミニマル', Blackwork: 'ブラックワーク', Oriental: 'オリエンタル', Sketch: 'スケッチ', Gótico: 'ゴシック' },
    quoteStyles: { Realismo: 'リアリズム', Oriental: 'オリエンタル', Lettering: 'レタリング', Minimalista: 'ミニマル', Blackwork: 'ブラックワーク', Gótico: 'ゴシック', Sketch: 'スケッチ', Outro: 'その他' },
    tierLabels: {
      low: { label: 'グリーンゾーン（痛み弱）', badgeText: 'グリーン · 痛み弱' },
      moderate: { label: 'イエローゾーン（痛み中）', badgeText: 'イエロー · 痛み中' },
      high: { label: 'レッドゾーン（痛み強）', badgeText: 'レッド · 痛み強' },
      extreme: { label: 'レッドゾーン（痛み強）', badgeText: 'レッド · 痛み強' },
    },
    otherZone: 'その他の部位',
    painMap: {
      ...EN_DOMAIN.painMap,
      hudTitle: '360° 3Dモデル · 痛みマップ',
      hudHint: 'ドラッグで360°回転 · ピンチ/スクロールで拡大 · 部位をタップ',
      view360Label: '360°視点:',
      presets: { frente: '正面', lado_dir: '右側面', costas: '背面', lado_esq: '左側面', reset: '3/4標準' },
      autoSpinOn: '回転停止',
      autoSpinOff: '360°回転',
      highlightLabel: '表示切替:',
      filters: { all: '全体マップ', low: 'グリーン', moderate: 'イエロー', sensitive: 'レッド', blank: '素体' },
      selectPrompt: '3Dモデル上の部位を選択してください',
      scale0: '0 — 痛み弱',
      scale50: '50 — 痛み中',
      scale100: '100 — 痛み強',
      useZoneBtn: '「{zone}」を見積もりに使う',
      allRegionsTitle: '全身の部位一覧（クリックで比較）',
    },
    quote: {
      ...EN_DOMAIN.quote,
      kicker: '自動見積もり',
      title: '見積もりを作成する。',
      styleLabel: 'スタイル',
      zoneLabel: '部位',
      sizeLabel: 'サイズ',
      couponLabel: 'クーポン（任意）',
      initialEstimate: '概算見積もり:',
      startingFrom: '{val}〜',
      yourName: 'お名前',
      describeIdea: 'デザインのアイデア',
      acceptTerms: '利用規約に同意します',
      signLabel: '下に署名してください',
      clearSign: '署名を消去',
      savePdf: 'PDF保存',
      finalizeWa: 'WhatsAppで送信',
      openWa: 'WhatsAppを開く',
    },
    foldersHub: {
      ...EN_DOMAIN.foldersHub,
      title: 'ガイド＆サポートハブ',
      folderWord: 'フォルダ',
      folders: {
        contato: { title: '連絡先', subtitle: 'Instagram・WhatsApp・地図', summary: '公式投稿とスタジオ所在地（Navegantes - SC）。' },
        faq: { title: 'FAQ', subtitle: 'よくある質問', summary: '予約・手付金・痛み・衛生管理について。' },
        preparacao: { title: '事前準備', subtitle: '施術前チェックリスト', summary: '水分補給・食事・睡眠・持ち物。' },
        'pos-tattoo': { title: 'アフターケア', subtitle: 'ケア用品＆回復ガイド', summary: '軟膏・保護フィルム・日々のケア記録。' },
      },
      visitUs: 'スタジオアクセス',
      openMaps: 'Googleマップで開く',
      aftercareTitle: 'タトゥーのアフターケア',
      orderWhatsapp: 'WhatsAppで注文',
    },
  },
  zh: {
    ...EN_DOMAIN,
    categories: { Todos: '全部', Lettering: '花体字', Realismo: '写实', Minimalista: '极简细线', Blackwork: '暗黑点刺', Oriental: '日式传统', Sketch: '素描草图', Gótico: '哥特' },
    quoteStyles: { Realismo: '写实', Oriental: '日式传统', Lettering: '花体字', Minimalista: '极简细线', Blackwork: '暗黑点刺', Gótico: '哥特', Sketch: '素描草图', Outro: '其他' },
    tierLabels: {
      low: { label: '绿区（低痛感）', badgeText: '绿区 · 低痛感' },
      moderate: { label: '黄区（中等痛感）', badgeText: '黄区 · 中等痛感' },
      high: { label: '红区（高痛感）', badgeText: '红区 · 高痛感' },
      extreme: { label: '红区（高痛感）', badgeText: '红区 · 高痛感' },
    },
    otherZone: '其他部位',
    painMap: {
      ...EN_DOMAIN.painMap,
      hudTitle: '360° 3D模型 · 痛感分布图',
      hudHint: '拖动360°旋转 · 缩放查看 · 点击任意身体部位',
      view360Label: '360°视角：',
      presets: { frente: '正面', lado_dir: '右侧', costas: '背面', lado_esq: '左侧', reset: '3/4默认' },
      autoSpinOn: '暂停旋转',
      autoSpinOff: '360°旋转',
      highlightLabel: '筛选：',
      filters: { all: '完整地图', low: '绿区', moderate: '黄区', sensitive: '红区', blank: '基础模型' },
      selectPrompt: '请在3D模型上选择一个部位',
      scale0: '0 — 轻度痛感',
      scale50: '50 — 中等痛感',
      scale100: '100 — 强烈痛感',
      useZoneBtn: '在报价中使用“{zone}”',
      allRegionsTitle: '全身部位列表（点击对比敏感度）',
    },
    quote: {
      ...EN_DOMAIN.quote,
      kicker: '自动报价系统',
      title: '生成您的纹身报价。',
      styleLabel: '风格',
      zoneLabel: '纹身部位',
      sizeLabel: '尺寸',
      couponLabel: '优惠码（选填）',
      initialEstimate: '初步估算：',
      startingFrom: '{val} 起',
      yourName: '您的姓名',
      describeIdea: '描述您的想法',
      acceptTerms: '我已阅读并同意条款',
      signLabel: '请在下方签名',
      clearSign: '清除签名',
      savePdf: '保存为 PDF',
      finalizeWa: '完成并通过 WhatsApp 发送',
      openWa: '打开 WhatsApp',
    },
    foldersHub: {
      ...EN_DOMAIN.foldersHub,
      title: '指南与支持中心',
      folderWord: '文件夹',
      folders: {
        contato: { title: '联系方式', subtitle: 'Instagram、WhatsApp 与地图', summary: '官方动态及 Navegantes - SC 工作室地址。' },
        faq: { title: '常见问题', subtitle: '预约与工作室政策', summary: '预约定金、痛感、卫生安全说明。' },
        preparacao: { title: '术前准备', subtitle: '纹身前核对清单', summary: '补水、饮食、休息与携带物品。' },
        'pos-tattoo': { title: '术后护理', subtitle: '护理产品与恢复指南', summary: '修复膏、保护膜与每日恢复打卡。' },
      },
      visitUs: '欢迎到店咨询。',
      openMaps: '在 Google 地图中打开',
      aftercareTitle: '呵护您的纹身',
      orderWhatsapp: '通过 WhatsApp 订购',
    },
  },
};
