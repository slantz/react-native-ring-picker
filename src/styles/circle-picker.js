import {StyleSheet} from "react-native";

import {SQUARE_DIMENSIONS} from "../util";

export default StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    icon: {
        position: 'absolute',
        width: SQUARE_DIMENSIONS.WIDTH * 0.09,
        height: SQUARE_DIMENSIONS.WIDTH * 0.09,
        flex: 1,
        // backgroundColor: 'blue',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer : {
        position : 'absolute',
        top : -(SQUARE_DIMENSIONS.WIDTH * 0.09 / 2),
        left : 0,
        width : SQUARE_DIMENSIONS.WIDTH * 0.09,
        height : SQUARE_DIMENSIONS.WIDTH * 0.09
    },
    iconText: {
        color: '#fff',
        fontSize: 20,
        flex: 0,
        width: SQUARE_DIMENSIONS.WIDTH * 0.4,
        left: -(SQUARE_DIMENSIONS.WIDTH * 0.2 - SQUARE_DIMENSIONS.WIDTH * 0.09 / 2),
        textAlign: 'center',
        textTransform: 'capitalize'
    },
    swipeArrowHint: {
        position: 'absolute',
        top: SQUARE_DIMENSIONS.WIDTH * 0.08,
        left: SQUARE_DIMENSIONS.WIDTH * 0.21,
        width: SQUARE_DIMENSIONS.WIDTH * 0.38,
        height: SQUARE_DIMENSIONS.WIDTH * 0.3
    },
    wheel: {
        width: SQUARE_DIMENSIONS.WIDTH * 0.8,
        height: SQUARE_DIMENSIONS.WIDTH * 0.8
    },
    wheelTouchableCenter: {
        position: 'absolute',
        width: SQUARE_DIMENSIONS.WIDTH * 0.4,
        height: SQUARE_DIMENSIONS.WIDTH * 0.4,
        top: SQUARE_DIMENSIONS.WIDTH * 0.2,
        left: SQUARE_DIMENSIONS.WIDTH * 0.2
    }
});
