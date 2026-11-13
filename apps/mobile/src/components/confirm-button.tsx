import { useState } from 'react';
import { Button } from '@/components/ui';

/**
 * Ação destrutiva em dois toques (padrão do projeto): o primeiro toque arma o botão, que passa a
 * mostrar `confirmLabel`; o segundo executa. Sem `window.confirm`/`Alert`, funciona com leitor de tela.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  context,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  /** Contexto no nome acessível (ex.: nome do membro), já que o rótulo visível se repete. */
  context: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      label={armed ? confirmLabel : label}
      accessibilityLabel={`${armed ? confirmLabel : label}: ${context}`}
      variant={armed ? 'primary' : 'secondary'}
      disabled={busy || disabled}
      onPress={async () => {
        if (!armed) return setArmed(true);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setArmed(false);
        }
      }}
    />
  );
}
