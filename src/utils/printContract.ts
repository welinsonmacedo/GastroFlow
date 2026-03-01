
import { User, BusinessInfo } from '../types';

export const printContract = (templateContent: string, user: User, company: BusinessInfo, roleName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDate = (date?: Date | string) => {
        if (!date) return '__________';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const formatCurrency = (val?: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    let content = templateContent;

    // Remove HTML tags inside the curly braces to prevent rich text formatting from breaking the variables
    content = content.replace(/\{\{([^}]+)\}\}/g, (match) => match.replace(/<[^>]+>/g, ''));

    const addressString = company.address?.street ? `${company.address.street}, ${company.address.number || 'S/N'}` : '';

    // Replace variables
    content = content.replace(/\{\{\s*empresa_nome\s*\}\}/g, company.restaurantName || '____________________');
    content = content.replace(/\{\{\s*empresa_cnpj\s*\}\}/g, company.cnpj || '____________________');
    content = content.replace(/\{\{\s*empresa_endereco\s*\}\}/g, addressString || '____________________');
    content = content.replace(/\{\{\s*empresa_cidade\s*\}\}/g, company.address?.city || '____________________');
    content = content.replace(/\{\{\s*empresa_estado\s*\}\}/g, company.address?.state || '____________________');
    content = content.replace(/\{\{\s*empresa_telefone\s*\}\}/g, company.phone || '____________________');
    content = content.replace(/\{\{\s*empresa_email\s*\}\}/g, company.email || '____________________');

    content = content.replace(/\{\{\s*nome\s*\}\}/g, user.name || '____________________');
    content = content.replace(/\{\{\s*cpf\s*\}\}/g, user.documentCpf || '____________________');
    content = content.replace(/\{\{\s*rg\s*\}\}/g, user.rgNumber ? `${user.rgNumber} ${user.rgIssuer}/${user.rgState}` : '____________________');
    content = content.replace(/\{\{\s*endereco\s*\}\}/g, user.addressStreet ? `${user.addressStreet}, ${user.addressNumber} ${user.addressComplement || ''} - ${user.addressNeighborhood}` : '____________________');
    content = content.replace(/\{\{\s*cidade_uf\s*\}\}/g, user.addressCity ? `${user.addressCity}/${user.addressState}` : '____________________');
    content = content.replace(/\{\{\s*nacionalidade\s*\}\}/g, 'Brasileiro(a)'); // Default for now
    content = content.replace(/\{\{\s*estado_civil\s*\}\}/g, user.maritalStatus || '____________________');
    content = content.replace(/\{\{\s*cargo\s*\}\}/g, roleName || '____________________');
    content = content.replace(/\{\{\s*setor\s*\}\}/g, user.department || '____________________');
    content = content.replace(/\{\{\s*salario\s*\}\}/g, formatCurrency(user.baseSalary));
    content = content.replace(/\{\{\s*data_admissao\s*\}\}/g, formatDate(user.hireDate));
    content = content.replace(/\{\{\s*jornada\s*\}\}/g, user.workModel || '____________________');
    content = content.replace(/\{\{\s*ctps\s*\}\}/g, user.ctpsNumber ? `${user.ctpsNumber} Série ${user.ctpsSeries}/${user.ctpsState}` : '____________________');
    content = content.replace(/\{\{\s*pis\s*\}\}/g, user.pisPasep || '____________________');

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Contrato de Trabalho - ${user.name}</title>
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
