'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Choices } from './ds/choices';
import { Icon } from './icons';
import { ManaText } from './mana';

/**
 * Pergunta de um desafio guiado (12.4): as respostas num radiogroup e "Responder". Depois de
 * responder, o resultado é anunciado e aparecem os comentários da resposta escolhida e da certa.
 * Acertar salva o desafio no progresso de quem tem conta.
 */
export function ChallengeQuiz({
  challengeId,
  question,
  options,
  signedIn,
}: {
  challengeId: string;
  question: string;
  options: { text: string; correct: boolean; why: string }[];
  signedIn: boolean;
}) {
  const t = useTranslations('learn.challenges');
  const [choice, setChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const right = answered !== null && options[answered]!.correct;

  const answer = () => {
    if (choice === null) return;
    const index = Number(choice);
    setAnswered(index);
    if (options[index]!.correct && signedIn) {
      void api('/api/v1/me/learn', {
        method: 'POST',
        body: { lessonId: challengeId, completed: true },
      })
        .then(() => setSaved(true))
        .catch(() => setSaved(false));
    }
  };

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          answer();
        }}
      >
        <Choices
          label={question}
          variant="cards"
          orientation="vertical"
          name={`challenge-${challengeId}`}
          value={choice ?? ''}
          onChange={(v) => {
            setChoice(v);
            setAnswered(null);
          }}
          options={options.map((o, i) => ({ value: String(i), label: o.text }))}
        />
        <button className="btn-primary" disabled={choice === null}>
          <Icon name="done" />
          {t('answer')}
        </button>
      </form>
      <div role="status" className="space-y-3">
        {answered !== null && (
          <>
            <p
              className={`flex items-center gap-2 font-semibold ${right ? 'text-success' : 'text-danger'}`}
            >
              <Icon name={right ? 'ok' : 'warning'} />
              {right ? t('right') : t('wrong')}
            </p>
            <ul className="space-y-2">
              {options.map((o, i) =>
                i === answered || (right && o.correct) ? (
                  <li
                    key={i}
                    className="rounded-xl border border-line-strong bg-surface p-3 text-sm"
                  >
                    <p className="font-medium">
                      {o.correct ? t('correctAnswer') : t('yourAnswer')}: {o.text}
                    </p>
                    <p className="mt-1">
                      <ManaText text={o.why} />
                    </p>
                  </li>
                ) : null,
              )}
            </ul>
            {right && saved && <p className="muted text-sm">{t('saved')}</p>}
            {!right && <p className="text-sm">{t('tryAgain')}</p>}
          </>
        )}
      </div>
    </div>
  );
}
