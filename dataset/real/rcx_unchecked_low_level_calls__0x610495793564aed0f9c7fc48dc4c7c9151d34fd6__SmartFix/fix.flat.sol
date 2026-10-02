// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract SimpleWallet {
    address public owner = msg.sender;
    uint public depositsCount;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    receive() external payable {
        require(((depositsCount + 1) >= depositsCount));
        depositsCount++;
    }

    function withdrawAll() public onlyOwner {
        withdraw(address(this).balance);
    }

    function withdraw(uint _value) public onlyOwner {
        payable(msg.sender).transfer(_value);
    }

    function sendMoney(address _target, uint _value, bytes memory _data) public onlyOwner {

        _target.call{value: _value}(_data);
    }
}
