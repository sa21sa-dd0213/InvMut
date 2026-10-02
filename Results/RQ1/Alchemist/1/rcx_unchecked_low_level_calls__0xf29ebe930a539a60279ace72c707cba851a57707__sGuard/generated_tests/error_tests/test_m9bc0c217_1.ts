import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - msg.value vs msg.value-1", function () {
  it("should kill mutant by sending exactly 1 wei and checking target balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Target address from the contract
    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    
    // Get initial balance of target
    const initialTargetBalance = await ethers.provider.getBalance(targetAddress);
    
    // Send exactly 1 wei to the go function
    const tx = await instance.go({ value: 1 });
    await tx.wait();

    // Get final balance of target
    const finalTargetBalance = await ethers.provider.getBalance(targetAddress);
    
    // In original: 1 wei sent to target -> balance increases by 1
    // In mutant: 0 wei sent to target (1-1=0) -> balance unchanged
    expect(finalTargetBalance - initialTargetBalance).to.equal(1n);
  });
});