import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m664098ee - updateRoundImplementation sets address(this) instead of parameter", function () {
  it("should kill the mutant by verifying that roundImplementation is updated correctly and clone creation uses the correct implementation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).initialize();

    // Add owner as program operator
    await instance.connect(owner).programOperators(owner.address, true);

    // Deploy a mock implementation contract to use as roundImplementation
    const MockRoundImpl = await ethers.getContractFactory("RoundImplementation");
    const mockImplementation = await MockRoundImpl.deploy();
    await mockImplementation.waitForDeployment();

    // Set alloSettings to a non-zero address
    const MockAlloSettings = await ethers.getContractFactory("AlloSettings");
    const mockAlloSettings = await MockAlloSettings.deploy();
    await mockAlloSettings.waitForDeployment();
    await instance.connect(owner).updateAlloSettings(mockAlloSettings.target);

    // Update roundImplementation with the mock implementation
    const tx = await instance.connect(owner).updateRoundImplementation(mockImplementation.target);
    await tx.wait();

    // Verify that roundImplementation was set to the mock, NOT address(this)
    const storedImplementation = await instance.roundImplementation();
    expect(storedImplementation).to.equal(mockImplementation.target);

    // Now try to create a round - this will fail with the mutant because it tries to clone itself
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256"],
      [owner.address, addr1.address, 100, 200]
    );

    // With the original contract this would succeed, with mutant it should revert
    // because cloning address(this) (the factory) will fail as it's not a valid implementation
    await expect(
      instance.connect(owner).create(encodedParameters, owner.address)
    ).to.be.reverted;
  });
});