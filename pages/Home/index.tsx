import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MasonryList from 'react-native-masonry-list';

import { apiGet } from '../../api/server';


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

export function HomeScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    fetchPhotosfromS3().then(setPhotos);
  }, []);

  const grouped = groupPhotosByDate(photos);

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
  section: { marginBottom: 24, flex: 1 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', margin: 8 },
  imageContainer: { borderRadius: 5 },
  masonryStyle: { flex: 1 },
});