import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - updateAlloSettings without onlyOwner", function () {
  it("should revert when non-owner calls updateAlloSettings on original contract, but succeed on mutant without modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed for this upgradeable contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();
    
    // Attempt to call updateAlloSettings from non-owner address
    const newAlloSettings = ethers.Wallet.createRandom().address;
    
    // This should revert on original (with onlyOwner modifier)
    // but would succeed on mutant (without modifier)
    await expect(
      instance.connect(addr1).updateAlloSettings(newAlloSettings)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});