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
    const isTimeAzul = Number(equipeId) % 2 !== 0;

    const [dados, setDados] = useState({ nivel: '1EF', status: 'parado', modo: 'cabo', operacao: 'soma' });
    const [conta, setConta] = useState({ texto: '', res: 0 });
    const [input, setInput] = useState('');

    useEffect(() => {
        const partidaRef = ref(db, 'partida');
        return onValue(partidaRef, (snap) => {
            if (snap.exists()) {
                const val = snap.val();
                if (val.status === 'jogando' && (!conta.texto || val.operacao !== dados.operacao || val.nivel !== dados.nivel)) {
                    gerar(val.nivel, val.operacao);
                }
                setDados(val);
            }
        });
    }, [conta.texto, dados.operacao, dados.status, dados.nivel]);

    const gerar = (nivelAtual: string, operacaoAtiva: string) => {
        // Fallback: Se o nível vindo do banco for antigo/errado, usa 1EF
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
        if (dados.status !== 'jogando') return;
        
        // CORREÇÃO DO ERRO: Fallback para evitar 'undefined' na forca
        const nivelAtual = NIVEIS[dados.nivel as keyof typeof NIVEIS] || NIVEIS['1EF'];
        const forca = nivelAtual.forca;

        if (parseInt(input) === conta.res) {
            if (dados.modo === 'cabo') {
                update(ref(db, 'partida'), { posicao: increment(isTimeAzul ? -forca : forca) });
            } else {
                update(ref(db, `partida/progressoEquipes`), { [equipeId]: increment(forca) });
            }
            gerar(dados.nivel, dados.operacao);
        } else setInput('');
    };

    return (
        <div className={`h-screen flex flex-col items-center justify-center p-6 text-white transition-all duration-1000 ${dados.status === 'jogando' ? (isTimeAzul ? 'bg-blue-700' : 'bg-red-700') : 'bg-slate-900'}`}>
            <div className="bg-white text-slate-900 p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border-b-[12px] border-black/20">
                {dados.status === 'jogando' ? (
                    <>
                        <div className="mb-4"><span className={`font-black uppercase text-xs px-3 py-1 rounded-full ${isTimeAzul ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>Equipe {equipeId} • {dados.nivel}</span></div>
                        <div className="text-8xl font-black mb-10 tracking-tighter text-slate-800 animate-in zoom-in duration-300">{conta.texto}</div>
                        <form onSubmit={responder}>
                            <input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)} className="w-full text-6xl border-4 rounded-3xl p-6 text-center mb-6 outline-none focus:border-yellow-500 transition-all border-slate-100" />
                            <button className={`w-full ${isTimeAzul ? 'bg-blue-600' : 'bg-red-600'} text-white font-black py-6 rounded-2xl text-3xl shadow-lg active:translate-y-1 transition-all uppercase tracking-widest`}>ENVIAR</button>
                        </form>
                    </>
                ) : (
                    <div className="py-12 flex flex-col items-center space-y-8">
                        <div className="w-20 h-20 border-8 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-slate-800 uppercase animate-pulse">Aguardando...</h2>
                            <p className="text-slate-400 font-bold text-sm uppercase mt-2">O professor vai iniciar em breve</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}