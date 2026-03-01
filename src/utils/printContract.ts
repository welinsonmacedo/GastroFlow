
import { User, RestaurantBusinessInfo } from '../types';

export const replaceContractVariables = (templateContent: string, user: User, company: RestaurantBusinessInfo, roleName: string, shiftName: string = '', extraVariables: Record<string, string> = {}): string => {
    const formatDate = (date?: Date | string) => {
        if (!date) return '__________';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const formatCurrency = (val?: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const getWorkModel = (model?: string) => {
        switch(model) {
            case '44H_WEEKLY': return '44 horas semanais';
            case '12X36': return '12x36';
            case 'PART_TIME': return 'Tempo Parcial';
            case 'INTERMITTENT': return 'Intermitente';
            case 'ROTATING': return 'Revezamento';
            default: return '____________________';
        }
    };

    const formatRg = () => {
        if (!user.rgNumber) return '____________________';
        const issuer = user.rgIssuer ? ` ${user.rgIssuer}` : '';
        const state = user.rgState ? `/${user.rgState}` : '';
        return `${user.rgNumber}${issuer}${state}`.trim();
    };

    const formatCtps = () => {
        if (!user.ctpsNumber) return '____________________';
        const series = user.ctpsSeries ? ` Série ${user.ctpsSeries}` : '';
        const state = user.ctpsState ? `/${user.ctpsState}` : '';
        return `${user.ctpsNumber}${series}${state}`.trim();
    };

    let content = templateContent;

    // Remove HTML tags inside the curly braces to prevent rich text formatting from breaking the variables
    content = content.replace(/\{\{([^}]+)\}\}/g, (match) => match.replace(/<[^>]+>/g, ''));
    
    // Also remove invisible characters like zero-width spaces that Quill might insert
    content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');

    const addressString = company.address?.street ? `${company.address.street}, ${company.address.number || 'S/N'}` : '';

    // Replace variables (using \s* to handle spaces inside braces and i for case-insensitivity)
    content = content.replace(/\{\{\s*empresa_nome\s*\}\}/gi, company.restaurantName || '____________________');
    content = content.replace(/\{\{\s*empresa_cnpj\s*\}\}/gi, company.cnpj || '____________________');
    content = content.replace(/\{\{\s*empresa_endereco\s*\}\}/gi, addressString || '____________________');
    content = content.replace(/\{\{\s*empresa_endereço\s*\}\}/gi, addressString || '____________________');
    content = content.replace(/\{\{\s*empresa_cidade\s*\}\}/gi, company.address?.city || '____________________');
    content = content.replace(/\{\{\s*empresa_estado\s*\}\}/gi, company.address?.state || '____________________');
    content = content.replace(/\{\{\s*empresa_telefone\s*\}\}/gi, company.phone || '____________________');
    content = content.replace(/\{\{\s*empresa_email\s*\}\}/gi, company.email || '____________________');

    content = content.replace(/\{\{\s*nome\s*\}\}/gi, user.name || '____________________');
    content = content.replace(/\{\{\s*cpf\s*\}\}/gi, user.documentCpf || '____________________');
    content = content.replace(/\{\{\s*rg\s*\}\}/gi, formatRg());
    content = content.replace(/\{\{\s*endereco\s*\}\}/gi, user.addressStreet ? `${user.addressStreet}, ${user.addressNumber || 'S/N'} ${user.addressComplement || ''} - ${user.addressNeighborhood || ''}`.trim() : '____________________');
    content = content.replace(/\{\{\s*endereço\s*\}\}/gi, user.addressStreet ? `${user.addressStreet}, ${user.addressNumber || 'S/N'} ${user.addressComplement || ''} - ${user.addressNeighborhood || ''}`.trim() : '____________________');
    content = content.replace(/\{\{\s*cidade_uf\s*\}\}/gi, user.addressCity ? `${user.addressCity}/${user.addressState || ''}`.trim() : '____________________');
    content = content.replace(/\{\{\s*nacionalidade\s*\}\}/gi, 'Brasileiro(a)'); // Default for now
    content = content.replace(/\{\{\s*estado_civil\s*\}\}/gi, user.maritalStatus || '____________________');
    content = content.replace(/\{\{\s*cargo\s*\}\}/gi, roleName || '____________________');
    content = content.replace(/\{\{\s*setor\s*\}\}/gi, user.department || '____________________');
    content = content.replace(/\{\{\s*turno\s*\}\}/gi, shiftName || '____________________');
    content = content.replace(/\{\{\s*salario\s*\}\}/gi, formatCurrency(user.baseSalary));
    content = content.replace(/\{\{\s*data_admissao\s*\}\}/gi, formatDate(user.hireDate));
    content = content.replace(/\{\{\s*jornada\s*\}\}/gi, getWorkModel(user.workModel));
    content = content.replace(/\{\{\s*ctps\s*\}\}/gi, formatCtps());
    content = content.replace(/\{\{\s*pis\s*\}\}/gi, user.pisPasep || '____________________');

    // Replace extra variables
    Object.keys(extraVariables).forEach(key => {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        content = content.replace(regex, extraVariables[key]);
    });

    return content;
};

export const printContractHtml = (content: string, userName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Contrato de Trabalho - ${userName}</title>
            <style>
                @page { size: A4; margin: 20mm; }
                body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.5; text-align: justify; }
                h1 { font-size: 14pt; text-transform: uppercase; text-align: center; margin-bottom: 30px; }
                p { margin-bottom: 15px; }
                .signature-box { margin-top: 50px; display: flex; justify-content: space-between; }
                .signature-line { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 10pt; }
            </style>
        </head>
        <body>
            ${content}
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

export const printContract = (templateContent: string, user: User, company: RestaurantBusinessInfo, roleName: string, shiftName: string = '', extraVariables: Record<string, string> = {}) => {
    const content = replaceContractVariables(templateContent, user, company, roleName, shiftName, extraVariables);
    printContractHtml(content, user.name || 'Colaborador');
};
