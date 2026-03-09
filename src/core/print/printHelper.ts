
/**
 * Utilitário para impressão em PWA (Mobile e Desktop)
 * Utiliza um iframe invisível para evitar bloqueios de pop-up e garantir formatação correta.
 */

export const printHtml = (htmlContent: string) => {
    // Remove iframes anteriores se houver (limpeza)
    const existingFrame = document.getElementById('print-iframe');
    if (existingFrame) {
        document.body.removeChild(existingFrame);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden'; // Esconde visualmente
    
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Aguarda carregamento de recursos (imagens/fontes)
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error("Erro ao tentar imprimir via iframe:", e);
            }
            
            // Remove o iframe após um tempo seguro (permitindo que o diálogo de impressão abra)
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 5000); // 5 segundos para garantir que o mobile processou
        }, 500);
    }
};

// Gera CSS base para impressoras térmicas (80mm e 58mm)
export const getReceiptStyles = () => `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
        body { 
            font-family: 'Roboto Mono', monospace; 
            margin: 0; 
            padding: 5px; 
            color: #000; 
            font-size: 12px;
            width: 80mm; /* Padrão Térmica */
        }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
        .title { font-size: 16px; font-weight: bold; display: block; margin-bottom: 5px; }
        .subtitle { font-size: 12px; display: block; }
        .item-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; font-size: 13px; }
        .item-row span:first-child { max-width: 70%; }
        .extras { font-size: 10px; margin-left: 10px; display: block; color: #333; }
        .note { font-weight: bold; background: #000; color: #fff; padding: 2px 4px; display: inline-block; margin-top: 2px; font-size: 11px; border-radius: 4px; }
        .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
        .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px; }
        
        @page {
            size: auto;   /* auto is the initial value */
            margin: 0mm;  /* this affects the margin in the printer settings */
        }
    </style>
`;

// Gera CSS base para relatórios A4
export const getReportStyles = () => `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #000; 
            font-size: 10px;
            width: 100%;
        }
        h1 { font-size: 18px; margin-bottom: 5px; text-transform: uppercase; }
        h2 { font-size: 14px; margin-bottom: 20px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { text-align: left; border-bottom: 2px solid #000; padding: 5px; font-weight: 900; text-transform: uppercase; }
        td { border-bottom: 1px solid #ddd; padding: 8px 5px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .total-row { font-size: 12px; font-weight: 900; background-color: #f0f0f0; }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
        }
    </style>
`;
