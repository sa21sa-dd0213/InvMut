import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m6c00c4c4 test", function () {
  it("should revert when roundImplementation is set to non-zero address due to inverted require check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - it's OwnableUpgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Initialize the factory (required since it's OwnableUpgradeable)
    await factory.initialize();
    
    // Set roundImplementation to a valid non-zero address
    const validImplementation = addr1.address;
    await factory.updateRoundImplementation(validImplementation);
    
    // Set alloSettings to a valid non-zero address
    const validAlloSettings = addr1.address;
    await factory.updateAlloSettings(validAlloSettings);
    
    // Set the caller as a program operator
    await factory.connect(owner).setProgramOperator(owner.address, true);
    
    // The create function should revert because the mutant requires roundImplementation == address(0)
    // but we set it to a non-zero address
    await expect(
      factory.connect(owner).create("0x", owner.address)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});