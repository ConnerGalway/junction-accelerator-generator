// ═══════════════════════════════════════════════════════════════════════════
// SHARED HTML PARSERS
// Functions for detecting content patterns in HTML
// Used by both generate-assessment-background.js and regenerate-assessment-background.js
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if website has actual booking functionality
 * Only returns true for real booking systems, not contact forms
 */
export function detectBookingPresence(html, htmlLower) {
  // First, check for contact-only patterns that indicate NO real booking
  const contactOnlyPatterns = [
    'contact us to reserve',
    'contact us to book',
    'email us to reserve',
    'email us to book',
    'call to reserve',
    'call to book',
    'phone to reserve',
    'phone to book',
    'enquire about',
    'inquire about',
    'request a reservation',
    'reservation request',
    'booking request',
    'reservation inquiry',
    'booking inquiry',
    'send us a message',
    'get in touch'
  ];

  const hasContactOnlyLanguage = contactOnlyPatterns.some(p => htmlLower.includes(p));

  // Check for actual booking UI elements
  const bookingUIPatterns = [
    'type="date"',
    'input-date',
    'date-picker',
    'datepicker',
    'check-in',
    'check-out',
    'checkin',
    'checkout',
    'arrival-date',
    'departure-date',
    'select-date',
    'choose-date',
    'pick-date',
    'availability-calendar',
    'booking-calendar',
    'reservation-calendar',
    'availability-widget',
    'booking-widget',
    'select-time',
    'time-slot',
    'timeslot',
    'available-times',
    'number-of-guests',
    'party-size',
    'select-guests',
    'how-many-guests',
    'select-tickets',
    'ticket-quantity',
    'add-to-cart',
    'addtocart',
    'buy-tickets',
    'purchase-tickets',
    'book-tickets',
    'booking-form',
    'reservation-form',
    'id="booking"',
    'id="reservations"',
    'class="booking-',
    'class="reservation-',
    'instant booking',
    'book instantly',
    'reserve instantly',
    'confirm booking',
    'complete reservation',
    'complete your booking',
    'finalize booking'
  ];

  const hasBookingUI = bookingUIPatterns.some(p => htmlLower.includes(p));

  // Strong booking action buttons
  const strongBookingActions = [
    'book now',
    'book online',
    'book today',
    'reserve now',
    'reserve online',
    'reserve today',
    'buy tickets',
    'get tickets',
    'purchase tickets',
    'book your stay',
    'book your room',
    'book your table',
    'book your tour',
    'book your experience',
    'book this',
    'reserve your',
    'jetzt buchen',
    'online buchen',
    'réserver maintenant',
    'réserver en ligne',
    'reservar ahora',
    'reservar en línea'
  ];

  const hasStrongBookingAction = strongBookingActions.some(p => htmlLower.includes(p));

  if (hasBookingUI) return true;
  if (hasStrongBookingAction && !hasContactOnlyLanguage) return true;
  return false;
}

/**
 * Detect which booking platforms are present on the website
 */
export function detectBookingPlatforms(htmlLower) {
  const platforms = [];

  // Major OTAs
  if (htmlLower.includes('booking.com')) platforms.push('Booking.com');
  if (htmlLower.includes('expedia')) platforms.push('Expedia');
  if (htmlLower.includes('hotels.com')) platforms.push('Hotels.com');
  if (htmlLower.includes('tripadvisor')) platforms.push('TripAdvisor');
  if (htmlLower.includes('vrbo')) platforms.push('VRBO');
  if (htmlLower.includes('airbnb')) platforms.push('Airbnb');

  // Hotel/Lodging PMS systems
  if (htmlLower.includes('cloudbeds')) platforms.push('Cloudbeds');
  if (htmlLower.includes('littlehotelier') || htmlLower.includes('little hotelier')) platforms.push('Little Hotelier');
  if (htmlLower.includes('mews.com') || htmlLower.includes('mews.li')) platforms.push('Mews');
  if (htmlLower.includes('webrezpro')) platforms.push('WebRezPro');
  if (htmlLower.includes('roomraccoon')) platforms.push('RoomRaccoon');
  if (htmlLower.includes('sirvoy')) platforms.push('Sirvoy');
  if (htmlLower.includes('lodgify')) platforms.push('Lodgify');
  if (htmlLower.includes('guesty')) platforms.push('Guesty');
  if (htmlLower.includes('hostaway')) platforms.push('Hostaway');
  if (htmlLower.includes('hostfully')) platforms.push('Hostfully');
  if (htmlLower.includes('smoobu')) platforms.push('Smoobu');
  if (htmlLower.includes('beds24')) platforms.push('Beds24');
  if (htmlLower.includes('innroad')) platforms.push('innRoad');
  if (htmlLower.includes('newbook')) platforms.push('NewBook');

  // Tour/Activity booking systems
  if (htmlLower.includes('fareharbor')) platforms.push('FareHarbor');
  if (htmlLower.includes('checkfront')) platforms.push('Checkfront');
  if (htmlLower.includes('rezdy')) platforms.push('Rezdy');
  if (htmlLower.includes('bookeo')) platforms.push('Bookeo');
  if (htmlLower.includes('peek.com')) platforms.push('Peek');
  if (htmlLower.includes('xola')) platforms.push('Xola');
  if (htmlLower.includes('bokun')) platforms.push('Bokun');
  if (htmlLower.includes('trekksoft')) platforms.push('TrekkSoft');
  if (htmlLower.includes('regiondo')) platforms.push('Regiondo');
  if (htmlLower.includes('bókun')) platforms.push('Bokun');

  // Experience/Activity OTAs
  if (htmlLower.includes('viator')) platforms.push('Viator');
  if (htmlLower.includes('getyourguide')) platforms.push('GetYourGuide');
  if (htmlLower.includes('klook')) platforms.push('Klook');
  if (htmlLower.includes('tiqets')) platforms.push('Tiqets');
  if (htmlLower.includes('musement')) platforms.push('Musement');

  // Restaurant booking
  if (htmlLower.includes('opentable')) platforms.push('OpenTable');
  if (htmlLower.includes('resy')) platforms.push('Resy');
  if (htmlLower.includes('yelp.com/reservations')) platforms.push('Yelp Reservations');
  if (htmlLower.includes('thefork') || htmlLower.includes('the fork')) platforms.push('TheFork');
  if (htmlLower.includes('sevenrooms')) platforms.push('SevenRooms');
  if (htmlLower.includes('tock.com')) platforms.push('Tock');

  // Generic booking/scheduling
  if (htmlLower.includes('squareup') || htmlLower.includes('square appointments')) platforms.push('Square');
  if (htmlLower.includes('calendly')) platforms.push('Calendly');
  if (htmlLower.includes('acuityscheduling')) platforms.push('Acuity Scheduling');
  if (htmlLower.includes('simplebooking')) platforms.push('SimpleBooking');
  if (htmlLower.includes('mindbody')) platforms.push('Mindbody');
  if (htmlLower.includes('vagaro')) platforms.push('Vagaro');

  return platforms;
}

