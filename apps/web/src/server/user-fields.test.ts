import { describe, expect, it } from 'vitest';
import { USER_NAME_MAX, allowedSignUpImage, cleanUserName } from './user-fields';

describe('campos da conta gravados pelo login', () => {
  it('nome: tira controles e espaços extras, limita o tamanho', () => {
    expect(cleanUserName('  Ana \u0007 Souza​  ')).toBe('Ana Souza');
    expect(cleanUserName('x'.repeat(500))).toHaveLength(USER_NAME_MAX);
    expect(cleanUserName(undefined)).toBe('');
  });

  it('foto: só a do Google; qualquer outra (rastreador, arquivo alheio) vira nenhuma', () => {
    expect(allowedSignUpImage('https://lh3.googleusercontent.com/a/abc=s96-c')).toBe(
      'https://lh3.googleusercontent.com/a/abc=s96-c',
    );
    expect(allowedSignUpImage('https://rastreador.example/p.gif')).toBeNull();
    expect(
      allowedSignUpImage('https://x.public.blob.vercel-storage.com/avatars/u2/f.webp'),
    ).toBeNull();
    expect(allowedSignUpImage('http://lh3.googleusercontent.com/a')).toBeNull();
    expect(allowedSignUpImage('https://googleusercontent.com.evil.example/a')).toBeNull();
    expect(allowedSignUpImage(null)).toBeNull();
  });
});
