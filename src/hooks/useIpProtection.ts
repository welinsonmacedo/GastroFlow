
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useIpProtection = () => {
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ip, setIp] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        const checkIp = async () => {
            try {
                let clientIp = '';
                
                // List of services to try in order
                const services = [
                    { url: 'https://api.ipify.org?format=json', key: 'ip' },
                    { url: 'https://api.seeip.org/jsonip', key: 'ip' },
                    { url: 'https://api.db-ip.com/v2/free/self', key: 'ipAddress' }
                ];

                // Try services sequentially
                for (const service of services) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout per service
                        
                        const res = await fetch(service.url, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        
                        if (res.ok) {
                            const data = await res.json();
                            clientIp = data[service.key];
                            if (clientIp) break; // Success
                        }
                    } catch (e) {
                        // Silent fail, try next service
                    }
                }

                // Fail Open if all services fail
                if (!clientIp) {
                    console.warn("Unable to determine client IP. Security check skipped (Fail Open).");
                    return;
                }

                setIp(clientIp);

                // 2. Check if blocked in Supabase
                const { data: blockedData } = await supabase
                    .from('blocked_ips')
                    .select('reason')
                    .eq('ip', clientIp)
                    .single();

                if (blockedData) {
                    setIsBlocked(true);
                    setReason(blockedData.reason);
                }
            } catch (err) {
                console.error("Error checking IP protection:", err);
            } finally {
                setLoading(false);
            }
        };

        checkIp();
    }, []);

    return { isBlocked, loading, ip, reason };
};