/**
 * Detect if phone number is present
 */
export function detectPhone(html) {
  const phonePatterns = [
    /tel:[\d\+\-\(\)\s]+/i,
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    /\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/,
    /\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/
  ];

  return phonePatterns.some(pattern => pattern.test(html));
}

/**
 * Detect if email address is present
 */
export function detectEmail(html) {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  return emailPattern.test(html);
}

/**
 * Detect if physical address is present
 */
export function detectAddress(htmlLower) {
  const addressKeywords = ['street', 'avenue', 'road', 'drive', 'boulevard',
    'suite', 'floor', 'address', 'located at', 'find us', 'visit us'];
  return addressKeywords.some(kw => htmlLower.includes(kw));
}

/**
 * Detect if business hours are displayed
 */
export function detectHours(htmlLower) {
  const hoursKeywords = ['hours', 'open daily', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday', 'sunday', 'am -', 'pm -', 'a.m.', 'p.m.',
    'opening hours', 'business hours', 'we are open', 'open from'];
  return hoursKeywords.some(kw => htmlLower.includes(kw));
}

/**
 * Detect if pricing information is displayed
 */
export function detectPricing(html, htmlLower) {
  const pricePatterns = [
    /\$\d+/,
    /\d+\s?(CAD|USD|EUR|GBP)/i,
    /price/i,
    /rate/i,
    /from \$/i,
    /starting at/i,
    /per person/i,
    /per night/i
  ];

  const hasPricePattern = pricePatterns.some(p => p.test(html));
  const hasPriceKeywords = ['pricing', 'rates', 'menu prices', 'admission', 'ticket price'].some(kw => htmlLower.includes(kw));

  return hasPricePattern || hasPriceKeywords;
}

/**
 * Detect if video content is present
 */
export function detectVideo(htmlLower) {
  return htmlLower.includes('youtube') ||
         htmlLower.includes('vimeo') ||
         htmlLower.includes('<video') ||
         htmlLower.includes('wistia');
}

/**
 * Detect if directions/maps are present
 */
export function detectDirections(htmlLower) {
  return htmlLower.includes('direction') ||
         htmlLower.includes('how to get') ||
         htmlLower.includes('google.com/maps') ||
         htmlLower.includes('maps.google') ||
         htmlLower.includes('get directions');
}

/**
 * Detect if accessibility information is present
 */
export function detectAccessibility(htmlLower) {
  return htmlLower.includes('accessibility') ||
         htmlLower.includes('wheelchair') ||
         htmlLower.includes('accessible') ||
         htmlLower.includes('ada compliant');
}

/**
 * Detect if multi-language support is present
 */
export function detectMultiLanguage(html) {
  const hasHreflang = html.includes('hreflang');
  const hasLangSwitcher = /lang(uage)?[-_]?(switch|select|choose)/i.test(html);
  const hasTranslateWidget = html.includes('translate.google') || html.includes('gtranslate');

  return hasHreflang || hasLangSwitcher || hasTranslateWidget;
}

/**
 * Detect which social media platforms have links
 */
export function detectSocialLinks(htmlLower) {
  const socials = [];
  if (htmlLower.includes('instagram.com') || htmlLower.includes('instagram')) socials.push('Instagram');
  if (htmlLower.includes('facebook.com') || htmlLower.includes('fb.com')) socials.push('Facebook');
  if (htmlLower.includes('twitter.com') || htmlLower.includes('x.com')) socials.push('Twitter/X');
  if (htmlLower.includes('tiktok.com')) socials.push('TikTok');
  if (htmlLower.includes('youtube.com')) socials.push('YouTube');
  if (htmlLower.includes('linkedin.com')) socials.push('LinkedIn');
  if (htmlLower.includes('pinterest.com')) socials.push('Pinterest');
  return socials;
}

/**
 * Extract Instagram handle from URL or @username
 */
export function extractInstagramHandle(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([^\/\?]+)/i) || url.match(/^@?([a-zA-Z0-9._]+)$/);
  return match ? match[1].replace('@', '') : null;
}

/**
 * Extract TikTok handle from URL or @username
 */
export function extractTikTokHandle(url) {
  if (!url) return null;
  const match = url.match(/tiktok\.com\/@([^\/\?]+)/i) || url.match(/^@([a-zA-Z0-9._]+)$/);
  return match ? match[1] : null;
}
