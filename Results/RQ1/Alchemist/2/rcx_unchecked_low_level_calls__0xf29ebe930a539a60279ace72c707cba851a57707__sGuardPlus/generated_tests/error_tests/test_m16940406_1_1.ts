import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mutant m16940406 - target replaced with address(0)", function () {
  it("should fail to send ETH to the original target address when target is address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const originalTargetBalanceBefore = await ethers.provider.getBalance(targetAddress);
    
    const sendAmount = ethers.parseEther("1.0");
    
    // Fund the contract with some ETH first so it has balance to send to target
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: sendAmount
    });
    
    // Call go from addr1 with a small amount of ETH
    const tx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
    await tx.wait();
    
    const originalTargetBalanceAfter = await ethers.provider.getBalance(targetAddress);
    const balanceDifference = originalTargetBalanceAfter - originalTargetBalanceBefore;
    
    // In the original, the target should have received the ETH sent in go()
    // In the mutant (address(0)), the ETH is burned, so target balance stays unchanged
    expect(balanceDifference).to.equal(0n);
  });
});