export type PublicProfileFact = {
  label: string;
  value?: string;
  sourceReported?: boolean;
};

// These are presentation-only recognisers for the bounded OSM detail strings
// already stored on a public profile. They never infer a new business fact or
// expose a value that the profile does not already contain.
export function extractPublicProfileFacts(
  description: string | null,
): PublicProfileFact[] {
  if (!description) return [];
  const facts: PublicProfileFact[] = [];
  const cuisine = description.match(/(?:^|\s)Cuisine:\s*([^\.\n]{1,150})\./i)?.[1]?.trim();
  if (cuisine) facts.push({ label: "Cuisine", value: cuisine });

  const exactFacts: Array<[string, PublicProfileFact]> = [
    ["Takeaway available.", { label: "Takeaway" }],
    ["Delivery available.", { label: "Delivery" }],
    ["Outdoor seating.", { label: "Outdoor seating" }],
    ["Vegan menu.", { label: "Vegan menu" }],
    ["Vegan options.", { label: "Vegan options" }],
    ["Vegetarian menu.", { label: "Vegetarian menu" }],
    ["Vegetarian options.", { label: "Vegetarian options" }],
    [
      "Source-reported wheelchair access.",
      { label: "Wheelchair access", sourceReported: true },
    ],
    [
      "Source-reported Wi-Fi.",
      { label: "Wi-Fi", sourceReported: true },
    ],
    [
      "Source-reported contactless payment.",
      { label: "Contactless payment", sourceReported: true },
    ],
    [
      "Drive-through available.",
      { label: "Drive-through", sourceReported: true },
    ],
  ];
  for (const [sentence, fact] of exactFacts) {
    if (description.includes(sentence)) facts.push(fact);
  }
  return facts;
}
