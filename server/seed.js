const mongoose = require('mongoose');
const config = require('./config');
const Candidate = require('./models/Candidate');
const StatusEvent = require('./models/StatusEvent');

/**
 * Realistic seed dataset (12 candidates) covering every stage of the hiring pipeline.
 * Seed timestamps are realistically staggered across minutes, hours, and days ago
 * so the board looks alive and authentic.
 */
const candidatesSeed = [
  {
    name: 'Aisha Patel',
    email: 'aisha.patel@example.com',
    role: 'Staff Infrastructure Engineer',
    status: 'applied',
    version: 0,
    updatedMinutesAgo: 18,
    createdMinutesAgo: 120,
    history: [{ from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 120 }],
  },
  {
    name: 'Liam Chen',
    email: 'liam.chen@example.com',
    role: 'Senior Distributed Systems Engineer',
    status: 'applied',
    version: 0,
    updatedMinutesAgo: 45,
    createdMinutesAgo: 1440, // 1 day ago
    history: [{ from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 1440 }],
  },
  {
    name: 'Sofia Rodriguez',
    email: 'sofia.rodriguez@example.com',
    role: 'Lead Product Designer',
    status: 'screening',
    version: 1,
    updatedMinutesAgo: 120, // 2 hours ago
    createdMinutesAgo: 2880, // 2 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 2880 },
      { from: 'applied', to: 'screening', changedBy: 'Marcus (Recruiter)', minusMinutes: 120 },
    ],
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    role: 'Principal Backend Architect',
    status: 'screening',
    version: 1,
    updatedMinutesAgo: 300, // 5 hours ago
    createdMinutesAgo: 4320, // 3 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 4320 },
      { from: 'applied', to: 'screening', changedBy: 'Marcus (Recruiter)', minusMinutes: 300 },
    ],
  },
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    role: 'Senior React / Frontend Engineer',
    status: 'assignment',
    version: 2,
    updatedMinutesAgo: 540, // 9 hours ago
    createdMinutesAgo: 4320,
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 4320 },
      { from: 'applied', to: 'screening', changedBy: 'Elena K. (Talent)', minusMinutes: 1440 },
      { from: 'screening', to: 'assignment', changedBy: 'Dev Lead Sarah', minusMinutes: 540 },
    ],
  },
  {
    name: 'Tariq Al-Mansoor',
    email: 'tariq.mansoor@example.com',
    role: 'Full Stack Engineer',
    status: 'assignment',
    version: 2,
    updatedMinutesAgo: 840, // 14 hours ago
    createdMinutesAgo: 5760, // 4 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 5760 },
      { from: 'applied', to: 'screening', changedBy: 'Elena K. (Talent)', minusMinutes: 2880 },
      { from: 'screening', to: 'assignment', changedBy: 'Dev Lead Sarah', minusMinutes: 840 },
    ],
  },
  {
    name: 'Maya Lin',
    email: 'maya.lin@example.com',
    role: 'Engineering Manager, Core Platform',
    status: 'interview',
    version: 3,
    updatedMinutesAgo: 1440, // 1 day ago
    createdMinutesAgo: 7200, // 5 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 7200 },
      { from: 'applied', to: 'screening', changedBy: 'Marcus (Recruiter)', minusMinutes: 5760 },
      { from: 'screening', to: 'assignment', changedBy: 'VP Eng David', minusMinutes: 2880 },
      { from: 'assignment', to: 'interview', changedBy: 'VP Eng David', minusMinutes: 1440 },
    ],
  },
  {
    name: 'Jordan Hayes',
    email: 'jordan.hayes@example.com',
    role: 'Security & Compliance Lead',
    status: 'interview',
    version: 3,
    updatedMinutesAgo: 1800, // 1.25 days ago
    createdMinutesAgo: 8640, // 6 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 8640 },
      { from: 'applied', to: 'screening', changedBy: 'Elena K. (Talent)', minusMinutes: 5760 },
      { from: 'screening', to: 'assignment', changedBy: 'Head of SecOps', minusMinutes: 2880 },
      { from: 'assignment', to: 'interview', changedBy: 'Head of SecOps', minusMinutes: 1800 },
    ],
  },
  {
    name: 'Devon Washington',
    email: 'devon.w@example.com',
    role: 'Staff Database Architect',
    status: 'offer',
    version: 4,
    updatedMinutesAgo: 2880, // 2 days ago
    createdMinutesAgo: 10080, // 7 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 10080 },
      { from: 'applied', to: 'screening', changedBy: 'Marcus (Recruiter)', minusMinutes: 7200 },
      { from: 'screening', to: 'assignment', changedBy: 'CTO Alice', minusMinutes: 4320 },
      { from: 'assignment', to: 'interview', changedBy: 'CTO Alice', minusMinutes: 3600 },
      { from: 'interview', to: 'offer', changedBy: 'Head of People', minusMinutes: 2880 },
    ],
  },
  {
    name: 'Chloe Bennett',
    email: 'chloe.bennett@example.com',
    role: 'Senior Machine Learning Engineer',
    status: 'offer',
    version: 4,
    updatedMinutesAgo: 4320, // 3 days ago
    createdMinutesAgo: 11520, // 8 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 11520 },
      { from: 'applied', to: 'screening', changedBy: 'Elena K. (Talent)', minusMinutes: 8640 },
      { from: 'screening', to: 'assignment', changedBy: 'AI Team Lead', minusMinutes: 5760 },
      { from: 'assignment', to: 'interview', changedBy: 'AI Team Lead', minusMinutes: 4600 },
      { from: 'interview', to: 'offer', changedBy: 'Head of People', minusMinutes: 4320 },
    ],
  },
  {
    name: 'Rafael Silva',
    email: 'rafael.silva@example.com',
    role: 'DevOps / Site Reliability Engineer',
    status: 'rejected',
    version: 2,
    updatedMinutesAgo: 5760, // 4 days ago
    createdMinutesAgo: 12960, // 9 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 12960 },
      { from: 'applied', to: 'screening', changedBy: 'Marcus (Recruiter)', minusMinutes: 8640 },
      { from: 'screening', to: 'rejected', changedBy: 'Marcus (Recruiter)', minusMinutes: 5760 },
    ],
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    role: 'iOS Systems Developer',
    status: 'rejected',
    version: 1,
    updatedMinutesAgo: 7200, // 5 days ago
    createdMinutesAgo: 14400, // 10 days ago
    history: [
      { from: 'none', to: 'applied', changedBy: 'System', minusMinutes: 14400 },
      { from: 'applied', to: 'rejected', changedBy: 'Automated Screener', minusMinutes: 7200 },
    ],
  },
];

