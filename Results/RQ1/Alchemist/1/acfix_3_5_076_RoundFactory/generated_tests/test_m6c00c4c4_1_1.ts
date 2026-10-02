import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m6c00c4c4 test", function () {
  it("should revert when roundImplementation is set to non-zero and create is called (mutant requires zero address)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as it's OwnableUpgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Add addr1 as a program operator
    await instance.connect(owner).programOperators(addr1.address, true);

    // Set a non-zero roundImplementation (as would be done in normal operation)
    const mockImplementation = "0x0000000000000000000000000000000000000001";
    await instance.connect(owner).updateRoundImplementation(mockImplementation);

    // Set alloSettings to a non-zero address
    const mockAlloSettings = "0x0000000000000000000000000000000000000002";
    await instance.connect(owner).updateAlloSettings(mockAlloSettings);

    // Try to call create from addr1 (authorized program operator)
    // The original requires != address(0), but mutant requires == address(0)
    // So with non-zero roundImplementation, mutant should revert
    await expect(
      instance.connect(addr1).create("0x", addr1.address)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});