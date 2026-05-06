'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { ref, increment, update, onValue, set } from 'firebase/database';
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
    const ehAzul = Number(equipeId) % 2 !== 0;

    const [dados, setDados] = useState({ nivel: '1EF', status: 'parado', modo: 'cabo', operacao: 'soma' });
    const [conta, setConta] = useState({ texto: '', res: 0 });
    const [input, setInput] = useState('');
    const [nome, setNome] = useState('');
    const [registrado, setRegistrado] = useState(false);
    const [feedback, setFeedback] = useState<'correto' | 'errado' | null>(null);

    useEffect(() => {
        return onValue(ref(db, 'partida'), (snap) => {
            if (snap.exists()) {
                const val = snap.val();
                if (val.status === 'jogando' && (!conta.texto || val.operacao !== dados.operacao || val.nivel !== dados.nivel)) {
                    gerar(val.nivel, val.operacao);
                }
                setDados(val);
                if (val.nomesEquipes?.[equipeId]) {
                    setNome(val.nomesEquipes[equipeId]);
                    setRegistrado(true);
                }
            }
        });
    }, [conta.texto, dados.operacao, dados.status, dados.nivel, equipeId]);

    const gerar = (nivelAtual: string, operacaoAtiva: string) => {
        const config = NIVEIS[nivelAtual as keyof typeof NIVEIS] || NIVEIS['1EF'];
        let n1 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        let n2 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        let op = operacaoAtiva === 'misto' ? config.ops[Math.floor(Math.random() * config.ops.length)] : ({ soma: '+', sub: '-', mult: '*', div: '/' }[operacaoAtiva] || '+');

        let res = 0, txt = '';
        if (op === '-') { const m = Math.max(n1, n2), n = Math.min(n1, n2); res = m - n; txt = `${m} - ${n}`; }
        else if (op === '*') { res = n1 * n2; txt = `${n1} × ${n2}`; }
        else if (op === '/') { n2 = n2 || 1; const p = n1 * n2; res = n1; txt = `${p} ÷ ${n2}`; }
        else { res = n1 + n2; txt = `${n1} + ${n2}`; }
        
        setConta({ texto: txt, res });
        setInput('');
    };

    const responder = (e: React.FormEvent) => {
        e.preventDefault();
        const resp = parseInt(input);
        if (dados.status !== 'jogando' || isNaN(resp)) return;
        
        const forca = (NIVEIS[dados.nivel as keyof typeof NIVEIS] || NIVEIS['1EF']).forca;

        if (resp === conta.res) {
            setFeedback('correto');
            setTimeout(() => setFeedback(null), 500);
            if (dados.modo === 'cabo') update(ref(db, 'partida'), { posicao: increment(ehAzul ? -forca : forca) });
            else set(ref(db, `partida/progressoEquipes/${equipeId}`), increment(forca));
            gerar(dados.nivel, dados.operacao);
        } else {
            setFeedback('errado');
            setTimeout(() => setFeedback(null), 500);
            setInput('');
        }
    };

    if (!registrado) {
        return (
            <div className={`h-screen flex items-center justify-center p-6 ${ehAzul ? 'bg-[#0542b9]' : 'bg-[#c60929]'}`}>
                <form onSubmit={(e) => { e.preventDefault(); if(nome.length > 2) { update(ref(db, 'partida/nomesEquipes'), {[equipeId]: nome.toUpperCase()}); setRegistrado(true); } }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl w-full max-w-md text-center border-b-[12px] border-black/10 transform scale-110">
                    <h2 className="text-4xl font-black mb-8 uppercase italic text-gray-800 tracking-tighter">Sua Equipe</h2>
                    <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="NOME DO TIME" className="w-full text-3xl font-black border-4 border-gray-100 rounded-3xl p-6 text-center mb-8 outline-none focus:border-[#46178f] uppercase" />
                    <button className="w-full bg-[#46178f] text-white font-black py-7 rounded-3xl text-2xl shadow-[0_8px_0_#2d0e5d] active:translate-y-1 transition-all">ENTRAR NA ARENA</button>
                </form>
            </div>
        );
    }

    return (
        <div className={`h-screen flex flex-col items-center justify-center p-6 transition-all duration-300 ${feedback === 'correto' ? 'bg-green-500 scale-95 shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]' : feedback === 'errado' ? 'bg-red-600 animate-pulse' : (ehAzul ? 'bg-[#0542b9]' : 'bg-[#c60929]')}`}>
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl w-full max-w-lg text-center border-b-[15px] border-black/10 transition-transform active:scale-95">
                {dados.status === 'jogando' ? (
                    <>
                        <div className="mb-2"><span className="font-black uppercase text-xs text-gray-400 tracking-widest">{nome}</span></div>
                        <div className="text-8xl font-black mb-10 tracking-tighter text-gray-800">{conta.texto}</div>
                        <form onSubmit={responder}>
                            <input autoFocus type="number" inputMode="numeric" value={input} onChange={e => setInput(e.target.value)} className="w-full text-7xl font-black border-4 rounded-[2rem] p-6 text-center mb-8 outline-none border-gray-50 focus:border-[#46178f]" placeholder="?" />
                            <button className={`w-full py-8 rounded-3xl text-4xl font-black shadow-xl transition-all active:translate-y-2 ${ehAzul ? 'bg-[#0542b9]' : 'bg-[#c60929]'} text-white uppercase`}>ENVIAR</button>
                        </form>
                    </>
                ) : (
                    <div className="py-16 flex flex-col items-center gap-8">
                        <div className="w-20 h-20 border-[10px] border-gray-100 border-t-[#46178f] rounded-full animate-spin"></div>
                        <h2 className="text-3xl font-black text-gray-800 uppercase italic">Esperando...</h2>
                    </div>
                )}
            </div>
        </div>
    );
}