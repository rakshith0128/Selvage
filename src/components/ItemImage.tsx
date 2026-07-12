import React from 'react';
import { Image } from 'react-native';
import { ClothingItem } from '../features/outfits/types';
import { COLORS } from '../features/outfits/constants';
import { GarmentIcon } from './GarmentIcon';
import { theme } from './theme';

interface Props {
  item: ClothingItem;
  size?: number;
}

/** Shows the item's photo when it has one, otherwise the generated garment icon. */
export function ItemImage({ item, size = 40 }: Props) {
  if (item.photoUri) {
    return (
      <Image
        source={{ uri: item.photoUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.15,
          backgroundColor: theme.line,
        }}
        resizeMode="cover"
      />
    );
  }
  return <GarmentIcon category={item.category} color={COLORS[item.color].hex} size={size} />;
}
