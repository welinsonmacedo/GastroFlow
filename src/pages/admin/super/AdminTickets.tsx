import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Ticket } from '../../../types';
import { MessageCircle, Clock, CheckCircle, XCircle, Send, Search } from 'lucide-react';
import { Button } from '../../../components/Button';
import { useUI } from '../../../context/UIContext';

export const AdminTickets: React.FC = () => {
    const { showAlert } = useUI();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [replyText, setReplyText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTickets = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (statusFilter !== 'ALL') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            
            if (data && !error) {
                setTickets(data as Ticket[]);
            } else {
                const allTickets = JSON.parse(localStorage.getItem('flux_all_tickets') || '[]');
                if (statusFilter !== 'ALL') {
                    setTickets(allTickets.filter((t: any) => t.status === statusFilter));
                } else {
                    setTickets(allTickets);
                }
            }
        } catch (e) {
            console.warn("Tickets table might not exist:", e);
            const allTickets = JSON.parse(localStorage.getItem('flux_all_tickets') || '[]');
            if (statusFilter !== 'ALL') {
                setTickets(allTickets.filter((t: any) => t.status === statusFilter));
            } else {
                setTickets(allTickets);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTickets();
        
        const channel = supabase.channel('admin_tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
            .subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [statusFilter]);

    const handleReply = async () => {
        if (!selectedTicket || !replyText) return;

        const newMessage = {
            sender: 'SUPPORT' as const,
            text: replyText,
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...selectedTicket.messages, newMessage];

        // If ticket was OPEN, change to IN_PROGRESS automatically
        const newStatus = selectedTicket.status === 'OPEN' ? 'IN_PROGRESS' : selectedTicket.status;

        try {
            const { error } = await supabase
                .from('tickets')
                .update({ 
                    messages: updatedMessages, 
                    status: newStatus,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', selectedTicket.id);
            if (error) throw error;
        } catch (e) {
            console.warn("Falling back to localStorage for tickets:", e);
            const updatedTicket = { ...selectedTicket, messages: updatedMessages, status: newStatus, updated_at: new Date().toISOString() };
            
            const localTickets = JSON.parse(localStorage.getItem(`flux_tickets_${selectedTicket.tenant_id}`) || '[]');
            const updatedLocalTickets = localTickets.map((t: any) => t.id === selectedTicket.id ? updatedTicket : t);
            localStorage.setItem(`flux_tickets_${selectedTicket.tenant_id}`, JSON.stringify(updatedLocalTickets));
            
            const allTickets = JSON.parse(localStorage.getItem('flux_all_tickets') || '[]');
            const updatedAllTickets = allTickets.map((t: any) => t.id === selectedTicket.id ? updatedTicket : t);
            localStorage.setItem('flux_all_tickets', JSON.stringify(updatedAllTickets));
        }

        setReplyText('');
        setSelectedTicket({ ...selectedTicket, messages: updatedMessages, status: newStatus });
        fetchTickets();
    };

    const handleChangeStatus = async (newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
        if (!selectedTicket) return;

        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', selectedTicket.id);
            if (error) throw error;
        } catch (e) {
            console.warn("Falling back to localStorage for tickets:", e);
            const updatedTicket = { ...selectedTicket, status: newStatus, updated_at: new Date().toISOString() };
            
            const localTickets = JSON.parse(localStorage.getItem(`flux_tickets_${selectedTicket.tenant_id}`) || '[]');
            const updatedLocalTickets = localTickets.map((t: any) => t.id === selectedTicket.id ? updatedTicket : t);
            localStorage.setItem(`flux_tickets_${selectedTicket.tenant_id}`, JSON.stringify(updatedLocalTickets));
            
            const allTickets = JSON.parse(localStorage.getItem('flux_all_tickets') || '[]');
            const updatedAllTickets = allTickets.map((t: any) => t.id === selectedTicket.id ? updatedTicket : t);
            localStorage.setItem('flux_all_tickets', JSON.stringify(updatedAllTickets));
        }

        setSelectedTicket({ ...selectedTicket, status: newStatus });
        fetchTickets();
        showAlert({ title: 'Sucesso', message: 'Status atualizado.', type: 'SUCCESS' });
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

    const filteredTickets = tickets.filter(t => 
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.includes(searchTerm)
    );

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Chamados</h1>
                    <p className="text-slate-500 text-sm">Responda e gerencie solicitações de suporte.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar chamados..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 w-64"
                        />
                    </div>
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 bg-white"
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="OPEN">Abertos</option>
                        <option value="IN_PROGRESS">Em Andamento</option>
                        <option value="RESOLVED">Resolvidos</option>
                        <option value="CLOSED">Fechados</option>
                    </select>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Ticket List */}
                <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center text-slate-400">Carregando...</div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">Nenhum chamado encontrado.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredTickets.map(ticket => (
                                <div 
                                    key={ticket.id} 
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-500">{ticket.tenant_name}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(ticket.updated_at || ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className={`font-bold text-sm mb-1 truncate ${selectedTicket?.id === ticket.id ? 'text-indigo-900' : 'text-slate-800'}`}>{ticket.subject}</h4>
                                    <div className="flex justify-between items-center mt-2">
                                        {getStatusBadge(ticket.status)}
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{ticket.id.split('-')[0]}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ticket Detail */}
                <div className="flex-1 bg-slate-50 flex flex-col">
                    {selectedTicket ? (
                        <>
                            <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 mb-1">{selectedTicket.subject}</h2>
                                        <p className="text-sm text-slate-500">
                                            Cliente: <span className="font-bold text-slate-700">{selectedTicket.tenant_name}</span> • ID: {selectedTicket.id}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <select 
                                            value={selectedTicket.status}
                                            onChange={(e) => handleChangeStatus(e.target.value as any)}
                                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white"
                                        >
                                            <option value="OPEN">ABERTO</option>
                                            <option value="IN_PROGRESS">EM ANDAMENTO</option>
                                            <option value="RESOLVED">RESOLVIDO</option>
                                            <option value="CLOSED">FECHADO</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600">
                                    <span className="font-bold text-slate-700 block mb-1">Descrição Inicial:</span>
                                    {selectedTicket.description}
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                                {selectedTicket.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex flex-col ${msg.sender === 'SUPPORT' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${msg.sender === 'SUPPORT' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-slate-700 rounded-tl-sm'}`}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                                            {msg.sender === 'SUPPORT' ? 'Suporte (Você)' : selectedTicket.tenant_name} • {new Date(msg.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-white border-t border-slate-200">
                                <div className="flex gap-2 max-w-4xl mx-auto">
                                    <textarea 
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Escreva uma resposta..." 
                                        className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 resize-none h-14"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReply();
                                            }
                                        }}
                                    />
                                    <Button onClick={handleReply} disabled={!replyText} className="px-6 h-14">
                                        <Send size={20} />
                                    </Button>
                                </div>
                                <p className="text-center text-[10px] text-slate-400 mt-2">Pressione Enter para enviar</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <MessageCircle size={64} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Selecione um chamado para visualizar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
