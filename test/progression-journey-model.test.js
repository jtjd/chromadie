import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressionJourneyModel } from '../src/lib/progressionJourneyModel.js';

function getLane(model, id) {
  const lane = model.laneModels.find(candidate => candidate.id === id);
  assert.ok(lane, `expected ${id} lane`);
  return lane;
}

test('rank and track sources preserve precedence, filtering, and the 32-node cap', () => {
  const rankNodes = [
    { id: 'unpublished-rank', published: false },
    { id: 'legacy-rank', status: 'legacy' },
    ...Array.from({ length: 33 }, (_, index) => ({ id: `rank-${index}`, track: 'rank' }))
  ];
  const model = buildProgressionJourneyModel({
    rankNodes,
    milestones: [
      { id: 'rank-fallback', track: 'rank' },
      { id: 'ritual-fallback', track: 'ritual' },
      { id: 'discovery-fallback', track: 'discovery' }
    ],
    journeyByTrack: { ritual: [], discovery: [] }
  });

  const rank = getLane(model, 'rank');
  assert.equal(rank.nodes.length, 32);
  assert.equal(rank.nodes[0].id, 'rank-0');
  assert.equal(rank.nodes.at(-1).id, 'rank-31');
  assert.ok(!rank.nodes.some(node => node.id === 'rank-fallback'));
  assert.deepEqual(getLane(model, 'ritual').nodes, []);
  assert.deepEqual(getLane(model, 'discovery').nodes, []);
});

test('rank falls back to milestone records only when the rank node source is absent', () => {
  const milestones = [
    { id: 'rank-fallback', track: 'rank' },
    { id: 'ritual-fallback', track: 'ritual' }
  ];
  assert.deepEqual(
    getLane(buildProgressionJourneyModel({ milestones }), 'rank').nodes.map(node => node.id),
    ['rank-fallback']
  );
  assert.deepEqual(
    getLane(buildProgressionJourneyModel({ rankNodes: [], milestones }), 'rank').nodes,
    []
  );
});

test('track lanes fall back to milestone records when their journey source is absent', () => {
  const model = buildProgressionJourneyModel({
    milestones: [
      { id: 'ritual-fallback', track: 'ritual', progress: { current: 1 } },
      { id: 'hidden-ritual', track: 'ritual', published: false },
      { id: 'discovery-fallback', track: 'discovery', presentationRole: 'open_discovery' },
      { id: 'legacy-discovery', track: 'discovery', status: 'legacy' }
    ],
    journeyByTrack: {}
  });

  assert.deepEqual(getLane(model, 'ritual').nodes.map(node => node.id), ['ritual-fallback']);
  assert.deepEqual(getLane(model, 'discovery').nodes.map(node => node.id), ['discovery-fallback']);
});

test('unlocked and explicit states take precedence over next-goal and partial-progress fallbacks', () => {
  const model = buildProgressionJourneyModel({
    rankNodes: [
      { id: 'rank-complete', unlocked: true, presentationState: 'future' },
      { id: 'rank-first-locked' },
      { id: 'rank-later-locked' }
    ],
    journeyByTrack: {
      ritual: [
        { id: 'camel-unlock', unlockedAt: '2026-01-01T00:00:00Z' },
        { id: 'snake-unlock', unlocked_at: '2026-01-01T00:00:00Z' },
        { id: 'future-wins', presentationState: 'future', progress: { current: 2 } },
        { id: 'current-alias', presentationState: 'CURRENT' },
        { id: 'new-state', presentationState: 'new' },
        { id: 'server-next' },
        { id: 'partial-progress', progress: { current: 1 } },
        { id: 'explicit-active', presentation_state: 'active' },
        { id: 'unclassified-future' }
      ]
    },
    nextJourney: { ritual: { id: 'server-next' } }
  });
  const rank = getLane(model, 'rank');
  const ritual = getLane(model, 'ritual');
  const byId = Object.fromEntries(ritual.nodes.map(node => [node.id, node]));

  assert.equal(rank.nodes[0].presentationState, 'complete');
  assert.equal(rank.nodes[1].presentationState, 'active');
  assert.equal(rank.nodes[2].presentationState, 'future');
  assert.equal(byId['camel-unlock'].presentationState, 'complete');
  assert.equal(byId['snake-unlock'].presentationState, 'complete');
  assert.equal(byId['future-wins'].presentationState, 'future');
  assert.equal(byId['current-alias'].presentationState, 'active');
  assert.equal(byId['new-state'].presentationState, 'new');
  assert.equal(byId['server-next'].presentationState, 'active');
  assert.equal(byId['partial-progress'].presentationState, 'active');
  assert.equal(byId['explicit-active'].presentationState, 'active');
  assert.equal(byId['unclassified-future'].presentationState, 'future');
  assert.deepEqual(ritual.activeNodes.map(node => node.id), ['current-alias', 'new-state']);
  assert.deepEqual(ritual.additionalActive.map(node => node.id), [
    'new-state', 'server-next', 'partial-progress', 'explicit-active'
  ]);
});

test('discovery groups both role aliases and retains the existing new-state completion count', () => {
  const model = buildProgressionJourneyModel({
    rankNodes: [{ id: 'rank-earned', unlocked: true, reward: { name: 'Rank reward' } }],
    journeyByTrack: {
      ritual: [
        { id: 'ritual-earned', unlocked: true, reward: { name: 'Ritual reward' } },
        { id: 'ritual-active', progress: { current: 1 } }
      ],
      discovery: [
        { id: 'open', presentationRole: 'open_discovery' },
        { id: 'lifetime', presentationRole: 'lifetime_discovery' },
        {
          id: 'new-open',
          presentationRole: 'open_discovery',
          presentationState: 'new',
          reward: { name: 'New find reward' }
        },
        {
          id: 'found',
          unlocked_at: '2026-01-01T00:00:00Z',
          presentationRole: 'open_discovery',
          reward: { name: 'Found reward' }
        }
      ]
    }
  });
  const discovery = getLane(model, 'discovery');

  assert.deepEqual(discovery.openDiscoveries.map(node => node.id), ['open', 'new-open']);
  assert.deepEqual(discovery.lifetimeDiscoveries.map(node => node.id), ['lifetime']);
  assert.deepEqual(discovery.completed.map(node => node.id), ['new-open', 'found']);
  assert.deepEqual(discovery.activeNodes, []);
  assert.equal(discovery.featuredNode, null);
  assert.deepEqual(discovery.additionalActive, []);
  assert.deepEqual(discovery.future, []);
  assert.equal(model.journeyGoalTotal, 7);
  assert.equal(model.journeyGoalComplete, 4);
  assert.equal(model.earnedCosmeticCount, 4);
});
