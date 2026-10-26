import { useEffect, useRef, useState } from 'react';
import { Game, type Stats, type Upgrade } from './game/Game';
import './index.css';

const EMPTY: Stats = { hp: 100, maxHp: 100, xp: 0, xpNext: 5, level: 1, time: 0, kills: 0 };

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [options, setOptions] = useState<Upgrade[] | null>(null);
  const [dead, setDead] = useState(false);
  const [run, setRun] = useState(0); // mudar este número reinicia o jogo

  useEffect(() => {
    const g = new Game({
      onStats: setStats,
      onLevelUp: setOptions,
      onGameOver: (s) => { setStats(s); setDead(true); },
    });
    game.current = g;
    g.init(host.current!);
    return () => g.destroy();
  }, [run]);

  const pick = (u: Upgrade) => {
    u.apply();
    setOptions(null);
    game.current?.resume();
  };

  const restart = () => {
    setDead(false); setOptions(null); setStats(EMPTY);
    setRun((r) => r + 1);
  };

  const mm = String(Math.floor(stats.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(stats.time % 60)).padStart(2, '0');

  return (
    <div className="stage">
      <div ref={host} className="canvas-host" />

      <div className="hud">
        <div className="bars">
          <div className="bar hp"><i style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }} /></div>
          <div className="bar xp"><i style={{ width: `${(stats.xp / stats.xpNext) * 100}%` }} /></div>
        </div>
        <div className="readout">
          <span>Nível {stats.level}</span>
          <span>{mm}:{ss}</span>
          <span>{stats.kills} abates</span>
        </div>
      </div>

      {options && (
        <div className="overlay">
          <h2>Subiu de nível</h2>
          <div className="choices">
            {options.map((o) => (
              <button key={o.label} onClick={() => pick(o)}>{o.label}</button>
            ))}
          </div>
        </div>
      )}

      {dead && (
        <div className="overlay">
          <h2>Fim de jogo</h2>
          <p>Você sobreviveu {mm}:{ss} e abateu {stats.kills} inimigos.</p>
          <button onClick={restart}>Jogar de novo</button>
        </div>
      )}
    </div>
  );
}
