import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
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

    const logExposure = (experimentKey: string, variant: string) => {
        const dedupeKey = `${user.id}:${experimentKey}:${variant}`;
        if (!exposedSetRef.current.has(dedupeKey)) {
            exposedSetRef.current.add(dedupeKey);
            onExposure?.({
                experimentKey,
                variant,
                userId: user.id,
                timestamp: Date.now(),
            });
        }
    };

    return (
        <SplitKitTestingContext.Provider value={{ user:activeUser, experiments, logExposure,deviceId }}>
            {children}
        </SplitKitTestingContext.Provider>
    );
};

export function useExperiment<T = any>(
    experimentKey: string,
    fallbackVariant: string = 'control'
): { variant: string,deviceId:string; payload?: T } {
    const context = useContext(SplitKitTestingContext);
    if (!context) {
        return { variant: fallbackVariant,deviceId:"" };
    }

    const { user, experiments, logExposure,deviceId } = context;
    const config = experiments[experimentKey];

    const result = useMemo(() => {
        if (!config) return { variant: fallbackVariant };
        return evaluateExperiment<T>(config, user);
    }, [config, user]);

    useEffect(() => {
        if (config) {
            logExposure(experimentKey, result.variant);
        }
    }, [experimentKey, result.variant]);

    return  { ...result, deviceId };;
}
