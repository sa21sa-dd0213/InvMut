import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateAlloSettings access control", function () {
  it("should revert when non-owner calls updateAlloSettings", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();
    
    // Set a valid alloSettings address for the test
    const dummyAddress = "0x0000000000000000000000000000000000000001";
    
    // Attempt to call updateAlloSettings from non-owner address
    await expect(
      instance.connect(nonOwner).updateAlloSettings(dummyAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    
    // Verify the alloSettings was NOT changed (should still be zero address)
    expect(await instance.alloSettings()).to.equal("0x0000000000000000000000000000000000000000");
  });
});