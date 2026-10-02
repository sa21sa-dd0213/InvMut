import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - onlyProgramOperator modifier", function () {
  it("should revert when non-program operator calls create function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory - no constructor arguments needed (OwnableUpgradeable uses initialize)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Setup required addresses for create function
    // Deploy a mock round implementation and alloSettings (using simple contracts)
    const MockRoundImpl = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await MockRoundImpl.deploy();
    await roundImpl.waitForDeployment();
    
    const MockAlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettings = await MockAlloSettings.deploy();
    await alloSettings.waitForDeployment();
    
    // Set round implementation and alloSettings (only owner can do this)
    await instance.updateRoundImplementation(await roundImpl.getAddress());
    await instance.updateAlloSettings(await alloSettings.getAddress());
    
    // Create encoded parameters (empty bytes for simplicity)
    const encodedParameters = "0x";
    
    // Attempt to call create from an address that is NOT a program operator
    // This should revert on the original but might succeed on the mutant
    await expect(
      instance.connect(addr1).create(encodedParameters, await addr2.getAddress())
    ).to.be.revertedWith("Caller is not a program operator");
  });
});