
import { User } from '../types';

export const printStaffSheet = (user: User) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDate = (date?: Date | string) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const formatCurrency = (val?: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Ficha Cadastral - ${user.name}</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Arial', sans-serif; font-size: 12px; color: #333; line-height: 1.4; }
                h1 { font-size: 18px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 20px; }
                h2 { font-size: 14px; background-color: #f0f0f0; padding: 5px; margin-top: 20px; border-left: 4px solid #333; }
                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px; }
                .field { margin-bottom: 5px; }
                .label { font-weight: bold; display: block; font-size: 10px; color: #666; text-transform: uppercase; }
                .value { font-size: 12px; border-bottom: 1px solid #ddd; padding-bottom: 2px; min-height: 16px; }
                .full-width { grid-column: span 2; }
                .section { margin-bottom: 15px; }
                .footer { margin-top: 50px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 10px; }
                .signature-box { margin-top: 50px; display: flex; justify-content: space-between; }
                .signature-line { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; }
            </style>
        </head>
        <body>
            <h1>Ficha Cadastral do Colaborador</h1>

            <div class="section">
                <h2>Dados Pessoais</h2>
                <div class="grid">
                    <div class="field full-width">
                        <span class="label">Nome Completo</span>
                        <div class="value">${user.name}</div>
                    </div>
                    <div class="field">
                        <span class="label">CPF</span>
                        <div class="value">${user.documentCpf || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">RG</span>
                        <div class="value">${user.rgNumber || '-'} (${user.rgIssuer || '-'} / ${user.rgState || '-'})</div>
                    </div>
                    <div class="field">
                        <span class="label">Data de Nascimento</span>
                        <div class="value">${formatDate(user.birthDate)}</div>
                    </div>
                    <div class="field">
                        <span class="label">Estado Civil</span>
                        <div class="value">${user.maritalStatus || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Nome da Mãe</span>
                        <div class="value">${user.mothersName || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Nome do Pai</span>
                        <div class="value">${user.fathersName || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Escolaridade</span>
                        <div class="value">${user.educationLevel || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Título de Eleitor</span>
                        <div class="value">${user.voterRegistration || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Endereço e Contato</h2>
                <div class="grid">
                    <div class="field full-width">
                        <span class="label">Endereço Completo</span>
                        <div class="value">${user.addressStreet || '-'}, ${user.addressNumber || '-'} ${user.addressComplement ? '- ' + user.addressComplement : ''}</div>
                    </div>
                    <div class="field">
                        <span class="label">Bairro</span>
                        <div class="value">${user.addressNeighborhood || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">CEP</span>
                        <div class="value">${user.addressZip || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Cidade / UF</span>
                        <div class="value">${user.addressCity || '-'} / ${user.addressState || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Telefone / Celular</span>
                        <div class="value">${user.phone || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">E-mail</span>
                        <div class="value">${user.email || '-'}</div>
                    </div>
                    <div class="field full-width">
                        <span class="label">Contato de Emergência</span>
                        <div class="value">${user.emergencyContactName || '-'} (${user.emergencyContactPhone || '-'})</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Dados Contratuais</h2>
                <div class="grid">
                    <div class="field">
                        <span class="label">Cargo / Função</span>
                        <div class="value">${user.hrJobRoleId || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Departamento</span>
                        <div class="value">${user.department || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Data de Admissão</span>
                        <div class="value">${formatDate(user.hireDate)}</div>
                    </div>
                    <div class="field">
                        <span class="label">Tipo de Contrato</span>
                        <div class="value">${user.contractType || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Salário Base</span>
                        <div class="value">${formatCurrency(user.baseSalary)}</div>
                    </div>
                    <div class="field">
                        <span class="label">Jornada de Trabalho</span>
                        <div class="value">${user.workModel || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">CTPS / Série / UF</span>
                        <div class="value">${user.ctpsNumber || '-'} / ${user.ctpsSeries || '-'} / ${user.ctpsState || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">PIS/PASEP</span>
                        <div class="value">${user.pisPasep || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Dados Bancários</h2>
                <div class="grid">
                    <div class="field">
                        <span class="label">Banco</span>
                        <div class="value">${user.bankName || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Tipo de Conta</span>
                        <div class="value">${user.bankAccountType || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Agência</span>
                        <div class="value">${user.bankAgency || '-'}</div>
                    </div>
                    <div class="field">
                        <span class="label">Conta</span>
                        <div class="value">${user.bankAccount || '-'}</div>
                    </div>
                    <div class="field full-width">
                        <span class="label">Chave PIX</span>
                        <div class="value">${user.pixKey || '-'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Benefícios e Observações</h2>
                <div class="field full-width" style="margin-bottom: 10px;">
                    <span class="label">Plano de Saúde / Odontológico</span>
                    <div class="value">${user.healthPlanInfo || '-'}</div>
                </div>
                <div class="field full-width" style="margin-bottom: 10px;">
                    <span class="label">Vale Transporte / Alimentação</span>
                    <div class="value">${user.transportVoucherInfo || '-'}</div>
                </div>
                <div class="field full-width">
                    <span class="label">Observações SST (Saúde e Segurança)</span>
                    <div class="value" style="min-height: 40px;">${user.sstInfo || '-'}</div>
                </div>
            </div>

            <div class="signature-box">
                <div class="signature-line">
                    Assinatura do Colaborador
                </div>
                <div class="signature-line">
                    Assinatura do Empregador
                </div>
            </div>

            <div class="footer">
                Documento gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};
