contract Cb1 {
    constructor(){}
    function f(uint x) public returns(bool) {
        if (x > 10) {

            assert(x > 9);
            return true;
        }
        else if (x > 2)
        {
            assert(x <= 10 && x > 2);
            return false;
        }
        else
        {
           assert(0 <= x && x <= 2);
            return true;
        }
    }
}
// ====
// SMTEngine: all
// ----
