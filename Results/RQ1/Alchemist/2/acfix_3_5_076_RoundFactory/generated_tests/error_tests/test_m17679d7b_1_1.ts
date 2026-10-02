import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - updateAlloSettings", function () {
  it("should detect mutant that sets alloSettings to address(this) instead of newAlloSettings", async function () {
    const [owner, addr1, programOperator] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Add program operator
    await instance.connect(owner).addProgramOperator(programOperator.address);

    // Deploy a mock RoundImplementation for testing
    const MockRoundImpl = await ethers.getContractFactory("MockRoundImplementation");
    const mockRoundImpl = await MockRoundImpl.deploy();
    await mockRoundImpl.waitForDeployment();

    // Update round implementation
    await instance.connect(owner).updateRoundImplementation(mockRoundImpl.target);

    // Set alloSettings to a specific address (not the factory itself)
    const testAlloSettings = addr1.address;
    await instance.connect(owner).updateAlloSettings(testAlloSettings);

    // Verify alloSettings was set correctly
    expect(await instance.alloSettings()).to.equal(testAlloSettings);

    // Create a round and check that the alloSettings passed to initialize is correct
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [programOperator.address, 100]
    );

    await instance.connect(programOperator).create(encodedParameters, programOperator.address);

    // The alloSettings should still be the test address, not the factory address
    expect(await instance.alloSettings()).to.equal(testAlloSettings);
    expect(await instance.alloSettings()).to.not.equal(instance.target);
  });
});