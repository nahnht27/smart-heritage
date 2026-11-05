import { useState } from 'react';
import {
  Image,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { isUsableMediaUrl } from '../services/heritageApi';

interface RemoteImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Renders a remote image only when the URL is a usable HTTP(S) value.
 * Falls back to a placeholder for null, invalid or failed images instead of
 * passing an undefined `uri` to React Native.
 */
export function RemoteImage({
  uri,
  style,
  placeholderStyle,
  accessibilityLabel,
}: RemoteImageProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const trimmedUri = typeof uri === 'string' ? uri.trim() : '';
  const showImage =
    isUsableMediaUrl(trimmedUri) && failedUri !== trimmedUri;

  if (!showImage) {
    return (
      <View
        style={[
          styles.placeholder,
          style as unknown as StyleProp<ViewStyle>,
          placeholderStyle,
        ]}
        accessible={Boolean(accessibilityLabel)}
        accessibilityLabel={
          accessibilityLabel
            ? `${accessibilityLabel} (no image available)`
            : undefined
        }
      />
    );
  }

  return (
    <Image
      source={{ uri: trimmedUri }}
      style={style}
      onError={() => setFailedUri(trimmedUri)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = {
  placeholder: {
    backgroundColor: '#E2E8F0',
  } satisfies ViewStyle,
};
