import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m98a88501 test", function () {
  it("should kill mutant by sending 1 wei and expecting revert due to msg.value+1 overflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    
    // Fund the target address with some ether so the call can succeed in the original
    await owner.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther("1")
    });

    // Send exactly 1 wei to the contract - original works, mutant reverts
    const tx = instance.connect(addr1).go({ value: 1 });
    
    // The mutant tries to send msg.value+1 = 2 wei, but contract only has 1 wei
    // This causes a revert in the mutant, while original succeeds
    await expect(tx).to.be.reverted;
  });
});