// SPDX-License-Identifier: UNLICENSED
contract sGuard{
  function sub_uint256(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  bool internal locked_;
  constructor() {
    locked_ = false;
  }
  modifier nonReentrant_() {
    require(!locked_);
    locked_ = true;
    _;
    locked_ = false;
  }

  function add_uint256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

contract W_WALLET
 is sGuard {
     function Put(uint _unlockTime)  public nonReentrant_ payable {
        Holder storage acc = Acc[msg.sender];
        acc.balance = add_uint256(acc.balance, msg.value);
        acc.unlockTime = _unlockTime>block.timestamp?_unlockTime:block.timestamp;
        LogFile.AddMessage(msg.sender,msg.value,"Put");
    }

     function Collect(uint _am)  public nonReentrant_ payable {
        Holder storage acc = Acc[msg.sender];
        if( acc.balance>=MinSum && acc.balance>=_am && block.timestamp>acc.unlockTime)
        {

            { (bool _s, bytes memory _d) = msg.sender.call{value: _am}(""); _d; if (_s) {
                acc.balance = sub_uint256(acc.balance, _am);
                LogFile.AddMessage(msg.sender,_am,"Collect");
            } }
        }
    }

    fallback() external payable {
        Put(0);
    }

    struct Holder
    {
        uint unlockTime;
        uint balance;
    }

    mapping (address => Holder) public Acc;

    Log LogFile;

    uint public MinSum = 1 ether;

    constructor(address log) public{
        LogFile = Log(log);
    }
}

contract Log
 is sGuard {
    struct Message
    {
        address Sender;
        string  Data;
        uint Val;
        uint  Time;
    }

    Message[] public History;

    Message LastMsg;

    function AddMessage(address _adr,uint _val, string memory _data)
    public
    {
        LastMsg.Sender = _adr;
        LastMsg.Time = block.timestamp;
        LastMsg.Val = _val;
        LastMsg.Data = _data;
        History.push(LastMsg);
    }
}
