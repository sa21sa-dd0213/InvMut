import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m37f2a3ad", function () {
  it("should revert when alloSettings is set to a valid non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as it uses initialize)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Set the owner as a program operator
    await instance.connect(owner).updateProgramOperators(owner.address, true);

    // Deploy a mock implementation contract (any contract will do for address validation)
    const MockImpl = await ethers.getContractFactory("RoundImplementation");
    const mockImpl = await MockImpl.deploy();
    await mockImpl.waitForDeployment();

    // Update round implementation to a valid address
    await instance.connect(owner).updateRoundImplementation(mockImpl.target);

    // Set alloSettings to a non-zero address (valid scenario)
    await instance.connect(owner).updateAlloSettings(addr1.address);

    // Create encoded parameters (empty bytes is valid for this test)
    const encodedParameters = "0x";

    // The mutant requires alloSettings == address(0), so with a non-zero alloSettings it should revert
    await expect(
      instance.connect(owner).create(encodedParameters, owner.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});