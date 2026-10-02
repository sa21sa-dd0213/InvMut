contract Av1 {
	int x;
	constructor (int a) { x = a;}
}

contract Bv1 is Av1 {
	int y;
	constructor(int a) Av1(-a) {
		if (a > 0) {
			y = 2;
			return;
		}
		else {
			y = 3;
		}
		y = 4; // overwrites the else branch
	}
}

contract Cv1 is Bv1 {
	constructor(int a) Bv1(a) {
		assert(y != 3); // should hold
		assert(y == 4); // should fail
		if (a > 0) {
			y=2;
			assert(x < 0 && y == 2); // should hold
			assert(x < 0 && y == 4); // should fail
		}
		else {
			y=4;
			assert(x >= 0 && y == 4); // should hold
			assert(x >= 0 && y == 2); // should fail
			assert(x > 0); // should fail
		}
	}
}
// ====
// SMTEngine: all
// ----
// Warning 6328: (297-311): CHC: Assertion violation happens here.\nCounterexample:\ny = 2, x = (- 1)\na = 1\n\nTransaction trace:\nC.constructor(1)
// Warning 6328: (389-412): CHC: Assertion violation happens here.\nCounterexample:\ny = 2, x = (- 1)\na = 1\n\nTransaction trace:\nC.constructor(1)
// Warning 6328: (489-513): CHC: Assertion violation happens here.\nCounterexample:\ny = 4, x = 0\na = 0\n\nTransaction trace:\nC.constructor(0)
// Warning 6328: (533-546): CHC: Assertion violation happens here.\nCounterexample:\ny = 4, x = 0\na = 0\n\nTransaction trace:\nC.constructor(0)
