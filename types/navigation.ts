import { StackNavigationProp } from '@react-navigation/stack'
import { RouteProp } from '@react-navigation/native'

export type TabParamList = {
  Timeline: undefined
  Albums: undefined
}

export type StackParamList = {
  Login: undefined
  Main: { screen?: keyof TabParamList }
  Upload: { imageUri?: string; imageType?: string }
  AlbumView: { albumId: string; albumName: string }
  VaultView: undefined
  PhotoPreview: {
    photos: { uri: string; id: string }[]
    initialIndex: number
  }
  Profile: undefined
  Duplicates: undefined
  Trash: undefined
}

export type StackNavProp = StackNavigationProp<StackParamList>
export type AlbumViewRouteProp = RouteProp<StackParamList, 'AlbumView'>
export type UploadRouteProp = RouteProp<StackParamList, 'Upload'>
