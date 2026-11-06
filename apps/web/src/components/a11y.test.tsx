// @vitest-environment jsdom
/**
 * Auditoria automática (axe-core) dos componentes interativos. Todo componente novo
 * com formulário ou controles deve entrar aqui. Contraste é verificado no E2E (navegador real).
 */
import axe from 'axe-core';
import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../messages/pt-BR.json';
import { AvailabilityForm, CreateEventFromWindowButton, DeleteButton } from './availability-forms';
import { DeckImportForm, ProxyToggle } from './deck-forms';
import { EventManage, EventStatusBadge } from './event-manage';
import { NewEventForm, RsvpButtons } from './event-forms';
import { GameEditor } from './game-editor';
import { GameForm } from './game-form';
import { GamePlayers } from './game-players';
import { GroupSettingsForm } from './group-settings-form';
import { SeasonForm } from './season-form';
import { CreateGroupForm, JoinGroupForm, LocationForm, SwitchGroupButton } from './group-forms';
import { JoinInviteButton, RegenerateInviteButton } from './invite';
import { NavLinks } from './nav-links';
import { AvailabilityGrid } from './availability-grid';
import { MemberActions } from './member-actions';
import { buildWeekGrid } from '@boramarcar/core/availability';
import { ProfileForm } from './profile-form';
import { ShareButtons } from './share-buttons';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/eventos/1',
}));

afterEach(cleanup);

async function audit(ui: ReactElement) {
  const { container } = render(
    <NextIntlClientProvider locale="pt-BR" messages={messages} timeZone="America/Sao_Paulo">
      <main>{ui}</main>
    </NextIntlClientProvider>,
  );
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
}

const locations = [{ id: 'l1', name: 'Casa da Ana' }];

const grid = buildWeekGrid({
  weekStart: '2026-11-09',
  timeZone: 'America/Sao_Paulo',
  currentUserId: 'a',
  hours: [19, 20],
  slots: [
    {
      userId: 'a',
      start: new Date('2026-11-12T22:00:00Z'),
      end: new Date('2026-11-13T00:00:00Z'),
      kind: 'once',
    },
    {
      userId: 'b',
      start: new Date('2026-11-12T22:00:00Z'),
      end: new Date('2026-11-13T00:00:00Z'),
      kind: 'weekly',
    },
  ],
});
const member = { userId: 'b', name: 'Bia', role: 'member' as const };

const gamePlayers = [
  { userId: 'a', name: 'Ana', decks: [{ id: 'd', name: 'Omnath' }] },
  { userId: 'b', name: 'Bia', decks: [] },
  { userId: 'c', name: 'Caio', decks: [] },
  { userId: 'd', name: 'Dani', decks: [] },
];

