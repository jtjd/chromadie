import { normalizeCanonicalRoll } from './rollState.js';
import { sleep, normalizeHexColor } from './utils.js';
import {
  getRevealHexCharacters,
  getRollRevealItems,
  getRollRevealTimeline,
  ROLL_REVEAL_SIGNAL_COLORS,
  ROLL_REVEAL_STEPS
} from './rollReveal.js';

/**
 * Present one server-confirmed result through the existing reveal stages.
 * State changes and browser/Svelte effects are supplied by the caller so this
 * sequence can be tested without mounting the Roll component.
 *
 * @param {any} data
 * @param {{
 *   isCurrent?: () => boolean,
 *   isSkipped?: () => boolean,
 *   reducedMotion?: boolean,
 *   applyState?: (patch: Record<string, any>) => void,
 *   dispatchRollState?: () => void,
 *   tick?: () => Promise<any>,
 *   scrollRevealList?: (behavior: ScrollBehavior) => void,
 *   animateScoreCountUp?: (targetScore: number, isCurrent: () => boolean, duration: number, reducedMotion: boolean, onProgress: () => void) => Promise<boolean>,
 *   wait?: typeof sleep
 * }} [options]
 * @returns {Promise<ReturnType<typeof normalizeCanonicalRoll> | null>}
 */
export async function playRollRevealSequence(data, {
  isCurrent = () => true,
  isSkipped = () => false,
  reducedMotion = false,
  applyState = () => {},
  dispatchRollState = () => {},
  tick = async () => {},
  scrollRevealList = () => {},
  animateScoreCountUp = async () => true,
  wait = sleep
} = {}) {
  const canonical = normalizeCanonicalRoll(data);
  const conditionCount = canonical.contributors.length;
  const revealItems = getRollRevealItems(canonical);
  const timing = getRollRevealTimeline({
    rarity: canonical.rarity,
    score: canonical.score,
    conditionCount,
    reducedMotion
  });
  if (!isCurrent()) return null;

  let visibleConditions = [];

  applyState({ revealConditions: visibleConditions, revealItemTotal: revealItems.length });

  const finalize = () => {
    const finalHex = normalizeHexColor(canonical.hex, '#000000');
    const score = Number(canonical.score) || 0;
    applyState({
      score,
      rarity: canonical.rarity || 'Common',
      identity: canonical.identity,
      traits: canonical.traits,
      rollContributors: canonical.contributors,
      revealConditions: [...revealItems],
      revealStep: ROLL_REVEAL_STEPS.length - 1,
      revealDetail: `${conditionCount} condition${conditionCount === 1 ? '' : 's'} · ${score.toLocaleString()} score confirmed`,
      displayHex: finalHex,
      displayColor: finalHex,
      displayScore: score,
      scanProgress: 100
    });
    return canonical;
  };

  if (reducedMotion) return finalize();

  applyState({
    displayColor: '#222',
    displayHex: getRevealHexCharacters(canonical.hex, 0)
  });
  dispatchRollState();
  applyState({
    revealStep: 0,
    revealDetail: 'Waiting for the roll result',
    scanProgress: ROLL_REVEAL_STEPS[0].progress,
    displayScore: 0,
    score: 0,
    rarity: '',
    identity: '',
    traits: [],
    rollContributors: []
  });

  const waitForBeat = async delay => {
    if (isSkipped()) return isCurrent();
    if (delay > 0) await wait(delay);
    return isCurrent() && !isSkipped();
  };

  const waitThroughStage = async (duration, messages, onBeat) => {
    const safeMessages = messages.length ? messages : [''];
    const beatDuration = duration / safeMessages.length;
    const beatHandler = typeof onBeat === 'function' ? onBeat : () => {};
    for (let index = 0; index < safeMessages.length; index += 1) {
      if (isSkipped()) return false;
      beatHandler(index, safeMessages[index]);
      if (!await waitForBeat(beatDuration)) return false;
    }
    return true;
  };

  const revealCondition = async item => {
    visibleConditions = [...visibleConditions, item];
    applyState({ revealConditions: visibleConditions });
    await tick();
    scrollRevealList(reducedMotion ? 'auto' : 'smooth');
  };

  if (!await waitThroughStage(
    timing.color,
    ['Color signal received'],
    (index, message) => applyState({
      revealDetail: message,
      displayColor: ROLL_REVEAL_SIGNAL_COLORS[index % ROLL_REVEAL_SIGNAL_COLORS.length]
    })
  )) {
    if (!isCurrent()) return null;
    if (isSkipped()) return finalize();
  }

  for (let revealedCharacters = 1; revealedCharacters <= 6; revealedCharacters += 1) {
    if (isSkipped()) return finalize();
    applyState({
      revealDetail: `${revealedCharacters}/6 HEX characters revealed`,
      displayHex: getRevealHexCharacters(canonical.hex, revealedCharacters),
      displayColor: ROLL_REVEAL_SIGNAL_COLORS[(revealedCharacters + 1) % ROLL_REVEAL_SIGNAL_COLORS.length]
    });
    dispatchRollState();
    if (!await waitForBeat(timing.channel)) {
      if (!isCurrent()) return null;
      if (isSkipped()) return finalize();
    }
  }

  const finalHex = normalizeHexColor(canonical.hex, '#000000');
  applyState({ displayHex: finalHex, displayColor: finalHex });
  dispatchRollState();
  applyState({
    revealStep: 1,
    scanProgress: ROLL_REVEAL_STEPS[1].progress,
    revealDetail: `${conditionCount} condition${conditionCount === 1 ? '' : 's'} confirmed`
  });
  if (!await waitForBeat(timing.conditionIntro)) {
    if (!isCurrent()) return null;
    if (isSkipped()) return finalize();
  }

  for (const item of revealItems) {
    if (isSkipped()) return finalize();
    await revealCondition(item);
    applyState({
      revealDetail: item.kind === 'condition' && item.points > 0
        ? `${item.label} · +${item.points.toLocaleString()} score`
        : `${item.label} checked`
    });
    if (!await waitForBeat(timing.conditionBeat)) {
      if (!isCurrent()) return null;
      if (isSkipped()) return finalize();
    }
  }

  applyState({ revealDetail: 'Confirming conditions' });
  if (!await waitForBeat(timing.conditionSettle)) {
    if (!isCurrent()) return null;
    if (isSkipped()) return finalize();
  }

  if (isSkipped()) return finalize();
  const score = Number(canonical.score) || 0;
  applyState({
    revealStep: 2,
    scanProgress: ROLL_REVEAL_STEPS[2].progress,
    score,
    rollContributors: canonical.contributors,
    traits: canonical.traits,
    identity: canonical.identity,
    revealDetail: 'Counting confirmed score'
  });
  const scoreComplete = await animateScoreCountUp(
    score,
    isCurrent,
    timing.score,
    reducedMotion,
    () => applyState({ revealDetail: 'Counting confirmed score' })
  );
  if (!scoreComplete || !isCurrent()) {
    if (!isCurrent()) return null;
    if (isSkipped()) return finalize();
  }

  if (isSkipped()) return finalize();
  applyState({
    revealStep: 3,
    scanProgress: ROLL_REVEAL_STEPS[3].progress,
    revealDetail: `${conditionCount} condition${conditionCount === 1 ? '' : 's'} · ${score.toLocaleString()} score confirmed`
  });
  if (!await waitForBeat(timing.settle)) {
    if (!isCurrent()) return null;
    if (isSkipped()) return finalize();
  }
  return finalize();
}
