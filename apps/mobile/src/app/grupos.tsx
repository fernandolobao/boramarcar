import { router } from 'expo-router';
import { NoGroup } from '@/components/no-group';

/** Entrar em outro grupo (código do convite) ou criar um, pela tela Conta. */
export default function GroupsScreen() {
  return <NoGroup onDone={() => router.back()} />;
}
