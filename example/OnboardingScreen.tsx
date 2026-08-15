import { View, Text, TouchableOpacity,StyleSheet } from 'react-native'
import React from 'react'
import { useExperiment } from 'splitkit';

const OnboardingScreen = () => {
    const { variant, payload, deviceId } = useExperiment('onboarding_v2');

    return (
        <View style={styles.card}>
            <Text style={styles.label}>Device ID (Bucket Key):</Text>
            <Text style={styles.monoText}>{deviceId}</Text>

            <Text style={styles.label}>Assigned Variant:</Text>
            <Text style={styles.variantText}>{variant}</Text>

            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>{payload?.title}</Text>
            </TouchableOpacity>
        </View>

    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1, justifyContent: 'center', padding: 20,
        backgroundColor: '#F1F5F9'
    },
    card: {
        backgroundColor: '#FFF', padding: 24, borderRadius: 16,
        elevation: 3
    },
    label: { fontSize: 13, color: '#64748B', marginTop: 12 },
    monoText: {
        fontSize: 13, fontFamily: 'monospace', color: '#0F172A',
        fontWeight: 'bold'
    },
    variantText: {
        fontSize: 20, fontWeight: '700', color: '#2563EB',
        marginBottom: 16
    },
    button: {
        backgroundColor: '#2563EB', padding: 14, borderRadius: 10,
        alignItems: 'center'
    },
    buttonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});

export default OnboardingScreen