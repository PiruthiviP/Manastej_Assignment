const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Candidate = require('../models/Candidate');
const StatusEvent = require('../models/StatusEvent');
const { changeStatus, AppError } = require('../services/statusService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Candidate.deleteMany({});
  await StatusEvent.deleteMany({});
});

describe('statusService.changeStatus', () => {
  test('valid transition: updates candidate status and increments version', async () => {
    const candidate = await Candidate.create({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      role: 'Backend Engineer',
      status: 'applied',
      version: 0,
    });

    const result = await changeStatus({
      id: candidate._id,
      to: 'screening',
      expectedVersion: 0,
      changedBy: 'Recruiter Bob',
    });

    expect(result.status).toBe('screening');
    expect(result.version).toBe(1);

    const inDb = await Candidate.findById(candidate._id);
    expect(inDb.status).toBe('screening');
    expect(inDb.version).toBe(1);
  });

  test('illegal transition: rejects disallowed step with 400 and preserves document', async () => {
    const candidate = await Candidate.create({
      name: 'Bob Marley',
      email: 'bob@example.com',
      role: 'Frontend Engineer',
      status: 'applied',
      version: 0,
    });

    // applied -> interview is not allowed (must go to screening or rejected)
    await expect(
      changeStatus({
        id: candidate._id,
        to: 'interview',
        expectedVersion: 0,
      })
    ).rejects.toThrow(AppError);

    try {
      await changeStatus({
        id: candidate._id,
        to: 'interview',
        expectedVersion: 0,
      });
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.message).toBe('Invalid transition from applied to interview');
    }

    const inDb = await Candidate.findById(candidate._id);
    expect(inDb.status).toBe('applied');
    expect(inDb.version).toBe(0);
  });

  test('stale version: detects race condition and returns 409 conflict', async () => {
    const candidate = await Candidate.create({
      name: 'Carol Danvers',
      email: 'carol@example.com',
      role: 'Staff Architect',
      status: 'applied',
      version: 1, // Already updated once
    });

    // Stale update: recruiter sends expectedVersion: 0
    await expect(
      changeStatus({
        id: candidate._id,
        to: 'screening',
        expectedVersion: 0,
      })
    ).rejects.toThrow(AppError);

    try {
      await changeStatus({
        id: candidate._id,
        to: 'screening',
        expectedVersion: 0,
      })
    } catch (err) {
      expect(err.status).toBe(409);
      expect(err.message).toBe('Stale update, refresh and retry');
    }

    // Document remains unchanged
    const inDb = await Candidate.findById(candidate._id);
    expect(inDb.status).toBe('applied');
    expect(inDb.version).toBe(1);
  });

  test('not found: throws 404 if candidate does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();

    await expect(
      changeStatus({
        id: nonExistentId,
        to: 'screening',
        expectedVersion: 0,
      })
    ).rejects.toThrow(AppError);

    try {
      await changeStatus({
        id: nonExistentId,
        to: 'screening',
        expectedVersion: 0,
      });
    } catch (err) {
      expect(err.status).toBe(404);
      expect(err.message).toBe('Candidate not found');
    }
  });

  test('audit log stores "from": writes immutable StatusEvent record', async () => {
    const candidate = await Candidate.create({
      name: 'Dave Grohl',
      email: 'dave@example.com',
      role: 'Audio Specialist',
      status: 'applied',
      version: 0,
    });

    await changeStatus({
      id: candidate._id,
      to: 'screening',
      expectedVersion: 0,
      changedBy: 'Audit Recruiter',
    });

    const event = await StatusEvent.findOne({ candidateId: candidate._id });
    expect(event).not.toBeNull();
    expect(event.from).toBe('applied');
    expect(event.to).toBe('screening');
    expect(event.changedBy).toBe('Audit Recruiter');
    expect(event.at).toBeInstanceOf(Date);
  });
});

