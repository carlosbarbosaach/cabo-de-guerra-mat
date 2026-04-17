'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { ref, increment, update, onValue } from 'firebase/database';
import { useParams } from 'next/navigation';

const NIVEIS = {
    '1EF': { min: 1, max: 10, ops: ['+'], forca: 10 },
    '5EF': { min: 5, max: 30, ops: ['+', '-'], forca: 12 },
    '9EF': { min: 2, max: 12, ops: ['*', '+', '-'], forca: 10 },
    '3EM': { min: 10, max: 25, ops: ['*', '/'], forca: 8 }
};

export default function PaginaEquipeDinamica() {
    const params = useParams();
    const equipeId = params.id as string;
    
    // Lógica de cor dinâmica: Ímpar = Azul, Par = Vermelho
    const ehAzul = Number(equipeId) % 2 !== 0;

    const [dados, setDados] = useState({ nivel: '1EF', status: 'parado', modo: 'cabo', operacao: 'soma' });
    const [conta, setConta] = useState({ texto: '', res: 0 });
    const [input, setInput] = useState('');

    useEffect(() => {
        const partidaRef = ref(db, 'partida');
        return onValue(partidaRef, (snap) => {
            if (snap.exists()) {
                const val = snap.val();
                
                // Se o jogo começou e não temos uma conta, ou se mudou nível/operação, gera nova conta
                if (val.status === 'jogando' && (!conta.texto || val.operacao !== dados.operacao || val.nivel !== dados.nivel)) {
                    gerar(val.nivel, val.operacao);
                }
                
                // Se o jogo parou ou finalizou, limpa o input para a próxima
                if (val.status !== 'jogando') {
                    setInput('');
                    setConta({ texto: '', res: 0 });
                }

                setDados(val);
            }
        });
    }, [conta.texto, dados.operacao, dados.status, dados.nivel]);

    const gerar = (nivelAtual: string, operacaoAtiva: string) => {
        const config = NIVEIS[nivelAtual as keyof typeof NIVEIS] || NIVEIS['1EF'];
        let n1 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        let n2 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        let op = '+';

        if (operacaoAtiva === 'misto') op = config.ops[Math.floor(Math.random() * config.ops.length)];
        else if (operacaoAtiva === 'aleatorio') op = ['+', '-', '*', '/'][Math.floor(Math.random() * 4)];
        else op = ({ soma: '+', sub: '-', mult: '*', div: '/' }[operacaoAtiva]) || '+';

        let res = 0, txt = '';
        if (op === '-') {
            if (n1 < n2) [n1, n2] = [n2, n1];
            res = n1 - n2; txt = `${n1} - ${n2}`;
        } else if (op === '*') {
            res = n1 * n2; txt = `${n1} x ${n2}`;
        } else if (op === '/') {
            if (n2 === 0) n2 = 1;
            const prod = n1 * n2; res = n1; txt = `${prod} ÷ ${n2}`;
        } else {
            res = n1 + n2; txt = `${n1} + ${n2}`;
        }
        setConta({ texto: txt, res });
        setInput('');
    };

    const responder = (e: React.FormEvent) => {
        e.preventDefault();
        if (dados.status !== 'jogando' || !input) return;
        
        const nivelAtual = NIVEIS[dados.nivel as keyof typeof NIVEIS] || NIVEIS['1EF'];
        const forca = nivelAtual.forca;

        if (parseInt(input) === conta.res) {
            if (dados.modo === 'cabo') {
                // Azul (Ímpar) puxa para - (esquerda), Vermelho (Par) puxa para + (direita)
                update(ref(db, 'partida'), { 
                    posicao: increment(ehAzul ? -forca : forca) 
                });
            } else {
                // Modo Corrida: Incrementa o progresso específico da equipe
                update(ref(db, `partida/progressoEquipes/${equipeId}`), increment(forca));
            }
            gerar(dados.nivel, dados.operacao);
        } else {
            setInput(''); // Errou, limpa o campo
        }
    };

    return (
        <div className={`h-screen flex flex-col items-center justify-center p-6 text-white transition-all duration-500 ${dados.status === 'jogando' ? (ehAzul ? 'bg-[#0542b9]' : 'bg-[#c60929]') : 'bg-[#46178f]'}`}>
            <div className="bg-white text-slate-900 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg text-center border-b-[10px] border-black/10">
                {dados.status === 'jogando' ? (
                    <>
                        <div className="mb-4">
                            <span className={`font-black uppercase text-xs px-4 py-1 rounded-full ${ehAzul ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                Equipe {equipeId} • {ehAzul ? 'Azul' : 'Vermelha'}
                            </span>
                        </div>
                        <div className="text-7xl font-black mb-8 tracking-tighter text-slate-800 animate-in zoom-in duration-200">
                            {conta.texto}
                        </div>
                        <form onSubmit={responder}>
                            <input 
                                autoFocus 
                                type="number" 
                                inputMode="numeric"
                                value={input} 
                                onChange={e => setInput(e.target.value)} 
                                className="w-full text-5xl border-4 rounded-2xl p-4 text-center mb-4 outline-none focus:border-[#46178f] transition-all border-slate-100"
                                placeholder="?"
                            />
                            <button className={`w-full ${ehAzul ? 'bg-[#0542b9]' : 'bg-[#c60929]'} text-white font-black py-5 rounded-xl text-2xl shadow-lg active:translate-y-1 transition-all uppercase`}>
                                Enviar Resposta
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="py-10 flex flex-col items-center space-y-6">
                        <div className={`w-16 h-16 border-8 border-slate-100 ${ehAzul ? 'border-t-blue-600' : 'border-t-red-600'} rounded-full animate-spin`}></div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-slate-800 uppercase italic">
                                {dados.status === 'finalizado' ? 'Rodada Finalizada!' : 'Aguardando Início...'}
                            </h2>
                            <p className="text-slate-500 font-bold text-sm mt-2">
                                Prepare-se, Equipe {equipeId}!
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Shapes decorativos estilo Kahoot no fundo */}
            <div className="absolute bottom-6 left-6 opacity-20 flex gap-4 pointer-events-none">
                <div className="w-10 h-10 bg-white rotate-45" />
                <div className="w-10 h-10 bg-white rounded-full" />
            </div>
        </div>
    );
}