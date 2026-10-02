import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - onlyProgramOperator modifier", function () {
  it("should revert when create() is called by a non-program operator on the original, but succeed on the mutant", async function () {
    const [owner, nonOperator, addr2] = await ethers.getSigners();

    // Deploy RoundFactory - no constructor arguments needed
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).initialize();

    // Set up required addresses for create() function
    const roundImplementation = addr2.address;
    const alloSettings = addr2.address;

    // Update round implementation and alloSettings
    await instance.connect(owner).updateRoundImplementation(roundImplementation);
    await instance.connect(owner).updateAlloSettings(alloSettings);

    // Attempt to call create() from a non-operator address
    const encodedParameters = "0x";

    // This should revert on the original contract because nonOperator is not a program operator
    await expect(
      instance.connect(nonOperator).create(encodedParameters, nonOperator.address)
    ).to.be.revertedWith("Caller is not a program operator");

    // If we reach here, the original contract correctly reverted
    // The mutant would NOT revert, thus failing this test
  });
});