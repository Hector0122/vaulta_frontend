declare module 'react-native-masonry-list' {
  import { ComponentType } from 'react';
  import { ViewStyle, ImageStyle } from 'react-native';

  export interface MasonryListProps {
    images: Array<{ uri: string }>;
    columns?: number;
    spacing?: number;
    imageContainerStyle?: ImageStyle | ImageStyle[];
    style?: ViewStyle | ViewStyle[];
  }

  const MasonryList: ComponentType<MasonryListProps>;
  export default MasonryList;
}