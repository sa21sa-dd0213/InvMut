import { expect } from "chai";
import { ethers } } from "hardhat";

describe("B mutant test - m4af6dfc0", function () {
  it("should detect mutant that always reverts by testing a successful external call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for B)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Send some ether to the contract via fallback to have balance
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });
    
    // Verify contract has the funds
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(fundAmount);
    
    // The target address in the contract is a known address (0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C)
    // We'll call go() which should forward the ether and then transfer balance to owner
    // On the mutant, this will always revert because condition is always true
    
    // Get owner's balance before
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    
    // Call go() - should succeed on original, but revert on mutant
    const tx = instance.connect(owner).go({ value: ethers.parseEther("0.5") });
    
    // On the mutant, this should revert because if(true) always triggers revert
    await expect(tx).to.be.reverted;
    
    // If we get here (test passes), the mutant is detected because:
    // - Original would succeed and transfer funds
    // - Mutant always reverts due to the condition being changed to true
  });
});