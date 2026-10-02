contract Av2 {
	uint x = 1;
}

contract Bv2 is Av2 {
	constructor(int a) {
		if (a > 0) {
			x = 2;
			return;
		}
		x = 3;
	}
}

abstract contract Cv2 is Bv2 {
}

contract Dv2 is Cv2 {
	constructor(int a) Bv2(a) {
		assert(a > 0 || x == 3); // should hold
		assert(a <= 0 || x == 2); // should hold
		assert(x == 1); // should fail
	}
}
// ====
// SMTEngine: all
// ----
// Warning 6328: (286-300): CHC: Assertion violation happens here.\nCounterexample:\nx = 2\na = 1\n\nTransaction trace:\nD.constructor(1)
