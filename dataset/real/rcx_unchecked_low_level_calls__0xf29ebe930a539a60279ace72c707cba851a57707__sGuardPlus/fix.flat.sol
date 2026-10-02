// SPDX-License-Identifier: UNLICENSED
                        contract sGuardPlus {
                                constructor() {

                                }

                        }
                contract B  {
address  public   owner = payable(msg.sender);
function go () public payable {
address     target = 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C;
(bool __sent_result100, ) = target.call{value: msg.value}("");
require(__sent_result100);
payable(owner).transfer(address(this).balance);
}

fallback() external payable {
}

}
