import { getBucketScore } from './murmur3';
import { Experiment, UserContext } from './Splitkit.types'

/** Floating-point slack allowed when checking that variant weights total 1.0. */
const WEIGHT_TOLERANCE = 1e-6;

const warnedExperiments = new Set<string>();

function isDevelopment(): boolean {
    const globals = globalThis as any;
    if (typeof globals.__DEV__ !== 'undefined') {
        return !!globals.__DEV__;
    }
    return globals.process?.env?.NODE_ENV !== 'production';
}

/**
 * Warns once per experiment about weights that would silently misroute users.
 * Config errors here are invisible at runtime — traffic just quietly drains to
 * the fallback — so they are worth surfacing loudly in development.
 */
function validateWeights<T>(experiment: Experiment<T>): void {
    if (!isDevelopment() || warnedExperiments.has(experiment.key)) {
        return;
    }
    warnedExperiments.add(experiment.key);

    if (experiment.variants.length === 0) {
        console.warn(`[splitkit] Experiment "${experiment.key}" has no variants; every user gets the fallback.`);
        return;
    }

    const negative = experiment.variants.filter((variant) => variant.weight < 0);
    if (negative.length > 0) {
        console.warn(
            `[splitkit] Experiment "${experiment.key}" has negative weights: ` +
            `${negative.map((variant) => `"${variant.name}"`).join(', ')}.`
        );
    }

    const total = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(total - 1) > WEIGHT_TOLERANCE) {
        console.warn(
            `[splitkit] Experiment "${experiment.key}" weights sum to ${total}, expected 1.0. ` +
            `Traffic will be split incorrectly.`
        );
    }
}

export function evaluateExperiment<T = any>(
    experiment: Experiment<T>,
    user: UserContext
): { variant: string; payload?: T } {
    if (experiment.enabled === false) {
        return { variant: experiment.fallback };
    }

    // Check targeting rules if provided
    if (experiment.targetingRules && !experiment.targetingRules(user.attributes || {})) {
        return { variant: experiment.fallback };
    }

    validateWeights(experiment);

    if (experiment.variants.length === 0) {
        return { variant: experiment.fallback };
    }

    const score = getBucketScore(user.id, experiment.key);
    let cumulative = 0;

    for (const variant of experiment.variants) {
        cumulative += variant.weight;
        if (score < cumulative) {
            return { variant: variant.name, payload: variant.payload };
        }
    }

    // Weights are floats, so the running total can land a hair below the score
    // even for a correctly configured experiment (0.1 + 0.2 + 0.7 < 1.0 in
    // binary floating point). Falling through to the last variant keeps those
    // users in the experiment instead of silently dropping them to the fallback.
    const last = experiment.variants[experiment.variants.length - 1];
    return { variant: last.name, payload: last.payload };
}
