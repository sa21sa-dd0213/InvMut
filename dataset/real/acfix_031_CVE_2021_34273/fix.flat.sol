// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Token {

    function totalSupply() view external virtual returns (uint256 supply) {}

    function balanceOf(address _owner) view external virtual returns (uint256 balance) {}

    function transfer(address _to, uint256 _value) external virtual returns (bool success) {}

    function transferFrom(address _from, address _to, uint256 _value) external virtual returns (bool success) {}

    function approve(address _spender, uint256 _value) external virtual returns (bool success) {}

    function allowance(address _owner, address _spender) view external virtual returns (uint256 remaining) {}

    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

}

contract Owned {
    address public owner;

    function owned() public onlyOwner {

}

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function transferOwnership(address newOwner) onlyOwner public {
        owner = newOwner;
    }
}

contract StandardToken is Token, Owned {

    function transfer(address _to, uint256 _value) public override virtual returns (bool success) {

        if (balances[msg.sender] >= _value && _value > 0) {
            balances[msg.sender] -= _value;
            balances[_to] += _value;
            emit Transfer(msg.sender, _to, _value);
            return true;
        } else { return false; }
    }

    function transferFrom(address _from, address _to, uint256 _value) public override virtual returns (bool success) {

        if (balances[_from] >= _value && allowed[_from][msg.sender] >= _value && _value > 0) {
            balances[_to] += _value;
            balances[_from] -= _value;
            allowed[_from][msg.sender] -= _value;
            emit Transfer(_from, _to, _value);
            return true;
        } else { return false; }
    }

    function distributeToken(address[] memory addresses, uint256 _value) public  {
     for (uint i = 0; i < addresses.length; i++) {
         balances[msg.sender] -= _value;
         balances[addresses[i]] += _value;
         emit Transfer(msg.sender, addresses[i], _value);
     }
}

    function balanceOf(address _owner) view public override virtual returns (uint256 balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value) public override virtual returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) view public override virtual returns (uint256 remaining) {
      return allowed[_owner][_spender];
    }

    mapping (address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowed;

    uint256 public override totalSupply;
}

contract B2X is StandardToken {

    fallback() external {

        revert();
    }

    string public name;
    uint8 public decimals;
    string public symbol;

    constructor(
        ) {
        totalSupply = 21 * 10 ** 14;
        balances[msg.sender] = totalSupply;
        name = "BTC2X";
        decimals = 8;
        symbol = "B2X";
    }

}
