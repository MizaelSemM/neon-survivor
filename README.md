# NEON SURVIVOR

Um survivor-like (bullet heaven) em neon: sobreviva o máximo que puder enquanto hordas de inimigos tentam te cercar, colete gemas de XP e escolha upgrades a cada nível.

Feito com **React 19 + TypeScript + PixiJS 8 + Vite**.

## Jogar

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (por padrão `http://localhost:5173`).

## Controles

| Tecla | Ação |
| --- | --- |
| `W` `A` `S` `D` ou setas | Mover o personagem |
| Mouse | Selecionar upgrade ao subir de nível |

O personagem atira automaticamente no inimigo mais próximo. Ao subir de nível o jogo pausa e você escolhe **1 de 3** melhorias.

## Mecânicas

- **Inimigos comuns** (rosa) aparecem desde o início.
- **Tanques** (laranja) surgem após 30 segundos: mais vida, mais lentos.
- **Dificuldade progressiva**: a cada segundo os inimigos nascem mais rápido e ficam mais fortes.
- **Gemas de XP** (verde) são atraídas pelo seu campo magnético.
- **Upgrades**: cadência, dano, velocidade, projéteis extras, ímã e vida máxima.
- **Game over** com tempo sobrevivido e número de abates.

## Scripts

```bash
npm run dev      # servidor de desenvolvimento com HMR
npm run build    # type-check + build de produção em dist/
npm run preview  # serve o build de produção
npm run lint     # ESLint
```

## Estrutura

```
src/
├── App.tsx          # HUD, overlays de level up e game over
├── main.tsx         # bootstrap do React
├── index.css        # estilos neon
└── game/
    └── Game.ts      # motor do jogo em PixiJS (loop, spawn, combate, upgrades)
public/              # ícones estáticos
```

Todo o balanceamento (velocidade, dano, spawn, cores e lista de upgrades) fica em `src/game/Game.ts`, nas constantes no topo da classe e no método `levelUp()`.

## Deploy

O projeto é 100% estático e pode ser publicado em qualquer host de site estático (GitHub Pages, Netlify, Vercel, Cloudflare Pages) usando `npm run build` (saída em `dist/`).

O deploy no **GitHub Pages** já está automatizado em `.github/workflows/deploy-pages.yml`: cada push na `main` roda o build e publica o jogo.

Para ativar, no repositório vá em **Settings → Pages** e defina **Source** como **GitHub Actions**. O site fica em `https://<usuario>.github.io/<repo>/`.

## Licença

MIT — veja [LICENSE](./LICENSE).
