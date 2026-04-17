'use client';
import { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { ref, onValue, update, set } from 'firebase/database';

interface JogoDados {
    posicao: number; nivel: string; tempoRestante: number; status: 'parado' | 'jogando' | 'finalizado';
    pontosA: number; pontosB: number; modo: 'cabo' | 'corrida'; operacao: 'soma' | 'sub' | 'mult' | 'div' | 'misto' | 'aleatorio';
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
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }
        return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
    }, [dados.status, dados.tempoRestante]);

    // MONITOR DE VITÓRIA (Barra Cheia)
    useEffect(() => {
        if (dados.status === 'jogando') {
            if (dados.modo === 'cabo') {
                if (dados.posicao <= -100) finalizarRodada("AZUL");
                else if (dados.posicao >= 100) finalizarRodada("VERMELHO");
            } else {
                Object.entries(dados.progressoEquipes || {}).forEach(([id, prog]) => {
                    if (prog >= 100) finalizarRodada(Number(id) % 2 !== 0 ? "AZUL" : "VERMELHO");
                });
            }
        }
    }, [dados.posicao, dados.progressoEquipes, dados.status]);

    const iniciarJogo = (minutos: number) => {
        update(ref(db, 'partida'), { 
            status: 'jogando', tempoRestante: minutos * 60, posicao: 0, progressoEquipes: {} 
        });
    };

    const finalizarRodada = (vencedorImediato?: "AZUL" | "VERMELHO") => {
        if (dados.status !== 'jogando') return;
        let pA = 0, pB = 0;

        if (vencedorImediato === "AZUL") pA = 3;
        else if (vencedorImediato === "VERMELHO") pB = 3;
        else {
            if (dados.modo === 'cabo') {
                if (dados.posicao < 0) pA = 3; else if (dados.posicao > 0) pB = 3; else { pA = 1; pB = 1; }
            } else {
                const eqs = Object.entries(dados.progressoEquipes || {}).sort((a,b) => b[1]-a[1]);
                if (eqs.length > 0) { if (Number(eqs[0][0]) % 2 !== 0) pA = 3; else pB = 3; }
            }
        }
        update(ref(db, 'partida'), { 
            status: 'finalizado', pontosA: (dados.pontosA || 0) + pA, pontosB: (dados.pontosB || 0) + pB, tempoRestante: 0 
        });
    };

    const resetTotal = () => {
        if (confirm("⚠️ ZERAR PLACAR E JOGO?")) {
            set(ref(db, 'partida'), {
                posicao: 0, nivel: '1EF', tempoRestante: 0, status: 'parado',
                pontosA: 0, pontosB: 0, modo: 'cabo', operacao: 'soma', progressoEquipes: {}
            });
        }
    };

    return (
        <div className="h-screen bg-[#46178f] flex flex-col items-center justify-between py-6 text-white overflow-hidden font-sans relative">
            <div className="w-full px-12 grid grid-cols-3 items-center z-10">
                <div className="bg-[#0542b9] p-4 rounded-2xl shadow-[0_6px_0_#032d7e] text-center border-b-2 border-white/10">
                    <span className="font-black text-xs uppercase opacity-80 italic">Pontos Azul</span>
                    <div className="text-7xl font-black">{dados.pontosA}</div>
                </div>
                <div className="flex justify-center">
                   <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 text-xs font-bold uppercase text-yellow-400">
                        {dados.status === 'jogando' ? `${dados.nivel} • ${dados.operacao}` : "Lobby"}
                   </div>
                </div>
                <div className="bg-[#c60929] p-4 rounded-2xl shadow-[0_6px_0_#8e061d] text-center border-b-2 border-white/10">
                    <span className="font-black text-xs uppercase opacity-80 italic">Pontos Vermelho</span>
                    <div className="text-7xl font-black">{dados.pontosB}</div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center w-full z-20">
                {dados.status === 'parado' ? (
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_15px_0_#d1d1d1] flex flex-row items-end gap-4 text-gray-700">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 ml-2">NÍVEL</label>
                            <select value={dados.nivel} onChange={e => update(ref(db, 'partida'), {nivel: e.target.value})} className="bg-gray-100 border-b-4 border-gray-300 font-black px-4 py-3 rounded-xl outline-none">
                                <option value="1EF">1º Fund</option><option value="5EF">5º Fund</option><option value="9EF">9º Fund</option><option value="3EM">3º Médio</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 ml-2">OPERAÇÃO</label>
                            <select value={dados.operacao} onChange={e => update(ref(db, 'partida'), {operacao: e.target.value})} className="bg-gray-100 border-b-4 border-gray-300 font-black px-4 py-3 rounded-xl outline-none">
                                <option value="soma">Soma (+)</option><option value="sub">Sub (-)</option><option value="mult">Mult (x)</option><option value="div">Div (÷)</option><option value="misto">Misto</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-gray-400 ml-2">MODO</label>
                            <select value={dados.modo} onChange={e => update(ref(db, 'partida'), {modo: e.target.value})} className="bg-gray-100 border-b-4 border-gray-300 font-black px-4 py-3 rounded-xl outline-none">
                                <option value="cabo">Cabo de Guerra</option><option value="corrida">Corrida</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 5].map(m => <button key={m} onClick={() => iniciarJogo(m)} className="bg-[#106b03] text-white px-4 py-3 rounded-xl font-black text-sm shadow-[0_4px_0_#084102] active:translate-y-1 transition-all">{m}M</button>)}
                        </div>
                        <button onClick={resetTotal} className="bg-gray-200 p-3 rounded-xl hover:text-red-600 transition-all">🔄</button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-64 h-64 rounded-full bg-white flex flex-col items-center justify-center shadow-[0_12px_0_#d1d1d1] border-[12px] border-[#333]">
                            <span className="text-8xl font-black text-[#333] font-mono leading-none">{Math.floor(dados.tempoRestante / 60)}:{(dados.tempoRestante % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <button onClick={() => finalizarRodada()} className="bg-red-600 text-white px-10 py-3 rounded-2xl font-black shadow-[0_6px_0_#8e061d] active:translate-y-1 transition-all">PARAR ⏹️</button>
                    </div>
                )}
            </div>

            <div className="w-full px-12 mb-20 z-10">
                {dados.modo === 'cabo' ? (
                    <div className="relative w-full h-28 bg-black/30 rounded-[2.5rem] border-4 border-white/20 p-2 overflow-hidden shadow-2xl">
                        <div className="absolute top-0 bottom-0 left-1/2 w-2 bg-yellow-400 z-20 shadow-[0_0_20px_#facc15]" />
                        <div className="flex w-full h-full rounded-[1.8rem] overflow-hidden">
                            <div className="h-full bg-[#0542b9] transition-all duration-500" style={{ width: `${50 - (dados.posicao / 2)}%` }} />
                            <div className="h-full bg-[#c60929] transition-all duration-500" style={{ width: `${50 + (dados.posicao / 2)}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-[35vh] overflow-y-auto">
                        {Object.entries(dados.progressoEquipes || {}).sort((a,b) => b[1]-a[1]).map(([id, prog]) => {
                            const azul = Number(id) % 2 !== 0;
                            return (
                                <div key={id} className="flex items-center gap-6 bg-white/10 p-4 rounded-[2rem] border-b-4 border-black/20">
                                    <span className={`font-black text-2xl italic w-32 ${azul ? 'text-blue-400' : 'text-red-400'}`}>EQUIPE {id}</span>
                                    <div className="flex-1 h-10 bg-black/40 rounded-full p-2 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-700 ${azul ? 'bg-[#0542b9]' : 'bg-[#c60929]'}`} style={{ width: `${Math.min(prog, 100)}%` }} />
                                    </div>
                                    <span className="font-black text-3xl w-24 text-right">{Math.min(prog, 100)}%</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {dados.status === 'finalizado' && (
                <div className="absolute inset-0 z-[120] bg-[#46178f]/95 flex flex-col items-center justify-center p-10 animate-in fade-in">
                    <div className="bg-white p-12 rounded-[3rem] shadow-[0_15px_0_#d1d1d1] text-[#333] flex flex-col items-center max-w-2xl w-full">
                        <h2 className="text-6xl font-black mb-6 uppercase text-[#46178f] italic tracking-tighter">Fim da Rodada!</h2>
                        <div className="flex gap-4 w-full">
                            <button onClick={() => update(ref(db, 'partida'), {status: 'parado', posicao: 0, progressoEquipes: {}})} className="flex-1 bg-[#106b03] text-white py-6 rounded-2xl font-black text-2xl shadow-[0_8px_0_#084102] active:translate-y-1 transition-all">NOVO ROUND</button>
                            <button onClick={resetTotal} className="bg-gray-200 text-gray-500 px-8 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all shadow-[0_8px_0_#ccc]">ZERAR TUDO</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}