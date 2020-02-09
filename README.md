# react-native-ring-picker
This is the ring-shaped wheel navigator/selector component for react native

## Dependencies
Inside the react native project do the following
- `npm i react-native-ring-picker --save` install the picker element
- `npm i react-native-svg --save` install the direct dependency of react native svg, since default icon is SVG and picker accepts the collection of SVG icons
- `cd ios` got to iOS project folder
    - `pod install` install native packages inside iOS project folder necessary for SVG work like  `RNSVG` from `../node_modules/react-native-svg`

## Basic default UI
```jsx harmony
<ReactNativeRingPicker
    girthAngle={120}
    iconHideOnTheBackDuration={300}
    styleIconText={{color: '#000', fontWeight: 'bold'}}
/>
```

## Configuration sample
```jsx harmony
<ReactNativeRingPicker
    icons={[<HomeIcon/>, <MapIcon title={"route"}/>, <OtherIcon id={"icon_id"} title={"other title"}/>, {id: "action_4", title: "action_4"}, "action_5"]}
    girthAngle={120}
    iconHideOnTheBackDuration={300}
    onPress={(iconId) => {}}
    showArrowHint={true}
    styleIconText={{color: '#000', fontWeight: 'bold'}}
    style={{flex: 0, marginTop: 0}}
/>
```
