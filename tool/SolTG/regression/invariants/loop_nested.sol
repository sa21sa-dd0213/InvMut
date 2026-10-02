contract Simpleln {
	function f() public pure {
		uint x = 10;
		uint y;
		while (y < x)
		{
			++y;
			x = 0;
			while (x < 10){
				if (x + y == 12){
					y = y + x;
				}
				++x;
			}
			assert(x == 10);
		}
		// Removed because of Spacer nondeterminism.
		assert(y == x);
	}
}
// ====
// SMTEngine: all
// ----
