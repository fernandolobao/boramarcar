'use client';

import {
  commanderTax,
  GLOSSARY,
  glossaryKeywordsIn,
  LEARN,
  type LearnLocale,
  type LessonId,
  manaAvailable,
  playtest,
  startPlaytest,
  type PlaytestAction,
  type PlaytestCard,
  type PlaytestLine,
  type PlaytestState,
  type PlaytestZone,
} from '@boramarcar/core';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useId, useMemo, useRef, useState } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { Icon } from '@/components/icons';
import { ManaCost, ManaSymbol, ManaText } from '@/components/mana';
import { Modal } from '@/components/modal-button';

const menuItem =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm outline-none data-[focused]:bg-surface-muted';

type Target = PlaytestZone | 'libraryTop' | 'libraryBottom';

/** Para onde a carta pode ir, a partir da zona em que está. */
function targetsFor(card: PlaytestCard, zone: PlaytestZone): Target[] {
  const all: Target[] = [
    'battlefield',
    'hand',
    'graveyard',
    'exile',
    'libraryTop',
    'libraryBottom',
  ];
  const list = all.filter((t) => t !== zone);
  if (card.isCommander && zone !== 'command') list.push('command');
  if (zone === 'command') return ['battlefield'];
  return card.isToken ? list.filter((t) => t !== 'libraryTop' && t !== 'libraryBottom') : list;
}

/** Idioma do conteúdo da trilha e do glossário. */
const learnLocale = (locale: string): LearnLocale => (locale === 'en' ? 'en' : 'pt-BR');

function useLessonTitle() {
  const locale = learnLocale(useLocale());
  return (id: LessonId) => LEARN[locale].lessons.find((l) => l.id === id)?.title ?? id;
}

/** Avisos da trilha já dispensados neste aparelho (conveniência local; sem conta). */
const HINTS_KEY = 'arcanakin:playtest-hints';
type HintId = 'turn' | 'mana' | 'tax';
function useDismissedHints() {
  // Lido na criação do estado: os avisos só aparecem depois de jogar, então a primeira
  // renderização (servidor e navegador) é a mesma.
  const [dismissed, setDismissed] = useState<HintId[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = JSON.parse(localStorage.getItem(HINTS_KEY) ?? '[]') as unknown;
      return Array.isArray(saved) ? (saved as HintId[]) : [];
    } catch {
      // Sem armazenamento (janela privada): os avisos só não ficam dispensados.
      return [];
    }
  });
  const dismiss = (id: HintId) =>
    setDismissed((list) => {
      const next = [...new Set([...list, id])];
      try {
        localStorage.setItem(HINTS_KEY, JSON.stringify(next));
      } catch {
        // Idem.
      }
      return next;
    });
  return { dismissed, dismiss };
}

/**
 * "?" ao lado de um termo do jogo: abre a definição do glossário logo abaixo, com o link para o
 * glossário (e a lição, se houver).
 */
function TermHelp({ id }: { id: string }) {
  const t = useTranslations('playtest');
  const locale = learnLocale(useLocale());
  const lessonTitle = useLessonTitle();
  const panel = useId();
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY.find((e) => e.id === id);
  if (!entry) return null;
  const text = entry[locale];
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full border border-line-strong text-sm font-bold text-link hover:bg-surface-muted"
        aria-expanded={open}
        aria-controls={open ? panel : undefined}
        aria-label={t('whatIs', { term: text.term })}
        title={t('whatIs', { term: text.term })}
        onClick={() => setOpen((o) => !o)}
      >
        ?
      </button>
      {open && (
        <span
          id={panel}
          className="mt-2 block max-w-sm rounded-xl border border-line-strong bg-surface p-3 text-sm font-normal"
        >
          <strong>{text.term}:</strong> {text.text}{' '}
          <Link
            href={`/aprender/glossario#${entry.id}`}
            className="text-link underline underline-offset-2"
          >
            {t('inGlossary')}
          </Link>
          {entry.lesson && (
            <>
              {' · '}
              <Link
                href={`/aprender/${entry.lesson}`}
                className="text-link underline underline-offset-2"
              >
                {t('lesson', { title: lessonTitle(entry.lesson) })}
              </Link>
            </>
          )}
        </span>
      )}
    </span>
  );
}

