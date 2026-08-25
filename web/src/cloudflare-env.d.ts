interface DirectoryObservabilityDataset {
  writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

declare global {
  interface CloudflareEnv {
    DIRECTORY_OBSERVABILITY?: DirectoryObservabilityDataset;
    DIRECTORY_OBSERVABILITY_ACCOUNT_ID?: string;
    DIRECTORY_OBSERVABILITY_API_TOKEN?: string;
    DIRECTORY_OBSERVABILITY_SITE_TAG?: string;
  }
}

export {};
