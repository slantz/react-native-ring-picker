import React from "react";
import PropTypes from "prop-types";
import { Animated, Easing, PanResponder, View } from "react-native";
import { SQUARE_DIMENSIONS } from "./util";
import { STYLES } from "./styles";
import { Icons } from "./components/Icons";
import { CircleBlueGradient } from "./components/CircleBlueGradient";
import { CircleTouchable } from "./components/CircleTouchable";
import { SwipeArrowHint } from "./icons/SwipeArrowHint";
import { Circle } from "./icons/Circle";
import { debounce } from "debounce";

export default class ReactNativeRingPicker extends React.Component {

    static DEFAULT_ICON = (color) => <Circle color={color}/>;

    static propTypes = {
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

    static defaultProps = {
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

    constructor(props) {
        super(props);

        let icons = this.mapPropsIconsToAnimatedOnes();

        this.state = {
            pan: new Animated.Value(0),
            icons: icons,
            showArrowHint: this.props.showArrowHint,
            currentSnappedIcon: this.getCurrentSnappedMiddleIcon(icons),
            ICON_PATH_RADIUS: 0,
            XY_AXES_COORDINATES: {
                X: 0,
                Y: 0,
                PAGE_Y: 0,
                PAGE_X: 0
            },
            CURRENT_ICON_SHIFT: 0
        };

        this.INDEX_EXTRACTORS = {};
        this.GIRTH_ANGLE = this.props.girthAngle;
        this.AMOUNT_OF_ICONS = icons.length;
        this.ICON_POSITION_ANGLE = this.GIRTH_ANGLE / this.AMOUNT_OF_ICONS;

        // 2*π*r / 360
        this.STEP_LENGTH_TO_1_ANGLE = 0;

        this.DIRECTIONS = {
            CLOCKWISE: "CLOCKWISE",
            COUNTERCLOCKWISE: "COUNTERCLOCKWISE"
        };

        this.CIRCLE_SECTIONS = {
            TOP_LEFT: "TOP_LEFT",
            TOP_RIGHT: "TOP_RIGHT",
            BOTTOM_LEFT: "BOTTOM_LEFT",
            BOTTOM_RIGHT: "BOTTOM_RIGHT"
        };

        this.CURRENT_CIRCLE_SECTION = null;
        this.CURRENT_DIRECTION = null;
        this.CURRENT_VECTOR_DIFFERENCE_LENGTH = 0;

        this.PREVIOUS_POSITION = {
            X: 0,
            Y: 0
        };

        this.ICON_HIDE_ON_THE_BACK_DURATION = this.props.iconHideOnTheBackDuration;

        this.ALL_ICONS_FINISH_ANIMATIONS = {
            promises: this.state.icons.reduce((promises, icon) => {promises[icon.id] = null; return promises}, {}),
            resolvers: this.state.icons.reduce((resolvers, icon) => {resolvers[icon.id] = null; return resolvers}, {})
        };

        this._panResponder = PanResponder.create({
            onMoveShouldSetResponderCapture: () => true, //Tell iOS that we are allowing the movement
            onMoveShouldSetPanResponderCapture: () => true, // Same here, tell iOS that we allow dragging
            onPanResponderGrant: (e, gestureState) => {
                this.hideArrowHint();
                this.resetCurrentValues();
                this.setPreviousDifferenceLengths(0 ,0);
                this.state.pan.setValue(this.state.pan._value);
            },
            onPanResponderMove: (e, gestureState) => {
                this.defineCurrentSection(gestureState.moveX, gestureState.moveY);
                this.checkPreviousDifferenceLengths(gestureState.dx, gestureState.dy);

                this.state.pan.setValue(this.CURRENT_VECTOR_DIFFERENCE_LENGTH);
                this.setState({
                    ...this.state,
                    CURRENT_ICON_SHIFT: this.CURRENT_VECTOR_DIFFERENCE_LENGTH / this.STEP_LENGTH_TO_1_ANGLE
                }, () => this.calculateIconCurrentPositions(gestureState.vx));
            },
            onPanResponderRelease: (evt, gestureState) => {
                let lastGesture = {...gestureState};

                this.createFinishAnimationPromisesAndResolveIfIconsAreNotMovingAlready();

                Promise
                    .all(this.getFinishAnimationPromises())
                    .then(() => this.snapNearestIconToVerticalAxis(lastGesture));
            }
        });
    }

    getCurrentSnappedMiddleIcon(icons) {
        return icons.filter((icon) => icon.index === 0)[0];
    }

    getFinishAnimationPromises() {
        return this.state.icons.map((icon) => this.ALL_ICONS_FINISH_ANIMATIONS.promises[icon.id]);
    }

    createFinishAnimationPromisesAndResolveIfIconsAreNotMovingAlready() {
        this.state.icons.forEach((icon) => {
            this.ALL_ICONS_FINISH_ANIMATIONS.promises[icon.id] = new Promise((resolve) => this.ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id] = resolve);
            !icon.position.x._animation && this.ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id]();
        });
    }

