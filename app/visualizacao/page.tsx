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
}

export default function Visualizacao() {
    const [dados, setDados] = useState<JogoDados>({ 
        posicao: 0, nivel: '1ano', tempoRestante: 0, status: 'parado', pontosA: 0, pontosB: 0 
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
            if (dados.posicao <= -100) finalizarRodada("EQUIPE 01");
            if (dados.posicao >= 100) finalizarRodada("EQUIPE 02");
        }
    }, [dados.posicao, dados.status]);

    const finalizarRodada = (vencedorDireto: string | null = null) => {
        let pA = 0, pB = 0;
        if (vencedorDireto === "EQUIPE 01" || dados.posicao <= -100) pA = 3;
        else if (vencedorDireto === "EQUIPE 02" || dados.posicao >= 100) pB = 3;
        else {
            if (dados.posicao === 0) { pA = 1; pB = 1; }
            else if (dados.posicao < 0) pA = 3;
            else pB = 3;
        }
        update(ref(db, 'partida'), { 
            status: 'finalizado', 
            pontosA: (dados.pontosA || 0) + pA, 
            pontosB: (dados.pontosB || 0) + pB 
        });
    };

    const iniciarJogo = (minutos: number) => {
        update(ref(db, 'partida'), { posicao: 0, tempoRestante: minutos * 60, status: 'jogando' });
    };

    const resetarTudo = (nivel = dados.nivel) => {
        set(ref(db, 'partida'), { posicao: 0, nivel, tempoRestante: 0, status: 'parado', pontosA: 0, pontosB: 0 });
    };

    const proximaRodada = () => {
        update(ref(db, 'partida'), { posicao: 0, tempoRestante: 0, status: 'parado' });
    };

    const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="h-screen bg-slate-900 flex flex-col items-center justify-between py-8 text-white font-sans overflow-hidden">
            {dados.status === 'finalizado' && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                    <h2 className="text-9xl font-black mb-12 text-yellow-500 uppercase tracking-tighter">Fim da Rodada!</h2>
                    <div className="flex gap-6">
                        <button onClick={proximaRodada} className="bg-blue-600 px-12 py-6 rounded-full font-bold text-3xl hover:scale-105 transition-transform">PRÓXIMA</button>
                        <button onClick={() => resetarTudo()} className="bg-slate-700 px-12 py-6 rounded-full font-bold text-3xl">ZERAR TUDO</button>
                    </div>
                </div>
            )}

            <div className="w-full px-20 flex justify-between items-center">
                <div className="text-center">
                    <p className="text-blue-500 text-2xl font-bold uppercase tracking-widest">Equipe 01</p>
                    <p className="text-blue-500 text-[10rem] font-black leading-none drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">{dados.pontosA}</p>
                </div>
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2 bg-slate-800 p-2 rounded-full border border-slate-700">
                        {['1ano', '5ano', '9ano', 'terceirao'].map(n => (
                            <button key={n} onClick={() => resetarTudo(n)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${dados.nivel === n ? 'bg-yellow-500 text-black' : 'text-slate-500 hover:text-white'}`}>{n.toUpperCase()}</button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {[2, 3, 5].map(m => <button key={m} onClick={() => iniciarJogo(m)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all">Começar {m}m</button>)}
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-red-500 text-2xl font-bold uppercase tracking-widest">Equipe 02</p>
                    <p className="text-red-500 text-[10rem] font-black leading-none drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">{dados.pontosB}</p>
                </div>
            </div>

            <div className="text-[14rem] font-mono font-black tabular-nums leading-none text-slate-200 drop-shadow-lg">{formatarTempo(dados.tempoRestante)}</div>

            <div className="w-full px-20 flex flex-col items-center mb-10">
                <div className="w-full h-32 bg-slate-800/50 rounded-3xl relative flex overflow-hidden border-4 border-slate-800 shadow-2xl">
                    <div className="flex-1 flex justify-end bg-slate-900/20">
                        <div className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[15px_0_35px_rgba(37,99,235,0.6)]" style={{ width: `${Math.abs(Math.min(dados.posicao, 0))}%` }} />
                    </div>
                    <div className="w-2 h-full bg-yellow-400 z-10 shadow-[0_0_25px_#facc15]" />
                    <div className="flex-1 flex justify-start bg-slate-900/20">
                        <div className="h-full bg-red-600 transition-all duration-500 ease-out shadow-[-15px_0_35px_rgba(220,38,38,0.6)]" style={{ width: `${Math.max(dados.posicao, 0)}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}