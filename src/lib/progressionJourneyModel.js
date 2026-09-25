import { PROGRESSION_JOURNEY_LANES } from './progressionState.js';
import { isUnlocked } from './progressionPresentation.js';

const RANK_LANE = Object.freeze({
  id: 'rank',
  label: 'Rank / mastery',
  description: 'Lifetime experience points turn steady play into a lasting profile record.'
});
const MAX_LANE_NODES = 32;

function getTrackNodes(track, progression, milestones) {
  const source = track === 'rank'
    ? (Array.isArray(progression?.rankNodes) ? progression.rankNodes : milestones.filter(node => node?.track === 'rank'))
    : (Array.isArray(progression?.journeyByTrack?.[track])
      ? progression.journeyByTrack[track]
      : milestones.filter(node => node?.track === track));

  return source
    .filter(node => node && node.published !== false && node.status !== 'legacy')
    .slice(0, MAX_LANE_NODES);
}

function explicitNodeState(node) {
  const state = String(node?.presentationState || node?.presentation_state || node?.state || '').toLowerCase();
  if (state === 'new' || state === 'active' || state === 'current') return state === 'new' ? 'new' : 'active';
  if (state === 'future') return 'future';
  return '';
}

function getNodeState(node, track, nodes, progression) {
  if (isUnlocked(node)) return 'complete';
  const explicit = explicitNodeState(node);
  if (explicit) return explicit;
  if (track === 'discovery') return 'active';
  if (progression?.nextJourney?.[track]?.id === node?.id) return 'active';
  if (Number(node?.progress?.current) > 0) return 'active';
  if (track === 'rank' && nodes.findIndex(candidate => !isUnlocked(candidate)) === nodes.indexOf(node)) return 'active';
  return 'future';
}

function buildLaneModel(lane, progression) {
  const decorated = lane.nodes.map(node => ({
    ...node,
    presentationState: getNodeState(node, lane.id, lane.nodes, progression)
  }));
  const activeNodes = decorated.filter(node => node.presentationState === 'active' || node.presentationState === 'new');
  if (!activeNodes.length) {
    const fallback = decorated.find(node => !isUnlocked(node));
    if (fallback) {
      fallback.presentationState = 'active';
      activeNodes.push(fallback);
    }
  }
  if (lane.id === 'discovery') {
    const locked = decorated.filter(node => !isUnlocked(node));
    return {
      ...lane,
      nodes: decorated,
      activeNodes: [],
      featuredNode: null,
      additionalActive: [],
      openDiscoveries: locked.filter(node => node.presentationRole === 'open_discovery'),
      lifetimeDiscoveries: locked.filter(node => node.presentationRole === 'lifetime_discovery'),
      completed: decorated.filter(node => node.presentationState === 'complete' || node.presentationState === 'new'),
      future: []
    };
  }
  return {
    ...lane,
    nodes: decorated,
    activeNodes: activeNodes.slice(0, 2),
    featuredNode: activeNodes[0] || null,
    additionalActive: activeNodes.slice(1),
    completed: decorated.filter(node => node.presentationState === 'complete'),
    future: decorated.filter(node => node.presentationState === 'future')
  };
}

/** @param {any} progression */
export function buildProgressionJourneyModel(progression = {}) {
  const currentProgression = progression || {};
  const milestones = Array.isArray(currentProgression.milestones) ? currentProgression.milestones : [];
  const laneModels = [
    { ...RANK_LANE, nodes: getTrackNodes('rank', currentProgression, milestones) },
    ...PROGRESSION_JOURNEY_LANES.map(lane => ({
      ...lane,
      nodes: getTrackNodes(lane.id, currentProgression, milestones)
    }))
  ].map(lane => buildLaneModel(lane, currentProgression));

  return {
    laneModels,
    journeyGoalTotal: laneModels.reduce((total, lane) => total + lane.nodes.length, 0),
    journeyGoalComplete: laneModels.reduce((total, lane) => total + lane.completed.length, 0),
    earnedCosmeticCount: laneModels.reduce((total, lane) => total + lane.completed.filter(node => node.reward).length, 0)
  };
}
