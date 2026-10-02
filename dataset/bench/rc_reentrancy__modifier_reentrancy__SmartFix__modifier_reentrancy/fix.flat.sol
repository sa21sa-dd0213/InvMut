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

contract ModifierEntrancy is SmartFix {
  mapping (address => uint) public tokenBalance;
  string constant name = "Nu Token";

  function airDrop()  public _nonReentrant  hasNoBalance supportsToken {
    require(((tokenBalance[msg.sender] + 20) >= tokenBalance[msg.sender]));
    tokenBalance[msg.sender] += 20;
  }

  modifier supportsToken() {
    require(keccak256(abi.encodePacked("Nu Token")) == Bank(msg.sender).supportsToken());
    _;
  }

  modifier hasNoBalance {
      require(tokenBalance[msg.sender] == 0);
      _;
  }
}

contract Bank{
    function supportsToken() external pure returns (bytes32){
        return(keccak256(abi.encodePacked("Nu Token")));
    }
}

contract attack{
    bool hasBeenCalled;
    function supportsToken() external returns (bytes32){
        if(!hasBeenCalled){
            hasBeenCalled = true;
            ModifierEntrancy(msg.sender).airDrop();
        }
        return(keccak256(abi.encodePacked("Nu Token")));
    }
    function call(address token) public{
        ModifierEntrancy(token).airDrop();
    }
}
