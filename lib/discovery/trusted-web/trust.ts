import { lowTrustPathHints, socialAndNewsHosts } from "@/lib/discovery/trusted-web/constants";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sourceNameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Trusted web source";
  }
}

export function stripHtmlToText(html: string) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
  );
}

export function isTrustedDiscoveryUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    if (socialAndNewsHosts.some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`))) {
      return false;
    }

    if (lowTrustPathHints.some((hint) => path.includes(hint))) {
      return false;
    }

    return (
      host.endsWith(".gov") ||
      host.endsWith(".gc.ca") ||
      host.endsWith(".org") ||
      host.endsWith(".edu") ||
      (host.endsWith(".ca") &&
        (path.includes("/community") ||
          path.includes("/services") ||
          path.includes("/housing") ||
          path.includes("/health"))) ||
      host.includes("library") ||
      host.includes("hospital") ||
      host.includes("health") ||
      host.includes("city") ||
      host.includes("county") ||
      host.includes("shelter")
    );
  } catch {
    return false;
  }
}
