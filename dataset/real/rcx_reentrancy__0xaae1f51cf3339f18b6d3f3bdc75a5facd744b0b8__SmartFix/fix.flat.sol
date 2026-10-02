// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract DEP_BANK
{
    mapping (address=>uint256) public balances;

    uint public MinSum;

    LogFile Log;

    bool intitalized;

    function SetMinSum(uint _val)
    public
    {
        if(intitalized)revert();
        MinSum = _val;
    }

    function SetLogFile(address _log)
    public
    {
        if(intitalized)revert();
        Log = LogFile(_log);
    }

    function Initialized()
    public
    {
        intitalized = true;
    }

    function Deposit()
    public
    payable
    {
        require(((balances[msg.sender] + msg.value) >= balances[msg.sender]));
        balances[msg.sender]+= msg.value;
        Log.AddMessage(msg.sender,msg.value,"Put");
    }

    function Collect(uint _am)
    public
    payable
    {
        if(balances[msg.sender]>=MinSum && balances[msg.sender]>=_am)
        {

            balances[msg.sender] = (balances[msg.sender] - _am);
            (bool _veri_ok,) = msg.sender.call{value: _am}("");
            if(_veri_ok)
            {

                Log.AddMessage(msg.sender,_am,"Collect");
            } else {revert (); }
        }
    }

    receive() external payable {
        Deposit();
    }

}

contract LogFile
{
    struct Message
    {
        address Sender;
        string  Data;
        uint Val;
        uint  Time;
    }

    Message[] public History;

    Message LastMsg;

    function AddMessage(address _adr,uint _val,string memory _data)
    public
    {
        LastMsg.Sender = _adr;
        LastMsg.Time = block.timestamp;
        LastMsg.Val = _val;
        LastMsg.Data = _data;
        History.push(LastMsg);
    }
}
