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
    operacao: 'soma' | 'sub' | 'mult' | 'div' | 'misto' | 'aleatorio';
    progressoEquipes?: { [key: string]: number };
}

export default function Visualizacao() {
    const [dados, setDados] = useState<JogoDados>({ 
        posicao: 0, nivel: '1EF', tempoRestante: 0, status: 'parado', pontosA: 0, pontosB: 0, modo: 'cabo', operacao: 'soma' 
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
        } else if (timerInterval.current) clearInterval(timerInterval.current);
        return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
    }, [dados.status, dados.tempoRestante]);

    const finalizarRodada = (vencedor: string | null = null) => {
        let pA = 0, pB = 0;
        if (vencedor === "EQUIPE 01") pA = 3;
        else if (vencedor === "EQUIPE 02") pB = 3;
        else {
            if (dados.posicao < 0) pA = 3;
            else if (dados.posicao > 0) pB = 3;
            else { pA = 1; pB = 1; }
        }
        update(ref(db, 'partida'), { status: 'finalizado', pontosA: (dados.pontosA || 0) + pA, pontosB: (dados.pontosB || 0) + pB });
    };

    const iniciarJogo = (minutos: number) => {
        update(ref(db, 'partida'), { status: 'jogando', tempoRestante: minutos * 60, posicao: 0, progressoEquipes: {} });
    };

    return (
        <div className="h-screen bg-[#0f172a] flex flex-col items-center justify-between py-4 text-white overflow-hidden bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 font-sans">
            {dados.status === 'finalizado' && (
                <div className="absolute inset-0 z-[110] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center">
                    <h2 className="text-8xl font-black mb-10 text-yellow-500 uppercase italic">Fim da Rodada!</h2>
                    <button onClick={() => update(ref(db, 'partida'), {status: 'parado', posicao: 0})} className="bg-blue-600 px-12 py-5 rounded-full font-bold text-3xl shadow-xl hover:scale-105 transition-all">PRÓXIMA DISPUTA</button>
                </div>
            )}

            {/* Placar Superior */}
            <div className="w-full px-16 grid grid-cols-3 items-center mt-4">
                <div className="flex flex-col items-start select-none">
                    <span className="text-blue-500 font-black text-2xl uppercase opacity-70 mb-[-10px] ml-2 tracking-widest">Equipe 01</span>
                    <div className="text-[10rem] font-black leading-none text-blue-500 drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]">{dados.pontosA}</div>
                </div>

                <div className="flex flex-col items-center gap-4 z-20 scale-90">
                    <div className="bg-white/5 backdrop-blur-md p-5 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 shadow-2xl w-[450px]">
                        <div className="flex justify-center gap-1.5 w-full">
                            {['1EF', '5EF', '9EF', '3EM'].map(n => (
                                <button key={n} onClick={() => update(ref(db, 'partida'), {nivel: n, posicao: 0})} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${dados.nivel === n ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}>{n}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 w-full">
                            {['soma', 'sub', 'mult', 'div', 'misto', 'aleatorio'].map(op => (
                                <button key={op} disabled={dados.nivel === '1EF' && (op === 'mult' || op === 'div')} onClick={() => update(ref(db, 'partida'), {operacao: op})} className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${dados.operacao === op ? 'bg-orange-600 border-white text-white shadow-md scale-105' : 'bg-black/20 border-white/5 text-slate-500 hover:text-white'} disabled:opacity-5`}>{op}</button>
                            ))}
                        </div>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => update(ref(db, 'partida'), {modo: 'cabo', status: 'parado'})} className={`flex-1 py-2 rounded-xl text-[9px] font-black ${dados.modo === 'cabo' ? 'bg-blue-600 text-white shadow-lg' : 'bg-black/20 text-slate-500'}`}>CABO DE GUERRA</button>
                            <button onClick={() => update(ref(db, 'partida'), {modo: 'corrida', status: 'parado'})} className={`flex-1 py-2 rounded-xl text-[9px] font-black ${dados.modo === 'corrida' ? 'bg-purple-600 text-white shadow-lg' : 'bg-black/20 text-slate-500'}`}>CORRIDA</button>
                        </div>
                        <div className="flex gap-2 w-full">
                            {[2, 3, 5].map(m => <button key={m} onClick={() => iniciarJogo(m)} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-400 hover:text-white py-2 rounded-lg font-black text-[9px]">INICIAR {m} MIN</button>)}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end select-none text-right">
                    <span className="text-red-500 font-black text-2xl uppercase opacity-70 mb-[-10px] mr-2 tracking-widest">Equipe 02</span>
                    <div className="text-[10rem] font-black leading-none text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.6)]">{dados.pontosB}</div>
                </div>
            </div>

            {/* CRONÔMETRO: Reduzido para text-10rem e margem ajustada */}
            <div className="text-[10rem] font-mono font-black text-white drop-shadow-2xl -mt-20 pointer-events-none select-none">
                {Math.floor(dados.tempoRestante / 60)}:{(dados.tempoRestante % 60).toString().padStart(2, '0')}
            </div>

            {/* BARRA DE PROGRESSO: Subiu com mb-32 */}
            <div className="w-full px-20 mb-32 z-10">
                {dados.modo === 'cabo' ? (
                    <div className="w-full h-32 bg-slate-950/60 rounded-[2rem] relative flex overflow-hidden border-4 border-slate-800 shadow-2xl backdrop-blur-sm">
                        <div className="flex-1 flex justify-end">
                            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.abs(Math.min(dados.posicao, 0))}%` }} />
                        </div>
                        <div className="w-4 h-full bg-yellow-400 z-10 shadow-[0_0_40px_#facc15]" />
                        <div className="flex-1 flex justify-start">
                            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${Math.max(dados.posicao, 0)}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 p-6 bg-black/30 rounded-[2rem] border border-white/5">
                        {Object.entries(dados.progressoEquipes || {}).map(([id, prog]) => (
                            <div key={id} className="flex items-center gap-8">
                                <span className="font-black text-xl w-32 uppercase italic">Equipe {id}</span>
                                <div className="flex-1 h-10 bg-slate-900 rounded-full overflow-hidden border-2 border-slate-800">
                                    <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300" style={{ width: `${prog}%` }} />
                                </div>
                                <span className="font-mono font-black text-2xl w-24 text-purple-400 text-right">{prog}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}