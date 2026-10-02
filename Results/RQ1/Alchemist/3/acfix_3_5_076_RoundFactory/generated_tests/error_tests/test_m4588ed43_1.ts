import { expect } from "chai";
import { ethers } } from "hardhat";

describe("RoundFactory mutant m4588ed43 test", function () {
  it("should return the clone address from create function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up a mock round implementation and alloSettings
    // We need to deploy a simple contract that can be used as roundImplementation
    const MockRoundImpl = await ethers.getContractFactory("MockRoundImplementation");
    const mockRoundImpl = await MockRoundImpl.deploy();
    await mockRoundImpl.waitForDeployment();
    
    // Deploy a mock alloSettings contract
    const MockAlloSettings = await ethers.getContractFactory("MockAlloSettings");
    const mockAlloSettings = await MockAlloSettings.deploy();
    await mockAlloSettings.waitForDeployment();
    
    // Set the round implementation and alloSettings
    await instance.updateRoundImplementation(mockRoundImpl.target);
    await instance.updateAlloSettings(mockAlloSettings.target);
    
    // Add addr1 as program operator
    await instance.addProgramOperator(addr1.address);
    
    // Prepare encoded parameters (empty bytes for simplicity)
    const encodedParameters = ethers.toUtf8Bytes("");
    
    // Call create function from program operator
    const tx = await instance.connect(addr1).create(encodedParameters, addr2.address);
    const receipt = await tx.wait();
    
    // Get the returned clone address from the transaction
    const returnedAddress = await instance.connect(addr1).create.staticCall(encodedParameters, addr2.address);
    
    // The mutant removes the return statement, so staticCall would return zero address
    // while the original contract returns a non-zero address
    expect(returnedAddress).to.not.equal(ethers.ZeroAddress);
    expect(returnedAddress).to.not.equal(undefined);
  });
});