async function seedDatabase() {
  // Clear existing data to guarantee idempotent seeding
  await Candidate.deleteMany({});
  await StatusEvent.deleteMany({});
  console.log('[Seed] Cleared existing Candidate and StatusEvent records');

  const now = Date.now();

  for (const item of candidatesSeed) {
    const { history, updatedMinutesAgo, createdMinutesAgo, ...candidateData } = item;

    const createdAt = new Date(now - (createdMinutesAgo || 120) * 60 * 1000);
    const updatedAt = new Date(now - (updatedMinutesAgo || 15) * 60 * 1000);

    const candidate = await Candidate.create({
      ...candidateData,
      createdAt,
      updatedAt,
    });

    // Bypass Mongoose timestamps hook so updatedAt accurately reflects the realistic staggered time
    await Candidate.updateOne(
      { _id: candidate._id },
      { $set: { updatedAt } },
      { timestamps: false }
    );

    // Create realistic historical audit log entries with staggered timestamps
    if (history && history.length > 0) {
      const events = history.map((h) => ({
        candidateId: candidate._id,
        from: h.from,
        to: h.to,
        changedBy: h.changedBy,
        at: new Date(now - h.minusMinutes * 60 * 1000),
      }));
      await StatusEvent.insertMany(events);
    }
  }

  console.log(`[Seed] Successfully seeded ${candidatesSeed.length} candidates with realistic staggered timestamps.`);
}

async function runStandaloneSeed() {
  try {
    console.log(`[Seed] Connecting to MongoDB: ${config.MONGO_URI}`);
    await mongoose.connect(config.MONGO_URI);
    await seedDatabase();
    await mongoose.disconnect();
    console.log('[Seed] Done.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error seeding database:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runStandaloneSeed();
}

module.exports = { seedDatabase, candidatesSeed };
