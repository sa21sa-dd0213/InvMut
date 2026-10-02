contract Simplelf {
	function f() public pure {
		uint x;
		uint y;
		for (x = 10; y < x; ++y)
		{
			for (x = 0; x < 10; ++x) {
				if (y + x == 20){
					y--;
				}
			}
			assert(x == 10);
		}
		assert(y == x);
	}
}

