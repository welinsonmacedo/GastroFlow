
import React, { useState } from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { Button } from '../Button';
import { Settings, ChevronDown, RotateCcw, Edit3, Printer, FileText } from 'lucide-react';

export const SaaSContractsView: React.FC = () => {
    const { state } = useSaaS();
    const [selectedContractTenantId, setSelectedContractTenantId] = useState('');
    const [isEditingContract, setIsEditingContract] = useState(false);

    const selectedContractTenant = state.tenants.find(t => t.id === selectedContractTenantId);
    const selectedContractPlan = selectedContractTenant ? state.plans.find(p => p.key === selectedContractTenant.plan) : null;

    return (
        <div className="flex flex-col h-full print:block">
            <div className="bg-white p-6 rounded-xl shadow-sm border mb-6 print:hidden">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Settings size={18} /> Configuração do Documento</h2>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Cliente</label>
                        <div className="relative">
                            <select 
                                className="w-full border p-3 rounded-lg appearance-none bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedContractTenantId}
                                onChange={(e) => {
                                    setSelectedContractTenantId(e.target.value);
                                    setIsEditingContract(false); 
                                }}
                            >
                                <option value="">-- Selecione um restaurante --</option>
                                {state.tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.ownerName})</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" size={16}/>
                        </div>
                    </div>
                    <Button 
                        onClick={() => setIsEditingContract(!isEditingContract)} 
                        variant={isEditingContract ? "secondary" : "outline"}
                        disabled={!selectedContractTenantId} 
                        className={`h-[46px] px-6 transition-all ${isEditingContract ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}`}
                    >
                        {isEditingContract ? <RotateCcw size={18} className="mr-2"/> : <Edit3 size={18} className="mr-2"/>} 
                        {isEditingContract ? 'Encerrar Edição' : 'Editar Texto'}
                    </Button>
                    <Button onClick={() => window.print()} disabled={!selectedContractTenantId} className="h-[46px] px-6">
                        <Printer size={18} className="mr-2"/> Imprimir Contrato
                    </Button>
                </div>
                {isEditingContract && <p className="text-xs text-blue-600 mt-2 font-bold animate-pulse">Modo de edição ativo. Clique no texto abaixo para alterar.</p>}
            </div>

            {selectedContractTenant ? (
                <div 
                    key={selectedContractTenantId} 
                    contentEditable={isEditingContract}
                    suppressContentEditableWarning={true}
                    className={`bg-white shadow-2xl p-[2cm] max-w-[21cm] min-h-[29.7cm] mx-auto text-justify text-sm leading-relaxed print:shadow-none print:w-full print:max-w-none print:mx-0 print:p-0 transition-all ${isEditingContract ? 'ring-4 ring-blue-200 outline-none cursor-text' : ''}`}
                >
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-bold uppercase mb-2">Contrato de Licenciamento de Software (SaaS)</h1>
                        <p className="text-xs text-gray-500 font-bold">Nº {selectedContractTenant.id.slice(0,8).toUpperCase()}/{new Date().getFullYear()}</p>
                    </div>

                    <div className="space-y-6">
                        <section>
                            <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">1. Identificação das Partes</h3>
                            <p className="mb-2">
                                <strong>CONTRATADA:</strong> <strong>FLUX EAT TECNOLOGIA LTDA</strong>, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em Uberlândia/MG, doravante denominada simplesmente "CONTRATADA".
                            </p>
                            <p>
                                <strong>CONTRATANTE:</strong> <strong>{selectedContractTenant.businessInfo?.restaurantName || selectedContractTenant.name.toUpperCase()}</strong>, 
                                {selectedContractTenant.businessInfo?.cnpj ? ` inscrita no CNPJ nº ${selectedContractTenant.businessInfo.cnpj},` : ''} 
                                representada neste ato por <strong>{selectedContractTenant.ownerName.toUpperCase()}</strong>,
                                {selectedContractTenant.businessInfo?.address ? ` localizada em ${selectedContractTenant.businessInfo.address.street}, ${selectedContractTenant.businessInfo.address.number} - ${selectedContractTenant.businessInfo.address.city}/${selectedContractTenant.businessInfo.address.state},` : ''}
                                com e-mail de contato <strong>{selectedContractTenant.email}</strong>.
                            </p>
                        </section>
                        
                        <section>
                           <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">2. Objeto</h3>
                           <p>
                               O presente contrato tem como objeto o licenciamento de uso do software <strong>Flux Eat</strong>, na modalidade SaaS (Software as a Service), para gestão de restaurante, incluindo módulos de cardápio digital, KDS e controle financeiro, conforme as especificações do plano contratado.
                           </p>
                        </section>

                        <section>
                           <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">3. Plano e Escopo de Uso</h3>
                           <p>
                               A CONTRATANTE opta pelo plano <strong>{selectedContractPlan?.name.toUpperCase() || selectedContractTenant.plan}</strong>.
                               A licença de uso inclui:
                           </p>
                           
                           <ul className="list-disc pl-5 my-3 text-xs space-y-1">
                               {selectedContractPlan?.features.map((feature, idx) => (
                                   <li key={idx}>{feature}</li>
                               ))}
                               {selectedContractPlan?.limits && (
                                   <>
                                       <li><strong>Capacidade de Mesas:</strong> {selectedContractPlan.limits.maxTables === -1 ? 'Ilimitada' : `${selectedContractPlan.limits.maxTables} mesas simultâneas`}</li>
                                       <li><strong>Contas de Staff (Usuários):</strong> {selectedContractPlan.limits.maxStaff === -1 ? 'Ilimitadas' : `Até ${selectedContractPlan.limits.maxStaff} usuários`}</li>
                                       
                                       <li><strong>Módulo KDS (Cozinha):</strong> {selectedContractPlan.limits.allowKds ? 'Incluso' : 'Não contratado'}</li>
                                       <li><strong>Frente de Caixa (PDV):</strong> {selectedContractPlan.limits.allowPos ? 'Incluso' : 'Não contratado'}</li>
                                       <li><strong>Delivery:</strong> {selectedContractPlan.limits.allowDelivery ? 'Incluso' : 'Não contratado'}</li>
                                       <li><strong>Controle de Estoque:</strong> {selectedContractPlan.limits.allowInventory ? 'Incluso' : 'Não contratado'}</li>
                                       <li><strong>Gestão Financeira:</strong> {selectedContractPlan.limits.allowExpenses ? 'Incluso' : 'Não contratado'}</li>
                                   </>
                               )}
                           </ul>

                           <p className="mt-2">
                               Pela licença de uso, a CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>{selectedContractPlan?.price || 'A DEFINIR'}</strong>.
                           </p>
                       </section>

                       <section>
                           <h3 className="font-bold uppercase mb-2 text-xs text-gray-900 border-b border-gray-300 pb-1">4. Vigência e Cancelamento</h3>
                           <p>
                               Este contrato entra em vigor na data de sua assinatura e vigorará por prazo indeterminado. Qualquer uma das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias.
                           </p>
                       </section>

                        <section className="mt-12 pt-12">
                            <p className="mb-12">
                                E, por estarem assim justas e contratadas, as partes assinam o presente instrumento.
                            </p>
                            <p className="text-right mb-16">
                                Uberlândia/MG, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                            </p>

                            <div className="flex justify-between gap-8 pt-8">
                                <div className="flex-1 border-t border-black text-center pt-2">
                                    <p className="font-bold text-xs uppercase">Flux Eat Tecnologia</p>
                                    <p className="text-[10px] text-gray-500">Contratada</p>
                                </div>
                                <div className="flex-1 border-t border-black text-center pt-2">
                                    <p className="font-bold text-xs uppercase">{selectedContractTenant.ownerName}</p>
                                    <p className="text-[10px] text-gray-500">Contratante</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 print:hidden">
                    <FileText size={48} className="mb-4 opacity-20"/>
                    <p>Selecione um cliente acima para gerar o contrato.</p>
                </div>
            )}
        </div>
    );
};
