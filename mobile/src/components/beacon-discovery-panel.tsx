import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBeaconDiscovery } from '../hooks/use-beacon-discovery';

interface BeaconDiscoveryPanelProps {
  onOpenArtifact: (artifactId: number) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'scanning':
      return '#16A34A';
    case 'requesting_permission':
      return '#D97706';
    case 'permission_denied':
    case 'bluetooth_off':
    case 'location_off':
    case 'error':
      return '#DC2626';
    default:
      return '#94A3B8';
  }
}

export function BeaconDiscoveryPanel({
  onOpenArtifact,
}: BeaconDiscoveryPanelProps) {
  const {
    enabled,
    status,
    statusMessage,
    banner,
    enable,
    disable,
    dismissBanner,
  } = useBeaconDiscovery();

  const isBusy = status === 'requesting_permission';
  const artifactId = banner?.artifactId ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Khám phá bằng beacon</Text>
          <Text style={styles.description}>
            Tự động nhận hiện vật khi bạn đến gần.
          </Text>
        </View>
        {isBusy ? (
          <ActivityIndicator color="#D97706" />
        ) : (
          <Switch
            value={enabled}
            onValueChange={(value) => {
              void (value ? enable() : disable());
            }}
            trackColor={{ false: '#CBD5E1', true: '#FCD34D' }}
            thumbColor={enabled ? '#D97706' : '#F8FAFC'}
            accessibilityLabel="Bật hoặc tắt quét beacon"
          />
        )}
      </View>

      <View style={styles.statusRow}>
        <View
          style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]}
        />
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {banner && artifactId !== null ? (
        <View style={styles.banner}>
          <View style={styles.bannerText}>
            <Text style={styles.bannerLabel}>Beacon đã phát hiện</Text>
            <Text style={styles.bannerTitle}>{banner.artifactName || banner.name}</Text>
            <Text style={styles.bannerSubtitle}>
              {banner.siteName || banner.name}
            </Text>
          </View>
          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={styles.openButton}
              onPress={() => onOpenArtifact(artifactId)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết ${banner.artifactName || banner.name}`}
            >
              <Text style={styles.openButtonText}>Xem chi tiết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={dismissBanner}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Đóng thông báo beacon"
            >
              <Text style={styles.dismissButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  description: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#78350F',
  },
  banner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerText: {
    gap: 2,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  openButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#D97706',
    alignItems: 'center',
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
});
