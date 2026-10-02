// SPDX-License-Identifier: UNLICENSED
contract sGuard{
  function sub_uint256(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add_uint256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
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
}

contract PENNY_BY_PENNY
 is sGuard {
    struct Holder
    {
        uint unlockTime;
        uint balance;
    }

    mapping (address => Holder) public Acc;

    uint public MinSum;

    LogFile Log;

    bool intitalized;

     function SetMinSum(uint _val)  public nonReentrant_ {
        if(intitalized)revert();
        MinSum = _val;
    }

     function SetLogFile(address _log)  public nonReentrant_ {
        if(intitalized)revert();
        Log = LogFile(_log);
    }

     function Initialized()  public nonReentrant_ {
        intitalized = true;
    }

     function Put(uint _lockTime)  public nonReentrant_ payable {
        Holder storage acc = Acc[msg.sender];
        acc.balance = add_uint256(acc.balance, msg.value);
        if(add_uint256(block.timestamp, _lockTime)>acc.unlockTime)acc.unlockTime=add_uint256(block.timestamp, _lockTime);
        Log.AddMessage(msg.sender,msg.value,"Put");
    }

     function Collect(uint _am)  public nonReentrant_ payable {
        Holder storage acc = Acc[msg.sender];
        if( acc.balance>=MinSum && acc.balance>=_am && block.timestamp>acc.unlockTime)
        {

            { (bool _s, bytes memory _d) = msg.sender.call{value: _am}(""); _d; if (_s) {
                acc.balance = sub_uint256(acc.balance, _am);
                Log.AddMessage(msg.sender,_am,"Collect");
            } }
        }
    }

    fallback() external payable {
        Put(0);
    }

}

contract LogFile
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
