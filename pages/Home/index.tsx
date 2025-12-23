import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import MasonryList from 'react-native-masonry-list';

const mockRecentPhotos = [
  { uri: 'https://picsum.photos/200/300?1', date: '2023-10-01' },
  { uri: 'https://picsum.photos/300/200?2', date: '2023-10-01' },
  { uri: 'https://picsum.photos/250/350?3', date: '2023-10-01' },
  { uri: 'https://picsum.photos/350/250?4', date: '2023-10-01' },
  { uri: 'https://picsum.photos/200/250?5', date: '2023-10-01' },
  { uri: 'https://picsum.photos/250/200?6', date: '2023-10-01' },
  { uri: 'https://picsum.photos/200/300?7', date: '2023-10-02' },
  { uri: 'https://picsum.photos/300/200?8', date: '2023-10-02' },
  { uri: 'https://picsum.photos/250/350?9', date: '2023-10-02' },
  { uri: 'https://picsum.photos/350/250?10', date: '2023-10-02' },
  { uri: 'https://picsum.photos/200/250?11', date: '2023-10-02' },
  { uri: 'https://picsum.photos/250/200?12', date: '2023-10-02' },
   { uri: 'https://picsum.photos/200/250?11', date: '2023-10-02' },
  { uri: 'https://picsum.photos/250/200?12', date: '2023-10-02' },
   { uri: 'https://picsum.photos/200/250?11', date: '2023-10-02' },
  { uri: 'https://picsum.photos/250/200?12', date: '2023-10-02' },
];

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

export function HomeScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    setPhotos(mockRecentPhotos);
  }, []);

  const grouped = groupPhotosByDate(photos);



  return (
    <ScrollView style={styles.container}>
      {grouped.map(section => (
        <View key={section.date} style={styles.section}>
          <Text style={styles.dateLabel}>
            {new Date(section.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <MasonryList
            images={section.photos}
            imageContainerStyle={styles.imageContainer}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
  section: { marginBottom: 24 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', margin: 8 },
  imageContainer: { borderRadius: 5 },
});