import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateRoundImplementation", function () {
  it("should kill mutant by calling updateRoundImplementation with a valid non-zero address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Set a valid non-zero address for the new implementation
    const validAddress = addr1.address;

    // In the original contract, this should succeed
    // In the mutant (with == instead of !=), this will revert
    await expect(instance.updateRoundImplementation(validAddress)).to.not.be.reverted;

    // Verify the implementation was actually updated
    expect(await instance.roundImplementation()).to.equal(validAddress);
  });
});