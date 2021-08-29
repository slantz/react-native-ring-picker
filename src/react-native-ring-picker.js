import React, {useReducer, useEffect, useLayoutEffect} from "react";
import PropTypes from "prop-types";
import {Animated, Easing, PanResponder, View} from "react-native";
import {CIRCLE_SECTIONS, DIRECTIONS, SQUARE_DIMENSIONS} from "./util";
import {STYLES} from "./styles";
import {Icons} from "./components/Icons";
import {CircleBlueGradient} from "./components/CircleBlueGradient";
import {CircleTouchable} from "./components/CircleTouchable";
import {SwipeArrowHint} from "./icons/SwipeArrowHint";
import {debounce} from "debounce";
import {
    HIDE_ARROW_HINT,
    HIDE_ICON,
    SET_PATH_RADIUS_AND_COORDINATES,
    SHOW_ICON,
    UPDATE_CURRENT_ICON_SHIFT_AND_GESTURE_VX,
    UPDATE_CURRENT_SNAPPED_ICON_AND_SHIFT
} from "./actions";
import {reducer} from "./reducers";
import {getInitialState} from "./store";

let _wheelNavigator = null;
// 2*π*r / 360
let STEP_LENGTH_TO_1_ANGLE = 0;
let CURRENT_CIRCLE_SECTION = null;
let CURRENT_DIRECTION = null;
let CURRENT_VECTOR_DIFFERENCE_LENGTH = 0;
let ICON_POSITION_ANGLE = 0;
let INDEX_EXTRACTORS = {};
let PREVIOUS_POSITION = {
    X: 0,
    Y: 0
};
let ALL_ICONS_FINISH_ANIMATIONS = {};
let _panResponder;

