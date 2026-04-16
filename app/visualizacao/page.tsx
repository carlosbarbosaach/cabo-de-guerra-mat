'use client';
import { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';

interface JogoDados {
    posicao: number;
    nivel: string;
    tempoRestante: number;
    status: 'parado' | 'jogando' | 'finalizado';
    pontosA: number;
    pontosB: number;
    modo: 'cabo' | 'corrida';
    progressoEquipes?: { [key: string]: number };
}

export default function Visualizacao() {
    const [dados, setDados] = useState<JogoDados>({ 
        posicao: 0, nivel: '1ano', tempoRestante: 0, status: 'parado', pontosA: 0, pontosB: 0, modo: 'cabo' 
    });
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return onValue(ref(db, 'partida'), (snap) => {
            if (snap.exists()) setDados(prev => ({ ...prev, ...snap.val() }));
        });
    }, []);

    useEffect(() => {
        if (dados.status === 'jogando' && dados.tempoRestante > 0) {
            timerInterval.current = setInterval(() => {
                const novoTempo = dados.tempoRestante - 1;
                update(ref(db, 'partida'), { tempoRestante: novoTempo });
                if (novoTempo <= 0) finalizarRodada();
            }, 1000);
        } else if (timerInterval.current) {
            clearInterval(timerInterval.current);
        }
        return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
    }, [dados.status, dados.tempoRestante]);

    useEffect(() => {
        if (dados.status === 'jogando') {
            if (dados.modo === 'cabo') {
                if (dados.posicao <= -100) finalizarRodada("EQUIPE 01");
                if (dados.posicao >= 100) finalizarRodada("EQUIPE 02");
            } else {
                Object.entries(dados.progressoEquipes || {}).forEach(([id, prog]) => {
                    if (prog >= 100) finalizarRodada(`EQUIPE ${id}`);
                });
            }
        }
    }, [dados.posicao, dados.status, dados.progressoEquipes]);

    const finalizarRodada = (vencedor: string | null = null) => {
        let pA = 0, pB = 0;
        if (vencedor === "EQUIPE 01" || (dados.modo === 'cabo' && dados.posicao < 0)) pA = 3;
        else if (vencedor === "EQUIPE 02" || (dados.modo === 'cabo' && dados.posicao > 0)) pB = 3;
        
        update(ref(db, 'partida'), { 
            status: 'finalizado',
            pontosA: (dados.pontosA || 0) + pA,
            pontosB: (dados.pontosB || 0) + pB
        });
    };

    const iniciarJogo = (minutos: number) => {
        update(ref(db, 'partida'), { status: 'jogando', tempoRestante: minutos * 60, posicao: 0, progressoEquipes: {} });
    };

    const alternarModo = (novoModo: 'cabo' | 'corrida') => {
        update(ref(db, 'partida'), { modo: novoModo, status: 'parado', posicao: 0, progressoEquipes: {} });
    };

    const resetarTudo = (nivel = dados.nivel) => {
        set(ref(db, 'partida'), { posicao: 0, nivel, tempoRestante: 0, status: 'parado', pontosA: 0, pontosB: 0, modo: dados.modo, progressoEquipes: {} });
    };

    const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-between py-6 text-white font-sans overflow-hidden bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
            
            {/* OVERLAY DE FIM DE JOGO */}
            {dados.status === 'finalizado' && (
                <div className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <h2 className="text-8xl font-black mb-10 text-yellow-500 uppercase italic tracking-tighter">Fim da Rodada!</h2>
                    <div className="flex gap-4">
                        <button onClick={() => update(ref(db, 'partida'), {status: 'parado', posicao: 0})} className="bg-blue-600 px-12 py-5 rounded-full font-bold text-3xl hover:scale-105 transition-all shadow-xl">PRÓXIMA DISPUTA</button>
                        <button onClick={() => resetarTudo()} className="bg-slate-800 px-12 py-5 rounded-full font-bold text-3xl shadow-xl">ZERAR TUDO</button>
                    </div>
                </div>
            )}

            {/* PLACAR E CONTROLES CENTRAIS */}
            <div className="w-full px-16 grid grid-cols-3 items-center">
                
                {/* Lado Equipe 01 */}
                <div className="flex flex-col items-start pointer-events-none select-none">
                    <span className="text-blue-500 font-black text-2xl tracking-[0.3em] uppercase opacity-70 mb-[-10px] ml-2">Equipe 01</span>
                    <div className="text-[11rem] font-black leading-none text-blue-500 drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]">{dados.pontosA}</div>
                </div>

                {/* Painel Central Único (Nível + Tempo + MODO) */}
                <div className="flex flex-col items-center gap-4 z-20">
                    <div className="bg-white/5 backdrop-blur-md p-5 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 shadow-2xl w-full max-w-sm">
                        {/* Níveis */}
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {['1ano', '5ano', '9ano', 'terceirao'].map(n => (
                                <button key={n} onClick={() => resetarTudo(n)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${dados.nivel === n ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}>{n.toUpperCase()}</button>
                            ))}
                        </div>
                        
                        {/* Tempos */}
                        <div className="flex gap-2">
                            {[2, 3, 5].map(m => (
                                <button key={m} onClick={() => iniciarJogo(m)} className="bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-400 hover:text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all">Iniciar {m}m</button>
                            ))}
                        </div>

                        {/* SELETOR DE MODO CENTRALIZADO AQUI EMBAIXO */}
                        <div className="w-full h-[1px] bg-white/10 my-1"></div>
                        <div className="flex gap-2 w-full">
                            <button 
                                onClick={() => alternarModo('cabo')} 
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${dados.modo === 'cabo' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-black/20 border-white/5 text-slate-500'}`}
                            >
                                Cabo de Guerra
                            </button>
                            <button 
                                onClick={() => alternarModo('corrida')} 
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${dados.modo === 'corrida' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/20 border-white/5 text-slate-500'}`}
                            >
                                Corrida (3+)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lado Equipe 02 */}
                <div className="flex flex-col items-end pointer-events-none select-none text-right">
                    <span className="text-red-500 font-black text-2xl tracking-[0.3em] uppercase opacity-70 mb-[-10px] mr-2">Equipe 02</span>
                    <div className="text-[11rem] font-black leading-none text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]">{dados.pontosB}</div>
                </div>
            </div>

            {/* CRONÔMETRO CENTRAL */}
            <div className="flex flex-col items-center -mt-4 pointer-events-none select-none">
                <div className="text-[15rem] font-mono font-black tabular-nums leading-none tracking-tighter text-white drop-shadow-2xl">
                    {formatarTempo(dados.tempoRestante)}
                </div>
            </div>

            {/* ARENA DINÂMICA */}
            <div className="w-full px-20 mb-10 z-10">
                {dados.modo === 'cabo' ? (
                    <div className="w-full h-36 bg-slate-950/60 rounded-[2.5rem] relative flex overflow-hidden border-4 border-slate-800 shadow-2xl backdrop-blur-sm">
                        <div className="flex-1 flex justify-end">
                            <div className="h-full bg-gradient-to-r from-blue-700 to-blue-500 transition-all duration-500 ease-out" style={{ width: `${Math.abs(Math.min(dados.posicao, 0))}%` }} />
                        </div>
                        <div className="w-4 h-full bg-yellow-400 z-10 shadow-[0_0_40px_#facc15] relative">
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full border-x-[20px] border-x-transparent border-t-[30px] border-t-yellow-400"></div>
                        </div>
                        <div className="flex-1 flex justify-start">
                            <div className="h-full bg-gradient-to-l from-red-700 to-red-500 transition-all duration-500 ease-out" style={{ width: `${Math.max(dados.posicao, 0)}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-[35vh] overflow-y-auto p-6 bg-black/30 rounded-[2rem] border border-white/5 custom-scrollbar">
                        {Object.entries(dados.progressoEquipes || {}).map(([id, prog]) => (
                            <div key={id} className="flex items-center gap-8">
                                <span className="font-black text-xl w-32 italic text-slate-200 tracking-tighter uppercase">Equipe {id}</span>
                                <div className="flex-1 h-10 bg-slate-900 rounded-full overflow-hidden border-2 border-slate-800 relative shadow-lg">
                                    <div className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 transition-all duration-300" style={{ width: `${prog}%` }} />
                                </div>
                                <span className="font-mono font-black text-2xl w-24 text-purple-400 text-right">{prog}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pb-4 text-slate-600 font-black uppercase tracking-[1.5em] text-[10px] opacity-30">
                Colégio do Campeche • Arena de Matemática
            </div>
        </div>
    );
}