'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DeleteButton } from '../availability-forms';
import { Icon } from '../icons';
import { DirectionsLinks } from './directions';
import { LocationForm, type LocationView } from './location-form';
import { LocationMap } from './location-map';
import { EmptyState } from '../empty-state';
import { ModalButton } from '../modal-button';

/** Locais do grupo (2.14): mapa com todos e a lista com rotas e edição (cadastrar: `AddLocationButton`). */
export function LocationsSection({
  groupId,
  locations,
  members,
  canManageAll,
  userId,
}: {
  groupId: string;
  locations: readonly LocationView[];
  members: readonly { userId: string; name: string }[];
  /** Dono/admin do grupo edita qualquer local. */
  canManageAll: boolean;
  userId: string;
}) {
  const t = useTranslations('places');
  const [editing, setEditing] = useState<string | null>(null);
  const points = locations.flatMap((l) =>
    l.lat !== null && l.lng !== null ? [{ id: l.id, name: l.name, lat: l.lat, lng: l.lng }] : [],
  );
  const near = points[0] ? { lat: points[0].lat, lng: points[0].lng } : null;
  const canEdit = (l: LocationView) =>
    canManageAll || l.createdBy === userId || l.hostUserId === userId;

  return (
    <div className="space-y-6">
      {points.length > 0 && <LocationMap points={points} label={t('groupMap')} className="h-72" />}
      {locations.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <ul className="divide-y divide-ink-200 dark:divide-ink-800">
          {locations.map((l) => (
            <li key={l.id} className="space-y-3 py-4">
              {editing === l.id ? (
                <LocationForm
                  groupId={groupId}
                  members={members}
                  location={l}
                  near={near}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 font-semibold">
                      <Icon name="location" />
                      {l.name}
                    </h3>
                    {l.address && <p className="text-sm">{l.address}</p>}
                    {l.details && <p className="muted text-sm">{l.details}</p>}
                    {l.hostName && (
                      <p className="muted text-sm">{t('hostedBy', { name: l.hostName })}</p>
                    )}
                    {l.lat === null && <p className="muted text-xs">{t('noPin')}</p>}
                  </div>
                  {/* Uma linha de botões pequenos; os apps de mapa abrem abaixo dela. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <DirectionsLinks place={l} collapsible />
                    {canEdit(l) && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary px-3 py-1.5 text-sm"
                          onClick={() => setEditing(l.id)}
                        >
                          <Icon name="edit" />
                          <span className="sr-only sm:not-sr-only">{t('edit')}</span>
                          <span className="sr-only"> ({l.name})</span>
                        </button>
                        <DeleteButton
                          path={`/api/v1/groups/${groupId}/locations/${l.id}`}
                          context={l.name}
                          small
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Adicionar local" (canto da seção de locais): o formulário num modal, que fecha ao salvar. */
export function AddLocationButton({
  groupId,
  members,
  near,
}: {
  groupId: string;
  members: readonly { userId: string; name: string }[];
  near: { lat: number; lng: number } | null;
}) {
  const t = useTranslations('places');
  return (
    <ModalButton label={t('add')} title={t('addTitle')} icon="add">
      {(close) => (
        <LocationForm
          groupId={groupId}
          members={members}
          near={near}
          heading={false}
          onDone={close}
        />
      )}
    </ModalButton>
  );
}
