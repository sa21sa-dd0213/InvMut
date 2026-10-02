import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m00e6fc02 - kill test", function () {
  it("should revert when non-program operator calls create function", async function () {
    const [owner, nonOperator] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).initialize();
    
    // Deploy a mock round implementation and set it
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplementation.deploy();
    await roundImpl.waitForDeployment();
    await instance.connect(owner).updateRoundImplementation(await roundImpl.getAddress());
    
    // Set alloSettings to a valid address (use a simple contract or address)
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    await instance.connect(owner).updateAlloSettings(await alloSettings.getAddress());
    
    // Attempt to call create from non-operator - should revert
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "string"],
      [await owner.getAddress(), 100, "test"]
    );
    
    await expect(
      instance.connect(nonOperator).create(encodedParameters, await nonOperator.getAddress())
    ).to.be.revertedWith("Caller is not a program operator");
  });
});