export const ReactNativeRingPicker = (
    {
        onPress,
        girthAngle,
        iconHideOnTheBackDuration,
        icons,
        showArrowHint,
        style,
        styleIconText,
        defaultIconColor,
        isExpDistCorrection,
        noExpDistCorrectionDegree
    }) => {

    const [state, dispatch] = useReducer(reducer, getInitialState(icons, showArrowHint, defaultIconColor));

    useLayoutEffect(() => {
        ICON_POSITION_ANGLE = girthAngle / icons.length;

        ALL_ICONS_FINISH_ANIMATIONS = {
            promises: icons.reduce((promises, icon) => {promises[icon.id] = null; return promises}, {}),
            resolvers: icons.reduce((resolvers, icon) => {resolvers[icon.id] = null; return resolvers}, {})
        };

        _panResponder = PanResponder.create({
            onMoveShouldSetResponderCapture: () => true, //Tell iOS that we are allowing the movement
            onMoveShouldSetPanResponderCapture: () => true, // Same here, tell iOS that we allow dragging
            onPanResponderGrant: (e, gestureState) => {
                hideArrowHint();
                resetCurrentValues();
                setPreviousDifferenceLengths(0 ,0);
                state.pan.setValue(state.pan._value);
            },
            onPanResponderMove: (e, gestureState) => {
                defineCurrentSection(gestureState.moveX, gestureState.moveY);
                checkPreviousDifferenceLengths(gestureState.dx, gestureState.dy);

                state.pan.setValue(CURRENT_VECTOR_DIFFERENCE_LENGTH);
                dispatch({
                    type: UPDATE_CURRENT_ICON_SHIFT_AND_GESTURE_VX,
                    payload: {
                        CURRENT_ICON_SHIFT: CURRENT_VECTOR_DIFFERENCE_LENGTH / STEP_LENGTH_TO_1_ANGLE,
                        VX: gestureState.vx
                    }
                });
                // calculateIconCurrentPositions(gestureState.vx);
            },
            onPanResponderRelease: (evt, gestureState) => {
                let lastGesture = {...gestureState};

                createFinishAnimationPromisesAndResolveIfIconsAreNotMovingAlready();

                Promise
                    .all(getFinishAnimationPromises())
                    .then(() => snapNearestIconToVerticalAxis(lastGesture));
            }
        });
    }, [icons, girthAngle]);

    useEffect(() => {
        STEP_LENGTH_TO_1_ANGLE = 2 * Math.PI * state.ICON_PATH_RADIUS / 360;
        calculateIconCurrentPositions();
    }, [state.ICON_PATH_RADIUS]);

    useEffect(() => {
        calculateIconCurrentPositions(state.GESTURE_VX);
    }, [state.CURRENT_ICON_SHIFT]);

    function getFinishAnimationPromises() {
        return state.icons.map((icon) => ALL_ICONS_FINISH_ANIMATIONS.promises[icon.id]);
    }

    function createFinishAnimationPromisesAndResolveIfIconsAreNotMovingAlready() {
        state.icons.forEach((icon) => {
            ALL_ICONS_FINISH_ANIMATIONS.promises[icon.id] = new Promise((resolve) => ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id] = resolve);
            !icon.position.x._animation && ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id]();
        });
    }

    function snapNearestIconToVerticalAxis(lastGesture) {
        let {minDistanceToVerticalAxis, minDistanceToHorizontalAxis, sign, currentSnappedIcon} = getMinDistanceToVerticalAxisAndSnappedIcon();
        [minDistanceToVerticalAxis, minDistanceToHorizontalAxis] = updateMinimalDistanceExponentialDeflection(minDistanceToVerticalAxis, minDistanceToHorizontalAxis, currentSnappedIcon);

        updateCurrentDirectionBasedOnNearestIconPosition(sign);
        setAdditiveMovementLength((sign * minDistanceToVerticalAxis), -minDistanceToHorizontalAxis);
        setPreviousDifferenceLengths(lastGesture.dx + (sign * minDistanceToVerticalAxis), lastGesture.dy + minDistanceToHorizontalAxis);
        animateAllIconsToMatchVerticalAxis(currentSnappedIcon);
    }

    function getMinDistanceToVerticalAxisAndSnappedIcon() {
        let minDistanceToVerticalAxis = STEP_LENGTH_TO_1_ANGLE * 360;
        let minDistanceToHorizontalAxis = STEP_LENGTH_TO_1_ANGLE * 360;
        let sign = 1;
        let currentSnappedIcon = null;
        let yCoordinateFromCssStyling = STYLES.iconContainer.top - SQUARE_DIMENSIONS.ICON_PADDING_FROM_WHEEL;

        state.icons.forEach((icon) => {
            let iconXCenterCoordinate = icon.position.x.__getValue() + STYLES.icon.width / 2;
            let iconYCenterCoordinate = icon.position.y.__getValue();

            let distanceToXAxis = Math.abs((iconXCenterCoordinate) - (state.XY_AXES_COORDINATES.X - state.XY_AXES_COORDINATES.PAGE_X));
            let distanceToYAxis = Math.abs(yCoordinateFromCssStyling - iconYCenterCoordinate);

            if (distanceToYAxis <= minDistanceToHorizontalAxis) {
                minDistanceToHorizontalAxis = distanceToYAxis;
            }

            if (distanceToXAxis <= minDistanceToVerticalAxis) {
                if (iconXCenterCoordinate > (state.XY_AXES_COORDINATES.X - state.XY_AXES_COORDINATES.PAGE_X)) {
                    sign = -1;
                }
                else if (iconXCenterCoordinate < (state.XY_AXES_COORDINATES.X - state.XY_AXES_COORDINATES.PAGE_X)) {
                    sign = 1;
                }
                else {
                    sign = 0;
                    minDistanceToVerticalAxis = 0;
                }
                minDistanceToVerticalAxis = distanceToXAxis;
                currentSnappedIcon = icon;
            }
        });

        return {
            minDistanceToVerticalAxis,
            minDistanceToHorizontalAxis,
            sign,
            currentSnappedIcon
        };
    }

    function updateCurrentDirectionBasedOnNearestIconPosition(sign) {
        if (sign > 0) {
            CURRENT_DIRECTION = DIRECTIONS.CLOCKWISE;
        }
        else {
            CURRENT_DIRECTION = DIRECTIONS.COUNTERCLOCKWISE;
        }
    }

    function adjustMinimalExponentialDistanceCorrection(angle, minV, minH) {
        if (!isExpDistCorrection) {
            return [minV, minH];
        }

        let currentAngle = Math.round(angle);
        let lowestBoundaryDegree = 270 - noExpDistCorrectionDegree;
        let highestBoundaryDegree = 270 + noExpDistCorrectionDegree;

        if (currentAngle < lowestBoundaryDegree || currentAngle > highestBoundaryDegree) {
            let number = (15 - 0.004165 * Math.pow((currentAngle - 270), 2)) * STEP_LENGTH_TO_1_ANGLE;

            return [minV - number, minH - Math.sqrt(number) / 2];
        }

        return [minV, minH];
    }

    /**
     * if current angle is lower than 270 center angle minus 15 degrees gap, that implies parabolic distance
     * from this. 30 degrees center gap - adjust minimal distance to vertical axis regarding this parabolic distance
     */
    function updateMinimalDistanceExponentialDeflection(minDistanceToVerticalAxis, minDistanceToHorizontalAxis, currentSnappedIcon) {
        const id = currentSnappedIcon.id;
        const index = currentSnappedIcon.index;

        let minV = minDistanceToVerticalAxis;
        let minH = minDistanceToHorizontalAxis;

        let currentAngle = (270 + state.CURRENT_ICON_SHIFT + (INDEX_EXTRACTORS[id] || 0) + (index * ICON_POSITION_ANGLE));

        [minV, minH] = adjustMinimalExponentialDistanceCorrection(currentAngle, minV, minH);

        return [
            minV,
            minH
        ]
    }

    function animateAllIconsToMatchVerticalAxis(currentSnappedIcon) {
        Animated.spring(state.pan, {
            toValue : CURRENT_VECTOR_DIFFERENCE_LENGTH,
            easing : Easing.linear,
            speed : 12
            // useNativeDriver: true // if this is used - the last click after previous release will twist back nad forward
        }).start();
        dispatch({
            type: UPDATE_CURRENT_SNAPPED_ICON_AND_SHIFT,
            payload: {
                CURRENT_ICON_SHIFT: CURRENT_VECTOR_DIFFERENCE_LENGTH / STEP_LENGTH_TO_1_ANGLE,
                currentSnappedIcon,
                VX: 0
            }
        });
    }

    function rotateOnInputPixelDistanceMatchingRadianShift() {
        return [
            {
                transform: [
                    {
                        rotate: state.pan.interpolate({inputRange: [-(girthAngle * STEP_LENGTH_TO_1_ANGLE), 0, girthAngle * STEP_LENGTH_TO_1_ANGLE], outputRange: [`-${girthAngle}deg`, "0deg", `${girthAngle}deg`]})
                    }
                ]
            }
        ]
    }

    const goToCurrentFocusedPage = () => {
        state.currentSnappedIcon && onPress(state.currentSnappedIcon.id);
    };

    const defineAxesCoordinatesOnLayoutDisplacement = () => {
        _wheelNavigator.measure((x, y, width, height, pageX, pageY) => {
            dispatch({
                type: SET_PATH_RADIUS_AND_COORDINATES,
                payload: {
                    ICON_PATH_RADIUS: height / 2 + STYLES.icon.height / 2 + SQUARE_DIMENSIONS.ICON_PADDING_FROM_WHEEL,
                    XY_AXES_COORDINATES: {
                        X: pageX + (width / 2),
                        Y: pageY + (height / 2),
                        PAGE_Y: pageY,
                        PAGE_X: pageX
                    }
                }
            });
        });
    };

    const defineAxesCoordinatesOnLayoutChangeByStylesOrScreenRotation = () => {
        defineAxesCoordinatesOnLayoutDisplacement();
    };

    function defineCurrentSection(x, y) {
        let yAxis = y < state.XY_AXES_COORDINATES.Y ? "TOP" : "BOTTOM";
        let xAxis = x < state.XY_AXES_COORDINATES.X ? "LEFT" : "RIGHT";
        CURRENT_CIRCLE_SECTION = CIRCLE_SECTIONS[`${yAxis}_${xAxis}`];
    }

    function resetCurrentValues() {
        CURRENT_CIRCLE_SECTION = null;
        CURRENT_DIRECTION = null;
        PREVIOUS_POSITION.X = 0;
        PREVIOUS_POSITION.Y = 0;
    }

    function setPreviousDifferenceLengths(x, y) {
        PREVIOUS_POSITION.X = x;
        PREVIOUS_POSITION.Y = y;
    }

    function checkPreviousDifferenceLengths(x, y) {
        if (CURRENT_CIRCLE_SECTION === null) {
            return;
        }

        let differenceX = x - PREVIOUS_POSITION.X;
        let differenceY = y - PREVIOUS_POSITION.Y;

        let getCurrentDirectionForYForLeftHemisphere = (diffY) => {
            if (diffY < 0) {
                return DIRECTIONS.CLOCKWISE;
            }
            if (diffY > 0) {
                return DIRECTIONS.COUNTERCLOCKWISE;
            }
        };

        let getCurrentDirectionForXForTopHemisphere = (diffX) => {
            if (diffX < 0) {
                return DIRECTIONS.COUNTERCLOCKWISE;
            }
            if (diffX > 0) {
                return DIRECTIONS.CLOCKWISE;
            }
        };

        let getCurrentDirectionForYForRightHemisphere = (diffY) => {
            if (diffY < 0) {
                return DIRECTIONS.COUNTERCLOCKWISE;
            }
            if (diffY > 0) {
                return DIRECTIONS.CLOCKWISE;
            }
        };

        let getCurrentDirectionForXForBottomHemisphere = (diffX) => {
            if (diffX < 0) {
                return DIRECTIONS.CLOCKWISE;
            }
            if (diffX > 0) {
                return DIRECTIONS.COUNTERCLOCKWISE;
            }
        };

        function getCurrentDirectionForTopLeftQuadrant(diffX, diffY) {
            if (diffX === 0) {
                return getCurrentDirectionForYForLeftHemisphere(diffY);
            }
            return getCurrentDirectionForXForTopHemisphere(diffX);
        }

        function getCurrentDirectionForTopRightQuadrant(diffX, diffY) {
            if (diffX === 0) {
                return getCurrentDirectionForYForRightHemisphere(diffY);
            }
            return getCurrentDirectionForXForTopHemisphere(diffX);
        }

        function getCurrentDirectionForBottomLeftQuadrant(diffX, diffY) {
            if (diffX === 0) {
                return getCurrentDirectionForYForLeftHemisphere(diffY);
            }
            return getCurrentDirectionForXForBottomHemisphere(diffX);
        }

        function getCurrentDirectionForBottomRightQuadrant(diffX, diffY) {
            if (diffX === 0) {
                return getCurrentDirectionForYForRightHemisphere(diffY);
            }
            return getCurrentDirectionForXForBottomHemisphere(diffX);
        }

        switch (CURRENT_CIRCLE_SECTION) {
            case CIRCLE_SECTIONS.TOP_LEFT:
                CURRENT_DIRECTION = getCurrentDirectionForTopLeftQuadrant(differenceX, differenceY);
                break;
            case CIRCLE_SECTIONS.TOP_RIGHT:
                CURRENT_DIRECTION = getCurrentDirectionForTopRightQuadrant(differenceX, differenceY);
                break;
            case CIRCLE_SECTIONS.BOTTOM_LEFT:
                CURRENT_DIRECTION = getCurrentDirectionForBottomLeftQuadrant(differenceX, differenceY);
                break;
            case CIRCLE_SECTIONS.BOTTOM_RIGHT:
                CURRENT_DIRECTION = getCurrentDirectionForBottomRightQuadrant(differenceX, differenceY);
                break;
        }

        setAdditiveMovementLength(differenceX, differenceY);
        setPreviousDifferenceLengths(x, y);
    }

    function setAdditiveMovementLength(x, y) {
        let absoluteHypotenuseLength = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

        if (CURRENT_DIRECTION === DIRECTIONS.CLOCKWISE) {
            CURRENT_VECTOR_DIFFERENCE_LENGTH += absoluteHypotenuseLength;
        }

        if (CURRENT_DIRECTION === DIRECTIONS.COUNTERCLOCKWISE) {
            CURRENT_VECTOR_DIFFERENCE_LENGTH -= absoluteHypotenuseLength;
        }
    }

    function adjustCurrentIconAngleExponentially(angle) {
        let currentIconAngle = Math.round(angle);

        if (!isExpDistCorrection) {
            return currentIconAngle;
        }

        let lowestBoundaryDegree = 270 - noExpDistCorrectionDegree;
        let highestBoundaryDegree = 270 + noExpDistCorrectionDegree;

        if (currentIconAngle < lowestBoundaryDegree) {
            return currentIconAngle - (15 - 0.004165 * Math.pow((currentIconAngle - 270), 2));
        }
        else if (currentIconAngle > highestBoundaryDegree) {
            return currentIconAngle + (15 - 0.004165 * Math.pow((currentIconAngle - 270), 2));
        }
        else {
            return currentIconAngle;
        }
    }

    function calculateIconCurrentPosition(icon) {
        let currentIconAngle = calculateCurrentIconAngle(icon);
        // the Y coordinate where the center of the circle is higher than the coordinates of Icons, this is actually similar {+X:-Y} section of coordinate net
        // and INVERTED, this is basically if we'd have an upside-down screen always

        // console.log(10 - 0.00277 * Math.pow((currentIconAngle - 270), 2));
        // console.log(20 - 0.00666 * Math.pow((currentIconAngle - 270), 2));
        // console.log(15 - 0.005 * Math.pow((currentIconAngle - 270), 2));
        // this is necessary deviation since angle sometimes would be 269.931793549246 or 270.002727265348 degrees
        /**
         * y=15-1/200*(x-270)^2
         *
         * this parabolic gap matches the maximum value of 15 degrees for the angle interval of {-60°:60°}, -270° shift
         * makes it possible to calculate the gap for X interval of {210°:330°}
         *
         * this is parabolic acceleration, basically - further the position from 270 degrees - more would be the gap
         * from the vertical axis - thus creating the distance from center aligned icon
         */
        currentIconAngle = adjustCurrentIconAngleExponentially(currentIconAngle);

        return {
            top: state.XY_AXES_COORDINATES.Y - state.XY_AXES_COORDINATES.PAGE_Y + state.ICON_PATH_RADIUS * Math.sin(currentIconAngle * (Math.PI / 180)),
            left: state.XY_AXES_COORDINATES.X - state.XY_AXES_COORDINATES.PAGE_X - STYLES.icon.width / 2 + state.ICON_PATH_RADIUS * Math.cos(currentIconAngle * (Math.PI / 180))
        };
    }

    function calculateCurrentIconAngle(icon) {
        const id = icon.id;
        const index = icon.index;

        if (!INDEX_EXTRACTORS[id]) {
            INDEX_EXTRACTORS[id] = 0;
        }

        let currentAngle = (270 + state.CURRENT_ICON_SHIFT + INDEX_EXTRACTORS[id] + (index * ICON_POSITION_ANGLE));

        if (currentAngle < 270 - girthAngle / 2) {
            hideIconWhileMovingBehindCircle(id);
            INDEX_EXTRACTORS[id] += girthAngle;
            return currentAngle + girthAngle;
        }

        if (currentAngle > 270 + girthAngle / 2) {
            hideIconWhileMovingBehindCircle(id);
            INDEX_EXTRACTORS[id] -= girthAngle;
            return currentAngle - girthAngle;
        }

        return currentAngle;
    }

    function calculateIconCurrentPositions(dx) {
        function extractCorrectRestDisplacementThreshold(dx) {
            if (!dx || (dx => 0 && dx <= 1)) {
                return 1;
            }

            return 10;
        }

        state.icons.forEach((icon) => {
            let coordinates = calculateIconCurrentPosition(icon);

            Animated.spring(icon.position, {
                toValue : {
                    x : coordinates.left,
                    y : coordinates.top
                },
                easing : Easing.linear,
                speed : 30,
                restSpeedThreshold : 10,
                bounciness : 0,
                restDisplacementThreshold : extractCorrectRestDisplacementThreshold(dx)
            }).start((finish) => finish.finished
                && typeof ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id] === "function"
                && ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id]());
        });
    }

    function hideIconWhileMovingBehindCircle(key) {
        dispatch({type: HIDE_ICON, payload: key});

        let timeout = setTimeout(() => {
            dispatch({type: SHOW_ICON, payload: key});
            clearTimeout(timeout);
        }, iconHideOnTheBackDuration);
    }

    function hideArrowHint() {
        state.showArrowHint && dispatch({type: HIDE_ARROW_HINT});
    }

    return (
        <View style={style} onLayout={debounce(defineAxesCoordinatesOnLayoutChangeByStylesOrScreenRotation, 100)}>
            <Icons icons={state.icons} onPress={onPress} styleIconText={styleIconText}/>
            <View
                style={[STYLES.wheel]}
                ref={component => _wheelNavigator = component}
                onLayout={defineAxesCoordinatesOnLayoutDisplacement}>
                {state.showArrowHint && <View style={STYLES.swipeArrowHint}><SwipeArrowHint /></View>}
                {_panResponder && (
                    <Animated.View
                        style={rotateOnInputPixelDistanceMatchingRadianShift()}
                        {..._panResponder.panHandlers}>
                        <CircleBlueGradient />
                    </Animated.View>
                )}
                <View style={STYLES.wheelTouchableCenter}>
                    <CircleTouchable onPress={goToCurrentFocusedPage}/>
                </View>
            </View>
        </View>
    );
};

ReactNativeRingPicker.propTypes = {
    onPress: PropTypes.func,
    girthAngle: PropTypes.number,
    iconHideOnTheBackDuration: PropTypes.number,
    icons: PropTypes.arrayOf(Object, String),
    showArrowHint: PropTypes.bool,
    style: PropTypes.object,
    styleIconText: PropTypes.object,
    defaultIconColor: PropTypes.string,
    isExpDistCorrection: PropTypes.bool,
    noExpDistCorrectionDegree: PropTypes.number
};

ReactNativeRingPicker.defaultProps = {
    onPress: (iconId) => {},
    girthAngle: 120,
    iconHideOnTheBackDuration: 250,
    icons: [{id: "action_1", title: "action_1"}, "action_2", "action_3", "action_4", "action_5"],
    showArrowHint: true,
    style: {},
    styleIconText: {},
    defaultIconColor: undefined,
    isExpDistCorrection: true,
    noExpDistCorrectionDegree: 15
};
