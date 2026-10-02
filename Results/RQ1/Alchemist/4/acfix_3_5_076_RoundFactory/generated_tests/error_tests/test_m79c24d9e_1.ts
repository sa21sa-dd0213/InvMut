import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m79c24d9e", function () {
  it("should detect mutant that always sets roundImplementation to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await (await instance.initialize()).wait();
    
    // Set up a program operator
    await (await instance.connect(owner).updateAlloSettings(addr1.address)).wait();
    
    // First, verify that roundImplementation is initially address(0)
    expect(await instance.roundImplementation()).to.equal(ethers.ZeroAddress);
    
    // Deploy a mock implementation contract to use as newRoundImplementation
    const MockImpl = await ethers.getContractFactory("RoundImplementation");
    const mockImpl = await MockImpl.deploy();
    await mockImpl.waitForDeployment();
    
    // Call updateRoundImplementation with a valid non-zero address
    await (await instance.connect(owner).updateRoundImplementation(mockImpl.target)).wait();
    
    // In the original contract, roundImplementation would now be set to mockImpl.target
    // In the mutant, it would be set to address(0) instead
    
    // Get the current roundImplementation value
    const currentImpl = await instance.roundImplementation();
    
    // The test passes (kills the mutant) if roundImplementation is address(0) when it should be mockImpl.target
    // This means the mutant is detected
    expect(currentImpl).to.equal(ethers.ZeroAddress);
    
    // Additionally, verify that calling create() reverts because roundImplementation is address(0)
    await expect(
      instance.connect(owner).create("0x", addr2.address)
    ).to.be.revertedWith("roundImplementation is 0x");
  });
});