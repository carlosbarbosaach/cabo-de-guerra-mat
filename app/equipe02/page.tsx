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

export default function Equipe02() {
  const [dados, setDados] = useState({ nivel: '1ano', tempoRestante: 0, status: 'parado' });
  const [conta, setConta] = useState({ texto: '', res: 0 });
  const [input, setInput] = useState('');

  useEffect(() => {
    return onValue(ref(db, 'partida'), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setDados(val);
        if (!conta.texto && val.status === 'jogando') {
          gerar(val.nivel);
        }
      }
    });
  }, [conta.texto]);

  const gerar = (nivelAtual) => {
    const config = NIVEIS[nivelAtual] || NIVEIS['1ano'];
    const n1 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    const n2 = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    let res = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;
    setConta({ texto: `${n1} ${op === '*' ? 'x' : op} ${n2}`, res });
    setInput('');
  };

  const responder = (e) => {
    e.preventDefault();
    if (dados.status !== 'jogando') return;
    if (parseInt(input) === conta.res) {
      // Diferença principal: valor positivo no increment
      update(ref(db, 'partida'), { posicao: increment(NIVEIS[dados.nivel].forca) });
      gerar(dados.nivel);
    } else { setInput(''); }
  };

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  return (
    <div className={`h-screen flex flex-col items-center justify-center p-6 text-white transition-all duration-500 ${dados.status === 'jogando' ? 'bg-red-700' : 'bg-slate-800'}`}>
      <div className="absolute top-10 text-4xl font-black font-mono bg-black/30 px-8 py-3 rounded-full border border-white/20">
        {formatarTempo(dados.tempoRestante)}
      </div>

      <div className="bg-white text-slate-900 p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border-b-[12px] border-red-900">
        {dados.status === 'jogando' ? (
          <>
            <p className="text-red-600 font-black tracking-widest mb-2 uppercase">Equipe 02 - {dados.nivel}</p>
            <div className="text-8xl font-black mb-10 tracking-tighter text-slate-800 animate-in zoom-in duration-300">{conta.texto}</div>
            <form onSubmit={responder}>
              <input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)}
                className="w-full text-6xl border-4 border-slate-100 bg-slate-50 rounded-3xl p-6 text-center mb-6 focus:border-red-500 outline-none" />
              <button className="w-full bg-red-600 text-white font-black py-6 rounded-2xl text-3xl shadow-lg active:translate-y-1 transition-all">ENVIAR</button>
            </form>
          </>
        ) : (
          <div className="py-20 opacity-40 uppercase font-black text-2xl tracking-widest">Aguardando Professor</div>
        )}
      </div>
    </div>
  );
}