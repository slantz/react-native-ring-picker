import { Dimensions } from "react-native";

export const SQUARE_DIMENSIONS = {
    WIDTH : Dimensions.get("window").width,
    HEIGHT : Dimensions.get("window").height,
    BLUE_INPUT_WIDTH : Dimensions.get("window").width * 0.56,
    ICON_PADDING_FROM_WHEEL : Dimensions.get("window").height * 0.05
};
