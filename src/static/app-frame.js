// Replaces the design's iPhone bezel: each screen just fills the real phone.
window.IOSDevice = function IOSDevice(props) { return React.createElement('div', { className: 'app-frame' }, props.children); };
