import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory - kill mutant m91c22590", function () {
  it("should emit RoundImplementationUpdated event when updateRoundImplementation is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Set a new round implementation address
    const newImplementation = addr1.address;

    // Call updateRoundImplementation and expect the event to be emitted
    await expect(instance.updateRoundImplementation(newImplementation))
      .to.emit(instance, "RoundImplementationUpdated")
      .withArgs(newImplementation);

    // Verify the state change happened correctly
    expect(await instance.roundImplementation()).to.equal(newImplementation);
  });
});