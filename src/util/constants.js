import { Dimensions } from "react-native";

let width = Dimensions.get("window").width;
let height = Dimensions.get("window").height;

let narrowScreenSide = width <= height ? width : height;
let broadScreenSide = width > height ? width : height;

export const SQUARE_DIMENSIONS = {
    WIDTH : narrowScreenSide,
    HEIGHT : broadScreenSide,
    BLUE_INPUT_WIDTH : narrowScreenSide * 0.56,
    ICON_PADDING_FROM_WHEEL : broadScreenSide * 0.05
};

export const DIRECTIONS = {
    CLOCKWISE: "CLOCKWISE",
    COUNTERCLOCKWISE: "COUNTERCLOCKWISE"
};

export const CIRCLE_SECTIONS = {
    TOP_LEFT: "TOP_LEFT",
    TOP_RIGHT: "TOP_RIGHT",
    BOTTOM_LEFT: "BOTTOM_LEFT",
    BOTTOM_RIGHT: "BOTTOM_RIGHT"
};
