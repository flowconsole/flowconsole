import Tracker from "@openreplay/tracker";
import trackerAssist from "@openreplay/tracker-assist";

import { env } from "@/env.mjs";

let openReplayTracker: Tracker | null = null;
let openReplayStarted = false;

function resolveProjectKey() {
  const projectKey = env.VITE_OPENREPLAY_PROJECT_KEY?.trim();

  return projectKey ? projectKey : null;
}

function getOpenReplayTracker() {
  if (openReplayTracker) {
    return openReplayTracker;
  }

  const projectKey = resolveProjectKey();

  if (!projectKey) {
    return null;
  }

  openReplayTracker = new Tracker({
    projectKey,
    ingestPoint: env.VITE_OPENREPLAY_INGEST_POINT,
    // Record linked stylesheets inside the replay payload so the session
    // stays styled even when OpenReplay cannot cache remote CSS assets.
    inlineCss: 3,
    defaultInputMode: 0,
    obscureInputEmails: false,
    obscureInputDates: false,
    obscureInputNumbers: false,
    obscureTextEmails: false,
    obscureTextNumbers: false
  });
  openReplayTracker.use(trackerAssist());

  return openReplayTracker;
}

export function startOpenReplay() {
  if (openReplayStarted || typeof window === "undefined") {
    return;
  }

  const tracker = getOpenReplayTracker();

  if (!tracker) {
    return;
  }

  tracker.start();
  tracker.setMetadata("surface", "frontend-app");
  tracker.setMetadata("app", "flowconsole");
  openReplayStarted = true;
}

export function identifyOpenReplayUser(userId: string | null | undefined) {
  if (!userId) {
    return;
  }

  const tracker = getOpenReplayTracker();

  if (!tracker) {
    return;
  }

  tracker.setUserID(userId);
}

export function setOpenReplayUserMetadata(metadata: Record<string, string | null | undefined>) {
  const tracker = getOpenReplayTracker();

  if (!tracker) {
    return;
  }

  Object.entries(metadata).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    tracker.setMetadata(key, value);
  });
}
