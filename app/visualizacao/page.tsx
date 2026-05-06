'use client';
import { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { ref, onValue, update, set } from 'firebase/database';
import confetti from 'canvas-confetti';

interface JogoDados {
    posicao: number; 
    nivel: string; 
    tempoRestante: number; 
    status: 'parado' | 'jogando' | 'finalizado';
    pontosA: number; 
    pontosB: number; 
    modo: 'cabo' | 'corrida'; 
    operacao: 'soma' | 'sub' | 'mult' | 'div' | 'misto';
    progressoEquipes?: { [key: string]: number };
    nomesEquipes?: { [key: string]: string };
}

const CORES_KAHOOT = [
    { bg: 'bg-[#0542b9]', text: 'text-[#0542b9]' }, 
    { bg: 'bg-[#c60929]', text: 'text-[#c60929]' },  
    { bg: 'bg-[#d89e00]', text: 'text-[#d89e00]' }, 
    { bg: 'bg-[#106b03]', text: 'text-[#106b03]' }, 
];

export default function Visualizacao() {
    const [dados, setDados] = useState<JogoDados | null>(null);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const partidaRef = ref(db, 'partida');
        const unsubscribe = onValue(partidaRef, (snap) => {
            if (snap.exists()) {
                setDados(snap.val());
            } else {
                setDados({
                    posicao: 0, nivel: '1EF', tempoRestante: 0, status: 'parado',
                    pontosA: 0, pontosB: 0, modo: 'cabo', operacao: 'soma'
                });
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (dados?.status === 'jogando' && dados.tempoRestante > 0) {
            timerInterval.current = setInterval(() => {
                const novoTempo = dados.tempoRestante - 1;
                update(ref(db, 'partida'), { tempoRestante: novoTempo });
                if (novoTempo <= 0) finalizarRodada(); 
            }, 1000);
        } else {
            if (timerInterval.current) clearInterval(timerInterval.current);
        }
        return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
    }, [dados?.status, dados?.tempoRestante]);

    useEffect(() => {
        if (dados?.status === 'jogando' && dados.modo === 'cabo') {
            if (dados.posicao <= -100) finalizarRodada("AZUL");
            else if (dados.posicao >= 100) finalizarRodada("VERMELHO");
        }
    }, [dados?.posicao, dados?.status]);

    const iniciarJogo = (minutos: number) => {
        if (!dados) return;
        set(ref(db, 'partida'), {
            status: 'jogando',
            tempoRestante: minutos * 60,
            posicao: 0,
            progressoEquipes: {},
            pontosA: dados.pontosA || 0,
            pontosB: dados.pontosB || 0,
            nivel: dados.nivel,
            operacao: dados.operacao,
            modo: dados.modo,
            nomesEquipes: dados.nomesEquipes || {}
        });
    };

    const finalizarRodada = (vencedorCabo?: "AZUL" | "VERMELHO") => {
        if (dados?.status !== 'jogando') return;
        let pA = 0, pB = 0;

        if (dados.modo === 'cabo') {
            if (vencedorCabo === "AZUL" || dados.posicao < -10) pA = 3; 
            else if (vencedorCabo === "VERMELHO" || dados.posicao > 10) pB = 3; 
            else { pA = 1; pB = 1; } // Empate no Cabo: 1 ponto para cada
        } else {
            const eqs = Object.entries(dados.progressoEquipes || {}).sort((a,b) => b[1]-a[1]);
            if (eqs.length > 1 && eqs[0][1] === eqs[1][1]) {
                pA = 1; pB = 1; // Empate na Corrida
            } else if (eqs.length > 0) {
                if (Number(eqs[0][0]) % 2 !== 0) pA = 3; else pB = 3;
            }
        }

        update(ref(db, 'partida'), { 
            status: 'finalizado', 
            pontosA: (dados.pontosA || 0) + pA, 
            pontosB: (dados.pontosB || 0) + pB, 
            tempoRestante: 0 
        });
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    };

    const voltarParaConfiguracao = () => {
        update(ref(db, 'partida'), {
            status: 'parado',
            posicao: 0,
            tempoRestante: 0,
            progressoEquipes: {}
        });
    };

    const resetTotal = () => {
        if (confirm("⚠️ ZERAR TUDO?")) {
            set(ref(db, 'partida'), {
                posicao: 0, nivel: '1EF', tempoRestante: 0, status: 'parado',
                pontosA: 0, pontosB: 0, modo: 'cabo', operacao: 'soma',
                nomesEquipes: {}, progressoEquipes: {}
            });
        }
    };

    if (!dados) return null;

    // Lógica para determinar a mensagem do modal
    const obterResultadoRound = () => {
        if (dados.modo === 'cabo') {
            if (dados.posicao < -10) return { texto: "VITÓRIA AZUL!", cor: "text-[#0542b9]" };
            if (dados.posicao > 10) return { texto: "VITÓRIA VERMELHA!", cor: "text-[#c60929]" };
            return { texto: "EMPATE TÉCNICO!", cor: "text-gray-500" };
        } else {
            const eqs = Object.entries(dados.progressoEquipes || {}).sort((a,b) => b[1]-a[1]);
            if (eqs.length > 1 && eqs[0][1] === eqs[1][1]) return { texto: "EMPATE!", cor: "text-gray-500" };
            if (eqs.length > 0) {
                const isAzul = Number(eqs[0][0]) % 2 !== 0;
                return { 
                    texto: isAzul ? "VITÓRIA AZUL!" : "VITÓRIA VERMELHA!", 
                    cor: isAzul ? "text-[#0542b9]" : "text-[#c60929]" 
                };
            }
            return { texto: "FIM DE JOGO!", cor: "text-gray-500" };
        }
    };

    const resultado = obterResultadoRound();

    return (
        <div className="h-screen bg-[#46178f] flex flex-col items-center justify-between py-6 text-white overflow-hidden relative font-sans">
            <style>{`
                @keyframes pull-blue { 0%, 100% { transform: translateX(0) rotate(-5deg); } 50% { transform: translateX(-8px) rotate(-10deg); } }
                @keyframes pull-red { 0%, 100% { transform: translateX(0) rotate(5deg); } 50% { transform: translateX(8px) rotate(10deg); } }
                .animate-pull-blue { animation: pull-blue 0.4s infinite; }
                .animate-pull-red { animation: pull-red 0.4s infinite; }
                .rope-transition { transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            `}</style>

            {/* Cabeçalho */}
            <div className="w-full px-12 grid grid-cols-3 items-center z-10">
                <div className="bg-[#0542b9] p-6 rounded-[2rem] shadow-[0_8px_0_#032d7e] text-center border-2 border-white/20">
                    <span className="font-black text-sm uppercase opacity-70 italic tracking-widest">Azul</span>
                    <div className="text-7xl font-black tabular-nums">{dados.pontosA}</div>
                </div>
                <div className="flex justify-center flex-col items-center gap-2">
                    <div className="bg-black/40 backdrop-blur-md px-8 py-3 rounded-full border-2 border-white/20 text-sm font-black uppercase text-yellow-400">
                        {dados.status === 'jogando' ? `${dados.nivel} • ${dados.operacao}` : "Lobby"}
                    </div>
                </div>
                <div className="bg-[#c60929] p-6 rounded-[2rem] shadow-[0_8px_0_#8e061d] text-center border-2 border-white/20">
                    <span className="font-black text-sm uppercase opacity-70 italic tracking-widest">Vermelho</span>
                    <div className="text-7xl font-black tabular-nums">{dados.pontosB}</div>
                </div>
            </div>

            {/* Painel Central */}
            <div className="flex-1 flex items-center justify-center w-full z-20">
                {dados.status === 'parado' ? (
                    <div className="bg-white p-8 rounded-[3rem] shadow-[0_20px_0_#d1d1d1] flex flex-col gap-6 text-gray-700 w-full max-w-4xl border-t-8 border-[#46178f]">
                        <h2 className="text-center font-black text-3xl uppercase italic text-[#46178f]">Configurações</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <select value={dados.nivel} onChange={e => update(ref(db, 'partida'), {nivel: e.target.value})} className="bg-gray-100 border-b-4 border-gray-300 font-black p-4 rounded-2xl outline-none text-xl">
                                <option value="1EF">1º Fund</option><option value="5EF">5º Fund</option><option value="9EF">9º Fund</option><option value="3EM">3º Médio</option>
                            </select>
                            <select value={dados.operacao} onChange={e => update(ref(db, 'partida'), {operacao: e.target.value})} className="bg-gray-100 border-b-4 border-gray-300 font-black p-4 rounded-2xl outline-none text-xl">
                                <option value="soma">Soma</option><option value="sub">Subtração</option><option value="mult">Multiplicação</option><option value="div">Divisão</option><option value="misto">Misto</option>
                            </select>
                            <select value={dados.modo} onChange={e => update(ref(db, 'partida'), {modo: e.target.value})} className="bg-gray-100 border-b-4 border-gray-300 font-black p-4 rounded-2xl outline-none text-xl">
                                <option value="cabo">Cabo de Guerra</option><option value="corrida">Corrida</option>
                            </select>
                        </div>
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3].map(m => (
                                <button key={m} onClick={() => iniciarJogo(m)} className="bg-[#106b03] text-white px-10 py-5 rounded-2xl font-black text-2xl shadow-[0_6px_0_#084102] active:translate-y-1 transition-all uppercase leading-none">{m} MIN</button>
                            ))}
                            <button onClick={resetTotal} className="bg-gray-200 p-5 rounded-2xl hover:bg-red-500 hover:text-white transition-all text-xl font-black border-b-4 border-gray-400">RESET</button>
                        </div>
                    </div>
                ) : (
                    <div className="w-80 h-80 rounded-full bg-white flex flex-col items-center justify-center shadow-[0_15px_0_#d1d1d1] border-[18px] border-[#333] animate-pulse">
                        <span className="text-9xl font-black text-[#333] font-mono leading-none tracking-tighter tabular-nums text-center">
                            {Math.floor(dados.tempoRestante / 60)}:{(dados.tempoRestante % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                )}
            </div>

            {/* Arena Inferior */}
            <div className="w-full px-12 mb-10 z-10 max-w-[1300px] mx-auto">
                <div className="relative w-full h-[380px] flex items-center justify-center bg-black/40 rounded-[4rem] border-4 border-white/10 overflow-hidden shadow-inner p-8">
                    {dados.modo === 'cabo' ? (
                        <div className="relative w-full h-full flex items-center justify-center rope-transition" 
                             style={{ transform: `translateX(${-dados.posicao * 0.6}%)` }}>
                            <div className="absolute w-[800%] h-10 bg-[#6d4c41] shadow-2xl" />
                            <div className="absolute left-1/2 -top-4 w-3 h-16 bg-yellow-400 rounded-full z-30 shadow-[0_0_20px_#facc15]" />
                            <div className={`absolute right-[51.5%] flex flex-col items-center z-20 ${dados.status === 'jogando' ? 'animate-pull-blue' : ''}`}>
                                <div className="w-28 h-28 bg-blue-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-7xl">{dados.posicao > 60 ? "😰" : "🥶"}</div>
                                <div className="bg-[#0542b9] text-white px-6 py-2 rounded-full mt-3 font-black text-sm border-2 border-white uppercase">{dados.nomesEquipes?.["1"] || "TIME AZUL"}</div>
                            </div>
                            <div className={`absolute left-[51.5%] flex flex-col items-center z-20 ${dados.status === 'jogando' ? 'animate-pull-red' : ''}`}>
                                <div className="w-28 h-28 bg-red-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-7xl">{dados.posicao < -60 ? "😰" : "😡"}</div>
                                <div className="bg-[#c60929] text-white px-6 py-2 rounded-full mt-3 font-black text-sm border-2 border-white uppercase">{dados.nomesEquipes?.["2"] || "TIME VERMELHO"}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 w-full h-full overflow-y-auto pr-4 custom-scrollbar">
                            {Object.entries(dados.progressoEquipes || {}).sort((a, b) => b[1] - a[1]).map(([id, prog], index) => {
                                const cor = CORES_KAHOOT[index % CORES_KAHOOT.length];
                                return (
                                    <div key={id} className="bg-white/10 p-4 rounded-3xl border border-white/10 flex flex-col gap-2 w-full">
                                        <div className="flex justify-between items-center px-2">
                                            <span className={`font-black text-xl uppercase italic ${cor?.text || 'text-white'}`}>{index === 0 && prog > 0 ? '👑 ' : ''}{dados.nomesEquipes?.[id] || `Equipe ${id}`}</span>
                                            <span className="font-black text-2xl text-white">{prog}%</span>
                                        </div>
                                        <div className="w-full h-6 bg-black/40 rounded-full overflow-hidden border border-white/10">
                                            <div className={`h-full transition-all duration-1000 ${cor?.bg || 'bg-blue-500'}`} style={{ width: `${prog}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Finalização com Tratamento de Empate */}
            {dados.status === 'finalizado' && (
                <div className="absolute inset-0 z-[120] bg-[#46178f]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-4xl w-full border-b-[15px] border-gray-200 animate-in zoom-in duration-300">
                        <div className="text-[120px] mb-4 animate-bounce">
                            {resultado.texto.includes("EMPATE") ? "🤝" : "🏆"}
                        </div>
                        <h2 className={`text-6xl font-black mb-4 uppercase italic tracking-tighter ${resultado.cor}`}>
                            {resultado.texto}
                        </h2>
                        
                        <div className="flex gap-4 mb-10">
                            <div className="flex-1 bg-blue-50 p-6 rounded-3xl border-b-8 border-blue-200">
                                <span className="block text-blue-600 font-black text-sm uppercase italic mb-1 text-center">Total Azul</span>
                                <div className="text-7xl font-black text-[#0542b9] tabular-nums text-center">{dados.pontosA}</div>
                            </div>
                            <div className="flex-1 bg-red-50 p-6 rounded-3xl border-b-8 border-red-200">
                                <span className="block text-red-600 font-black text-sm uppercase italic mb-1 text-center">Total Vermelho</span>
                                <div className="text-7xl font-black text-[#c60929] tabular-nums text-center">{dados.pontosB}</div>
                            </div>
                        </div>

                        <button 
                            onClick={voltarParaConfiguracao} 
                            className="w-full bg-[#106b03] text-white py-8 rounded-3xl font-black text-4xl shadow-[0_12px_0_#084102] active:translate-y-2 transition-all uppercase flex items-center justify-center gap-4"
                        >
                            Próximo Round 🚀
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}