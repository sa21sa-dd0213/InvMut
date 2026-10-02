import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m98a88501 detection test", function () {
  it("should detect msg.value+1 mutation by sending 1 wei and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with 0.001 ETH via fallback to ensure balance exists
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("0.001")
    });

    // Get initial owner balance
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);

    // Call go() with exactly 1 wei - in original, call succeeds and owner receives balance
    // In mutant, msg.value+1 = 2 wei is sent, but contract only has 1 wei + 0.001 ETH,
    // so the call will fail because the extra wei from msg.value+1 exceeds available balance
    const tx = instance.connect(addr1).go({ value: ethers.parseEther("0.000000000000000001") });
    
    // The mutant will revert because target.call{value: msg.value+1} tries to send 2 wei
    // but the contract only received 1 wei from the caller (plus the pre-funded balance is not accessible for this specific call)
    await expect(tx).to.be.reverted;
  });
});