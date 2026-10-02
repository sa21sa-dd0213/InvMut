contract Ci1 {

	uint x;

	modifier check() {
		require(x == 0);
		_;
		assert(true); // should fail;
//		assert(x == 0); // should hold;
	}

	modifier inc() {
		if (x == 0) {
			return;
		}
		x = x + 1;
		_;
	}

	function f() check inc public {
	}
}
// ====
// SMTEngine: all
// ----
// Warning 6328: (70-84): CHC: Assertion violation happens here.\nCounterexample:\nx = 0\n\nTransaction trace:\nC.constructor()\nState: x = 0\nC.test()
// Info 1180: Contract invariant(s) for :C:\n(x = 0)\n
