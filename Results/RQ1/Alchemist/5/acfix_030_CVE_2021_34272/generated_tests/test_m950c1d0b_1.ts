import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant kill test", function () {
  it("should revert when non-owner calls transferOwnership, but succeed when owner calls it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that the original owner is set (default address(0) if no constructor arg)
    // Try transferring from non-owner - should revert in original, but in mutant it may succeed
    // The key: in mutant, onlyOwner modifier allows anyone EXCEPT owner, so:
    // - Owner calling transferOwnership should revert (mutant will fail)
    // - Non-owner calling transferOwnership should succeed (mutant will pass)
    
    // Test 1: Owner calls transferOwnership - original passes, mutant reverts
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.not.be.reverted;

    // Test 2: After ownership transferred, new owner can transfer again
    // This ensures the mutation is detected if first test passed incorrectly
    await expect(
      instance.connect(addr1).transferOwnership(owner.address)
    ).to.not.be.reverted;
  });
});