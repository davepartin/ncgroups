import crypto from 'crypto';
import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { buildConsentSnapshot } from '../services/sms-consent.js';
import { buildSyncPlan, payloadHash, validatePayload } from '../services/vault-sync.js';

const router = Router();

function safeTokenMatch(provided, expected) {
  if (!provided || !expected) return false;
  const left = Buffer.from(String(provided));
  const right = Buffer.from(String(expected));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authenticateSyncToken(req, res, next) {
  const configured = process.env.NCGROUPS_SYNC_TOKEN;
  if (!configured) return res.status(503).json({ error: 'Vault sync is not configured' });
  const provided = req.get('X-NCGroups-Sync-Token');
  if (!safeTokenMatch(provided, configured)) return res.status(401).json({ error: 'Invalid vault sync token' });
  next();
}

async function loadCurrent(prismaClient = prisma) {
  const [people, groups] = await Promise.all([
    prismaClient.person.findMany({
      include: {
        groups: {
          include: { group: { select: { id: true, sourceId: true } } }
        }
      }
    }),
    prismaClient.group.findMany()
  ]);
  return { people, groups };
}

async function preparePlan(input) {
  const payload = validatePayload(input);
  const current = await loadCurrent();
  const plan = buildSyncPlan(payload, current.people, current.groups);
  return { payload, current, plan, hash: payloadHash(payload) };
}

router.get('/consent-snapshot', authenticateSyncToken, async (_req, res) => {
  try {
    const preferences = await prisma.smsPreference.findMany({ orderBy: { phone: 'asc' } });
    res.json(buildConsentSnapshot(preferences));
  } catch (error) {
    console.error('Error fetching consent snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch consent snapshot' });
  }
});

router.get('/status', authenticateToken, async (_req, res) => {
  try {
    const [state, peopleCount, groupsCount, phones] = await Promise.all([
      prisma.vaultSyncState.findUnique({ where: { id: 'nc-vault' } }),
      prisma.person.count({ where: { sourceManaged: true, sourceStatus: { not: 'archived' } } }),
      prisma.group.count({ where: { sourceManaged: true, sourceStatus: { not: 'archived' } } }),
      prisma.person.findMany({
        where: { sourceManaged: true, sourceStatus: { not: 'archived' }, phone: { not: null } },
        select: { phone: true },
        distinct: ['phone']
      })
    ]);
    res.json({
      configured: Boolean(process.env.NCGROUPS_SYNC_TOKEN),
      lastAppliedAt: state?.lastAppliedAt || null,
      sourceHash: state?.lastSourceHash || null,
      peopleCount,
      groupsCount,
      uniquePhoneCount: phones.length,
      summary: state?.lastSummary || null
    });
  } catch (error) {
    console.error('Error fetching vault sync status:', error);
    res.status(500).json({ error: 'Failed to fetch vault sync status' });
  }
});

router.post('/preview', authenticateSyncToken, async (req, res) => {
  try {
    const { plan, hash } = await preparePlan(req.body);
    res.json({
      readyToApply: plan.conflicts.length === 0,
      previewHash: hash,
      summary: plan.summary,
      conflicts: plan.conflicts,
      sharedPhones: plan.sharedPhones,
      archiveCandidates: plan.archiveCandidates
    });
  } catch (error) {
    console.error('Vault sync preview failed:', error);
    res.status(error.status || 500).json({ error: error.message || 'Vault sync preview failed' });
  }
});

router.post('/apply', authenticateSyncToken, async (req, res) => {
  try {
    const { previewHash, payload: rawPayload } = req.body || {};
    if (!previewHash || !rawPayload) return res.status(400).json({ error: 'previewHash and payload are required' });
    const { payload, current, plan, hash } = await preparePlan(rawPayload);
    if (previewHash !== hash) return res.status(409).json({ error: 'The vault data changed after preview. Run preview again.' });
    if (plan.conflicts.length) {
      return res.status(409).json({ error: 'Sync has unresolved matching conflicts', conflicts: plan.conflicts });
    }

    const appliedAt = new Date();
    await prisma.$transaction(async tx => {
      const groupIds = new Map();
      for (const incoming of payload.groups) {
        const existingId = plan.groupMatches.get(incoming.sourceId);
        const data = {
          sourceId: incoming.sourceId,
          sourceManaged: true,
          sourceStatus: incoming.status,
          sourceSyncedAt: appliedAt,
          name: incoming.name,
          description: incoming.description
        };
        const group = existingId
          ? await tx.group.update({ where: { id: existingId }, data })
          : await tx.group.create({ data });
        groupIds.set(incoming.sourceId, group.id);
      }

      if (plan.groupsArchiveIds.length) {
        await tx.group.updateMany({
          where: { id: { in: plan.groupsArchiveIds } },
          data: { sourceManaged: true, sourceStatus: 'archived', sourceSyncedAt: appliedAt }
        });
      }

      for (const incoming of payload.people) {
        const existingId = plan.personMatches.get(incoming.sourceId);
        let isOptedOut = false;
        if (incoming.phone) {
          const preference = await tx.smsPreference.upsert({
            where: { phone: incoming.phone },
            create: { phone: incoming.phone, status: 'Unknown', source: 'vault-sync' },
            update: {}
          });
          isOptedOut = preference.status === 'OptedOut';
        }
        const data = {
          sourceId: incoming.sourceId,
          sourceManaged: true,
          sourceStatus: incoming.status,
          sourceSyncedAt: appliedAt,
          firstName: incoming.firstName,
          lastName: incoming.lastName,
          phone: incoming.phone,
          email: incoming.email,
          gender: incoming.gender,
          ageGroup: incoming.ageGroup,
          membershipStatus: incoming.membershipStatus,
          isOptedOut
        };
        const person = existingId
          ? await tx.person.update({ where: { id: existingId }, data })
          : await tx.person.create({ data });

        await tx.personGroup.deleteMany({ where: { personId: person.id } });
        const membershipRows = incoming.groupSourceIds
          .map(sourceId => groupIds.get(sourceId))
          .filter(Boolean)
          .map(groupId => ({ personId: person.id, groupId }));
        if (membershipRows.length) await tx.personGroup.createMany({ data: membershipRows });
      }

      if (plan.peopleArchiveIds.length) {
        await tx.personGroup.deleteMany({ where: { personId: { in: plan.peopleArchiveIds } } });
        await tx.person.updateMany({
          where: { id: { in: plan.peopleArchiveIds } },
          data: { sourceManaged: true, sourceStatus: 'archived', sourceSyncedAt: appliedAt }
        });
      }

      await tx.vaultSyncState.upsert({
        where: { id: 'nc-vault' },
        create: { id: 'nc-vault', lastAppliedAt: appliedAt, lastSourceHash: hash, lastSummary: plan.summary },
        update: { lastAppliedAt: appliedAt, lastSourceHash: hash, lastSummary: plan.summary }
      });
    }, { timeout: 60000 });

    res.json({ success: true, appliedAt: appliedAt.toISOString(), sourceHash: hash, summary: plan.summary });
  } catch (error) {
    console.error('Vault sync apply failed:', error);
    res.status(error.status || 500).json({ error: error.message || 'Vault sync apply failed' });
  }
});

export default router;
