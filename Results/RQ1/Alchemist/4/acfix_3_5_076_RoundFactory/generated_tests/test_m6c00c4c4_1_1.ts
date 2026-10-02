import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m6c00c4c4", function () {
  it("should detect mutant that changed != to == in require for roundImplementation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the RoundFactory contract
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required by OwnableUpgradeable pattern)
    await instance.initialize();

    // Set a valid roundImplementation address
    const roundImpl = addr1.address;
    await instance.updateRoundImplementation(roundImpl);

    // Set alloSettings to a non-zero address (required by create)
    await instance.updateAlloSettings(addr1.address);

    // Add owner as a program operator
    await instance.setProgramOperator(owner.address, true);

    // Prepare encoded parameters (empty bytes for simplicity)
    const encodedParameters = ethers.toUtf8Bytes("");

    // Call create - should succeed in original, revert in mutant
    await expect(
      instance.create(encodedParameters, addr1.address)
    ).to.not.be.reverted;
  });
});