    snapNearestIconToVerticalAxis(lastGesture) {
        let {minDistanceToVerticalAxis, minDistanceToHorizontalAxis, sign, currentSnappedIcon} = this.getMinDistanceToVerticalAxisAndSnappedIcon();
        [minDistanceToVerticalAxis, minDistanceToHorizontalAxis] = this.updateMinimalDistanceExponentialDeflection(minDistanceToVerticalAxis, minDistanceToHorizontalAxis, currentSnappedIcon);

        this.updateCurrentDirectionBasedOnNearestIconPosition(sign);
        this.setAdditiveMovementLength((sign * minDistanceToVerticalAxis), -minDistanceToHorizontalAxis);
        this.setPreviousDifferenceLengths(lastGesture.dx + (sign * minDistanceToVerticalAxis), lastGesture.dy + minDistanceToHorizontalAxis);
        this.animateAllIconsToMatchVerticalAxis(currentSnappedIcon);
    }

    getMinDistanceToVerticalAxisAndSnappedIcon() {
        let minDistanceToVerticalAxis = this.STEP_LENGTH_TO_1_ANGLE * 360;
        let minDistanceToHorizontalAxis = this.STEP_LENGTH_TO_1_ANGLE * 360;
        let sign = 1;
        let currentSnappedIcon = null;
        let yCoordinateFromCssStyling = STYLES.iconContainer.top - SQUARE_DIMENSIONS.ICON_PADDING_FROM_WHEEL;

        this.state.icons.forEach((icon) => {
            let iconXCenterCoordinate = icon.position.x.__getValue() + STYLES.icon.width / 2;
            let iconYCenterCoordinate = icon.position.y.__getValue();

            let distanceToXAxis = Math.abs((iconXCenterCoordinate) - (this.state.XY_AXES_COORDINATES.X - this.state.XY_AXES_COORDINATES.PAGE_X));
            let distanceToYAxis = Math.abs(yCoordinateFromCssStyling - iconYCenterCoordinate);

            if (distanceToYAxis <= minDistanceToHorizontalAxis) {
                minDistanceToHorizontalAxis = distanceToYAxis;
            }

            if (distanceToXAxis <= minDistanceToVerticalAxis) {
                if (iconXCenterCoordinate > (this.state.XY_AXES_COORDINATES.X - this.state.XY_AXES_COORDINATES.PAGE_X)) {
                    sign = -1;
                }
                else if (iconXCenterCoordinate < (this.state.XY_AXES_COORDINATES.X - this.state.XY_AXES_COORDINATES.PAGE_X)) {
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

    updateCurrentDirectionBasedOnNearestIconPosition(sign) {
        if (sign > 0) {
            this.CURRENT_DIRECTION = this.DIRECTIONS.CLOCKWISE;
        }
        else {
            this.CURRENT_DIRECTION = this.DIRECTIONS.COUNTERCLOCKWISE;
        }
    };

    adjustMinimalExponentialDistanceCorrection(angle, minV, minH) {
        if (!this.props.isExpDistCorrection) {
            return [minV, minH];
        }

        let currentAngle = Math.round(angle);
        let lowestBoundaryDegree = 270 - this.props.noExpDistCorrectionDegree;
        let highestBoundaryDegree = 270 + this.props.noExpDistCorrectionDegree;

        if (currentAngle < lowestBoundaryDegree || currentAngle > highestBoundaryDegree) {
            let number = (15 - 0.004165 * Math.pow((currentAngle - 270), 2)) * this.STEP_LENGTH_TO_1_ANGLE;

            return [minV - number, minH - Math.sqrt(number) / 2];
        }

        return [minV, minH];
    }

    /**
     * if current angle is lower than 270 center angle minus 15 degrees gap, that implies parabolic distance
     * from this. 30 degrees center gap - adjust minimal distance to vertical axis regarding this parabolic distance
     */
    updateMinimalDistanceExponentialDeflection(minDistanceToVerticalAxis, minDistanceToHorizontalAxis, currentSnappedIcon) {
        const id = currentSnappedIcon.id;
        const index = currentSnappedIcon.index;

        let minV = minDistanceToVerticalAxis;
        let minH = minDistanceToHorizontalAxis;

        let currentAngle = (270 + this.state.CURRENT_ICON_SHIFT + (this.INDEX_EXTRACTORS[id] || 0) + (index * this.ICON_POSITION_ANGLE));

        [minV, minH] = this.adjustMinimalExponentialDistanceCorrection(currentAngle, minV, minH);

        return [
            minV,
            minH
        ]
    }

    animateAllIconsToMatchVerticalAxis(currentSnappedIcon) {
        Animated.spring(this.state.pan, {
            toValue : this.CURRENT_VECTOR_DIFFERENCE_LENGTH,
            easing : Easing.linear,
            speed : 12
            // useNativeDriver: true // if this is used - the last click after previous release will twist back nad forward
        }).start();
        this.setState({
            ...this.state,
            CURRENT_ICON_SHIFT : this.CURRENT_VECTOR_DIFFERENCE_LENGTH / this.STEP_LENGTH_TO_1_ANGLE,
            currentSnappedIcon : currentSnappedIcon
        }, () => this.calculateIconCurrentPositions());
    }

    /**
     * "some icon"
     *      * id: "some icon"
     *      * title: "some icon"
     *      * el: DEFAULT_ICON
     *
     * {id: "test id"}
     *      * id: "test id"
     *      * title: "test id"
     *      * el: DEFAULT_ICON
     *
     * {id: "test id", title: "some title"}
     *      * id: "test id"
     *      * title: "some title"
     *      * el: DEFAULT_ICON
     *
     * {title: "some title"}
     *      * id: "default"
     *      * title: "some title"
     *      * el: DEFAULT_ICON
     *
     * <Search/>
     *      * id: "search"
     *      * title: "search"
     *      * el: <Search />
     *
     * <Search id={"search_id"}/>
     *      * id: "search_id"
     *      * title: "search"
     *      * el: <Search />
     *
     * <Search title={"find"}/>
     *      * id: "search"
     *      * title: "find"
     *      * el: <Search />
     *
     * <Search id={"search_id"} title={"find"}/>
     *      * id: "search_id"
     *      * title: "find"
     *      * el: <Search />
     *
     * @returns {{el: React.Element, isShown: boolean, index: string, id: string, position: Animated.ValueXY, title: string}[]}
     */
    mapPropsIconsToAnimatedOnes() {
        function getId(propIcon) {
            if (React.isValidElement(propIcon)) {
                return propIcon.props?.id || propIcon.type.name.toLowerCase();
            }
            return typeof propIcon === "object" ? propIcon.id || "default" : propIcon;
        }

        function getTitle(propIcon) {
            if (React.isValidElement(propIcon)) {
                return propIcon.props?.title || propIcon.type.name.toLowerCase();
            }
            return typeof propIcon === "object" ? propIcon.title || propIcon.id : propIcon;
        }

        function getIndex(index, array) {
            return index - Math.trunc(array.length / 2);
        }

        let getEl = (propIcon) => {
            return React.isValidElement(propIcon) ? propIcon : ReactNativeRingPicker.DEFAULT_ICON(this.props.defaultIconColor);
        };

        return this.props.icons.map((propIcon, index, array) => ({
            id : getId(propIcon),
            title : getTitle(propIcon),
            isShown : true,
            index : getIndex(index, array),
            el : getEl(propIcon),
            position : new Animated.ValueXY()
        }));
    }

    rotateOnInputPixelDistanceMatchingRadianShift() {
        return [
            {
                transform: [
                    {
                        rotate: this.state.pan.interpolate({inputRange: [-(this.GIRTH_ANGLE * this.STEP_LENGTH_TO_1_ANGLE), 0, this.GIRTH_ANGLE * this.STEP_LENGTH_TO_1_ANGLE], outputRange: [`-${this.GIRTH_ANGLE}deg`, "0deg", `${this.GIRTH_ANGLE}deg`]})
                    }
                ]
            }
        ]
    };

    goToCurrentFocusedPage = () => {
        this.state.currentSnappedIcon && this.props.onPress(this.state.currentSnappedIcon.id);
    };

    defineAxesCoordinatesOnLayoutDisplacement = () => {
        this._wheelNavigator.measure((x, y, width, height, pageX, pageY) => {
            this.setState({
                ...this.state,
                ICON_PATH_RADIUS: height / 2 + STYLES.icon.height / 2 + SQUARE_DIMENSIONS.ICON_PADDING_FROM_WHEEL,
                XY_AXES_COORDINATES: {
                    X: pageX + (width / 2),
                    Y: pageY + (height / 2),
                    PAGE_Y: pageY,
                    PAGE_X: pageX
                }
            });
            this.STEP_LENGTH_TO_1_ANGLE = 2 * Math.PI * this.state.ICON_PATH_RADIUS / 360;

            this.calculateIconCurrentPositions();
        });
    };

    defineAxesCoordinatesOnLayoutChangeByStylesOrScreenRotation = () => {
        this.defineAxesCoordinatesOnLayoutDisplacement();
    };

    defineCurrentSection(x, y) {
        let yAxis = y < this.state.XY_AXES_COORDINATES.Y ? "TOP" : "BOTTOM";
        let xAxis = x < this.state.XY_AXES_COORDINATES.X ? "LEFT" : "RIGHT";
        this.CURRENT_CIRCLE_SECTION = this.CIRCLE_SECTIONS[`${yAxis}_${xAxis}`];
    }

    resetCurrentValues() {
        this.CURRENT_CIRCLE_SECTION = null;
        this.CURRENT_DIRECTION = null;
        this.PREVIOUS_POSITION.X = 0;
        this.PREVIOUS_POSITION.Y = 0;
    }

    setPreviousDifferenceLengths(x, y) {
        this.PREVIOUS_POSITION.X = x;
        this.PREVIOUS_POSITION.Y = y;
    }

    checkPreviousDifferenceLengths(x, y) {
        if (this.CURRENT_CIRCLE_SECTION === null) {
            return;
        }

        let differenceX = x - this.PREVIOUS_POSITION.X;
        let differenceY = y - this.PREVIOUS_POSITION.Y;

        let getCurrentDirectionForYForLeftHemisphere = (diffY) => {
            if (diffY < 0) {
                return this.DIRECTIONS.CLOCKWISE;
            }
            if (diffY > 0) {
                return this.DIRECTIONS.COUNTERCLOCKWISE;
            }
        };

        let getCurrentDirectionForXForTopHemisphere = (diffX) => {
            if (diffX < 0) {
                return this.DIRECTIONS.COUNTERCLOCKWISE;
            }
            if (diffX > 0) {
                return this.DIRECTIONS.CLOCKWISE;
            }
        };

        let getCurrentDirectionForYForRightHemisphere = (diffY) => {
            if (diffY < 0) {
                return this.DIRECTIONS.COUNTERCLOCKWISE;
            }
            if (diffY > 0) {
                return this.DIRECTIONS.CLOCKWISE;
            }
        };

        let getCurrentDirectionForXForBottomHemisphere = (diffX) => {
            if (diffX < 0) {
                return this.DIRECTIONS.CLOCKWISE;
            }
            if (diffX > 0) {
                return this.DIRECTIONS.COUNTERCLOCKWISE;
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

        switch (this.CURRENT_CIRCLE_SECTION) {
            case this.CIRCLE_SECTIONS.TOP_LEFT:
                this.CURRENT_DIRECTION = getCurrentDirectionForTopLeftQuadrant(differenceX, differenceY);
                break;
            case this.CIRCLE_SECTIONS.TOP_RIGHT:
                this.CURRENT_DIRECTION = getCurrentDirectionForTopRightQuadrant(differenceX, differenceY);
                break;
            case this.CIRCLE_SECTIONS.BOTTOM_LEFT:
                this.CURRENT_DIRECTION = getCurrentDirectionForBottomLeftQuadrant(differenceX, differenceY);
                break;
            case this.CIRCLE_SECTIONS.BOTTOM_RIGHT:
                this.CURRENT_DIRECTION = getCurrentDirectionForBottomRightQuadrant(differenceX, differenceY);
                break;
        }

        this.setAdditiveMovementLength(differenceX, differenceY);
        this.setPreviousDifferenceLengths(x, y);
    }

    setAdditiveMovementLength(x, y) {
        let absoluteHypotenuseLength = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));

        if (this.CURRENT_DIRECTION === this.DIRECTIONS.CLOCKWISE) {
            this.CURRENT_VECTOR_DIFFERENCE_LENGTH += absoluteHypotenuseLength;
        }

        if (this.CURRENT_DIRECTION === this.DIRECTIONS.COUNTERCLOCKWISE) {
            this.CURRENT_VECTOR_DIFFERENCE_LENGTH -= absoluteHypotenuseLength;
        }
    }

    adjustCurrentIconAngleExponentially(angle) {
        let currentIconAngle = Math.round(angle);

        if (!this.props.isExpDistCorrection) {
            return currentIconAngle;
        }

        let lowestBoundaryDegree = 270 - this.props.noExpDistCorrectionDegree;
        let highestBoundaryDegree = 270 + this.props.noExpDistCorrectionDegree;

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

    calculateIconCurrentPosition(icon) {
        let currentIconAngle = this.calculateCurrentIconAngle(icon);
        // the Y coordinate where the center of the circle is higher than the coordinates of Icons, this is actually similar {+X:-Y} section of coordinate net
        // and INVERTED, this is basically if we'd have an upside-down screen always

        // console.log(10 - 0.00277 * Math.pow((currentIconAngle - 270), 2));
        // console.log(20 - 0.00666 * Math.pow((currentIconAngle - 270), 2));
        // console.log(15 - 0.005 * Math.pow((currentIconAngle - 270), 2));
        // this is necessary deviation since angle sometimes would be 269.931793549246 or 270.002727265348 degrees
        /**
         * y=15-1/200*(x-270)^2
         *
         * this parabolic gap matches the maximum value of 15 degrees for the angle interval of {-60°:60°}, -270° shift makes it possible to calculate the gap for X interval of {210°:330°}
         *
         * this is parabolic acceleration, basically - further the position from 270 degrees - more would be the gap from the vertical axis - thus creating the distance from center aligned icon
         */
        currentIconAngle = this.adjustCurrentIconAngleExponentially(currentIconAngle);

        return {
            top: this.state.XY_AXES_COORDINATES.Y - this.state.XY_AXES_COORDINATES.PAGE_Y + this.state.ICON_PATH_RADIUS * Math.sin(currentIconAngle * (Math.PI / 180)),
            left: this.state.XY_AXES_COORDINATES.X - this.state.XY_AXES_COORDINATES.PAGE_X - STYLES.icon.width / 2 + this.state.ICON_PATH_RADIUS * Math.cos(currentIconAngle * (Math.PI / 180))
        };
    }

    calculateCurrentIconAngle(icon) {
        const id = icon.id;
        const index = icon.index;

        if (!this.INDEX_EXTRACTORS[id]) {
            this.INDEX_EXTRACTORS[id] = 0;
        }

        let currentAngle = (270 + this.state.CURRENT_ICON_SHIFT + this.INDEX_EXTRACTORS[id] + (index * this.ICON_POSITION_ANGLE));

        if (currentAngle < 270 - this.GIRTH_ANGLE / 2) {
            this.hideIconWhileMovingBehindCircle(id);
            this.INDEX_EXTRACTORS[id] += this.GIRTH_ANGLE;
            return currentAngle + this.GIRTH_ANGLE;
        }

        if (currentAngle > 270 + this.GIRTH_ANGLE / 2) {
            this.hideIconWhileMovingBehindCircle(id);
            this.INDEX_EXTRACTORS[id] -= this.GIRTH_ANGLE;
            return currentAngle - this.GIRTH_ANGLE;
        }

        return currentAngle;
    }

    calculateIconCurrentPositions(dx) {
        function extractCorrectRestDisplacementThreshold(dx) {
            if (!dx || (dx => 0 && dx <= 1)) {
                return 1;
            }

            return 10;
        }

        this.state.icons.forEach((icon) => {
            let coordinates = this.calculateIconCurrentPosition(icon);

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
                && typeof this.ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id] === "function"
                && this.ALL_ICONS_FINISH_ANIMATIONS.resolvers[icon.id]());
        });
    }

    hideIconWhileMovingBehindCircle(key) {
        this.setIconDisplayState(key, false);

        let timeout = setTimeout(() => {
            this.setIconDisplayState(key, true);
            clearTimeout(timeout);
        }, this.ICON_HIDE_ON_THE_BACK_DURATION);
    }

    setIconDisplayState(key, state) {
        this.setState({
            ...this.state,
            icons: [...this.state.icons.map((icon) => {
                if (icon.id === key) {
                    icon.isShown = state
                }

                return icon;
            })]
        });
    }

    hideArrowHint() {
        this.state.showArrowHint && this.setState({
            ...this.state,
            showArrowHint: false
        });
    }

    render() {
        let { onPress, style, styleIconText } = this.props;

        return (
            <View style={style} onLayout={debounce(this.defineAxesCoordinatesOnLayoutChangeByStylesOrScreenRotation, 100)}>
                <Icons icons={this.state.icons} onPress={onPress} styleIconText={styleIconText}/>
                <View
                    style={[STYLES.wheel]}
                    ref={component => this._wheelNavigator = component}
                    onLayout={this.defineAxesCoordinatesOnLayoutDisplacement}>
                    {this.state.showArrowHint && <View style={STYLES.swipeArrowHint}><SwipeArrowHint /></View>}
                    <Animated.View
                        style={this.rotateOnInputPixelDistanceMatchingRadianShift()}
                        {...this._panResponder.panHandlers}>
                        <CircleBlueGradient />
                    </Animated.View>
                    <View style={STYLES.wheelTouchableCenter}>
                        <CircleTouchable onPress={this.goToCurrentFocusedPage}/>
                    </View>
                </View>
            </View>
        );
    }
}
