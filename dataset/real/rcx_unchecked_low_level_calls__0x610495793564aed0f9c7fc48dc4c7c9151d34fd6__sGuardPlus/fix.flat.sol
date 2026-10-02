// SPDX-License-Identifier: UNLICENSED
                        contract sGuardPlus {
                                constructor() {

                                }

                        }
                contract SimpleWallet  {
address  public   owner = payable(msg.sender);
uint  public   depositsCount;
modifier onlyOwner {
require(msg.sender==owner);
_;
}
fallback() external payable {
depositsCount ++ ;
}

function withdrawAll () public onlyOwner  {
withdraw(address(this).balance);
}

function withdraw (uint    _value) public onlyOwner  {
payable(msg.sender).transfer(_value);
}

function sendMoney (address    _target,uint    _value, bytes memory _data) public onlyOwner  {
(bool __sent_result100, ) = _target.call{value: _value}(_data);
require(__sent_result100);
}

}
