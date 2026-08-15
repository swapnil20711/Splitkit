import { getBucketScore } from './murmur3';
import { Experiment, UserContext } from './Splitkit.types'

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

    const score = getBucketScore(user.id, experiment.key);
    let cumulative = 0;

    for (const variant of experiment.variants) {
        cumulative += variant.weight;
        if (score < cumulative) {
            return { variant: variant.name, payload: variant.payload };
        }
    }

    return { variant: experiment.fallback };
}