import React from "react";
import { TouchableOpacity } from "react-native";
import Svg, { Circle } from "react-native-svg";

export const CircleTouchable = ({onPress}) => (
    <TouchableOpacity onPress={onPress}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Circle
                cx="100"
                cy="100"
                r="100"
                fill="none"/>
        </Svg>
    </TouchableOpacity>
);
