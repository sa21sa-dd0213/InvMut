import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m9bc0c217 test", function () {
  it("should detect mutation by verifying target receives exact msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of target address
    const targetAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialTargetBalance = await ethers.provider.getBalance(targetAddress);
    
    // Send exactly 1 wei to the contract via go()
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();
    
    // Check that target received exactly 1 wei (original behavior)
    // In mutant, target would receive 0 wei (msg.value - 1 = 0)
    const finalTargetBalance = await ethers.provider.getBalance(targetAddress);
    expect(finalTargetBalance).to.equal(initialTargetBalance + BigInt(1));
  });
});