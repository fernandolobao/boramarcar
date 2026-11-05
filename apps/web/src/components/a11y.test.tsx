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
import { NewEventForm, RecordGameForm, RsvpButtons } from './event-forms';
import { CreateGroupForm, JoinGroupForm, LocationForm, SwitchGroupButton } from './group-forms';
import { JoinInviteButton, RegenerateInviteButton } from './invite';
import { NavLinks } from './nav-links';
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

const cases: [string, ReactElement][] = [
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
    'RecordGameForm',
    <RecordGameForm
      key="i"
      eventId="e"
      players={[
        { userId: 'a', name: 'Ana', decks: [{ id: 'd', name: 'Omnath' }] },
        { userId: 'b', name: 'Bia', decks: [] },
      ]}
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
