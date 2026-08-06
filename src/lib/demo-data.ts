const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=500&fit=crop&auto=format&q=80`;

export const homeSections = {
  continueSearching: [
    {
      id: "1",
      name: "Everlane Day Market Tote",
      saved: "Saved 2h ago",
      imageUrl: img("1558769132-cb1aea458c5e"),
    },
    {
      id: "2",
      name: "Veja V-10 Sneakers",
      saved: "Saved yesterday",
      imageUrl: img("1549298916-b41d501d3772"),
    },
    {
      id: "3",
      name: "COS Wool Blazer",
      saved: "Saved 3 days ago",
      imageUrl: img("1591047139829-d91aecb6caea"),
    },
  ],
  priceDrops: [
    {
      id: "1",
      name: "Aritzia Wilfred Dress",
      price: 148,
      note: "Predicted drop in 6 days",
      imageUrl: img("1595777457583-95e059d581b8"),
    },
    {
      id: "2",
      name: "Madewell Transport Tote",
      price: 98,
      note: "Likely sale within 2 weeks",
      imageUrl: img("1434389677669-e08b4cac3105"),
    },
    {
      id: "3",
      name: "Reformation Linen Set",
      price: 128,
      note: "Price trending down",
      imageUrl: img("1566174053879-31528523f8ae"),
    },
  ],
  recommended: [
    {
      id: "1",
      name: "Toteme Scarf Coat",
      reason: "Fits your neutral palette",
      imageUrl: img("1515886657613-9f3515b0c78f"),
    },
    {
      id: "2",
      name: "COS Wide-Leg Trousers",
      reason: "Pairs with your saved blazers",
      imageUrl: img("1594938298603-c8148c4dae35"),
    },
    {
      id: "3",
      name: "The Row Soft Bag",
      reason: "Similar to items you saved",
      imageUrl: img("1490481651871-ab68de25d43d"),
    },
  ],
  wardrobeMatches: [
    {
      id: "1",
      name: "White leather sneakers",
      matches: 7,
      imageUrl: img("1549298916-b41d501d3772"),
    },
    {
      id: "2",
      name: "Cropped black blazer",
      matches: 5,
      imageUrl: img("1591047139829-d91aecb6caea"),
    },
    {
      id: "3",
      name: "Gold hoop earrings",
      matches: 4,
      imageUrl: img("1469334031218-e382a71b716b"),
    },
  ],
  recentSources: [
    { id: "1", source: "Pinterest screenshot", time: "2 hours ago", icon: "pinterest" as const },
    { id: "2", source: "TikTok clip", time: "Yesterday", icon: "tiktok" as const },
    { id: "3", source: "Instagram post", time: "3 days ago", icon: "instagram" as const },
  ],
};

export const onboardingShowcase = [
  {
    tag: "Exact match",
    tagColor: "bg-violet-100 text-violet-700",
    name: "Reformation Juliette Knit Dress",
    detail: "92% match • 18 retailers compared",
    imageUrl: img("1595777457583-95e059d581b8"),
  },
  {
    tag: "Better value",
    tagColor: "bg-sky-100 text-sky-700",
    name: "COS oversized shirt",
    detail: "4 alternatives under $80",
    imageUrl: img("1594938298603-c8148c4dae35"),
  },
  {
    tag: "Wardrobe fit",
    tagColor: "bg-violet-100 text-violet-700",
    name: "White leather sneakers",
    detail: "Matches 7 saved items",
    imageUrl: img("1549298916-b41d501d3772"),
  },
];
