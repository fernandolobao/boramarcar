import { redirect } from 'next/navigation';

/** Os recordes agora ficam na própria página do grupo (endereço antigo, de links e avisos). */
export default function GroupRecordsPage() {
  redirect('/grupo#recordes');
}
