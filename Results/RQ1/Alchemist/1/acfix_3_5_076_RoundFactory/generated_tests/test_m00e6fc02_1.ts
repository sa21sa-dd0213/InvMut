import { expect } from "chai";
import { ethers } } from "hardhat";

describe("RoundFactory mutant m00e6fc02 - onlyProgramOperator modifier removal", function () {
  it("should revert when non-operator calls create, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by initializer modifier)
    await instance.connect(owner).initialize();
    
    // Set up required state: roundImplementation and alloSettings
    // Deploy dummy contracts for these addresses (or use zero address will fail later)
    const Dummy = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await Dummy.deploy();
    await roundImpl.waitForDeployment();
    
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    
    await instance.connect(owner).updateRoundImplementation(roundImpl.target);
    await instance.connect(owner).updateAlloSettings(alloSettings.target);
    
    // Create encoded parameters (can be empty bytes for this test)
    const encodedParams = ethers.toUtf8Bytes("test");
    
    // Test: non-operator (addr1) tries to call create - should revert on original
    await expect(
      instance.connect(addr1).create(encodedParams, addr2.address)
    ).to.be.revertedWith("Caller is not a program operator");
    
    // If the mutant is present, the above will not revert and the test will fail
  });
});