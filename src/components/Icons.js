import React from "react";
import PropTypes from "prop-types";
import { View } from "react-native";
import { Icon } from "./Icon";

export const Icons = ({icons, onPress, styleIconText}) => (
    <View>
        {icons.map((icon) => <Icon key={icon.index} icon={icon} onPress={onPress} styleIconText={styleIconText}/>)}
    </View>
);

Icons.propTypes = {
    icons: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title : PropTypes.string.isRequired,
        isShown : PropTypes.bool.isRequired,
        index: PropTypes.number.isRequired,
        el : PropTypes.element.isRequired,
        position : PropTypes.object.isRequired
    })).isRequired,
    onPress: PropTypes.func,
    styleIconText: PropTypes.object
};

Icons.defaultProps = {
    onPress: () => {},
    styleIconText: {}
};
