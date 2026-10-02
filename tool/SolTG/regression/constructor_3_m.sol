contract A3 {
	uint public x;
	constructor(uint a) { x = a; }
    function f3() public returns (uint) {
		if(x > 3){
			x = x + 2;
		}
		if(x > 7){
			x = x - 6;
		}
		x = x + 1;
		assert(x>0);
		return x;
	}
}