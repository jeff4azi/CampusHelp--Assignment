/** @type {import('../types').User[]} */
export const SEED_USERS = [
  {
    id: "seed-user-1",
    email: "alice@university.edu",
    username: "alice",
    createdAt: "2024-01-01T00:00:00.000Z",
    passwordHash: "password123",
  },
  {
    id: "seed-user-2",
    email: "bob@university.edu",
    username: "bob",
    createdAt: "2024-01-01T00:00:00.000Z",
    passwordHash: "password123",
  },
];

/** @type {import('../types').Post[]} */
export const SEED_POSTS = [
  {
    id: "seed-post-1",
    userId: "seed-user-1",
    course: "CS 301",
    description:
      "Need help implementing a binary search tree in Python with insert, delete, and traversal methods. Due end of week.",
    budget: 40,
    createdAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "seed-post-2",
    userId: "seed-user-2",
    course: "ENG 201",
    description:
      "Looking for feedback on a 5-page argumentative essay about climate policy. Need grammar and structure review.",
    budget: 25,
    createdAt: "2024-01-08T14:30:00.000Z",
  },
  {
    id: "seed-post-3",
    userId: "seed-user-1",
    course: "MATH 350",
    description:
      "Struggling with linear algebra — eigenvalues and eigenvectors. Need someone to walk me through 3 problem sets.",
    budget: 55,
    createdAt: "2024-01-05T09:15:00.000Z",
  },
];
