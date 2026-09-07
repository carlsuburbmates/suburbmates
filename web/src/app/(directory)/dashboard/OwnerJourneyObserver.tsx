"use client";

import { useEffect } from "react";
import { recordDirectoryObservabilityEvent } from "@/components/observability/DirectoryObservabilityObserver";

export default function OwnerJourneyObserver() {
  useEffect(() => {
    recordDirectoryObservabilityEvent("owner_dashboard_reached");
  }, []);

  return null;
}
