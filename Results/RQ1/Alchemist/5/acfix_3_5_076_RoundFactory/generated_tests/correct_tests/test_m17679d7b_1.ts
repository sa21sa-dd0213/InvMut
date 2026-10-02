import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m17679d7b - updateAlloSettings", function () {
  it("should detect that alloSettings is set to address(this) instead of the provided parameter", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set owner as program operator to enable create() if needed
    // First, we need to test updateAlloSettings behavior
    
    // Get the contract's own address
    const contractAddress = await instance.getAddress();
    
    // Call updateAlloSettings with a distinct address (different from contract address)
    const newSettingsAddress = addr1.address;
    await instance.updateAlloSettings(newSettingsAddress);
    
    // Read the alloSettings value
    const storedAlloSettings = await instance.alloSettings();
    
    // The original contract would store newSettingsAddress
    // The mutant stores address(this) instead
    // So we expect the stored value to be the one we passed (newSettingsAddress)
    // If the mutant is active, it will be the contract's own address instead
    expect(storedAlloSettings).to.equal(newSettingsAddress);
    
    // Additional verification: ensure it's NOT the contract's own address
    expect(storedAlloSettings).to.not.equal(contractAddress);
  });
});