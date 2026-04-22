"use client";

import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { storeLinks } from "@/config/storeLinks";

const APPLE_BADGE_SRC =
  "https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83";
const GOOGLE_PLAY_BADGE_SRC =
  "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png";

type StoreBadgesProps = {
  location: string;
  className?: string;
};

export default function StoreBadges({ location, className }: StoreBadgesProps) {
  const { iosAppStoreUrl, androidPlayStoreUrl, androidComingSoon } = storeLinks;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={iosAppStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download Wurder on the Apple App Store (opens in a new tab)"
          onClick={() =>
            trackEvent(ANALYTICS_EVENTS.storeCtaClick, {
              location,
              platform: "ios",
            })
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={APPLE_BADGE_SRC}
            alt="Download on the App Store"
            width={150}
            height={50}
            className="h-[50px] w-auto"
          />
        </a>

        {androidComingSoon ? (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white/80"
          >
            Google Play coming soon
          </span>
        ) : androidPlayStoreUrl ? (
          <a
            href={androidPlayStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get Wurder on Google Play (opens in a new tab)"
            onClick={() =>
              trackEvent(ANALYTICS_EVENTS.storeCtaClick, {
                location,
                platform: "android",
              })
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={GOOGLE_PLAY_BADGE_SRC}
              alt="Get it on Google Play"
              width={169}
              height={65}
              className="h-[50px] w-auto"
            />
          </a>
        ) : null}
      </div>
    </div>
  );
}

