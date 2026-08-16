import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { evaluateExperiment } from './engine';
import { Experiment, ExposureCallback, UserContext } from './Splitkit.types';
import SplitKitModule from './SplitkitModule';


interface SplitKitTestingContextValue {
    user: UserContext;
    experiments: Record<string, Experiment>;
    logExposure: (experimentKey: string, variant: string) => void;
    deviceId: string;

}

const SplitKitTestingContext = createContext<SplitKitTestingContextValue | null>(null);

export interface SplitKitTestingProviderProps {
    user: UserContext;
    experiments: Record<string, Experiment>;
    onExposure?: ExposureCallback;
    children: React.ReactNode;
}

/**
 * Returns the persistent device identifier (synchronous).
 */
export function getDeviceId(): string {
    return SplitKitModule.getDeviceId();
}

export const SplitKitTestingProvider: React.FC<SplitKitTestingProviderProps> = ({
    user,
    experiments,
    onExposure,
    children,
}) => {
    const exposedSetRef = useRef<Set<string>>(new Set());
    const deviceId = useMemo(() => getDeviceId(), []);

    const activeUser: UserContext = useMemo(() => ({
        id: user?.id || deviceId,
        attributes: user?.attributes || {},
      }), [user?.id, user?.attributes, deviceId]);

    // Keyed on activeUser.id, the same identity bucketing uses, so an exposure
    // event can always be joined back to the assignment that produced it.
    // Using the raw `user.id` here would log `undefined` for anonymous users
    // while they were actually bucketed by device ID.
    const logExposure = useCallback((experimentKey: string, variant: string) => {
        const dedupeKey = `${activeUser.id}:${experimentKey}:${variant}`;
        if (!exposedSetRef.current.has(dedupeKey)) {
            exposedSetRef.current.add(dedupeKey);
            onExposure?.({
                experimentKey,
                variant,
                userId: activeUser.id,
                timestamp: Date.now(),
            });
        }
    }, [activeUser.id, onExposure]);

    const value = useMemo(
        () => ({ user: activeUser, experiments, logExposure, deviceId }),
        [activeUser, experiments, logExposure, deviceId]
    );

    return (
        <SplitKitTestingContext.Provider value={value}>
            {children}
        </SplitKitTestingContext.Provider>
    );
};

export function useExperiment<T = any>(
    experimentKey: string,
    fallbackVariant: string = 'control'
): { variant: string, deviceId: string; payload?: T } {
    // Every hook below runs unconditionally, including when there is no
    // provider above. Returning early on a missing context would change the
    // hook count between renders and break the Rules of Hooks.
    const context = useContext(SplitKitTestingContext);
    const config = context?.experiments[experimentKey];
    const user = context?.user;
    const logExposure = context?.logExposure;

    const result = useMemo((): { variant: string; payload?: T } => {
        if (!config || !user) return { variant: fallbackVariant };
        return evaluateExperiment<T>(config, user);
    }, [config, user, fallbackVariant]);

    useEffect(() => {
        if (config && logExposure) {
            logExposure(experimentKey, result.variant);
        }
    }, [experimentKey, result.variant, config, logExposure]);

    return { ...result, deviceId: context?.deviceId ?? '' };
}
