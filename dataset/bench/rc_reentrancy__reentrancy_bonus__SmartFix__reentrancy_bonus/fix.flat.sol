// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract SmartFix {
  bool public _locked = false;

  modifier _nonReentrant() {
    require(!_locked);
    _locked = true;
    _;
    _locked = false;
  }
}

contract Reentrancy_bonus is SmartFix {

    mapping (address => uint) private userBalances;
    mapping (address => bool) private claimedBonus;
    mapping (address => uint) private rewardsForA;

    function withdrawReward(address recipient)  public _nonReentrant  {
        uint amountToWithdraw = rewardsForA[recipient];
        rewardsForA[recipient] = 0;
        (bool success, ) = recipient.call{value: amountToWithdraw}("");
        require(success);
    }

    function getFirstWithdrawalBonus(address recipient) public {
        require(!claimedBonus[recipient]);

        rewardsForA[recipient] += 100;

        withdrawReward(recipient);
        claimedBonus[recipient] = true;
    }
}
