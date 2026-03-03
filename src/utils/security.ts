
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';

// --- DATA SANITIZATION ---
export const sanitizeInput = (input: string): string => {
    if (!input) return '';
    // Usa DOMPurify para limpar HTML malicioso (XSS)
    return DOMPurify.sanitize(input).trim();
};

export const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') return sanitizeInput(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            newObj[key] = sanitizeObject(obj[key]);
        }
        return newObj;
    }
    return obj;
};

// --- SECURITY LOGGER ---
interface SecurityIncidentParams {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
    details: string;
    tenantId?: string;
    userId?: string;
}

export const logSecurityIncident = async (params: SecurityIncidentParams) => {
    try {
        const { error } = await supabase.from('security_incidents').insert({
            type: params.type,
            severity: params.severity,
            details: params.details,
            tenant_id: params.tenantId || null,
            user_id: params.userId || null,
            user_agent: navigator.userAgent
        });

        if (error) console.error("Falha ao registrar incidente de segurança localmente", error);
    } catch (e) {
        // Silencioso para não alertar o atacante
        console.error("Erro interno segurança", e);
    }
};
