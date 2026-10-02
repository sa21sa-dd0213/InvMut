import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m00e6fc02", function () {
  it("should revert when non-program operator calls create", async function () {
    const [owner, nonOperator] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).initialize();
    
    // Set up round implementation and alloSettings (required for create)
    const dummyImplementation = await ethers.deployContract("RoundImplementation");
    await dummyImplementation.waitForDeployment();
    await instance.connect(owner).updateRoundImplementation(await dummyImplementation.getAddress());
    
    const dummyAlloSettings = ethers.Wallet.createRandom().address;
    await instance.connect(owner).updateAlloSettings(dummyAlloSettings);
    
    // Try to call create from a non-operator address
    const encodedParameters = "0x";
    await expect(
      instance.connect(nonOperator).create(encodedParameters, nonOperator.address)
    ).to.be.revertedWith("Caller is not a program operator");
  });
});