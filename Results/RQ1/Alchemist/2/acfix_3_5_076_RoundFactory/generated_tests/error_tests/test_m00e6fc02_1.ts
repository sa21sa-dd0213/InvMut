import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m00e6fc02 - onlyProgramOperator modifier removed from create", function () {
  it("should revert when non-program operator calls create, but mutant allows it", async function () {
    const [owner, nonOperator, randomUser] = await ethers.getSigners();

    // Deploy the RoundFactory (no constructor arguments as per original code)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initialize the factory (required by the contract)
    await factory.connect(owner).initialize();

    // Deploy a minimal mock round implementation (needed for create to work)
    const MockRoundImpl = await ethers.getContractFactory("RoundImplementationMock");
    const roundImpl = await MockRoundImpl.deploy();
    await roundImpl.waitForDeployment();

    // Set the round implementation and alloSettings
    await factory.connect(owner).updateRoundImplementation(await roundImpl.getAddress());
    await factory.connect(owner).updateAlloSettings(await roundImpl.getAddress()); // using same mock for simplicity

    // Attempt to call create from a non-program operator (should revert in original, pass in mutant)
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "string"],
      [randomUser.address, "test"]
    );

    // This should revert with "Caller is not a program operator" in the original
    // In the mutant (without modifier), it will succeed (detecting the bug)
    await expect(
      factory.connect(nonOperator).create(encodedParams, randomUser.address)
    ).to.be.revertedWith("Caller is not a program operator");
  });
});

// Helper mock contract to satisfy the create function requirements
// This should be deployed in a separate file or as part of the test setup
contract RoundImplementationMock {
  function initialize(bytes calldata, address) external {
    // Do nothing, just satisfy the interface
  }
}