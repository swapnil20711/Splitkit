
export interface Variant<T = any> {
    name: string;
    weight: number; // 0.0 to 1.0 (must sum to 1.0 per experiment)
    payload?: T;
}

export interface Experiment<T = any> {
    key: string;
    variants: Variant<T>[];
    fallback: string;
    enabled?: boolean;
    targetingRules?: (attributes: Record<string, any>) => boolean;
}

export interface UserContext {
    id: string;
    attributes?: Record<string, any>;
}

export type ExposureCallback = (event: {
    experimentKey: string;
    variant: string;
    userId: string;
    timestamp: number;
}) => void;
