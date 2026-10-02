import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - m6c00c4c4", function () {
  it("should kill the mutant that inverts the roundImplementation zero address check", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the RoundFactory contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initialize the factory (required before using it)
    await factory.initialize();

    // Set up a valid round implementation address (deploy a minimal proxy target)
    // Deploy a simple contract to act as the round implementation
    const MinimalContract = await ethers.getContractFactory("contracts/test/MinimalRound.sol:MinimalRound");
    const roundImpl = await MinimalContract.deploy();
    await roundImpl.waitForDeployment();

    // Set the round implementation to a non-zero address
    await factory.updateRoundImplementation(await roundImpl.getAddress());

    // Set up alloSettings (deploy a simple contract)
    const AlloSettings = await ethers.getContractFactory("contracts/test/MinimalAlloSettings.sol:MinimalAlloSettings");
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    await factory.updateAlloSettings(await alloSettings.getAddress());

    // Add addr1 as a program operator
    await factory.connect(owner).addProgramOperator(addr1.address);

    // Prepare encoded parameters for the round
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "string"],
      [owner.address, 100, "test round"]
    );

    // The original contract should succeed; the mutant should revert because it checks
    // require(roundImplementation == address(0)) which will fail since we set it to non-zero
    await expect(
      factory.connect(addr1).create(encodedParameters, addr1.address)
    ).to.not.be.reverted;
  });
});