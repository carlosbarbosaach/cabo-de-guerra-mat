'use client';
import { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { ref, increment, update, onValue } from 'firebase/database';
import { useParams } from 'next/navigation';

// Configuração de dificuldades por nível
const NIVEIS = {
  '1ano': { min: 1, max: 10, ops: ['+'], forca: 10 },
  '5ano': { min: 10, max: 50, ops: ['+', '-'], forca: 8 },
  '9ano': { min: 2, max: 15, ops: ['*', '+'], forca: 6 },
  'terceirao': { min: 12, max: 30, ops: ['*'], forca: 4 }
};

export default function PaginaEquipeDinamica() {
  const params = useParams();
  const equipeId = params.id as string; // Identificador da equipe (ex: 1, 2, 3...)
  
  // Lógica de cores: Ímpar = Azul | Par = Vermelho
  const isTimeAzul = Number(equipeId) % 2 !== 0;

  const [dados, setDados] = useState({ 
    nivel: '1ano', 
    tempoRestante: 0, 
    status: 'parado', 
    modo: 'cabo', 
    pontosA: 0, 
    pontosB: 0 
  });
  const [conta, setConta] = useState({ texto: '', res: 0 });
  const [input, setInput] = useState('');

  // Sincroniza com o Firebase
  useEffect(() => {
    const partidaRef = ref(db, 'partida');
    return onValue(partidaRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setDados(prev => ({ ...prev, ...val }));
        
        // Se o jogo começou e não tem conta na tela, gera uma
        if (!conta.texto && val.status === 'jogando') {
          gerar(val.nivel);
        }
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
      const valorForca = NIVEIS[dados.nivel as keyof typeof NIVEIS].forca;

      if (dados.modo === 'cabo') {
        // MODO CABO DE GUERRA: Empurra a barra central
        const forcaFinal = isTimeAzul ? -valorForca : valorForca;
        update(ref(db, 'partida'), { posicao: increment(forcaFinal) });
      } else {
        // MODO CORRIDA: Sobe a própria barra independente
        update(ref(db, `partida/progressoEquipes`), {
          [equipeId]: increment(valorForca)
        });
      }
      gerar(dados.nivel);
    } else {
      setInput(''); // Errou, limpa o campo
    }
  };

  const formatarTempo = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`h-screen flex flex-col items-center justify-center p-6 text-white transition-all duration-1000 
      ${dados.status === 'jogando' ? (isTimeAzul ? 'bg-blue-700' : 'bg-red-700') : 'bg-slate-900'}`}>
      
      {/* Relógio no Topo */}
      <div className="absolute top-10 text-4xl font-black font-mono bg-black/40 px-8 py-3 rounded-full border border-white/10 shadow-2xl">
        {formatarTempo(dados.tempoRestante)}
      </div>
      
      <div className={`bg-white text-slate-900 p-10 rounded-[3rem] shadow-2xl w-full max-w-lg text-center border-b-[12px] transition-colors duration-500 
        ${dados.status === 'jogando' ? (isTimeAzul ? 'border-blue-900' : 'border-red-900') : 'border-slate-700'}`}>
        
        {dados.status === 'jogando' ? (
          <>
            <div className="mb-2">
                <span className={`font-black uppercase tracking-tighter text-sm px-3 py-1 rounded ${isTimeAzul ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  Equipe {equipeId} • {dados.modo === 'cabo' ? 'Cabo' : 'Corrida'}
                </span>
            </div>
            
            <div className="text-8xl font-black mb-10 text-slate-800 tracking-tighter animate-in zoom-in duration-300">
              {conta.texto}
            </div>

            <form onSubmit={responder}>
              <input 
                autoFocus 
                type="number" 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                className={`w-full text-6xl border-4 rounded-3xl p-6 text-center mb-6 outline-none transition-all 
                  ${isTimeAzul ? 'focus:border-blue-500 border-slate-100' : 'focus:border-red-500 border-slate-100'}`} 
              />
              <button className={`w-full ${isTimeAzul ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'} 
                text-white font-black py-6 rounded-2xl text-3xl shadow-lg active:translate-y-1 transition-all uppercase tracking-widest`}>
                Enviar
              </button>
            </form>
          </>
        ) : (
          /* LOADING ANIMADO PARA ESPERA */
          <div className="py-12 flex flex-col items-center space-y-8">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-8 border-slate-100 rounded-full opacity-20"></div>
              <div className={`absolute inset-0 border-8 ${isTimeAzul ? 'border-blue-600' : 'border-red-600'} border-t-transparent rounded-full animate-spin`}></div>
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter animate-pulse">
                    Aguardando...
                </h2>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                    O professor vai iniciar em breve
                </p>
            </div>
            {dados.modo === 'cabo' && (
                <div className="pt-6 border-t w-full text-slate-500 font-black">
                    PONTOS DA EQUIPE: <span className="text-2xl text-slate-800">{isTimeAzul ? dados.pontosA : dados.pontosB}</span>
                </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-10 text-white/20 font-bold uppercase tracking-[0.5em] text-xs">
        Colégio do Campeche • Olimpíada de Matemática
      </div>
    </div>
  );
}