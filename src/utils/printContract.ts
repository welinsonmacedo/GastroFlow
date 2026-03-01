
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

    // Replace variables
    content = content.replace(/{{empresa_nome}}/g, company.restaurantName || '____________________');
    content = content.replace(/{{empresa_cnpj}}/g, company.cnpj || '____________________');
    content = content.replace(/{{empresa_endereco}}/g, `${company.address?.street || ''}, ${company.address?.number || ''}`);
    content = content.replace(/{{empresa_cidade}}/g, company.address?.city || '____________________');
    content = content.replace(/{{empresa_estado}}/g, company.address?.state || '____________________');
    content = content.replace(/{{empresa_telefone}}/g, company.phone || '____________________');
    content = content.replace(/{{empresa_email}}/g, company.email || '____________________');

    content = content.replace(/{{nome}}/g, user.name || '____________________');
    content = content.replace(/{{cpf}}/g, user.documentCpf || '____________________');
    content = content.replace(/{{rg}}/g, user.rgNumber ? `${user.rgNumber} ${user.rgIssuer}/${user.rgState}` : '____________________');
    content = content.replace(/{{endereco}}/g, user.addressStreet ? `${user.addressStreet}, ${user.addressNumber} ${user.addressComplement || ''} - ${user.addressNeighborhood}` : '____________________');
    content = content.replace(/{{cidade_uf}}/g, user.addressCity ? `${user.addressCity}/${user.addressState}` : '____________________');
    content = content.replace(/{{nacionalidade}}/g, 'Brasileiro(a)'); // Default for now
    content = content.replace(/{{estado_civil}}/g, user.maritalStatus || '____________________');
    content = content.replace(/{{cargo}}/g, roleName || '____________________');
    content = content.replace(/{{setor}}/g, user.department || '____________________');
    content = content.replace(/{{salario}}/g, formatCurrency(user.baseSalary));
    content = content.replace(/{{data_admissao}}/g, formatDate(user.hireDate));
    content = content.replace(/{{jornada}}/g, user.workModel || '____________________');
    content = content.replace(/{{ctps}}/g, user.ctpsNumber ? `${user.ctpsNumber} Série ${user.ctpsSeries}/${user.ctpsState}` : '____________________');
    content = content.replace(/{{pis}}/g, user.pisPasep || '____________________');

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
