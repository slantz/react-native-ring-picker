import React from "react";
import {Animated} from "react-native";
import {Circle} from "../icons/Circle";

const DEFAULT_ICON = (color) => <Circle color={color} />;

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
 * @returns {{el: React.Element, isShown: boolean, index: string, id: string, position: Animated.ValueXY, title:
 *     string}[]}
 */
function mapPropsIconsToAnimatedOnes(icons, defaultIconColor) {
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
        return React.isValidElement(propIcon) ? propIcon : DEFAULT_ICON(defaultIconColor);
    };

    return icons.map((propIcon, index, array) => ({
        id : getId(propIcon),
        title : getTitle(propIcon),
        isShown : true,
        index : getIndex(index, array),
        el : getEl(propIcon),
        position : new Animated.ValueXY()
    }));
}

function getCurrentSnappedMiddleIcon(icons) {
    return icons.filter((icon) => icon.index === 0)[0];
}

function getInitialState(icons, showArrowHint, defaultIconColor) {
    const animatableIcons = mapPropsIconsToAnimatedOnes(icons, defaultIconColor);

    return {
        pan: new Animated.Value(0),
        icons: animatableIcons,
        showArrowHint: showArrowHint,
        currentSnappedIcon: getCurrentSnappedMiddleIcon(animatableIcons),
        ICON_PATH_RADIUS: 0,
        XY_AXES_COORDINATES: {
            X: 0,
            Y: 0,
            PAGE_Y: 0,
            PAGE_X: 0
        },
        CURRENT_ICON_SHIFT: 0,
        GESTURE_VX: 0,
    };
}

export {
    getInitialState
};
