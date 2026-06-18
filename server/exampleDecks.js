// Example decks are read-only; see server/app.js isExampleDeckId guards.
// Genre decks use exaggerated spreads; Jonah's decks are live snapshots from Turso.

const NOW = '2026-06-04T18:00:00.000Z'

export const EXAMPLE_DECKS = [
  {
    id: "example-action",
    name: "Action (AI generated)",
    createdAt: "2026-06-04T18:00:00.000Z",
    updatedAt: "2026-06-04T18:00:00.000Z",
    movies: [
      {
        id: "example-action-0",
        title: "Mad Max: Fury Road",
        fun: 9.8,
        good: 9.5
      },
      {
        id: "example-action-1",
        title: "Top Gun: Maverick",
        fun: 9.5,
        good: 8.2
      },
      {
        id: "example-action-2",
        title: "The Dark Knight",
        fun: 6.2,
        good: 9.9
      },
      {
        id: "example-action-3",
        title: "Die Hard",
        fun: 9.2,
        good: 7.8
      },
      {
        id: "example-action-4",
        title: "Mission: Impossible – Fallout",
        fun: 8.8,
        good: 8.5
      },
      {
        id: "example-action-5",
        title: "Terminator 2: Judgment Day",
        fun: 8.5,
        good: 9
      },
      {
        id: "example-action-6",
        title: "The Raid",
        fun: 7.5,
        good: 9.2
      },
      {
        id: "example-action-7",
        title: "Casino Royale",
        fun: 7,
        good: 9.4
      },
      {
        id: "example-action-8",
        title: "John Wick",
        fun: 8,
        good: 5.5
      },
      {
        id: "example-action-9",
        title: "Kill Bill: Vol. 1",
        fun: 9,
        good: 6.8
      },
      {
        id: "example-action-10",
        title: "Speed",
        fun: 7.8,
        good: 4.2
      },
      {
        id: "example-action-11",
        title: "The Bourne Ultimatum",
        fun: 6.5,
        good: 8
      },
      {
        id: "example-action-12",
        title: "Indiana Jones and the Last Crusade",
        fun: 8.2,
        good: 7
      },
      {
        id: "example-action-13",
        title: "Black Panther",
        fun: 7.2,
        good: 7.5
      },
      {
        id: "example-action-14",
        title: "Fast Five",
        fun: 9.5,
        good: 3.5
      },
      {
        id: "example-action-15",
        title: "Heat",
        fun: 4.5,
        good: 9.6
      },
      {
        id: "example-action-16",
        title: "Crouching Tiger, Hidden Dragon",
        fun: 5,
        good: 9.8
      },
      {
        id: "example-action-17",
        title: "Wonder Woman",
        fun: 6.8,
        good: 6
      },
      {
        id: "example-action-18",
        title: "Commando",
        fun: 8.5,
        good: 1.5
      },
      {
        id: "example-action-19",
        title: "Transformers",
        fun: 5.5,
        good: 0.8
      }
    ]
  },
  {
    id: "example-comedy",
    name: "Comedy (AI generated)",
    createdAt: "2026-06-04T18:00:00.000Z",
    updatedAt: "2026-06-04T18:00:00.000Z",
    movies: [
      {
        id: "example-comedy-0",
        title: "Airplane!",
        fun: 9.9,
        good: 7.5
      },
      {
        id: "example-comedy-1",
        title: "Monty Python and the Holy Grail",
        fun: 9.5,
        good: 8.8
      },
      {
        id: "example-comedy-2",
        title: "Groundhog Day",
        fun: 7,
        good: 9.5
      },
      {
        id: "example-comedy-3",
        title: "Ghostbusters",
        fun: 9,
        good: 7.2
      },
      {
        id: "example-comedy-4",
        title: "The Big Lebowski",
        fun: 8.5,
        good: 8
      },
      {
        id: "example-comedy-5",
        title: "Superbad",
        fun: 9.2,
        good: 5.5
      },
      {
        id: "example-comedy-6",
        title: "Office Space",
        fun: 8,
        good: 7.8
      },
      {
        id: "example-comedy-7",
        title: "Borat",
        fun: 8.8,
        good: 6.5
      },
      {
        id: "example-comedy-8",
        title: "Knives Out",
        fun: 6,
        good: 9
      },
      {
        id: "example-comedy-9",
        title: "Bridesmaids",
        fun: 7.5,
        good: 7
      },
      {
        id: "example-comedy-10",
        title: "When Harry Met Sally...",
        fun: 6.5,
        good: 8.5
      },
      {
        id: "example-comedy-11",
        title: "Palm Springs",
        fun: 7.8,
        good: 8.2
      },
      {
        id: "example-comedy-12",
        title: "Booksmart",
        fun: 7.2,
        good: 7.8
      },
      {
        id: "example-comedy-13",
        title: "Dumb and Dumber",
        fun: 9.5,
        good: 2.5
      },
      {
        id: "example-comedy-14",
        title: "The Hangover",
        fun: 8.2,
        good: 4
      },
      {
        id: "example-comedy-15",
        title: "Step Brothers",
        fun: 9,
        good: 1.8
      },
      {
        id: "example-comedy-16",
        title: "Anchorman",
        fun: 8.5,
        good: 3.2
      },
      {
        id: "example-comedy-17",
        title: "Austin Powers: International Man of Mystery",
        fun: 7,
        good: 4.5
      },
      {
        id: "example-comedy-18",
        title: "Ted",
        fun: 6.2,
        good: 2
      },
      {
        id: "example-comedy-19",
        title: "Jackass Forever",
        fun: 8,
        good: 0.5
      }
    ]
  },
  {
    id: "example-drama",
    name: "Drama (AI generated)",
    createdAt: "2026-06-04T18:00:00.000Z",
    updatedAt: "2026-06-04T18:00:00.000Z",
    movies: [
      {
        id: "example-drama-0",
        title: "The Shawshank Redemption",
        fun: 6.5,
        good: 9.8
      },
      {
        id: "example-drama-1",
        title: "The Godfather",
        fun: 3.5,
        good: 10
      },
      {
        id: "example-drama-2",
        title: "Parasite",
        fun: 7,
        good: 9.6
      },
      {
        id: "example-drama-3",
        title: "Schindler's List",
        fun: 0.5,
        good: 9.9
      },
      {
        id: "example-drama-4",
        title: "Moonlight",
        fun: 2,
        good: 9.5
      },
      {
        id: "example-drama-5",
        title: "12 Years a Slave",
        fun: 0.8,
        good: 9.4
      },
      {
        id: "example-drama-6",
        title: "Whiplash",
        fun: 8,
        good: 9.2
      },
      {
        id: "example-drama-7",
        title: "The Social Network",
        fun: 6,
        good: 9
      },
      {
        id: "example-drama-8",
        title: "A Separation",
        fun: 1.5,
        good: 9.7
      },
      {
        id: "example-drama-9",
        title: "Lady Bird",
        fun: 7.5,
        good: 8.5
      },
      {
        id: "example-drama-10",
        title: "The Florida Project",
        fun: 2.5,
        good: 9
      },
      {
        id: "example-drama-11",
        title: "Brokeback Mountain",
        fun: 3,
        good: 8.8
      },
      {
        id: "example-drama-12",
        title: "Manchester by the Sea",
        fun: 1,
        good: 9.1
      },
      {
        id: "example-drama-13",
        title: "Marriage Story",
        fun: 2.8,
        good: 8.6
      },
      {
        id: "example-drama-14",
        title: "Room",
        fun: 1.8,
        good: 8.9
      },
      {
        id: "example-drama-15",
        title: "Nomadland",
        fun: 2.2,
        good: 8.2
      },
      {
        id: "example-drama-16",
        title: "Forrest Gump",
        fun: 9,
        good: 6.5
      },
      {
        id: "example-drama-17",
        title: "Titanic",
        fun: 8.5,
        good: 7
      },
      {
        id: "example-drama-18",
        title: "The Tree of Life",
        fun: 0.3,
        good: 8.5
      },
      {
        id: "example-drama-19",
        title: "Requiem for a Dream",
        fun: 0.2,
        good: 9.3
      }
    ]
  },
  {
    id: "example-jonah-2025",
    name: "Jonah's 2025",
    createdAt: "2026-06-04T15:55:00.472Z",
    updatedAt: "2026-06-04T15:55:00.472Z",
    movies: [
      {
        id: "example-jonah-2025-0",
        title: "A Real Pain",
        fun: 5.52,
        good: 9.14
      },
      {
        id: "example-jonah-2025-1",
        title: "Black Bag",
        fun: 7.05,
        good: 5.01
      },
      {
        id: "example-jonah-2025-2",
        title: "Bridge of Spies",
        fun: 1.01,
        good: 8.01
      },
      {
        id: "example-jonah-2025-3",
        title: "Carry On",
        fun: 6.91,
        good: 2.13
      },
      {
        id: "example-jonah-2025-4",
        title: "Challengers",
        fun: 7.36,
        good: 7.14
      },
      {
        id: "example-jonah-2025-5",
        title: "Clerks",
        fun: 8.47,
        good: 8.48
      },
      {
        id: "example-jonah-2025-6",
        title: "Dark Waters",
        fun: 1.27,
        good: 8.28
      },
      {
        id: "example-jonah-2025-7",
        title: "Emily the Criminal",
        fun: 4.77,
        good: 9.07
      },
      {
        id: "example-jonah-2025-8",
        title: "Fight Club",
        fun: 9.52,
        good: 9.04
      },
      {
        id: "example-jonah-2025-9",
        title: "Friendship",
        fun: 1.86,
        good: 3.24
      },
      {
        id: "example-jonah-2025-10",
        title: "Inside the Mind of a Dog",
        fun: 6.32,
        good: 6.41
      },
      {
        id: "example-jonah-2025-11",
        title: "John Wick 1-3",
        fun: 8.52,
        good: 6.95
      },
      {
        id: "example-jonah-2025-12",
        title: "Knives Out 3",
        fun: 6.77,
        good: 8.01
      },
      {
        id: "example-jonah-2025-13",
        title: "Logan Lucky",
        fun: 7,
        good: 7.01
      },
      {
        id: "example-jonah-2025-14",
        title: "Lotr: War of the Rohirrim",
        fun: 1.38,
        good: 1.74
      },
      {
        id: "example-jonah-2025-15",
        title: "Love Hurts",
        fun: 0.76,
        good: 0.72
      },
      {
        id: "example-jonah-2025-16",
        title: "Mad Max: Furiosa",
        fun: 9.12,
        good: 7.5
      },
      {
        id: "example-jonah-2025-17",
        title: "Marty Supreme",
        fun: 9.73,
        good: 6.88
      },
      {
        id: "example-jonah-2025-18",
        title: "Mickey 17",
        fun: 7.58,
        good: 8.78
      },
      {
        id: "example-jonah-2025-19",
        title: "Moana 1 + 2",
        fun: 3.02,
        good: 3.52
      },
      {
        id: "example-jonah-2025-20",
        title: "Mountain Queen",
        fun: 4.95,
        good: 6.74
      },
      {
        id: "example-jonah-2025-21",
        title: "Mulholland Drive",
        fun: 3,
        good: 9
      },
      {
        id: "example-jonah-2025-22",
        title: "Nosferatu",
        fun: 3.01,
        good: 5.85
      },
      {
        id: "example-jonah-2025-23",
        title: "Ocean with David Attenborough",
        fun: 4,
        good: 7.99
      },
      {
        id: "example-jonah-2025-24",
        title: "On the Basis of Sex",
        fun: 2.54,
        good: 3.04
      },
      {
        id: "example-jonah-2025-25",
        title: "One Battle After Another",
        fun: 8.01,
        good: 8.52
      },
      {
        id: "example-jonah-2025-26",
        title: "One of Them Days",
        fun: 7.72,
        good: 3.9
      },
      {
        id: "example-jonah-2025-27",
        title: "Pangolin: Kulu's Journey",
        fun: 4.63,
        good: 4.5
      },
      {
        id: "example-jonah-2025-28",
        title: "Pop Star: Never Stop Never Stopping",
        fun: 9.11,
        good: 4.05
      },
      {
        id: "example-jonah-2025-29",
        title: "Sinners",
        fun: 8.97,
        good: 8.98
      },
      {
        id: "example-jonah-2025-30",
        title: "Snowpiercer",
        fun: 8.86,
        good: 5.88
      },
      {
        id: "example-jonah-2025-31",
        title: "Some Like It Hot",
        fun: 7.69,
        good: 7.08
      },
      {
        id: "example-jonah-2025-32",
        title: "Stand by Me",
        fun: 7.13,
        good: 9.19
      },
      {
        id: "example-jonah-2025-33",
        title: "Straw",
        fun: 3.11,
        good: 1.82
      },
      {
        id: "example-jonah-2025-34",
        title: "The Killer",
        fun: 5.99,
        good: 8.3
      },
      {
        id: "example-jonah-2025-35",
        title: "The Naked Gun",
        fun: 8.32,
        good: 4.81
      },
      {
        id: "example-jonah-2025-36",
        title: "The Naked Gun (old Version)",
        fun: 8.56,
        good: 4.73
      },
      {
        id: "example-jonah-2025-37",
        title: "The Secret Life of Ariette",
        fun: 3.54,
        good: 4.08
      },
      {
        id: "example-jonah-2025-38",
        title: "The Unbearable Weight of Massive Talent",
        fun: 5.51,
        good: 5.61
      },
      {
        id: "example-jonah-2025-39",
        title: "The Vvitch",
        fun: 6.4,
        good: 8.36
      },
      {
        id: "example-jonah-2025-40",
        title: "Weapons",
        fun: 7.53,
        good: 5.7
      },
      {
        id: "example-jonah-2025-41",
        title: "Wind River",
        fun: 2.1,
        good: 8.24
      },
      {
        id: "example-jonah-2025-42",
        title: "Wolfs",
        fun: 6.12,
        good: 3.81
      },
      {
        id: "example-jonah-2025-43",
        title: "Y2k",
        fun: 7.57,
        good: 2.01
      }
    ]
  },
  {
    id: "example-jonah-2026",
    name: "Jonah's 2026",
    createdAt: "2026-06-04T16:11:34.743Z",
    updatedAt: "2026-06-04T16:11:34.743Z",
    movies: [
      {
        id: "example-jonah-2026-0",
        title: "28 Days Later",
        fun: 7.22,
        good: 8.32
      },
      {
        id: "example-jonah-2026-1",
        title: "28 Years Later",
        fun: 5.99,
        good: 2.8
      },
      {
        id: "example-jonah-2026-2",
        title: "28 Years Later Bone Temple",
        fun: 7.75,
        good: 3.03
      },
      {
        id: "example-jonah-2026-3",
        title: "A Complete Unknown",
        fun: 3.55,
        good: 9
      },
      {
        id: "example-jonah-2026-4",
        title: "A Working Man",
        fun: 8.23,
        good: 4.45
      },
      {
        id: "example-jonah-2026-5",
        title: "Ad Astra",
        fun: 4.15,
        good: 3.8
      },
      {
        id: "example-jonah-2026-6",
        title: "Alexander and the Terrible, Horrible, No Good, Very Bad Day",
        fun: 6.88,
        good: 2.03
      },
      {
        id: "example-jonah-2026-7",
        title: "Apollo 13: Survival",
        fun: 1.96,
        good: 8.39
      },
      {
        id: "example-jonah-2026-8",
        title: "Back to the Future",
        fun: 9.26,
        good: 6.54
      },
      {
        id: "example-jonah-2026-9",
        title: "Back to the Future 2",
        fun: 9.05,
        good: 2.27
      },
      {
        id: "example-jonah-2026-10",
        title: "Back to the Future 3",
        fun: 7.79,
        good: 5.71
      },
      {
        id: "example-jonah-2026-11",
        title: "Code 3",
        fun: 8.55,
        good: 7.29
      },
      {
        id: "example-jonah-2026-12",
        title: "Dead of Winter",
        fun: 5.16,
        good: 5.04
      },
      {
        id: "example-jonah-2026-13",
        title: "Elevation",
        fun: 3.04,
        good: 2.3
      },
      {
        id: "example-jonah-2026-14",
        title: "Frankenstein",
        fun: 7.31,
        good: 6.07
      },
      {
        id: "example-jonah-2026-15",
        title: "Grizzly Man",
        fun: 7.59,
        good: 8.32
      },
      {
        id: "example-jonah-2026-16",
        title: "Inglorious Basterds",
        fun: 9,
        good: 9.02
      },
      {
        id: "example-jonah-2026-17",
        title: "Kill Bill V1",
        fun: 8.67,
        good: 9.25
      },
      {
        id: "example-jonah-2026-18",
        title: "Kill Bill V2",
        fun: 8.55,
        good: 7.29
      },
      {
        id: "example-jonah-2026-19",
        title: "Marty Supreme",
        fun: 9.88,
        good: 7.87
      },
      {
        id: "example-jonah-2026-20",
        title: "Novocaine",
        fun: 8.28,
        good: 7.79
      },
      {
        id: "example-jonah-2026-21",
        title: "Pirates of the Carribean: Curse of the Black Pearl",
        fun: 9.55,
        good: 9.83
      },
      {
        id: "example-jonah-2026-22",
        title: "Pizza Movie",
        fun: 8.62,
        good: 2.94
      },
      {
        id: "example-jonah-2026-23",
        title: "Sicario: Day of the Soldado",
        fun: 4.66,
        good: 3.26
      },
      {
        id: "example-jonah-2026-24",
        title: "The Beekeeper",
        fun: 9.05,
        good: 2.27
      },
      {
        id: "example-jonah-2026-25",
        title: "The Crash",
        fun: 5.98,
        good: 7.1
      },
      {
        id: "example-jonah-2026-26",
        title: "The Death of Stalin",
        fun: 8.01,
        good: 8.44
      },
      {
        id: "example-jonah-2026-27",
        title: "The Last Duel",
        fun: 1.19,
        good: 1.08
      },
      {
        id: "example-jonah-2026-28",
        title: "The Phoenician Scheme",
        fun: 6.65,
        good: 7.88
      },
      {
        id: "example-jonah-2026-29",
        title: "The Wicker Man",
        fun: 8.84,
        good: 5.72
      },
      {
        id: "example-jonah-2026-30",
        title: "Y Tu Mama Tambien",
        fun: 7.77,
        good: 9.55
      }
    ]
  }
]
