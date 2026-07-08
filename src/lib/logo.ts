// Provider → logo domain mapping. Used to auto-assign real brand logos
// to subscriptions. Falls back to Clearbit with a derived domain.

const PROVIDER_DOMAINS: Record<string, string> = {
  netflix: "netflix.com",
  spotify: "spotify.com",
  apple: "apple.com",
  google: "google.com",
  "google one": "google.com",
  youtube: "youtube.com",
  adobe: "adobe.com",
  "adobe creative cloud": "adobe.com",
  amazon: "amazon.com",
  "amazon prime": "amazon.com",
  notion: "notion.so",
  openai: "openai.com",
  "chatgpt": "openai.com",
  "chatgpt plus": "openai.com",
  disney: "disney.com",
  "disney+": "disney.com",
  dropbox: "dropbox.com",
  duolingo: "duolingo.com",
  microsoft: "microsoft.com",
  "microsoft 365": "microsoft.com",
  "microsoft 365 family": "microsoft.com",
  linkedin: "linkedin.com",
  "linkedin premium": "linkedin.com",
  xbox: "xbox.com",
  "xbox game pass": "xbox.com",
  hulu: "hulu.com",
  icloud: "apple.com",
  "icloud+": "apple.com",
  "apple music": "apple.com",
  "apple tv+": "apple.com",
  "youtube premium": "youtube.com",
  "spotify premium": "spotify.com",
  paypal: "paypal.com",
  zoom: "zoom.us",
  slack: "slack.com",
  github: "github.com",
  "github copilot": "github.com",
  cloudflare: "cloudflare.com",
  aws: "aws.amazon.com",
  "amazon aws": "aws.amazon.com",
  canva: "canva.com",
  figma: "figma.com",
  "jetbrains": "jetbrains.com",
  nintendo: "nintendo.com",
  "nintendo switch online": "nintendo.com",
  sony: "sony.com",
  "playstation plus": "playstation.com",
  ea: "ea.com",
  "ea play": "ea.com",
  ubisoft: "ubisoft.com",
  tidal: "tidal.com",
  "apple arcade": "apple.com",
  "apple news+": "apple.com",
  "apple fitness+": "apple.com",
  "google one": "google.com",
  "google drive": "google.com",
  "google play pass": "google.com",
  "google workspace": "google.com",
  "youtube tv": "youtube.com",
  "youtube music": "youtube.com",
  "hbo max": "hbomax.com",
  max: "max.com",
  "peacock": "peacocktv.com",
  paramount: "paramountplus.com",
  "paramount+": "paramountplus.com",
  "crunchyroll": "crunchyroll.com",
  "patreon": "patreon.com",
  "substack": "substack.com",
  "medium": "medium.com",
  "new york times": "nytimes.com",
  "nyt": "nytimes.com",
  "washington post": "washingtonpost.com",
  "wall street journal": "wsj.com",
  "duolingo super": "duolingo.com",
  "grammarly": "grammarly.com",
  "1password": "1password.com",
  "lastpass": "lastpass.com",
  "nordvpn": "nordvpn.com",
  "expressvpn": "expressvpn.com",
  "surfshark": "surfshark.com",
  "private internet access": "privateinternetaccess.com",
  "dashlane": "dashlane.com",
  "bitwarden": "bitwarden.com",
  "evernote": "evernote.com",
  "todoist": "todoist.com",
  "trello": "trello.com",
  "asana": "asana.com",
  "monday.com": "monday.com",
  "clickup": "clickup.com",
  "linear": "linear.app",
  "notion plus": "notion.so",
  "vercel": "vercel.com",
  "netlify": "netlify.com",
  "digitalocean": "digitalocean.com",
  "linode": "linode.com",
  "heroku": "heroku.com",
};

export function logoForProvider(provider: string): string {
  const key = provider.toLowerCase().trim();
  const domain =
    PROVIDER_DOMAINS[key] ||
    `${key.replace(/[^a-z0-9]/g, "").slice(0, 20) || "example"}.com`;
  // DuckDuckGo Icons is the most reliable favicon service (no API key,
  // high uptime, returns real brand logos). Clearbit is unreachable from
  // some networks; Google favicon is a backup.
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

// Backup logo URLs tried in order if the primary fails (client-side).
export const LOGO_FALLBACKS = (provider: string): string[] => {
  const key = provider.toLowerCase().trim();
  const domain =
    PROVIDER_DOMAINS[key] ||
    `${key.replace(/[^a-z0-9]/g, "").slice(0, 20) || "example"}.com`;
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://logo.clearbit.com/${domain}`,
  ];
};
