'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DeleteButton } from '../availability-forms';
import { Icon } from '../icons';
import { DirectionsLinks } from './directions';
import { LocationForm, type LocationView } from './location-form';
import { LocationMap } from './location-map';

/** Locais do grupo (2.14): mapa com todos, lista com rotas e edição, e o formulário para cadastrar. */
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
        <p className="muted">{t('empty')}</p>
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
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
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
                    {canEdit(l) && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setEditing(l.id)}
                        >
                          <Icon name="edit" />
                          {t('edit')}
                          <span className="sr-only"> ({l.name})</span>
                        </button>
                        <DeleteButton
                          path={`/api/v1/groups/${groupId}/locations/${l.id}`}
                          context={l.name}
                        />
                      </div>
                    )}
                  </div>
                  <DirectionsLinks place={l} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-ink-200 pt-6 dark:border-ink-800">
        <LocationForm groupId={groupId} members={members} near={near} />
      </div>
    </div>
  );
}
