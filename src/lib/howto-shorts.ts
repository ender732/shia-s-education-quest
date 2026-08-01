/**
 * How-to shorts catalog — animated in-app tips for students and parents.
 * Icons are Lucide names resolved in the player.
 */

export type HowToRole = "student" | "parent" | "both";

export type HowToScene = {
  caption: string;
  /** Lucide icon key used by HowToShortPlayer */
  icon:
    | "sparkles"
    | "trophy"
    | "link"
    | "book"
    | "graduation"
    | "flame"
    | "clipboard"
    | "upload"
    | "users"
    | "barChart"
    | "lightbulb"
    | "rocket"
    | "check"
    | "pencil"
    | "shield";
  emphasis?: string;
};

export type HowToShort = {
  id: string;
  role: HowToRole;
  title: string;
  scenes: HowToScene[];
};

export const HOWTO_SHORTS: HowToShort[] = [
  // —— Student ——
  {
    id: "student-welcome",
    role: "student",
    title: "Welcome to your Quest",
    scenes: [
      {
        icon: "rocket",
        caption: "This is your Student Portal — your home base for learning.",
        emphasis: "Student Portal",
      },
      {
        icon: "trophy",
        caption: "Earn XP and levels when you finish lessons and book reports.",
        emphasis: "XP & levels",
      },
      {
        icon: "flame",
        caption: "Practice a little each day to grow your streak.",
        emphasis: "Daily streak",
      },
      {
        icon: "sparkles",
        caption: "Use How-to shorts anytime from Help if you get stuck.",
        emphasis: "Help button",
      },
    ],
  },
  {
    id: "student-link-code",
    role: "student",
    title: "Share your parent link code",
    scenes: [
      {
        icon: "link",
        caption: "Your link code lets a parent connect to your progress.",
        emphasis: "Link code",
      },
      {
        icon: "clipboard",
        caption: "Tap Copy, then send the code to your parent or guardian.",
        emphasis: "Copy",
      },
      {
        icon: "users",
        caption: "They paste it in Parent Portal → Link student.",
        emphasis: "Parent connects",
      },
      {
        icon: "check",
        caption: "Once linked, they can assign lessons and see your wins.",
        emphasis: "You're connected",
      },
    ],
  },
  {
    id: "student-subjects",
    role: "student",
    title: "Subjects and lessons",
    scenes: [
      {
        icon: "book",
        caption: "Pick a subject tab: Math, ELA, Science, Social Studies, or Reading.",
        emphasis: "Subject tabs",
      },
      {
        icon: "graduation",
        caption: "Open a lesson card to learn, quiz, and practice.",
        emphasis: "Lesson cards",
      },
      {
        icon: "lightbulb",
        caption: "If a subject is empty, wait for a parent to assign something — or try another tab.",
        emphasis: "Empty boards",
      },
      {
        icon: "rocket",
        caption: "Assigned Reading is for books your parent uploaded.",
        emphasis: "Reading tab",
      },
    ],
  },
  {
    id: "student-lesson",
    role: "student",
    title: "How a lesson works",
    scenes: [
      {
        icon: "book",
        caption: "First: teach notes and video — learn the idea.",
        emphasis: "Teach",
      },
      {
        icon: "check",
        caption: "Next: practice questions. You need about 70% to continue.",
        emphasis: "Quiz",
      },
      {
        icon: "pencil",
        caption: "Some lessons have a worksheet — write or draw your own answers.",
        emphasis: "Worksheet",
      },
      {
        icon: "sparkles",
        caption: "Ask AI Coach for hints — it helps you think, not fill answers for you.",
        emphasis: "AI Coach",
      },
      {
        icon: "trophy",
        caption: "Pass the lesson to earn XP and mastery.",
        emphasis: "Mastery",
      },
    ],
  },
  {
    id: "student-books",
    role: "student",
    title: "Assigned reading & book reports",
    scenes: [
      {
        icon: "book",
        caption: "Open a book your parent assigned and read in the app.",
        emphasis: "Read",
      },
      {
        icon: "pencil",
        caption: "Write a RACECE response: Restate, Answer, Cite, Explain (twice).",
        emphasis: "RACECE",
      },
      {
        icon: "sparkles",
        caption: "Submit to AI Teacher for a score, strengths, and next steps.",
        emphasis: "AI grade",
      },
      {
        icon: "trophy",
        caption: "Strong reports earn XP — keep revising with the feedback.",
        emphasis: "Improve",
      },
    ],
  },
  {
    id: "student-leaderboard",
    role: "student",
    title: "Today's Quest Challenge",
    scenes: [
      {
        icon: "trophy",
        caption: "The daily leaderboard ranks practice time and quiz scores today.",
        emphasis: "Today only",
      },
      {
        icon: "flame",
        caption: "It resets at midnight Eastern — fresh chance every day.",
        emphasis: "Resets nightly",
      },
      {
        icon: "graduation",
        caption: "Open a lesson and practice to appear on the board.",
        emphasis: "Practice counts",
      },
      {
        icon: "rocket",
        caption: "Cheer for classmates — learning together is the win.",
        emphasis: "Team spirit",
      },
    ],
  },

  // —— Parent ——
  {
    id: "parent-welcome",
    role: "parent",
    title: "Welcome to Parent Portal",
    scenes: [
      {
        icon: "shield",
        caption: "Parent Portal is for assigning work and reviewing progress.",
        emphasis: "Parent Portal",
      },
      {
        icon: "users",
        caption: "Use Switch to Parent Portal from the top of the dashboard.",
        emphasis: "Toggle",
      },
      {
        icon: "link",
        caption: "First step: link your student with their shareable code.",
        emphasis: "Link first",
      },
      {
        icon: "lightbulb",
        caption: "Replay any tip from How-to shorts in Help.",
        emphasis: "Help",
      },
    ],
  },
  {
    id: "parent-link-student",
    role: "parent",
    title: "Link your student",
    scenes: [
      {
        icon: "link",
        caption: "Ask your student for their Parent link code (on their dashboard).",
        emphasis: "Get the code",
      },
      {
        icon: "clipboard",
        caption: "Paste it under Link a student and confirm.",
        emphasis: "Paste & link",
      },
      {
        icon: "users",
        caption: "You can link more than one student if needed.",
        emphasis: "Multiple kids",
      },
      {
        icon: "check",
        caption: "Linked students show mastery, reports, and assignments here.",
        emphasis: "Connected",
      },
    ],
  },
  {
    id: "parent-worksheet",
    role: "parent",
    title: "Upload a worksheet PDF",
    scenes: [
      {
        icon: "upload",
        caption: "Upload a text-based PDF worksheet you are allowed to use.",
        emphasis: "Upload PDF",
      },
      {
        icon: "sparkles",
        caption: "AI drafts a lesson: quiz, fillable fields, and a matching video when possible.",
        emphasis: "AI draft",
      },
      {
        icon: "clipboard",
        caption: "Review the draft — students never see it until you Publish.",
        emphasis: "Review",
      },
      {
        icon: "check",
        caption: "Publish to assign it. Discard if you want to try again.",
        emphasis: "Publish",
      },
    ],
  },
  {
    id: "parent-tasks-books",
    role: "parent",
    title: "Tasks and assigned books",
    scenes: [
      {
        icon: "graduation",
        caption: "Create a task from curriculum units when you want a built-in lesson.",
        emphasis: "Tasks",
      },
      {
        icon: "book",
        caption: "Upload a PDF book and writing prompt for Assigned Reading.",
        emphasis: "Books",
      },
      {
        icon: "users",
        caption: "Linked students see new work on their Student Portal.",
        emphasis: "They see it",
      },
      {
        icon: "lightbulb",
        caption: "Keep prompts clear — RACECE works best with a focused question.",
        emphasis: "Clear prompts",
      },
    ],
  },
  {
    id: "parent-progress",
    role: "parent",
    title: "Review progress",
    scenes: [
      {
        icon: "barChart",
        caption: "Open a linked student to see mastery bars and completed work.",
        emphasis: "Mastery",
      },
      {
        icon: "pencil",
        caption: "Read AI-graded book reports and checklist feedback.",
        emphasis: "Reports",
      },
      {
        icon: "trophy",
        caption: "Celebrate effort — XP and streaks show daily practice habits.",
        emphasis: "Habits",
      },
      {
        icon: "rocket",
        caption: "Assign the next lesson or book when they are ready for more.",
        emphasis: "Next step",
      },
    ],
  },
];

export const STUDENT_TOUR_IDS = [
  "student-welcome",
  "student-link-code",
  "student-subjects",
  "student-lesson",
  "student-books",
  "student-leaderboard",
] as const;

export const PARENT_TOUR_IDS = [
  "parent-welcome",
  "parent-link-student",
  "parent-worksheet",
  "parent-tasks-books",
  "parent-progress",
] as const;

export function getHowToShort(id: string): HowToShort | undefined {
  return HOWTO_SHORTS.find((s) => s.id === id);
}

export function shortsForRole(role: "student" | "parent"): HowToShort[] {
  return HOWTO_SHORTS.filter((s) => s.role === role || s.role === "both");
}

export function tourIdsForRole(role: "student" | "parent"): readonly string[] {
  return role === "parent" ? PARENT_TOUR_IDS : STUDENT_TOUR_IDS;
}
