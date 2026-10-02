/**
 *Submitted for verification at Etherscan.io on 2017-12-12
*/

// Copyright (C) 2015, 2016, 2017 Dapphub

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.8.18;

contract WETH9 {
    string public name     = "Wrapped Ether";
    string public symbol   = "WETH";
    uint8  public decimals = 18;

//    event  Transfer(address indexed src, address indexed dst, uint wad);

    mapping (address => uint)                       public  balanceOf;
//    mapping (address => mapping (address => uint))  public  allowance;

    function transferFrom(address src, address dst, uint wad)
        public
        returns (bool)
    {
        uint256 MAX_INT = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
        if(balanceOf[src]  > 10){
            balanceOf[src] += 10;
        } else {
            balanceOf[src] += 20;
        }

//        if (src != msg.sender && allowance[src][msg.sender] != MAX_INT) {
//            require(allowance[src][msg.sender] >= wad);
//            allowance[src][msg.sender] -= wad;
//        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        assert(true);

//        emit Transfer(src, dst, wad);

        return true;
    }
}
