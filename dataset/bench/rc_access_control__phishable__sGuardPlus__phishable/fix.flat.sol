// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract sGuardPlus {
                                constructor() {

                                }

                        }
                contract Phishable  {
address  public   owner;
constructor (address    _owner)   {
owner=_owner;
}

fallback() external payable {
}

function withdrawAll (address    _recipient) public  {
require(msg.sender==owner);
payable(_recipient).transfer(address(this).balance);
}

}
