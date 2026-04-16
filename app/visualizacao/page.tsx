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
    modo: 'cabo' | 'corrida'; // Novo campo
    progressoEquipes?: { [key: string]: number }; // Para modo corrida
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

    // ... (Mantenha seu useEffect do cronômetro igual)
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

    // Lógica de Vencedor Adaptada
    useEffect(() => {
        if (dados.status === 'jogando') {
            if (dados.modo === 'cabo') {
                if (dados.posicao <= -100) finalizarRodada("EQUIPE 01");
                if (dados.posicao >= 100) finalizarRodada("EQUIPE 02");
            } else {
                // Lógica para Corrida (mais de 2 equipes)
                Object.entries(dados.progressoEquipes || {}).forEach(([id, prog]) => {
                    if (prog >= 100) finalizarRodada(`EQUIPE ${id}`);
                });
            }
        }
    }, [dados.posicao, dados.status, dados.progressoEquipes]);

    const finalizarRodada = (vencedor: string | null = null) => {
        update(ref(db, 'partida'), { status: 'finalizado' });
        // Aqui você pode expandir a lógica de pontos para corrida se quiser
    };

    const iniciarJogo = (minutos: number) => {
        const updates: any = { status: 'jogando', tempoRestante: minutos * 60, posicao: 0 };
        if (dados.modo === 'corrida') updates.progressoEquipes = {}; // Reseta progresso
        update(ref(db, 'partida'), updates);
    };

    const alternarModo = (novoModo: 'cabo' | 'corrida') => {
        update(ref(db, 'partida'), { modo: novoModo, status: 'parado', posicao: 0, progressoEquipes: {} });
    };

    const resetarTudo = (nivel = dados.nivel) => {
        set(ref(db, 'partida'), { 
            posicao: 0, nivel, tempoRestante: 0, status: 'parado', pontosA: 0, pontosB: 0, modo: dados.modo, progressoEquipes: {} 
        });
    };

    const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="h-screen bg-slate-900 flex flex-col items-center justify-between py-8 text-white font-sans overflow-hidden">
            
            {/* Controles de Modo no Topo */}
            <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => alternarModo('cabo')} className={`px-4 py-2 rounded-lg text-xs font-bold ${dados.modo === 'cabo' ? 'bg-blue-600' : 'bg-slate-800'}`}>MODO CABO (2 EQU.)</button>
                <button onClick={() => alternarModo('corrida')} className={`px-4 py-2 rounded-lg text-xs font-bold ${dados.modo === 'corrida' ? 'bg-purple-600' : 'bg-slate-800'}`}>MODO CORRIDA (3+ EQU.)</button>
            </div>

            {/* Cabeçalho de Pontos (Só aparece no modo Cabo) */}
            {dados.modo === 'cabo' && (
                <div className="w-full px-20 flex justify-between items-center">
                    <div className="text-center">
                        <p className="text-blue-500 text-2xl font-bold uppercase">Equipe 01</p>
                        <p className="text-blue-500 text-[8rem] font-black leading-none">{dados.pontosA}</p>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex gap-2 bg-slate-800 p-2 rounded-full border border-slate-700">
                            {['1ano', '5ano', '9ano', 'terceirao'].map(n => (
                                <button key={n} onClick={() => resetarTudo(n)} className={`px-4 py-2 rounded-full text-xs font-bold ${dados.nivel === n ? 'bg-yellow-500 text-black' : 'text-slate-500'}`}>{n.toUpperCase()}</button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {[2, 3, 5].map(m => <button key={m} onClick={() => iniciarJogo(m)} className="bg-emerald-600 px-4 py-2 rounded font-bold text-xs uppercase transition-all hover:scale-105">Começar {m}m</button>)}
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-red-500 text-2xl font-bold uppercase">Equipe 02</p>
                        <p className="text-red-500 text-[8rem] font-black leading-none">{dados.pontosB}</p>
                    </div>
                </div>
            )}

            {/* Se for modo Corrida, o cabeçalho é mais simples */}
            {dados.modo === 'corrida' && (
                 <div className="flex flex-col items-center gap-4">
                    <h2 className="text-4xl font-black text-purple-500 uppercase italic">Grande Corrida Matemática</h2>
                    <div className="flex gap-2">
                        {[2, 3, 5].map(m => <button key={m} onClick={() => iniciarJogo(m)} className="bg-emerald-600 px-6 py-2 rounded-full font-bold uppercase shadow-lg">Iniciar {m} min</button>)}
                    </div>
                 </div>
            )}

            <div className="text-[12rem] font-mono font-black tabular-nums leading-none text-slate-200 drop-shadow-lg">{formatarTempo(dados.tempoRestante)}</div>

            {/* ARENA DINÂMICA */}
            <div className="w-full px-20 mb-10">
                {dados.modo === 'cabo' ? (
                    /* Visual Cabo de Guerra (Seu código original) */
                    <div className="w-full h-32 bg-slate-800/50 rounded-3xl relative flex overflow-hidden border-4 border-slate-800 shadow-2xl">
                        <div className="flex-1 flex justify-end">
                            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.abs(Math.min(dados.posicao, 0))}%` }} />
                        </div>
                        <div className="w-2 h-full bg-yellow-400 z-10 shadow-[0_0_25px_#facc15]" />
                        <div className="flex-1 flex justify-start">
                            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${Math.max(dados.posicao, 0)}%` }} />
                        </div>
                    </div>
                ) : (
                    /* Visual Modo Corrida (Barras Horizontais para várias equipes) */
                    <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto p-4">
                        {Object.entries(dados.progressoEquipes || {}).map(([id, prog]) => (
                            <div key={id} className="flex items-center gap-4">
                                <span className="font-bold w-24">EQUIPE {id}</span>
                                <div className="flex-1 h-12 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-300" 
                                        style={{ width: `${prog}%` }} 
                                    />
                                </div>
                                <span className="font-mono font-bold w-12">{prog}%</span>
                            </div>
                        ))}
                        {Object.keys(dados.progressoEquipes || {}).length === 0 && (
                            <p className="text-center text-slate-500 italic">Aguardando as equipes conectarem...</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}