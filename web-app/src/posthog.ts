import posthog from "posthog-js";
import { AppSettings } from "@/lib/app-settings";

/**
 * Initialise PostHog using config from AppSettings.
 * Must be called after AppSettings.init() has resolved.
 */
export function initPostHog(): void {
  const { posthogKey, posthogHost } = AppSettings.get();
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    });
  }
}

export default posthog;
