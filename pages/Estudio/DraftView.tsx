import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import RNFS from 'react-native-fs'
import Share from 'react-native-share'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { RouteProp } from '@react-navigation/native'
import { useTheme } from '../../theme'
import { iconSize, radius, spacing } from '../../tokens'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getPhotoDetail, getToken } from '../../api/client'
import { isPresignedUrl } from '../../utils/urls'
import { deleteDraft, getDraft, updateDraft, type Draft, type DraftRatio } from '../../api/estudio'
import type { StackNavProp, StackParamList } from '../../types/navigation'

type Props = {
  navigation: StackNavProp
  route: RouteProp<StackParamList, 'EstudioDraft'>
}

type Slide = { id: string; uri: string | null }

export default function DraftView({ navigation, route }: Props) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { width } = useWindowDimensions()
  const [draft, setDraft] = useState<Draft | undefined>(() => getDraft(route.params.draftId))
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [authHeaders, setAuthHeaders] = useState<Record<string, string> | undefined>()
  const [page, setPage] = useState(0)
  const [preparing, setPreparing] = useState(false)

  const photoIds = draft?.photoIds
  useEffect(() => {
    if (!photoIds) return
    let alive = true
    ;(async () => {
      const token = await getToken()
      if (token) setAuthHeaders({ Authorization: `Bearer ${token}` })
      // URLs frescas en cada apertura: las firmadas caducan
      const results = await Promise.allSettled(photoIds.map(id => getPhotoDetail(id)))
      if (!alive) return
      const next = results.map((r, i) => ({
        id: photoIds[i],
        uri: r.status === 'fulfilled' ? r.value.largeUri ?? r.value.url : null,
      }))
      const missing = next.filter(s => !s.uri).length
      if (missing > 0) showToast({ message: `${missing} foto(s) ya no están disponibles`, type: 'error' })
      setSlides(next)
    })()
    return () => {
      alive = false
    }
  }, [photoIds, showToast])

  if (!draft) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Este borrador ya no existe</Text>
      </View>
    )
  }

  const save = (patch: Partial<Pick<Draft, 'caption' | 'ratio' | 'published'>>) => {
    updateDraft(draft.id, patch)
    setDraft({ ...draft, ...patch })
  }

  const frameW = width - spacing.md * 2
  const frameH = frameW * (draft.ratio === '4:5' ? 1.25 : 1)
  const displayName = user?.name || 'tu_cuenta'

  const handlePrepare = async () => {
    const ready = (slides ?? []).filter((s): s is { id: string; uri: string } => !!s.uri)
    if (ready.length === 0) return
    setPreparing(true)
    try {
      if (draft.caption) Clipboard.setString(draft.caption)
      const files = await Promise.all(
        ready.map(async (s, i) => {
          const dest = `${RNFS.CachesDirectoryPath}/estudio_${draft.id}_${i}.jpg`
          const headers = isPresignedUrl(s.uri) ? undefined : authHeaders
          const res = await RNFS.downloadFile({ fromUrl: s.uri, toFile: dest, headers }).promise
          if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`)
          return Platform.OS === 'android' ? `file://${dest}` : dest
        }),
      )
      if (draft.caption) showToast({ message: 'Caption copiado — pégalo en Instagram', type: 'success' })
      await Share.open({ urls: files, type: 'image/jpeg', failOnCancel: false })
    } catch (e) {
      console.warn('[estudio] preparar falló', e)
      showToast({ message: 'No se pudieron preparar las fotos', type: 'error' })
    } finally {
      setPreparing(false)
    }
  }

  const handleDelete = () =>
    Alert.alert('Eliminar borrador', 'Las fotos siguen en Vaulta; solo se borra la publicación.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteDraft(draft.id)
          navigation.goBack()
        },
      },
    ])

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Vista previa tipo publicación de Instagram */}
      <View style={[styles.post, { backgroundColor: colors.surface }]}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
        </View>

        {slides === null ? (
          <View style={[styles.center, { width: frameW, height: frameH }]}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : (
          <FlatList
            data={slides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={s => s.id}
            onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / frameW))}
            renderItem={({ item }) => (
              <View style={{ width: frameW, height: frameH, backgroundColor: colors.skeleton }}>
                {item.uri ? (
                  <Image
                    source={{ uri: item.uri, headers: isPresignedUrl(item.uri) ? undefined : authHeaders }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.center}>
                    <Icon name="image-off-outline" size={iconSize.lg} color={colors.textTertiary} />
                  </View>
                )}
              </View>
            )}
          />
        )}

        {draft.photoIds.length > 1 && (
          <View style={styles.dots}>
            {draft.photoIds.map((id, i) => (
              <View
                key={id}
                style={[styles.dot, { backgroundColor: i === page ? colors.primary : colors.border }]}
              />
            ))}
          </View>
        )}

        <View style={styles.postActions}>
          {['heart-outline', 'comment-outline', 'send-outline'].map(n => (
            <Icon key={n} name={n} size={iconSize.md} color={colors.text} style={{ marginRight: spacing.sm }} />
          ))}
        </View>
        {!!draft.caption && (
          <Text style={[styles.postCaption, { color: colors.text }]}>
            <Text style={styles.name}>{displayName} </Text>
            {draft.caption}
          </Text>
        )}
      </View>

      {/* Edición */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>Formato</Text>
      <View style={styles.segment}>
        {(['4:5', '1:1'] as DraftRatio[]).map(r => {
          const active = draft.ratio === r
          return (
            <TouchableOpacity
              key={r}
              onPress={() => save({ ratio: r })}
              style={[
                styles.segmentItem,
                { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                {r === '4:5' ? '4:5 vertical' : '1:1 cuadrado'}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Caption</Text>
      <TextInput
        value={draft.caption}
        onChangeText={caption => save({ caption })}
        placeholder="Escribe el texto de la publicación…"
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={2200} // límite de caption de Instagram
        style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
        accessibilityLabel="Caption"
      />
      <Text style={[styles.counter, { color: colors.textTertiary }]}>{draft.caption.length}/2200</Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: preparing || !slides ? 0.6 : 1 }]}
        onPress={handlePrepare}
        disabled={preparing || !slides}
        accessibilityRole="button"
      >
        {preparing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="instagram" size={iconSize.md} color="#fff" />
            <Text style={styles.primaryText}>Preparar para subir</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={() => save({ published: !draft.published })}
          accessibilityRole="button"
        >
          <Icon
            name={draft.published ? 'check-circle' : 'check-circle-outline'}
            size={iconSize.sm}
            color={draft.published ? colors.success : colors.text}
          />
          <Text style={{ color: colors.text, marginLeft: spacing.xxs }}>
            {draft.published ? 'Publicada' : 'Marcar publicada'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={handleDelete}
          accessibilityRole="button"
        >
          <Icon name="delete-outline" size={iconSize.sm} color={colors.danger} />
          <Text style={{ color: colors.danger, marginLeft: spacing.xxs }}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  post: { borderRadius: radius.md, overflow: 'hidden' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { fontWeight: '700', marginLeft: spacing.xs },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
  postActions: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  postCaption: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.xs },
  segment: { flexDirection: 'row', gap: spacing.xs },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  counter: { fontSize: 11, textAlign: 'right', marginTop: spacing.xxs },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.xxl },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
})
