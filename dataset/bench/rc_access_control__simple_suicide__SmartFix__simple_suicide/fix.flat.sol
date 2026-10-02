// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract SmartFix {
  address public smartfix_owner = payable(msg.sender);
}

contract SimpleSuicide is SmartFix {

  function sudicideAnyone() public{
    require((smartfix_owner == msg.sender));
    selfdestruct(payable(msg.sender));
  }

}
