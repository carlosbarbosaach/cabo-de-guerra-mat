'use client';
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { ref, increment, update, onValue } from 'firebase/database';

const NIVEIS = {
  '1ano': { min: 1, max: 10, ops: ['+'], forca: 10 },
  '5ano': { min: 10, max: 50, ops: ['+', '-'], forca: 8 },
  '9ano': { min: 2, max: 15, ops: ['*', '+'], forca: 6 },
  'terceirao': { min: 12, max: 30, ops: ['*'], forca: 4 }
};

export default function Equipe01() {
  const [dados, setDados] = useState({ nivel: '1ano', tempoRestante: 0, status: 'parado', pontosA: 0 });
  const [conta, setConta] = useState({ texto: '', res: 0 });
  const [input, setInput] = useState('');

  useEffect(() => {
    return onValue(ref(db, 'partida'), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setDados(val);
        if (!conta.texto && val.status === 'jogando') gerar(val.nivel);
      }
    });
  }, [conta.texto]);

  const gerar = (nivelAtual: string) => {
    const config = NIVEIS[nivelAtual as keyof typeof NIVEIS] || NIVEIS['1ano'];
    const n1 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    const n2 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    const res = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;
    setConta({ texto: `${n1} ${op === '*' ? 'x' : op} ${n2}`, res });
    setInput('');
  };

  const responder = (e: React.FormEvent) => {
    e.preventDefault();
    if (dados.status !== 'jogando') return;
    if (parseInt(input) === conta.res) {
      update(ref(db, 'partida'), { posicao: increment(-NIVEIS[dados.nivel as keyof typeof NIVEIS].forca) });
      gerar(dados.nivel);
    } else { setInput(''); }
  };

  const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`h-screen flex flex-col items-center justify-center p-6 text-white transition-all duration-1000 ${dados.status === 'jogando' ? 'bg-blue-700' : 'bg-slate-900'}`}>
      <div className="absolute top-10 text-4xl font-black font-mono bg-black/30 px-8 py-3 rounded-full border border-white/10">{formatarTempo(dados.tempoRestante)}</div>
      
      <div className="bg-white text-slate-900 p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border-b-[12px] border-blue-900">
        {dados.status === 'jogando' ? (
          <>
            <p className="text-blue-600 font-bold uppercase tracking-widest mb-2">Equipe 01 - {dados.nivel}</p>
            <div className="text-8xl font-black mb-10 text-slate-800 animate-in zoom-in duration-300">{conta.texto}</div>
            <form onSubmit={responder}>
              <input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)} className="w-full text-6xl border-4 rounded-3xl p-6 text-center mb-6 outline-none focus:border-blue-500 transition-all" />
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-2xl text-3xl shadow-lg active:translate-y-1 transition-all">ENVIAR</button>
            </form>
          </>
        ) : (
          <div className="py-12 flex flex-col items-center space-y-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full opacity-20"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-700 uppercase animate-pulse">Aguardando Professor</h2>
                <p className="text-slate-400 text-sm italic">Preparem-se para começar!</p>
            </div>
            <div className="mt-4 pt-4 border-t w-full text-slate-400 font-bold uppercase text-xs tracking-widest">
                Pontos Totais: <span className="text-slate-900 text-xl">{dados.pontosA}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}