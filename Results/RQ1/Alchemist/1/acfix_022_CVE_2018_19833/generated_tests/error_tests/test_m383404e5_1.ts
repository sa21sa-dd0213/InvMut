import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m383404e5 - owned() modifier removed", function () {
  it("should revert when non-owner calls owned() on original, but pass on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments (initialSupply, tokenName, tokenSymbol)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TST");
    await instance.waitForDeployment();

    // Record original owner
    const originalOwner = await instance.owner();

    // Attempt to call owned() from a non-owner address (addr1)
    // In the original contract this should revert due to onlyOwner modifier
    // In the mutant it will succeed and change ownership to addr1
    try {
      const tx = await instance.connect(addr1).owned();
      await tx.wait();
      
      // If we reach here, the mutant is detected: ownership changed
      const newOwner = await instance.owner();
      expect(newOwner).to.equal(addr1.address);
      expect(newOwner).to.not.equal(originalOwner);
      
      // If ownership changed, test passes (kills the mutant)
    } catch (error: any) {
      // If it reverts, it's the original contract behavior
      // We expect revert on original, so this should be caught
      expect(error.message).to.include("revert");
      
      // Verify owner remains unchanged
      const currentOwner = await instance.owner();
      expect(currentOwner).to.equal(originalOwner);
      
      // If we got a revert and owner unchanged, the mutant is NOT killed
      // This test would need to be restructured to specifically fail on mutant
      // Let's rethrow to indicate test should fail for mutant detection
      throw new Error("Mutant not killed: owned() reverted as expected for original contract");
    }
  });
});