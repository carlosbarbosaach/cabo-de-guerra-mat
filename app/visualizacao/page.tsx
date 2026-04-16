'use client';
import { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { ref, onValue, set, update, runTransaction } from 'firebase/database';

export default function Visualizacao() {
    const [dados, setDados] = useState({ 
        posicao: 0, 
        nivel: '1ano', 
        tempoRestante: 0, 
        status: 'parado',
        pontosA: 0,
        pontosB: 0 
    });
    const timerInterval = useRef(null);

    useEffect(() => {
        return onValue(ref(db, 'partida'), (snap) => {
            if (snap.exists()) {
                setDados(prev => ({ ...prev, ...snap.val() }));
            }
        });
    }, []);

    // Lógica do Cronômetro e Finalização Automática de Pontos
    useEffect(() => {
        if (dados.status === 'jogando' && dados.tempoRestante > 0) {
            timerInterval.current = setInterval(() => {
                const novoTempo = dados.tempoRestante - 1;
                update(ref(db, 'partida'), { tempoRestante: novoTempo });
                
                if (novoTempo <= 0) {
                    finalizarRodada();
                    clearInterval(timerInterval.current);
                }
            }, 1000);
        } else {
            clearInterval(timerInterval.current);
        }
        return () => clearInterval(timerInterval.current);
    }, [dados.status, dados.tempoRestante]);

    // Função para computar pontos quando alguém chega em 100% antes do tempo
    useEffect(() => {
        if (dados.status === 'jogando') {
            if (dados.posicao <= -100) finalizarRodada("EQUIPE 01");
            if (dados.posicao >= 100) finalizarRodada("EQUIPE 02");
        }
    }, [dados.posicao, dados.status]);

    const finalizarRodada = (vencedorDireto = null) => {
        let pontosA_add = 0;
        let pontosB_add = 0;

        if (vencedorDireto === "EQUIPE 01" || dados.posicao <= -100) {
            pontosA_add = 3;
        } else if (vencedorDireto === "EQUIPE 02" || dados.posicao >= 100) {
            pontosB_add = 3;
        } else {
            // Empate ou fim do tempo
            if (dados.posicao === 0) {
                pontosA_add = 1;
                pontosB_add = 1;
            } else if (dados.posicao < 0) {
                pontosA_add = 3;
            } else {
                pontosB_add = 3;
            }
        }

        update(ref(db, 'partida'), { 
            status: 'finalizado',
            pontosA: (dados.pontosA || 0) + pontosA_add,
            pontosB: (dados.pontosB || 0) + pontosB_add
        });
    };

    const iniciarJogo = (minutos) => {
        update(ref(db, 'partida'), {
            posicao: 0,
            tempoRestante: minutos * 60,
            status: 'jogando'
        });
    };

    const resetarTudo = (nivel = dados.nivel) => {
        set(ref(db, 'partida'), { 
            posicao: 0, 
            nivel: nivel, 
            tempoRestante: 0, 
            status: 'parado',
            pontosA: 0,
            pontosB: 0 
        });
    };

    const proximaRodada = () => {
        update(ref(db, 'partida'), { 
            posicao: 0, 
            tempoRestante: 0, 
            status: 'parado' 
        });
    };

    const formatarTempo = (segundos) => {
        const min = Math.floor(segundos / 60);
        const seg = segundos % 60;
        return `${min}:${seg < 10 ? '0' : ''}${seg}`;
    };

    const vencedorTela = dados.status === 'finalizado' ? 
        (dados.posicao < 0 ? "EQUIPE 01" : dados.posicao > 0 ? "EQUIPE 02" : "EMPATE") : null;

    return (
        <div className="h-screen bg-slate-900 flex flex-col items-center justify-between py-8 overflow-hidden font-sans text-white">

            {dados.status === 'finalizado' && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                    <h1 className="text-4xl font-thin mb-4 uppercase tracking-[1em] text-slate-400">Rodada Finalizada</h1>
                    <h2 className={`text-9xl font-black mb-12 ${vencedorTela === "EQUIPE 01" ? 'text-blue-500' : vencedorTela === "EQUIPE 02" ? 'text-red-500' : 'text-yellow-500'}`}>
                        {vencedorTela}
                    </h2>
                    <div className="flex gap-4">
                        <button onClick={proximaRodada} className="bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-2xl hover:bg-blue-500 transition-all">PRÓXIMA RODADA</button>
                        <button onClick={() => resetarTudo()} className="bg-slate-700 text-white px-10 py-4 rounded-full font-bold text-2xl hover:bg-slate-600 transition-all">ZERAR PLACAR</button>
                    </div>
                </div>
            )}

            {/* Placar Acumulado */}
            <div className="w-full px-20 flex justify-between items-start">
                <div className="text-center">
                    <p className="text-blue-500 text-xl font-bold uppercase tracking-widest">Pontos Totais</p>
                    <p className="text-blue-500 text-8xl font-black">{dados.pontosA || 0}</p>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2 bg-slate-800 p-1 rounded-full border border-slate-700 scale-90">
                        {['1ano', '5ano', '9ano', 'terceirao'].map((n) => (
                            <button key={n} onClick={() => resetarTudo(n)} className={`px-6 py-2 rounded-full font-black text-xs transition-all ${dados.nivel === n ? 'bg-yellow-500 text-black' : 'text-slate-500'}`}>{n.toUpperCase()}</button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {[2, 3, 5].map((m) => (
                            <button key={m} onClick={() => iniciarJogo(m)} className="bg-emerald-600 px-4 py-1 rounded font-bold text-xs uppercase tracking-widest">Começar {m}m</button>
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-red-500 text-xl font-bold uppercase tracking-widest">Pontos Totais</p>
                    <p className="text-red-500 text-8xl font-black">{dados.pontosB || 0}</p>
                </div>
            </div>

            {/* Relógio Central */}
            <div className="text-[10rem] font-mono font-black tracking-tighter tabular-nums leading-none text-slate-200">
                {formatarTempo(dados.tempoRestante)}
            </div>

            {/* Arena: Barra de Progresso Split */}
            <div className="w-full px-20 flex flex-col items-center mb-10">
                <div className="flex justify-between w-full mb-4">
                    <span className="text-blue-500 text-5xl font-black">EQUIPE 01</span>
                    <span className="text-red-500 text-5xl font-black">EQUIPE 02</span>
                </div>

                <div className="w-full h-24 bg-slate-800/50 rounded-2xl relative flex overflow-hidden border-4 border-slate-800 shadow-2xl">
                    <div className="flex-1 flex justify-end">
                        <div 
                            className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[10px_0_30px_rgba(37,99,235,0.6)]"
                            style={{ width: `${Math.abs(Math.min(dados.posicao, 0))}%` }}
                        />
                    </div>
                    <div className="w-2 h-full bg-yellow-400 z-10 shadow-[0_0_20px_#facc15]" />
                    <div className="flex-1 flex justify-start">
                        <div 
                            className="h-full bg-red-600 transition-all duration-500 ease-out shadow-[-10px_0_30px_rgba(220,38,38,0.6)]"
                            style={{ width: `${Math.max(dados.posicao, 0)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}