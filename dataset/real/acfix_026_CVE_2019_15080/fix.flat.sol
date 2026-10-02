// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

    contract Owned {
        address public owner;

        function owned() public onlyOwner {

}

        modifier onlyOwner {
            require(msg.sender == owner);
            _;
        }

        function transferOwnership(address _newOwner)  public onlyOwner {
            owner = _newOwner;
        }
    }

contract ERC20 {

  using SafeMath for uint256;

  mapping (address => uint256) public balanceOf;
  mapping (address => mapping (address => uint256)) allowed;

  mapping(address => bool) public isblacklistedAccount;

  string public name;
  string public symbol;
  uint8 public decimals = 4;
  uint256 public totalSupply;

  event Approval(address indexed owner, address indexed spender, uint256 value);

  event Transfer(address indexed from, address indexed to, uint256 value);

  constructor(uint256 _initialSupply, string memory _tokenName, string memory _tokenSymbol) public {
    totalSupply = _initialSupply * 10 ** uint256(decimals);
    balanceOf[msg.sender] = totalSupply;
    name = _tokenName;
    symbol = _tokenSymbol;
  }

	function transfer(address _to, uint256 _value) public returns (bool) {
        require(!isblacklistedAccount[msg.sender]);
        require(!isblacklistedAccount[_to]);
		require(balanceOf[msg.sender] > 0);
		require(balanceOf[msg.sender] >= _value);
		require(_to != address(0));
		require(_value > 0);
		require(balanceOf[_to] .add(_value) >= balanceOf[_to]);
		require(_to != msg.sender);
		balanceOf[msg.sender] = balanceOf[msg.sender].sub(_value);
		balanceOf[_to] = balanceOf[_to].add(_value);
		emit Transfer(msg.sender, _to, _value);
        return true;
	}

    function transferFrom(
         address _from,
         address _to,
         uint256 _amount
     ) public returns (bool success)
      {
         if (balanceOf[_from] >= _amount
             && allowed[_from][msg.sender] >= _amount
             && _amount > 0
             && balanceOf[_to].add(_amount) > balanceOf[_to])
        {
             balanceOf[_from] = balanceOf[_from].sub(_amount);
             allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_amount);
             balanceOf[_to] = balanceOf[_to].add(_amount);
             return true;
        } else {
             return false;
        }
    }

     function approve(address _spender, uint256 _amount) public returns (bool success) {
         allowed[msg.sender][_spender] = _amount;
         emit Approval(msg.sender, _spender, _amount);
         return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
         return allowed[_owner][_spender];
    }
}

library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {

    uint256 c = a / b;

    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

contract MorphToken is Owned, ERC20 {

    using SafeMath for uint256;

    uint256  tokenSupply = 100000000;

    event Burn(address from, uint256 value);

	constructor()

	ERC20 (tokenSupply,"MORPH","MORPH") public
    {
		owner = payable(msg.sender);
	}

    function blacklistAccount(address _target, bool _isBlacklisted) public onlyOwner {
        isblacklistedAccount[_target] = _isBlacklisted;
    }

    function mintTokens(uint256 _mintedAmount) public onlyOwner {
        balanceOf[owner] = balanceOf[owner].add(_mintedAmount);
        totalSupply = totalSupply.add(_mintedAmount);
        emit Transfer(address(0), owner, _mintedAmount);
    }

    function burn(uint256 _value) public onlyOwner {
      require(_value <= balanceOf[msg.sender]);

      address burner = payable(msg.sender);
      balanceOf[burner] = balanceOf[burner].sub(_value);
      totalSupply = totalSupply.sub(_value);
      emit Burn(burner, _value);
  }
}
