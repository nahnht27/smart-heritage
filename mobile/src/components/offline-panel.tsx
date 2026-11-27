import React, { useState, useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getApiBaseUrl } from '../services/api';
import { saveServerUrl } from '../services/serverSettings';
import { formatBytes } from '../services/offline/plan';
import {
  downloadOfflinePack,
  removeOfflinePack,
  type DownloadProgress,
} from '../services/offline/packFiles';
import {
  getOfflinePack,
  subscribeToOfflinePack,
} from '../services/offline/store';
import { flushPendingInteractions } from '../services/interactionApi';

/** Download, update and remove the offline content pack. */
export function OfflinePanel() {
  const pack = useSyncExternalStore(
    subscribeToOfflinePack,
    getOfflinePack,
    getOfflinePack,
  );
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsBusy(true);
    setError(null);
    setProgress(null);
    try {
      await downloadOfflinePack(setProgress);
      void flushPendingInteractions();
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : '';
      setError(
        `Tải chưa xong. Kiểm tra Wi-Fi và địa chỉ máy chủ rồi thử lại.${
          detail ? `\n${detail}` : ''
        }`,
      );
    } finally {
      setIsBusy(false);
      setProgress(null);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Xóa nội dung đã tải?',
      'Bạn sẽ cần kết nối máy chủ để xem lại nội dung.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            void removeOfflinePack();
          },
        },
      ],
    );
  };

  const handleSaveServer = async () => {
    const saved = await saveServerUrl(serverUrl);
    setServerMessage(
      saved
        ? `Đang dùng: ${getApiBaseUrl()}`
        : 'Địa chỉ không hợp lệ. Ví dụ: 192.168.1.48:8081',
    );
  };

  const percent =
    progress && progress.totalBytes > 0
      ? Math.round((progress.doneBytes / progress.totalBytes) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xem không cần mạng</Text>
      <Text style={styles.description}>
        {pack
          ? `Đã tải ${pack.manifest.artifacts.length} hiện vật, ${formatBytes(
              pack.totalBytes,
            )} (${new Date(pack.downloadedAt).toLocaleDateString('vi-VN')}).`
          : 'Tải toàn bộ nội dung một lần qua Wi-Fi, sau đó xem và quét beacon không cần mạng.'}
      </Text>

      {isBusy ? (
        <View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <View style={styles.busyRow}>
            <ActivityIndicator color="#D97706" />
            <Text style={styles.description}>
              {progress
                ? `${progress.doneFiles}/${progress.totalFiles} tệp · ${formatBytes(
                    progress.doneBytes,
                  )} / ${formatBytes(progress.totalBytes)}`
                : 'Đang chuẩn bị...'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleDownload}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>
              {pack ? 'Cập nhật' : 'Tải về máy'}
            </Text>
          </TouchableOpacity>
          {pack && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleRemove}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Xóa</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowSettings((value) => !value)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Máy chủ</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {showSettings && !isBusy && (
        <View style={styles.settings}>
          <Text style={styles.description}>Đang dùng: {getApiBaseUrl()}</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="IP:cổng, để trống = mặc định"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="Địa chỉ máy chủ"
          />
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSaveServer}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Lưu địa chỉ</Text>
          </TouchableOpacity>
          {serverMessage && (
            <Text style={styles.description}>{serverMessage}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  description: { fontSize: 13, color: '#64748B', flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryButton: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: { color: '#334155', fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#D97706' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  error: { color: '#DC2626', fontSize: 13 },
  settings: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0F172A',
  },
});
