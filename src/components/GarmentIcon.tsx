import React from 'react';
import Svg, { Polygon, Rect, Path, Line } from 'react-native-svg';
import { Category } from '../features/outfits/types';

interface Props {
  category: Category;
  color: string;
  size?: number;
}

export function GarmentIcon({ category, color, size = 40 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {category === 'top' && (
        <Polygon
          points="14,4 26,4 30,9 37,14 30,19 30,36 10,36 10,19 3,14 10,9"
          fill={color}
        />
      )}

      {category === 'bottom' && (
        <>
          <Rect x={8} y={4} width={24} height={8} rx={1} fill={color} />
          <Rect x={8} y={12} width={9} height={24} rx={1} fill={color} />
          <Rect x={23} y={12} width={9} height={24} rx={1} fill={color} />
        </>
      )}

      {category === 'shoe' && (
        <Path
          d="M4,30 Q4,22 12,20 L26,20 Q34,20 36,26 Q37,31 32,32 L8,32 Q4,32 4,30 Z"
          fill={color}
        />
      )}

      {category === 'outerwear' && (
        <>
          <Polygon
            points="12,4 28,4 33,9 39,14 32,19 32,36 8,36 8,19 1,14 7,9"
            fill={color}
          />
          <Line x1={20} y1={6} x2={20} y2={34} stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} />
        </>
      )}

      {category === 'accessory' && (
        <>
          <Rect x={8} y={16} width={24} height={18} rx={4} fill={color} />
          <Path d="M14,16 Q14,6 20,6 Q26,6 26,16" fill="none" stroke={color} strokeWidth={3} />
        </>
      )}
    </Svg>
  );
}
