// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract PrivateBank
{
    mapping (address => uint) public balances;

    uint public MinDeposit = 1 ether;

    Log TransferLog;

    constructor(address _log)
    {
        TransferLog = Log(_log);
    }

    function Deposit()
    public
    payable
    {
        if(msg.value >= MinDeposit)
        {
            require(((balances[msg.sender] + msg.value) >= balances[msg.sender]));
            balances[msg.sender]+=msg.value;
            TransferLog.AddMessage(msg.sender,msg.value,"Deposit");
        }
    }

    function CashOut(uint _am) public
    {
        if(_am<=balances[msg.sender])
        {

            balances[msg.sender] = (balances[msg.sender] - _am);
            (bool _veri_ok,) = msg.sender.call{value: _am}("");
            if(_veri_ok)
            {

                TransferLog.AddMessage(msg.sender,_am,"CashOut");
            } else {revert (); }
        }
    }

    receive() external payable {}

}

contract Log
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
