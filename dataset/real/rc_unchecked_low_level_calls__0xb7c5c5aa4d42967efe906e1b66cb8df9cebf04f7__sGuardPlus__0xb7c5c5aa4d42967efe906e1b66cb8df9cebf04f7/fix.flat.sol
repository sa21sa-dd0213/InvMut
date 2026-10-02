// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract sGuardPlus {
                                constructor() {
                                        __lock_modifier0_lock = false;

                                }

                bool private __lock_modifier0_lock;
                modifier __lock_modifier0() {
                        require(!__lock_modifier0_lock);
                        __lock_modifier0_lock = true;
                        _;
                        __lock_modifier0_lock = false;

                }

                        }
                contract keepMyEther is sGuardPlus {
mapping (address  => uint256 ) public   balances;
fallback() external payable {
balances[msg.sender]+=msg.value;
}

function withdraw () public __lock_modifier0  {
(bool __sent_result100, ) = msg.sender.call{value: balances[msg.sender]}("");
require(__sent_result100);
balances[msg.sender]=0;
}

}
