import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Validation states
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Field validation logic per Sprint 2 requirements
  const validateForm = (): boolean => {
    const newErrors: { identifier?: string; password?: string } = {};

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      newErrors.identifier = 'Vui lòng nhập Email hoặc Tên đăng nhập';
    } else if (trimmedId.includes('@')) {
      // Basic email format check if user appears to enter an email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedId)) {
        newErrors.identifier = 'Định dạng email chưa hợp lệ';
      }
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải chứa ít nhất 6 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    // UI-only authentication simulation per Sprint 2 scope:
    // "The screen may be UI-only until M1's authentication API contract is ready. Do not invent a separate authentication mechanism."
    setIsLoading(true);

    try {
      // Simulate network response latency
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Successful simulated login
      setIsLoading(false);
      router.replace('/home');
    } catch (err) {
      setIsLoading(false);
      setGeneralError('Đăng nhập không thành công. Vui lòng thử lại sau.');
    }
  };

  const handleGuestEntry = () => {
    // Visitor bypass login option
    router.replace('/home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branding & Logo Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🏛️</Text>
          </View>
          <Text style={styles.appTitle}>Smart Heritage</Text>
          <Text style={styles.appSubtitle}>Cổng thông tin & Trải nghiệm Di sản Văn hóa</Text>
        </View>

        {/* General Error Banner */}
        {generalError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{generalError}</Text>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Đăng nhập dành cho Khách tham quan</Text>
          <Text style={styles.formSubtitle}>
            Đăng nhập để lưu lại lịch sử tham quan và hiện vật yêu thích của bạn
          </Text>

          {/* Identifier Input (Email / Username) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email hoặc Tên đăng nhập</Text>
            <TextInput
              style={[styles.input, errors.identifier ? styles.inputError : null]}
              placeholder="ví dụ: visitor@example.com"
              placeholderTextColor="#94A3B8"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (errors.identifier) {
                  setErrors((prev) => ({ ...prev, identifier: undefined }));
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isLoading}
            />
            {errors.identifier && (
              <Text style={styles.fieldErrorText}>{errors.identifier}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  errors.password ? styles.inputError : null,
                ]}
                placeholder="Nhập ít nhất 6 ký tự"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.fieldErrorText}>{errors.password}</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading ? styles.buttonDisabled : null]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.loginButtonText}>Đang xác thực...</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* Guest / Direct Entry Option */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestEntry}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.guestButtonText}>
              Tiếp tục với tư cách Khách tham quan →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Sprint 2: Giao diện giả lập đăng nhập UI-only. API Auth chính thức sẽ đồng bộ cùng M1/Backend.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark Slate Blue - Premium Heritage Header
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#D97706',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  fieldErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  loginButton: {
    height: 50,
    backgroundColor: '#D97706', // Warm Amber / Heritage Gold
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#D97706',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  guestButton: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  guestButtonText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