/** Aviso da trilha no momento certo (dispensável; fica dispensado neste aparelho). */
function Hint({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  const t = useTranslations('playtest');
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-line-strong bg-surface p-3 text-sm">
      <Icon name="learn" className="mt-0.5 size-5 shrink-0 text-link" />
      <p className="min-w-0 flex-1">{children}</p>
      <button type="button" className="btn-secondary text-sm" onClick={onDismiss}>
        {t('gotIt')}
      </button>
    </div>
  );
}

/**
 * Mesa de testes solo (11.4): turnos de mentira com o deck, sem regras automáticas. Tudo roda no
 * navegador (nada é gravado); cada ação guarda o estado anterior, para "Desfazer".
 */
export function PlaytestTable({
  lines,
  startingLife,
}: {
  lines: PlaytestLine[];
  startingLife: number;
}) {
  const t = useTranslations('playtest');
  const start = () => startPlaytest(lines, { startingLife, playFirst: true });
  const [history, setHistory] = useState<PlaytestState[]>(() => [start()]);
  const [playFirst, setPlayFirst] = useState(true);
  const [status, setStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const state = history[history.length - 1]!;

  const dispatch = (action: PlaytestAction, message?: string) => {
    setHistory((h) => [...h.slice(-99), playtest(h[h.length - 1]!, action)]);
    if (message) setStatus(message);
  };
  const undo = () => {
    if (history.length <= 1) return;
    setHistory((h) => h.slice(0, -1));
    setStatus(t('undone'));
  };
  const restart = () => {
    setHistory([start()]);
    setStatus(t('restarted'));
  };
  const keep = () => {
    let next = playtest(state, { type: 'keep' });
    // Quem joga depois compra no turno 1.
    if (!playFirst) next = playtest(next, { type: 'draw' });
    setHistory((h) => [...h, next]);
    setStatus(t('kept'));
  };

  const mana = manaAvailable(state);
  const hints = useDismissedHints();
  const lessonTitle = useLessonTitle();
  const taxed =
    state.zones.command.some((c) => commanderTax(state, c.uid) > 0) ||
    state.zones.battlefield.some((c) => c.isCommander && commanderTax(state, c.uid) > 0);
  const zoneName = (z: Target) => t(`zones.${z}`);
  const move = (card: PlaytestCard, to: Target) => {
    const action: PlaytestAction =
      to === 'libraryTop'
        ? { type: 'move', uid: card.uid, to: 'library', position: 'top' }
        : to === 'libraryBottom'
          ? { type: 'move', uid: card.uid, to: 'library', position: 'bottom' }
          : { type: 'move', uid: card.uid, to };
    dispatch(action, t('moved', { name: card.name, zone: zoneName(to) }));
  };

  const lands = state.zones.battlefield.filter((c) => c.isLand);
  const permanents = state.zones.battlefield.filter((c) => !c.isLand);
  const choosing = state.turn === 0;

  return (
    <div className="space-y-6">
      {/* Barra do turno: sempre à mão, no topo. */}
      <section
        aria-label={t('bar')}
        className="card sticky top-2 z-10 flex flex-wrap items-center gap-x-6 gap-y-3"
      >
        <p className="font-display text-2xl font-semibold">
          {choosing ? t('openingHand') : t('turn', { turn: state.turn })}
        </p>
        <div className="flex items-center gap-2" role="group" aria-label={t('life')}>
          <button
            type="button"
            className="btn-secondary px-3"
            onClick={() => dispatch({ type: 'life', delta: -1 })}
            aria-label={t('lifeMinus')}
          >
            −
          </button>
          <p className="min-w-16 text-center text-xl font-semibold tabular-nums">
            <span className="sr-only">{t('life')}: </span>
            {state.life}
          </p>
          <button
            type="button"
            className="btn-secondary px-3"
            onClick={() => dispatch({ type: 'life', delta: 1 })}
            aria-label={t('lifePlus')}
          >
            +
          </button>
        </div>
        <p className="flex flex-wrap items-center gap-1.5">
          <span>{t('mana', { count: mana.total })}</span>
          <span aria-hidden="true" className="inline-flex flex-wrap gap-1">
            {mana.sources.map((s, i) => (
              <span key={i} className="inline-flex">
                {s.split('').map((c, j) => (
                  <ManaSymbol key={j} symbol={c} />
                ))}
              </span>
            ))}
          </span>
        </p>
        <p className="muted inline-flex items-center gap-2">
          {t('library', { count: state.zones.library.length })}
          <TermHelp id="grimorio" />
        </p>
        <div className="flex flex-wrap gap-2 sm:ms-auto">
          {!choosing && (
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                dispatch({ type: 'nextTurn' }, t('nextTurnDone', { turn: state.turn + 1 }))
              }
            >
              <Icon name="next" />
              {t('nextTurn')}
            </button>
          )}
          {!choosing && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch({ type: 'draw' }, t('drew'))}
            >
              {t('draw')}
            </button>
          )}
          <button
            ref={searchButton}
            type="button"
            className="btn-secondary"
            onClick={() => setSearching(true)}
          >
            <Icon name="filter" />
            {t('search')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={undo}
            disabled={history.length <= 1}
          >
            <Icon name="undo" />
            {t('undo')}
          </button>
          <button type="button" className="btn-secondary" onClick={restart}>
            <Icon name="refresh" />
            {t('restart')}
          </button>
        </div>
      </section>
      <p role="status" className="sr-only">
        {status}
      </p>

      {/* Avisos da trilha no momento certo (uma vez por aparelho). */}
      {state.turn >= 2 && !hints.dismissed.includes('turn') && (
        <Hint onDismiss={() => hints.dismiss('turn')}>
          {t('hintTurn')}{' '}
          <Link href="/aprender/o-turno" className="text-link underline underline-offset-2">
            {t('lesson', { title: lessonTitle('o-turno') })}
          </Link>
        </Hint>
      )}
      {mana.total > 0 && !hints.dismissed.includes('mana') && (
        <Hint onDismiss={() => hints.dismiss('mana')}>
          {t('hintMana')}{' '}
          <Link href="/aprender/mana-e-terrenos" className="text-link underline underline-offset-2">
            {t('lesson', { title: lessonTitle('mana-e-terrenos') })}
          </Link>
        </Hint>
      )}
      {taxed && !hints.dismissed.includes('tax') && (
        <Hint onDismiss={() => hints.dismiss('tax')}>
          {t('hintTax')}{' '}
          <Link
            href="/aprender/glossario#imposto-do-comandante"
            className="text-link underline underline-offset-2"
          >
            {t('inGlossary')}
          </Link>
          {' · '}
          <Link
            href="/aprender/commander-o-formato"
            className="text-link underline underline-offset-2"
          >
            {t('lesson', { title: lessonTitle('commander-o-formato') })}
          </Link>
        </Hint>
      )}

      {choosing && (
        <section className="card space-y-3" aria-labelledby="mesa-mulligan">
          <div className="flex flex-wrap items-start gap-2">
            <h2 id="mesa-mulligan" className="section-title mb-0">
              {t('mulliganTitle', { count: state.mulligans })}
            </h2>
            <TermHelp id="mulligan" />
          </div>
          {state.toBottom > 0 ? (
            <p className="font-semibold">{t('chooseBottom', { count: state.toBottom })}</p>
          ) : (
            <p className="muted">{t('mulliganHint')}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={keep}
              disabled={state.toBottom > 0}
            >
              <Icon name="done" />
              {t('keep')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dispatch({ type: 'mulligan' }, t('mulliganed'))}
              disabled={state.mulligans >= 6}
            >
              <Icon name="refresh" />
              {t('mulligan')}
            </button>
            <label className="inline-flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={playFirst}
                onChange={(e) => setPlayFirst(e.target.checked)}
              />
              {t('playFirst')}
            </label>
          </div>
        </section>
      )}

      {state.zones.command.length > 0 && (
        <Zone
          title={t('zones.command')}
          count={state.zones.command.length}
          term="imposto-do-comandante"
        >
          {state.zones.command.map((c) => (
            <CardMenu
              key={c.uid}
              card={c}
              zone="command"
              note={t('tax', { tax: commanderTax(state, c.uid) })}
              targets={targetsFor(c, 'command')}
              zoneName={zoneName}
              onMove={(to) => move(c, to)}
            />
          ))}
        </Zone>
      )}

      <Zone title={t('lands')} count={lands.length} term="virar">
        {lands.map((c) => (
          <CardMenu
            key={c.uid}
            card={c}
            zone="battlefield"
            targets={targetsFor(c, 'battlefield')}
            zoneName={zoneName}
            onMove={(to) => move(c, to)}
            onTap={() =>
              dispatch(
                { type: 'toggleTap', uid: c.uid },
                t(c.tapped ? 'untapped' : 'tapped', { name: c.name }),
              )
            }
          />
        ))}
      </Zone>

      <Zone
        title={t('permanents')}
        count={permanents.length}
        term="ficha"
        action={
          <CreateToken
            onCreate={(name, count) =>
              dispatch({ type: 'createToken', name, count }, t('tokensCreated', { count, name }))
            }
          />
        }
      >
        {permanents.map((c) => (
          <CardMenu
            key={c.uid}
            card={c}
            zone="battlefield"
            targets={targetsFor(c, 'battlefield')}
            zoneName={zoneName}
            onMove={(to) => move(c, to)}
            onTap={() =>
              dispatch(
                { type: 'toggleTap', uid: c.uid },
                t(c.tapped ? 'untapped' : 'tapped', { name: c.name }),
              )
            }
          />
        ))}
      </Zone>

      <Zone title={t('zones.hand')} count={state.zones.hand.length}>
        {state.zones.hand.map((c) =>
          choosing && state.toBottom > 0 ? (
            <button
              key={c.uid}
              type="button"
              className="text-left"
              onClick={() =>
                dispatch({ type: 'bottom', uid: c.uid }, t('sentToBottom', { name: c.name }))
              }
              aria-label={t('sendToBottom', { name: c.name })}
            >
              <CardFace card={c} />
            </button>
          ) : (
            <CardMenu
              key={c.uid}
              card={c}
              zone="hand"
              targets={targetsFor(c, 'hand')}
              zoneName={zoneName}
              onMove={(to) => move(c, to)}
            />
          ),
        )}
      </Zone>

      <div className="grid gap-6 md:grid-cols-2">
        {(['graveyard', 'exile'] as const).map((zone) => (
          <Zone
            key={zone}
            title={t(`zones.${zone}`)}
            count={state.zones[zone].length}
            term={zone === 'graveyard' ? 'cemiterio' : 'exilio'}
          >
            {state.zones[zone].map((c) => (
              <CardMenu
                key={c.uid}
                card={c}
                zone={zone}
                targets={targetsFor(c, zone)}
                zoneName={zoneName}
                onMove={(to) => move(c, to)}
              />
            ))}
          </Zone>
        ))}
      </div>

      <SearchLibrary
        open={searching}
        onClose={() => setSearching(false)}
        returnFocus={searchButton}
        library={state.zones.library}
        onPick={(card, to) => {
          dispatch(
            { type: 'search', uid: card.uid, to },
            t('searched', { name: card.name, zone: zoneName(to) }),
          );
          setSearching(false);
        }}
      />
    </div>
  );
}

function Zone({
  title,
  count,
  action,
  term,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  /** Termo do glossário explicado no "?" ao lado do título. */
  term?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('playtest');
  const id = useId();
  return (
    <section className="card space-y-3" aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-start gap-2">
          <h2 id={id} className="section-title mb-0">
            {title} <span className="muted text-base font-normal">({count})</span>
          </h2>
          {term && <TermHelp id={term} />}
        </div>
        {action}
      </div>
      {count === 0 ? (
        <p className="muted text-sm">{t('emptyZone')}</p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {Array.isArray(children) ? (
            children.map((child, i) => <li key={i}>{child}</li>)
          ) : (
            <li>{children}</li>
          )}
        </ul>
      )}
    </section>
  );
}

/** A carta na mesa: imagem (virada, se estiver) ou o nome, quando não há imagem. */
function CardFace({ card }: { card: PlaytestCard }) {
  return (
    <span
      className={`block w-24 transition-transform motion-reduce:transition-none sm:w-28 ${card.tapped ? 'rotate-90' : ''}`}
    >
      {card.imageUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem do Scryfall, já em cache
        <img
          src={card.imageUri}
          alt=""
          className="aspect-[63/88] w-full rounded-lg object-cover shadow"
          loading="lazy"
        />
      ) : (
        <span className="flex aspect-[63/88] w-full items-center justify-center rounded-lg border border-line-strong bg-surface-muted p-2 text-center text-xs font-semibold">
          {card.name}
        </span>
      )}
    </span>
  );
}

function CardMenu({
  card,
  zone,
  targets,
  zoneName,
  onMove,
  onTap,
  note,
}: {
  card: PlaytestCard;
  zone: PlaytestZone;
  targets: Target[];
  zoneName: (z: Target) => string;
  onMove: (to: Target) => void;
  onTap?: () => void;
  note?: string;
}) {
  const t = useTranslations('playtest');
  const [viewing, setViewing] = useState(false);
  const label = [
    card.name,
    card.tapped ? t('isTapped') : '',
    card.isToken ? t('isToken') : '',
    note ?? '',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <>
      <MenuTrigger>
        <Button
          aria-label={t('cardActions', { card: label })}
          className="cursor-pointer rounded-lg outline-none data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-focus"
        >
          <CardFace card={card} />
          {note && <span className="muted mt-1 block text-center text-xs">{note}</span>}
        </Button>
        <Popover
          placement="bottom start"
          className="min-w-56 rounded-xl border border-line-strong bg-surface p-1 text-fg shadow-xl"
        >
          <Menu
            aria-label={t('cardActions', { card: card.name })}
            className="outline-none"
            onAction={(key) => {
              if (key === 'view') setViewing(true);
              else if (key === 'tap') onTap?.();
              else onMove(key as Target);
            }}
          >
            <MenuItem id="view" textValue={t('view')} className={menuItem}>
              <Icon name="info" />
              {t('view')}…
            </MenuItem>
            {onTap && (
              <MenuItem id="tap" textValue={t(card.tapped ? 'untap' : 'tap')} className={menuItem}>
                <Icon name="flip" />
                {t(card.tapped ? 'untap' : 'tap')}
              </MenuItem>
            )}
            {targets.map((to) => (
              <MenuItem
                key={to}
                id={to}
                textValue={t('moveTo', { zone: zoneName(to) })}
                className={menuItem}
              >
                <Icon name="next" />
                {zone === 'hand' && to === 'battlefield'
                  ? t('play')
                  : t('moveTo', { zone: zoneName(to) })}
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
      <CardDetail card={card} open={viewing} onClose={() => setViewing(false)} />
    </>
  );
}

/**
 * A carta aberta: imagem, custo, tipo, texto e as palavras-chave dela, com a definição do
 * glossário e os links para o glossário e a lição (ensina enquanto joga).
 */
function CardDetail({
  card,
  open,
  onClose,
}: {
  card: PlaytestCard;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('playtest');
  const locale = learnLocale(useLocale());
  const lessonTitle = useLessonTitle();
  const keywords = glossaryKeywordsIn(card.oracleText, locale);
  return (
    <Modal open={open} onClose={onClose} title={card.name}>
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        {card.imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagem do Scryfall, já em cache
          <img src={card.imageUri} alt="" className="aspect-[63/88] w-48 rounded-xl shadow" />
        ) : null}
        <div className="min-w-0 space-y-3">
          <p className="muted flex flex-wrap items-center gap-2 text-sm">
            {card.typeLine}
            <ManaCost cost={card.manaCost} />
          </p>
          {card.oracleText ? (
            <div className="space-y-1 text-sm whitespace-pre-line">
              <ManaText text={card.oracleText} />
            </div>
          ) : null}
          {keywords.length > 0 && (
            <section aria-label={t('keywords')} className="space-y-2">
              <h3 className="font-semibold">{t('keywords')}</h3>
              <ul className="space-y-2 text-sm">
                {keywords.map((k) => (
                  <li key={k.id}>
                    <strong>{k.term}:</strong> {k.text}{' '}
                    <Link
                      href={`/aprender/glossario#${k.id}`}
                      className="text-link underline underline-offset-2"
                    >
                      {t('inGlossary')}
                      <span className="sr-only"> ({k.term})</span>
                    </Link>
                    {k.lesson && (
                      <>
                        {' · '}
                        <Link
                          href={`/aprender/${k.lesson}`}
                          className="text-link underline underline-offset-2"
                        >
                          {t('lesson', { title: lessonTitle(k.lesson) })}
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CreateToken({ onCreate }: { onCreate: (name: string, count: number) => void }) {
  const t = useTranslations('playtest');
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [count, setCount] = useState('1');
  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <Icon name="add" />
        {t('createToken')}
      </button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Math.max(1, Math.min(50, Number(count) || 1));
        if (!name.trim()) return;
        onCreate(name.trim(), n);
        setName('');
        setCount('1');
        setOpen(false);
      }}
    >
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          {t('tokenName')}
        </label>
        <input
          id={`${id}-name`}
          className="input"
          value={name}
          maxLength={80}
          required
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-count`}>
          {t('tokenCount')}
        </label>
        <input
          id={`${id}-count`}
          className="input w-20"
          inputMode="numeric"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      </div>
      <button className="btn-primary">{t('create')}</button>
      <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
        {t('cancel')}
      </button>
    </form>
  );
}

function SearchLibrary({
  open,
  onClose,
  returnFocus,
  library,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  returnFocus: React.RefObject<HTMLButtonElement | null>;
  library: PlaytestCard[];
  onPick: (card: PlaytestCard, to: PlaytestZone) => void;
}) {
  const t = useTranslations('playtest');
  const id = useId();
  const [query, setQuery] = useState('');
  // Uma linha por carta diferente (a primeira cópia no grimório).
  const unique = useMemo(() => {
    const seen = new Map<string, PlaytestCard>();
    for (const c of library) if (!seen.has(c.name)) seen.set(c.name, c);
    const q = query.trim().toLowerCase();
    return [...seen.values()]
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.typeLine.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [library, query]);
  return (
    <Modal open={open} onClose={onClose} title={t('searchTitle')} returnFocus={returnFocus}>
      <p className="muted text-sm">{t('searchHint')}</p>
      <div>
        <label className="label" htmlFor={`${id}-q`}>
          {t('searchFilter')}
        </label>
        <input
          id={`${id}-q`}
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <ul className="max-h-[50dvh] divide-y divide-line overflow-y-auto">
        {unique.map((c) => (
          <li key={c.uid} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="font-semibold">{c.name}</span>
              <span className="muted block text-sm">{c.typeLine}</span>
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onPick(c, 'hand')}
                aria-label={t('toHandLabel', { name: c.name })}
              >
                {t('toHand')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onPick(c, 'battlefield')}
                aria-label={t('toBattlefieldLabel', { name: c.name })}
              >
                {t('toBattlefield')}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
