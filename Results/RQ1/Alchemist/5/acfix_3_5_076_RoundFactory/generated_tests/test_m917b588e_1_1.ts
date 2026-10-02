import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m917b588e - updateRoundImplementation", function () {
  it("should kill mutant by calling updateRoundImplementation with a valid non-zero address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Add owner as a program operator to be able to call create
    // First we need to set owner as program operator (since onlyProgramOperator is needed for create, but updateRoundImplementation only has onlyOwner)
    // For updateRoundImplementation, we just need to be owner

    // Set a valid non-zero address to update to
    const validAddress = addr1.address;

    // This should succeed on the original contract but revert on the mutant
    // because mutant requires newRoundImplementation == address(0)
    await expect(
      instance.updateRoundImplementation(validAddress)
    ).to.not.be.reverted;

    // Verify the implementation was updated
    expect(await instance.roundImplementation()).to.equal(validAddress);
  });
});