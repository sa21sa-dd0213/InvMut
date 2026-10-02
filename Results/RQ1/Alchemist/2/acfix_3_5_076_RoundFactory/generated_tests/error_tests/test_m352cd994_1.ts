import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - m352cd994", function () {
  it("should revert when non-owner calls updateAlloSettings on original, but mutant allows it", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - uses OwnableUpgradeable pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await factory.connect(owner).initialize();
    
    // Attempt to call updateAlloSettings from non-owner address
    // Original contract with onlyOwner modifier would revert here
    // Mutant without modifier would allow the call
    const testAddress = "0x0000000000000000000000000000000000000001";
    
    // This should revert on original, but pass on mutant
    await expect(
      factory.connect(nonOwner).updateAlloSettings(testAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});