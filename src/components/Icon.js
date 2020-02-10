import React from "react";
import PropTypes from "prop-types";
import { Animated, Text, TouchableWithoutFeedback, View } from "react-native";
import { STYLES } from "../styles";
import { SQUARE_DIMENSIONS } from "../util";

export const Icon = ({icon, onPress, styleIconText}) => {
    let getIconsTransformDynamicStyles = () => ({
        opacity : icon.position.x.interpolate({
            inputRange : [0, SQUARE_DIMENSIONS.WIDTH * 0.3, SQUARE_DIMENSIONS.WIDTH * 0.7],
            outputRange : [0.4, 1, 0.4]
        }),
        transform : [
            {
                scale : icon.position.x.interpolate({
                    inputRange : [0, SQUARE_DIMENSIONS.WIDTH * 0.375, SQUARE_DIMENSIONS.WIDTH * 0.8],
                    outputRange : [0.5, 1.2, 0.25]
                })
            }
        ]
    });

    return (
        <TouchableWithoutFeedback onPress={() => onPress(icon.id)}>
            <Animated.View
                style={[STYLES.icon, icon.styles, icon.position.getLayout(), getIconsTransformDynamicStyles()]}>
                {icon.isShown &&
                <View style={STYLES.iconContainer}>
                    {icon.el}
                    <Text style={[STYLES.iconText, styleIconText]}>{icon.title}</Text>
                </View>
                }
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

Icon.propTypes = {
    icon: PropTypes.shape({
        id: PropTypes.string.isRequired,
        title : PropTypes.string.isRequired,
        isShown : PropTypes.bool.isRequired,
        index: PropTypes.number.isRequired,
        el : PropTypes.element.isRequired,
        position : PropTypes.object.isRequired
    }).isRequired,
    onPress: PropTypes.func.isRequired,
    styleIconText: PropTypes.object.isRequired
};
