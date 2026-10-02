import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - return clone", function () {
  it("should return the address of the newly created clone when calling create", async function () {
    const [owner, programOperator, ownedBy] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set program operator
    await instance.connect(owner).updateProgramOperator(programOperator.address, true);
    
    // Deploy a mock round implementation
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplementation.deploy();
    await roundImpl.waitForDeployment();
    
    // Update round implementation
    await instance.connect(owner).updateRoundImplementation(roundImpl.target);
    
    // Deploy mock AlloSettings
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    
    // Update AlloSettings
    await instance.connect(owner).updateAlloSettings(alloSettings.target);
    
    // Prepare encoded parameters
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "string"],
      [1, "test"]
    );
    
    // Call create as program operator
    const tx = await instance.connect(programOperator).create(encodedParams, ownedBy.address);
    const receipt = await tx.wait();
    
    // Get the return value from the transaction
    const iface = new ethers.Interface(["function create(bytes, address) returns (address)"]);
    const decodedReturn = iface.decodeFunctionResult("create", tx.data);
    
    // The return value should be a valid address (non-zero)
    expect(decodedReturn[0]).to.not.equal(ethers.ZeroAddress);
    
    // The return value should be a contract (has code)
    const code = await ethers.provider.getCode(decodedReturn[0]);
    expect(code).to.not.equal("0x");
  });
});