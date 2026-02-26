
// Helper para sons do sistema usando Web Audio API
// Evita problemas com arquivos de áudio corrompidos ou Base64 inválidos

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

export const unlockAudioContext = async () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
};

export const playNotificationSound = async (type: 'kitchen' | 'waiter' = 'waiter') => {
    try {
        const ctx = getAudioContext();
        
        // Garante que o contexto está ativo
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (type === 'kitchen') {
            // Som de Cozinha: "Ding Dong" (Dois tons)
            // Primeiro tom (Ding)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, ctx.currentTime); // Mi 5
            
            // Segundo tom (Dong)
            oscillator.frequency.setValueAtTime(550, ctx.currentTime + 0.2); // Dó# 5

            // Envelope de volume
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 1.5);

        } else {
            // Som de Garçom: "Glass Ping" (Agudo e curto)
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
            
            // Envelope de volume (Ataque rápido, decay suave)
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 1.0);
        }

        return true;
    } catch (e) {
        console.error("Erro ao tocar som:", e);
        return false;
    }
};
