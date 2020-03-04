import React from "react";

import Svg,{
    G,
    Path,
    LinearGradient,
    Stop
} from "react-native-svg";

export const CircleBlueGradient = () => (
    <Svg width="100%" height="100%" viewBox="0 0 955 955">
        <G id="layer_2">
            <G id="layer_1-2">
                <LinearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="477.3691" y1="0.2666" x2="477.3691" y2="955">
                    <Stop offset="0" stopColor="#5896D0"/>
                    <Stop offset="0.2815" stopColor="#3D8CCB"/>
                    <Stop offset="0.5674" stopColor="#1E80C6"/>
                    <Stop offset="0.8652" stopColor="#0060AD"/>
                    <Stop offset="0.9944" stopColor="#004886"/>
                </LinearGradient>
                <Path fill="url(#SVGID_1_)" d="M477.4,955C214.1,955,0,740.9,0,477.6S214.1,0.3,477.4,0.3s477.4,214.1,477.4,477.4S740.6,955,477.4,955z
	 M477.4,178.6c-164.9,0-299,134.1-299,299s134.1,299,299,299s299-134.1,299-299S642.2,178.6,477.4,178.6z"/>
            </G>
        </G>
    </Svg>
);
