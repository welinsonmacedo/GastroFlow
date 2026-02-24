import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRestaurant } from '../context/RestaurantContext';
import { Ticket } from '../types';
import { Plus, MessageCircle, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { useUI } from '../context/UIContext';

export const TicketsClient: React.FC = () => {
    const { state } = useRestaurant();
    const { showAlert } = useUI();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyText, setReplyText] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('tenant_id', state.tenantId)
                .order('created_at', { ascending: false });
            
            if (data && !error) {
                setTickets(data as Ticket[]);
            } else {
                const localTickets = localStorage.getItem(`flux_tickets_${state.tenantId}`);
                if (localTickets) setTickets(JSON.parse(localTickets));
            }
        } catch (e) {
            console.warn("Tickets table might not exist:", e);
            const localTickets = localStorage.getItem(`flux_tickets_${state.tenantId}`);
            if (localTickets) setTickets(JSON.parse(localTickets));
        }
        setLoading(false);
    };

    useEffect(() => {
        if (state.tenantId) {
            fetchTickets();
            
            const channel = supabase.channel(`tickets_client:${state.tenantId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `tenant_id=eq.${state.tenantId}` }, fetchTickets)
                .subscribe();
                
            return () => { supabase.removeChannel(channel); };
        }
    }, [state.tenantId]);

    const handleCreateTicket = async () => {
        if (!newSubject || !newDescription) {
            showAlert({ title: 'Atenção', message: 'Preencha o assunto e a descrição.', type: 'WARNING' });
            return;
        }

        const newTicket = {
            tenant_id: state.tenantId,
            tenant_name: state.theme.restaurantName || 'Restaurante',
            subject: newSubject,
            description: newDescription,
            status: 'OPEN',
            messages: [{
                sender: 'CLIENT' as const,
                text: newDescription,
                timestamp: new Date().toISOString()
            }]
        };

        try {
            const { data, error } = await supabase.from('tickets').insert(newTicket).select().single();
            if (error) throw error;

            if (data) {
                const newTicketWithId = { ...data, tenant_name: newTicket.tenant_name } as Ticket;
                setTickets(prev => [newTicketWithId, ...prev]);
            }

        } catch (e) {
            console.warn("Falling back to localStorage for tickets:", e);
            const localTicket = {
                ...newTicket,
                id: Math.random().toString(36).substring(2),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            const localTickets = [...tickets, localTicket];
            localStorage.setItem(`flux_tickets_${state.tenantId}`, JSON.stringify(localTickets));
            // Also save to a global list for the super admin
            const allTickets = JSON.parse(localStorage.getItem('flux_all_tickets') || '[]');
            localStorage.setItem('flux_all_tickets', JSON.stringify([...allTickets, localTicket]));
        }

        showAlert({ title: 'Sucesso', message: 'Chamado criado com sucesso.', type: 'SUCCESS' });
        setIsNewTicketModalOpen(false);
        setNewSubject('');
        setNewDescription('');
        // fetchTickets(); No longer needed, we update the state optimistically
    };

    const handleReply = async () => {
        if (!selectedTicket || !replyText) return;

        const newMessage = {
            sender: 'CLIENT' as const,
            text: replyText,
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...selectedTicket.messages, newMessage];

        try {
            const { error } = await supabase
                .from('tickets')
                .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
                .eq('id', selectedTicket.id);
            if (error) throw error;
        } catch (e) {
            console.warn("Falling back to localStorage for tickets:", e);
            const updatedTicket = { ...selectedTicket, messages: updatedMessages, updated_at: new Date().toISOString() };
            const localTickets = tickets.map(t => t.id === selectedTicket.id ? updatedTicket : t);
            localStorage.setItem(`flux_tickets_${state.tenantId}`, JSON.stringify(localTickets));
            
            const allTickets = JSON.parse(localStorage.getItem('flux_all_tickets') || '[]');
            const updatedAllTickets = allTickets.map((t: any) => t.id === selectedTicket.id ? updatedTicket : t);
            localStorage.setItem('flux_all_tickets', JSON.stringify(updatedAllTickets));
        }

        setReplyText('');
        setSelectedTicket({ ...selectedTicket, messages: updatedMessages });
        fetchTickets();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OPEN': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={12}/> Aberto</span>;
            case 'IN_PROGRESS': return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock size={12}/> Em Andamento</span>;
            case 'RESOLVED': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={12}/> Resolvido</span>;
            case 'CLOSED': return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><XCircle size={12}/> Fechado</span>;
            default: return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-10">
            <header className="mb-8 border-b pb-6 flex justify-between items-end">
                <div>
                    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4">
                        <MessageCircle size={14} /> Suporte Técnico
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Meus Chamados</h1>
                    <p className="text-lg text-slate-500">Acompanhe suas solicitações de suporte.</p>
                </div>
                <Button onClick={() => setIsNewTicketModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={18} /> Novo Chamado
                </Button>
            </header>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Carregando chamados...</div>
            ) : tickets.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center shadow-sm">
                    <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum chamado aberto</h3>
                    <p className="text-slate-500 mb-6">Você ainda não abriu nenhuma solicitação de suporte.</p>
                    <Button onClick={() => setIsNewTicketModalOpen(true)} variant="outline">Abrir meu primeiro chamado</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                        {tickets.map(ticket => (
                            <div 
                                key={ticket.id} 
                                onClick={() => setSelectedTicket(ticket)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200 hover:border-indigo-100'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-400">#{ticket.id.split('-')[0]}</span>
                                    {getStatusBadge(ticket.status)}
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{ticket.subject}</h4>
                                <p className="text-xs text-slate-500 truncate">{ticket.description}</p>
                                <div className="mt-3 text-[10px] text-slate-400 font-mono">
                                    Atualizado: {new Date(ticket.updated_at || ticket.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="md:col-span-2">
                        {selectedTicket ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
                                <div className="p-5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-slate-800">{selectedTicket.subject}</h3>
                                        {getStatusBadge(selectedTicket.status)}
                                    </div>
                                    <p className="text-sm text-slate-500">Aberto em {new Date(selectedTicket.created_at).toLocaleString()}</p>
                                </div>
                                
                                <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50">
                                    {selectedTicket.messages.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col ${msg.sender === 'CLIENT' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'CLIENT' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                {msg.sender === 'CLIENT' ? 'Você' : 'Suporte'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' && (
                                    <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl flex gap-2">
                                        <input 
                                            type="text" 
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Digite sua mensagem..." 
                                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-500"
                                            onKeyDown={e => e.key === 'Enter' && handleReply()}
                                        />
                                        <Button onClick={handleReply} disabled={!replyText} className="px-4">
                                            <Send size={18} />
                                        </Button>
                                    </div>
                                )}
                                {(selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED') && (
                                    <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-center text-sm text-gray-500 font-medium">
                                        Este chamado foi encerrado.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl border border-gray-200 border-dashed h-[600px] flex items-center justify-center text-gray-400">
                                Selecione um chamado para ver os detalhes
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isNewTicketModalOpen} onClose={() => setIsNewTicketModalOpen(false)} title="Abrir Novo Chamado" variant="dialog">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Assunto</label>
                        <input 
                            type="text" 
                            value={newSubject}
                            onChange={e => setNewSubject(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-indigo-500"
                            placeholder="Ex: Problema com a impressora"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Descrição</label>
                        <textarea 
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 resize-none h-32"
                            placeholder="Descreva o problema com o máximo de detalhes possível..."
                        />
                    </div>
                    <Button onClick={handleCreateTicket} className="w-full py-3">Enviar Chamado</Button>
                </div>
            </Modal>
        </div>
    );
};
