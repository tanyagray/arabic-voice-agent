import posthog from "posthog-js";

const apiKey = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

if (apiKey) {
  posthog.init(apiKey, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export default posthog;
