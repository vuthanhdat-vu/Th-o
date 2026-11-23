interface TopIdentityBarProps {
  partnerA: string;
  partnerB: string;
  headline: string;
  startDate: string;
  activeRealmLabel: string;
  showHint: boolean;
}

export function TopIdentityBar(_props: TopIdentityBarProps) {
  // Completely removed top text overlays & performance HUD as requested
  return null;
}
