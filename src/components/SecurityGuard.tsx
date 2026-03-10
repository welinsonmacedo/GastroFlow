
import React, { useEffect, useState } from 'react';
import { supabase } from '@/core/api/supabaseClient';
import { logSecurityIncident } from '@/core/security/security';

interface SecurityConfig {
    blockDevTools: boolean;
    blockRightClick: boolean;
    blockExtensions: boolean;
}

export const SecurityGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<SecurityConfig>({
        blockDevTools: false,
        blockRightClick: false,
        blockExtensions: false
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'security_config')
                    .single();
                
                if (data?.value) {
                    setConfig(data.value);
                }
            } catch (err) {
                console.error("SecurityGuard: Error fetching config", err);
            }
        };

        fetchConfig();

        // Listen for real-time updates from Admin panel
        const handleConfigChange = (event: any) => {
            if (event.detail) {
                setConfig(event.detail);
            }
        };

        window.addEventListener('securityConfigChanged', handleConfigChange);

        // Also listen via Supabase Realtime for other sessions
        const channel = supabase.channel('system_settings_changes')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'system_settings', filter: 'key=eq.security_config' }, 
                (payload: any) => {
                    if (payload.new && (payload.new as any).value) {
                        setConfig((payload.new as any).value);
                    }
                }
            )
            .subscribe();

        return () => {
            window.removeEventListener('securityConfigChanged', handleConfigChange);
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        // 1. Block Right Click
        const handleContextMenu = (e: MouseEvent) => {
            if (config.blockRightClick) {
                e.preventDefault();
                logSecurityIncident({
                    type: 'BLOCKED_RIGHT_CLICK',
                    severity: 'LOW',
                    details: 'Tentativa de uso do botão direito bloqueada.'
                });
            }
        };

        // 2. Block DevTools Shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!config.blockDevTools) return;

            const isF12 = e.key === 'F12';
            const isInspect = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i');
            const isViewSource = (e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u');
            const isConsole = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j');

            if (isF12 || isInspect || isViewSource || isConsole) {
                e.preventDefault();
                logSecurityIncident({
                    type: 'BLOCKED_DEVTOOLS_SHORTCUT',
                    severity: 'MEDIUM',
                    details: `Atalho de DevTools bloqueado: ${e.key}`
                });
            }
        };

        // 3. Detect DevTools Opening (Window Resize Trick)
        let threshold = 160;
        const detectDevTools = () => {
            if (!config.blockDevTools) return;
            
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;
            
            if (widthDiff || heightDiff) {
                // This is not foolproof but a common indicator
                // We don't block, but we can log or alert
                console.warn("DevTools detection triggered");
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', detectDevTools);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', detectDevTools);
        };
    }, [config]);

    return <>{children}</>;
};
