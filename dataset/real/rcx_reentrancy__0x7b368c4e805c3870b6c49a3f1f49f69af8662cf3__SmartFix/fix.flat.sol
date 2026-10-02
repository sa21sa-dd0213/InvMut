// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract W_WALLET
{
    function Put(uint _unlockTime)
     public payable {
        Holder storage acc = Acc[msg.sender];
        require(((acc.balance + msg.value) >= acc.balance));
        acc.balance += msg.value;
        acc.unlockTime = _unlockTime>block.timestamp?_unlockTime:block.timestamp;
        LogFile.AddMessage(msg.sender,msg.value,"Put");
    }

    function Collect(uint _am)
     public payable {
        Holder storage acc = Acc[msg.sender];
        if( acc.balance>=MinSum && acc.balance>=_am && block.timestamp>acc.unlockTime)
        {

            acc.balance = (acc.balance - _am);
            { (bool _s, bytes memory _d) = msg.sender.call{value: _am}(""); _d; if (_s) {

                LogFile.AddMessage(msg.sender,_am,"Collect");
            } else {revert (); } }
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
