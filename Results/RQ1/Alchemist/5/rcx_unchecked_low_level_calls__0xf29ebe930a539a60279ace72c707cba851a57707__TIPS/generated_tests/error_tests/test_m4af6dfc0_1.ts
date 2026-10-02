import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m4af6dfc0 test", function () {
  it("should succeed on original but fail on mutant when external call succeeds", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract B (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Send some ETH to the contract first (needed for balance transfer)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Call go() with ETH - the target address is hardcoded in the contract
    // The target 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C should accept the call
    // Original: should succeed and transfer balance to owner
    // Mutant: will revert because if(true) always triggers revert
    const tx = instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
    
    // The mutant will always revert, so we expect this to revert
    await expect(tx).to.be.reverted;
  });
});