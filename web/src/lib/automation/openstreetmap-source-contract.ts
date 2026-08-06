export const OPENSTREETMAP_SOURCE = "openstreetmap";
export const OPENSTREETMAP_SOURCE_CONTRACT_VERSION = "openstreetmap-candidate-v1";
export const OPENSTREETMAP_SOURCE_HOST = "www.openstreetmap.org";

export function hasOpenStreetMapSourceContract(version: string) {
  return version === OPENSTREETMAP_SOURCE_CONTRACT_VERSION;
}
