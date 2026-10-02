import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - return clone", function () {
  it("should return the clone address when create is called", async function () {
    const [owner, programOperator, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the factory
    await instance.initialize();
    
    // Set up program operator
    await instance.connect(owner).updateProgramOperator(programOperator.address, true);
    
    // Deploy a mock round implementation
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplementation.deploy();
    await roundImpl.waitForDeployment();
    
    // Set round implementation and alloSettings
    const alloSettingsAddress = ethers.ZeroAddress; // Using zero address for testing
    await instance.connect(owner).updateRoundImplementation(await roundImpl.getAddress());
    await instance.connect(owner).updateAlloSettings(alloSettingsAddress);
    
    // Prepare encoded parameters (empty bytes for testing)
    const encodedParameters = "0x";
    
    // Call create as program operator and expect a non-zero address to be returned
    const tx = await instance.connect(programOperator).create(encodedParameters, addr1.address);
    const receipt = await tx.wait();
    
    // Decode the return value from the transaction
    const iface = new ethers.Interface(Factory.interface.format());
    const decoded = iface.decodeFunctionResult("create", receipt.logs[0].data);
    
    // The returned address should not be zero
    expect(decoded[0]).to.not.equal(ethers.ZeroAddress);
    
    // Alternative approach: call static to get return value
    const returnedAddress = await instance.connect(programOperator).create.staticCall(encodedParameters, addr1.address);
    expect(returnedAddress).to.not.equal(ethers.ZeroAddress);
  });
});