declare module 'react-native-masonry-list' {
  import { ComponentType } from 'react';
  import { ViewStyle, ImageStyle } from 'react-native';

  export interface MasonryListProps {
    images: Array<{ uri: string }>;
    columns?: number;
    spacing?: number;
    imageContainerStyle?: ImageStyle | ImageStyle[];
    style?: ViewStyle | ViewStyle[];
    rerender?: boolean;
    masonryFlatListColProps?: Record<string, any>;
    customImageComponent?: React.ComponentType<any>;
    customImageProps?: Record<string, any>;
    onPressImage?: (data: { uri: string }, index: number) => void;
    onLongPressImage?: (data: { uri: string }, index: number) => void;
  }

  const MasonryList: ComponentType<MasonryListProps>;
  export default MasonryList;
}