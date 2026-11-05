import { DomainError } from '../errors';
import { assertTimeZone, utcToZonedLocalInput, zonedLocalToUtc } from '../time';
import type { AvailabilitySlot } from './index';

/** Regra semanal: "toda quinta, das 19h às 23h". Horários no fuso em que a regra foi criada. */
export interface WeeklyRule {
  id: string;
  userId: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM". Igual ou menor que o início = termina no dia seguinte (ex.: 19:00–01:00). */
  endTime: string;
  timeZone: string;
  locationIds: readonly string[];
  /** Datas locais ("AAAA-MM-DD") em que a regra não vale ("nesta quinta não posso"). */
  exceptions: readonly string[];
}

export interface RuleOccurrence extends AvailabilitySlot {
  ruleId: string;
  /** Data local da ocorrência ("AAAA-MM-DD"), usada para criar exceções. */
  date: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

export function assertWeeklyRule(
  rule: Pick<WeeklyRule, 'weekday' | 'startTime' | 'endTime' | 'timeZone'>,
) {
  if (!Number.isInteger(rule.weekday) || rule.weekday < 0 || rule.weekday > 6) {
    throw new DomainError('invalid_input', 'Dia da semana inválido');
  }
  if (!TIME_RE.test(rule.startTime) || !TIME_RE.test(rule.endTime)) {
    throw new DomainError('invalid_input', 'Horário inválido (use HH:MM)');
  }
  if (rule.startTime === rule.endTime) {
    throw new DomainError('invalid_input', 'O início e o fim não podem ser iguais');
  }
  assertTimeZone(rule.timeZone);
}

export function assertLocalDate(date: string) {
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new DomainError('invalid_input', 'Data inválida (use AAAA-MM-DD)');
  }
}

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/**
 * Expande regras semanais em ocorrências concretas que intersectam [from, to).
 * Cada ocorrência é calculada no fuso da regra, então "19h" continua sendo 19h
 * mesmo quando o horário de verão muda.
 */
export function expandWeeklyRules(
  rules: readonly WeeklyRule[],
  from: Date,
  to: Date,
): RuleOccurrence[] {
  const occurrences: RuleOccurrence[] = [];
  for (const rule of rules) {
    assertWeeklyRule(rule);
    const exceptions = new Set(rule.exceptions);
    // Começa um dia antes para pegar ocorrências que atravessam a meia-noite.
    let date = utcToZonedLocalInput(new Date(from.getTime() - DAY), rule.timeZone).slice(0, 10);
    const lastDate = utcToZonedLocalInput(to, rule.timeZone).slice(0, 10);
    while (date <= lastDate) {
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (weekday === rule.weekday && !exceptions.has(date)) {
        const overnight = rule.endTime <= rule.startTime;
        const start = zonedLocalToUtc(`${date}T${rule.startTime}`, rule.timeZone);
        const end = zonedLocalToUtc(
          `${overnight ? addDays(date, 1) : date}T${rule.endTime}`,
          rule.timeZone,
        );
        if (end > from && start < to) {
          occurrences.push({
            ruleId: rule.id,
            date,
            userId: rule.userId,
            start,
            end,
            locationIds: rule.locationIds,
          });
        }
      }
      date = addDays(date, 1);
    }
  }
  return occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
}
