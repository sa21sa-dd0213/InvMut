// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
contract ERCDDAToken {
  address public owner;
  string public name;
  string public symbol;
  uint8 public decimals = 0;
  uint256 public totalSupply;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event FrozenFunds(address target, bool frozen);
  event Burn(address indexed from, uint256 value);
  mapping (address => uint256) public balanceOf;
  mapping (address => bool) public frozenAccount;

    function owned() public {
    require(msg.sender == owner, "Only the current owner can change ownership");
}

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

  constructor(
        uint256 initialSupply, string memory tokenName, string memory tokenSymbol) public {
        owner = payable(msg.sender);
        totalSupply = initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        name = tokenName;
        symbol = tokenSymbol;
    }

    function _transfer(address _from, address _to, uint _value) internal {
        require (_to != address(0));
        require (balanceOf[_from] >= _value);
        require (balanceOf[_to] + _value >= balanceOf[_to]);
        require(!frozenAccount[_from]);
        require(!frozenAccount[_to]);
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(_from, _to, _value);
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function freezeAccount(address target, bool freeze)  public onlyOwner {
        frozenAccount[target] = freeze;
        emit FrozenFunds(target, freeze);
    }

    function burn(uint256 _value)  public onlyOwner returns (bool success) {
        require(balanceOf[msg.sender] >= _value);
        balanceOf[msg.sender] -= _value;
        totalSupply -= _value;
        emit Burn(msg.sender, _value);
        return true;
    }

	function mintToken(address target, uint256 mintedAmount)  public onlyOwner {
		balanceOf[target] += mintedAmount;
		totalSupply += mintedAmount;
	}
}
