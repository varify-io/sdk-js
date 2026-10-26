const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|quora link preview|outbrain|pinterest|vkshare|w3c_validator|whatsapp|lighthouse|headlesschrome|prerender|preview/i;

/** Bots get no id and see the original: no assignment writes for crawlers, and SEO sees one consistent page. */
export const isBotUserAgent = (userAgent: string | null): boolean => userAgent !== null && BOT_USER_AGENT.test(userAgent);