const cases: [string, ReactElement][] = [
  [
    'AvailabilityGrid',
    <AvailabilityGrid
      key="grid"
      groupId="g"
      grid={grid}
      members={[
        { userId: 'a', name: 'Ana' },
        { userId: 'b', name: 'Bia' },
      ]}
      minPlayers={4}
    />,
  ],
  [
    'MemberActions (dono vendo membro)',
    <MemberActions
      key="ma1"
      groupId="g"
      actorId="a"
      actorRole="owner"
      member={member}
      memberCount={3}
    />,
  ],
  [
    'MemberActions (dono saindo)',
    <MemberActions
      key="ma2"
      groupId="g"
      actorId="a"
      actorRole="owner"
      member={{ userId: 'a', name: 'Ana', role: 'owner' }}
      memberCount={3}
    />,
  ],
  ['AvailabilityForm', <AvailabilityForm key="a" groupId="g" locations={locations} />],
  ['DeleteButton', <DeleteButton key="b" path="/x" label="Remover disponibilidade de sábado" />],
  [
    'CreateEventFromWindowButton',
    <CreateEventFromWindowButton
      key="c"
      groupId="g"
      title="Commander"
      startsAt="2030-01-01T22:00:00Z"
      endsAt="2030-01-02T02:00:00Z"
      locationId={null}
      participantIds={[]}
    />,
  ],
  ['DeckImportForm', <DeckImportForm key="d" />],
  [
    'ProxyToggle',
    <ProxyToggle key="e" deckId="d" cardId="c" isProxy={false} label="Proxy: Sol Ring" />,
  ],
  [
    'EventManage',
    <EventManage
      key="f"
      eventId="e"
      title="Commander"
      startsAt="2030-01-01T22:00:00Z"
      endsAt={null}
      locationId={null}
      status="scheduled"
      locations={locations}
    />,
  ],
  ['EventStatusBadge', <EventStatusBadge key="g" status="finished" />],
  ['NewEventForm', <NewEventForm key="h" groupId="g" locations={locations} />],
  [
    'GameForm (commander)',
    <GameForm key="i" eventId="e" defaultFormat="commander" players={gamePlayers} />,
  ],
  [
    'GameForm (2HG, edição)',
    <GameForm
      key="i2"
      gameId="g"
      defaultFormat="commander"
      players={gamePlayers}
      initial={{
        format: 'two_headed_giant',
        firstPlayerId: 'a',
        winningTurn: 7,
        durationMinutes: 60,
        notes: null,
        players: gamePlayers.map((p, i) => ({
          userId: p.userId,
          result: i % 2 === 0 ? 'win' : 'loss',
          deckId: null,
          team: (i % 2) + 1,
          eliminatedOrder: null,
        })),
      }}
    />,
  ],
  [
    'GameEditor',
    <GameEditor
      key="i3"
      gameId="g"
      number={2}
      players={gamePlayers}
      initial={{
        format: 'standard',
        firstPlayerId: null,
        winningTurn: null,
        durationMinutes: null,
        notes: null,
        players: [
          { userId: 'a', result: 'win', deckId: 'd', team: null, eliminatedOrder: null },
          { userId: 'b', result: 'loss', deckId: null, team: null, eliminatedOrder: null },
        ],
      }}
    />,
  ],
  [
    'GamePlayers',
    <GamePlayers
      key="i4"
      showTeams
      players={[
        {
          userId: 'a',
          name: 'Ana',
          result: 'win',
          team: 1,
          eliminatedOrder: null,
          deckName: 'Omnath',
          deck: { artUri: 'https://cards.scryfall.io/art_crop/x.jpg', cards: [{ name: 'Omnath' }] },
        },
        {
          userId: 'b',
          name: 'Bia',
          result: 'loss',
          team: 2,
          eliminatedOrder: 1,
          deckName: null,
          deck: null,
        },
      ]}
    />,
  ],
  [
    'GroupSettingsForm',
    <GroupSettingsForm
      key="i5"
      groupId="g"
      canEdit
      settings={{
        tableSize: 4,
        minDurationMinutes: 120,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        defaultFormat: 'commander',
      }}
    />,
  ],
  ['RsvpButtons', <RsvpButtons key="j" eventId="e" current="yes" />],
  ['CreateGroupForm', <CreateGroupForm key="k" />],
  ['JoinGroupForm', <JoinGroupForm key="l" />],
  ['LocationForm', <LocationForm key="m" groupId="g" />],
  ['SwitchGroupButton', <SwitchGroupButton key="n" groupId="g" />],
  ['JoinInviteButton', <JoinInviteButton key="o" inviteCode="ABCD2345" />],
  ['RegenerateInviteButton', <RegenerateInviteButton key="p" groupId="g" />],
  [
    'NavLinks',
    <NavLinks
      key="q"
      label="Navegação principal"
      links={[
        { href: '/painel', label: 'Painel' },
        { href: '/eventos', label: 'Encontros' },
      ]}
    />,
  ],
  ['ProfileForm', <ProfileForm key="r" />],
  ['SeasonForm', <SeasonForm key="r2" groupId="g" />],
  [
    'ShareButtons',
    <ShareButtons key="s" text="t" url="https://x.app" title="Grupo" icsHref="/x.ics" />,
  ],
];

describe('acessibilidade dos componentes (axe-core)', () => {
  it.each(cases)('%s não tem violações', async (_name, ui) => {
    expect(await audit(ui)).toEqual([]);
  });

  it('marca a página atual na navegação', () => {
    const { getByRole } = render(
      <NavLinks
        label="Navegação principal"
        links={[
          { href: '/painel', label: 'Painel' },
          { href: '/eventos', label: 'Encontros' },
        ]}
      />,
    );
    expect(getByRole('link', { name: 'Encontros' })).toHaveAttribute('aria-current', 'page');
    expect(getByRole('link', { name: 'Painel' })).not.toHaveAttribute('aria-current');
  });
});
