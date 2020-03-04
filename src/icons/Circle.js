import React from "react";
import PropTypes from "prop-types";

import Svg,{
    G,
    Path
} from "react-native-svg";

export const Circle = ({color}) => (
    <Svg width="100%" height="100%" viewBox="0 0 953.85 953.85">
        <G id="layer_2" data-name="layer 2">
            <G id="layer_1-2" data-name="layer 1">
                <Path fill={color}
                      d="M476.92,953.85C213.95,953.85,0,739.9,0,476.92S213.95,0,476.92,0,953.85,213.95,953.85,476.92,739.9,953.85,476.92,953.85Zm0-775.65c-164.72,0-298.73,134-298.73,298.73s134,298.73,298.73,298.73,298.73-134,298.73-298.73S641.64,178.19,476.92,178.19Z"/>
            </G>
        </G>
    </Svg>
);

Circle.propTypes = {
    color: PropTypes.string
};

Circle.defaultProps = {
    color: "#5795D0"
};
