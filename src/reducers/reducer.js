import {
    HIDE_ARROW_HINT,
    HIDE_ICON,
    SET_PATH_RADIUS_AND_COORDINATES,
    SHOW_ICON,
    UPDATE_CURRENT_ICON_SHIFT_AND_GESTURE_VX,
    UPDATE_CURRENT_SNAPPED_ICON_AND_SHIFT
} from "../actions";

export const reducer = (state, {type, payload}) => {
    function mapIsShown(state) {
        return (icon) => {
            if (icon.id === payload) {
                icon.isShown = state;
            }
            return icon;
        };
    }

    switch (type) {
        case UPDATE_CURRENT_ICON_SHIFT_AND_GESTURE_VX:
            return {
                ...state,
                CURRENT_ICON_SHIFT: payload.CURRENT_ICON_SHIFT,
                GESTURE_VX: payload.VX
            };
        case UPDATE_CURRENT_SNAPPED_ICON_AND_SHIFT:
            return {
                ...state,
                CURRENT_ICON_SHIFT: payload.CURRENT_ICON_SHIFT,
                currentSnappedIcon: payload.currentSnappedIcon
            };
        case SET_PATH_RADIUS_AND_COORDINATES:
            return {
                ...state,
                ICON_PATH_RADIUS: payload.ICON_PATH_RADIUS,
                XY_AXES_COORDINATES: payload.XY_AXES_COORDINATES
            };
        case HIDE_ICON:
            return {
                ...state,
                icons: state.icons.map(mapIsShown(false))
            };
        case SHOW_ICON:
            return {
                ...state,
                icons: state.icons.map(mapIsShown(true))
            };
        case HIDE_ARROW_HINT:
            return {
                ...state,
                showArrowHint: false
            };
        default:
            throw new Error();
    }
};
