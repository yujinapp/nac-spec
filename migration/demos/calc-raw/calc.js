/* Calc state. Simple two-operand: current input + pending operator + accumulator. */
var state = {
  display: '0',
  acc: null,
  op: null,
  freshInput: true
};

function el(id) { return document.getElementById(id); }
function render() {
  el('display').textContent = state.display;
  el('history').textContent = state.acc != null
    ? state.acc + ' ' + (state.op || '') + ' ' + (state.freshInput ? '' : state.display)
    : '';
}

function digit(d) {
  if (state.freshInput || state.display === '0') {
    state.display = d;
    state.freshInput = false;
  } else {
    if (state.display.length < 12) state.display += d;
  }
  render();
}

function dot() {
  if (state.freshInput) { state.display = '0.'; state.freshInput = false; render(); return; }
  if (state.display.indexOf('.') === -1) { state.display += '.'; render(); }
}

function setOp(op) {
  if (state.acc != null && !state.freshInput) {
    compute();
  } else {
    state.acc = parseFloat(state.display);
  }
  state.op = op;
  state.freshInput = true;
  render();
}

function compute() {
  if (state.acc == null || state.op == null) return;
  var b = parseFloat(state.display);
  var a = state.acc;
  var r = 0;
  if (state.op === '+') r = a + b;
  else if (state.op === '-') r = a - b;
  else if (state.op === '*') r = a * b;
  else if (state.op === '/') r = b === 0 ? NaN : a / b;
  state.display = String(r);
  state.acc = r;
}

function equals() {
  if (state.op == null || state.acc == null) return;
  compute();
  state.acc = null;
  state.op = null;
  state.freshInput = true;
  render();
}

function clearAll() {
  state.display = '0';
  state.acc = null;
  state.op = null;
  state.freshInput = true;
  render();
}

function backspace() {
  if (state.freshInput) return;
  if (state.display.length <= 1 || (state.display.length === 2 && state.display.charAt(0) === '-')) {
    state.display = '0';
    state.freshInput = true;
  } else {
    state.display = state.display.slice(0, -1);
  }
  render();
}

function percent() {
  var v = parseFloat(state.display) / 100;
  state.display = String(v);
  render();
}

/* Initial paint */
render();
