import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NitroImage } from 'react-native-nitro-image';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { authenticatedGet, deletePhoto } from '../../api/client';

type DuplicateGroup = {
  id: string;
  url: string;
  filename: string;
  perceptualHash: string;
  blurred: boolean;
  blurScore: number | null;
  createdAt: string;
}[];

export default function DuplicatesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    authenticatedGet<DuplicateGroup[]>('photos/duplicates')
      .then(data => {
        setGroups(data);
        setLoading(false);
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudieron cargar los duplicados');
        setLoading(false);
      });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    Alert.alert(
      'Eliminar duplicados',
      `Eliminar ${selected.size} foto(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            for (const id of selected) {
              try {
                await deletePhoto(id);
              } catch { /* skip */ }
            }
            setGroups(prev =>
              prev
                .map(g => g.filter(p => !selected.has(p.id)))
                .filter(g => g.length > 1),
            );
            setSelected(new Set());
          },
        },
      ],
    );
  };

  const selectAll = () => {
    const all = new Set<string>();
    groups.forEach(g => g.forEach(p => all.add(p.id)));
    setSelected(all);
  };

  const renderGroup = useCallback(({ item: group }: { item: DuplicateGroup }) => (
    <View style={[styles.group, { backgroundColor: colors.cardBg }]}>
      <View style={styles.groupHeader}>
        <Icon name="content-copy" size={18} color={colors.textTertiary} />
        <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
          {group.length} fotos similares
        </Text>
      </View>
      <View style={styles.groupRow}>
        {group.map(photo => (
          <TouchableOpacity
            key={photo.id}
            style={[
              styles.thumbWrap,
              selected.has(photo.id) && { borderColor: colors.primary, borderWidth: 2 },
            ]}
            onPress={() => toggleSelect(photo.id)}
          >
            <NitroImage
              image={{ url: photo.uri }}
              style={styles.thumb}
              resizeMode="cover"
              recyclingKey={photo.id}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [colors, selected, toggleSelect]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon name="check-circle" size={64} color={colors.success} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hay fotos duplicadas
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Duplicados</Text>
        <TouchableOpacity onPress={selectAll}>
          <Text style={[styles.selectAll, { color: colors.primary }]}>Todo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={renderGroup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  selectAll: { fontSize: 15, fontWeight: '600' },
  list: { padding: 12, gap: 12, paddingBottom: 80 },
  group: {
    borderRadius: 12,
    padding: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupCount: { fontSize: 13, fontWeight: '500' },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumbWrap: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderColor: 'transparent',
    borderWidth: 2,
  },
  thumb: { width: '100%', height: '100%' },
  blurryBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
