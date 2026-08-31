export type PublicProfileFact = {
  label: string;
  value?: string;
  sourceReported?: boolean;
};

const exactFactSentences = [
  "Takeaway available.",
  "Delivery available.",
  "Outdoor seating.",
  "Vegan menu.",
  "Vegan options.",
  "Vegetarian menu.",
  "Vegetarian options.",
  "Source-reported wheelchair access.",
  "Source-reported Wi-Fi.",
  "Source-reported contactless payment.",
  "Drive-through available.",
];

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

// A source refresh can legitimately give a profile a short set of structured
// amenities before it has a fuller owner-written description. In that case the
// presentation should not mislabel those facts as an editorial business story.
// This deliberately returns false as soon as any unrecognised prose remains.
export function hasOnlyStructuredPublicProfileFacts(description: string | null): boolean {
  if (!description?.trim()) return false;
  let remainder = description;
  remainder = remainder.replace(/Cuisine:\s*[^.\n]{1,150}\./gi, " ");
  for (const sentence of exactFactSentences) {
    remainder = remainder.replaceAll(sentence, " ");
  }
  return remainder.replace(/[\s.]+/g, "").length === 0;
}
