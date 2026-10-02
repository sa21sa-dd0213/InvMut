import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant kill test - msg.value-1", function () {
  it("should detect when msg.value-1 is used instead of msg.value", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const targetBalanceBefore = await ethers.provider.getBalance(targetAddress);
    
    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();
    
    const targetBalanceAfter = await ethers.provider.getBalance(targetAddress);
    
    // In original, target receives 1 wei; in mutant, target receives 0 wei (1-1)
    expect(targetBalanceAfter - targetBalanceBefore).to.equal(1);
  });
});