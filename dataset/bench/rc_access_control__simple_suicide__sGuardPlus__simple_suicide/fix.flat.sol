// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract sGuardPlus {
                                constructor() {

                                        __owner = payable(msg.sender);
                                }

                address private __owner;
                modifier __onlyOwner() {
                        require(msg.sender == __owner);
                        _;
                }

                        }
                contract SimpleSuicide is sGuardPlus {
function sudicideAnyone ()   public __onlyOwner {
selfdestruct(payable(msg.sender));
}

}
