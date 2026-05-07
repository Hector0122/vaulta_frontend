import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MasonryList from 'react-native-masonry-list';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { apiGet } from '../../api/server';

type HomeStackParamList = {
  Main: undefined;
  Upload: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Main'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

type Photo = { uri: string; date: string };

function groupPhotosByDate(photos: Photo[]) {
  const groups: { [date: string]: Photo[] } = {};
  photos.forEach(photo => {
    if (!groups[photo.date]) groups[photo.date] = [];
    groups[photo.date].push(photo);
  });
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return sortedDates.map(date => ({ date, photos: groups[date] }));
}

async function fetchPhotosfromS3() {
  const data = await apiGet<string[]>('photos');
  const today = new Date().toISOString().slice(0, 10);
  return data.map((url: string) => ({ uri: url, date: today }));
}

export function HomeScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 800));
    const fetchData = fetchPhotosfromS3();

    Promise.all([fetchData, minLoadingTime]).then(([data]) => {
      setPhotos(data);
      setLoading(false);
    });
  }, []);

  const grouped = groupPhotosByDate(photos);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.uploadButton} onPress={() => navigation.navigate('Upload')}>
          <Icon name="add-a-photo" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {grouped.map(section => (
        <View key={section.date} style={styles.section}>
          <Text style={styles.dateLabel}>
            {new Date(section.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <MasonryList
            images={section.photos}
            imageContainerStyle={styles.imageContainer}
            style={styles.masonryStyle}
          />
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 10, alignItems: 'flex-end' },
  uploadButton: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  section: { marginBottom: 24, flex: 1 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', margin: 8 },
  imageContainer: { borderRadius: 5 },
  masonryStyle: { flex: 1 },
});