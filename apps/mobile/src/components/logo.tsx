import { logo } from '@boramarcar/tokens';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

/**
 * Logotipo ArcanaKin (o mesmo desenho do site, numa cor só). Lido pelo leitor de tela como
 * imagem com o nome do app; `decorative` quando o nome já está em texto ao lado.
 */
export function Logo({
  height = 28,
  color,
  decorative = false,
}: {
  height?: number;
  color?: string;
  decorative?: boolean;
}) {
  const colors = useColors();
  return (
    <Svg
      viewBox={logo.viewBox}
      width={height * logo.aspectRatio}
      height={height}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : t('appName')}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <Path d={logo.path} fill={color ?? colors.text} />
    </Svg>
  );
}
