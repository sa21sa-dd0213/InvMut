import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateAlloSettings", function () {
  it("should detect mutant that always sets alloSettings to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments as it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // First set a valid roundImplementation to avoid revert in create
    const MockImplementation = await ethers.getContractFactory("RoundImplementation");
    const mockImpl = await MockImplementation.deploy();
    await mockImpl.waitForDeployment();
    
    await instance.updateRoundImplementation(await mockImpl.getAddress());
    
    // Set a non-zero alloSettings address
    const validAlloSettings = addr1.address;
    await instance.updateAlloSettings(validAlloSettings);
    
    // Verify that alloSettings was actually set to the passed value, not address(0)
    const storedAlloSettings = await instance.alloSettings();
    expect(storedAlloSettings).to.equal(validAlloSettings, "alloSettings should be the non-zero address we passed");
    
    // Now call create - this should succeed with valid alloSettings
    // Prepare minimal encoded parameters for initialize
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "address"],
      [owner.address, owner.address, 0, 0, ethers.ZeroAddress]
    );
    
    // This call should succeed if alloSettings is properly set
    // But will revert if mutant set it to address(0)
    const tx = instance.create(encodedParams, owner.address);
    await expect(tx).to.not.be.reverted;
  });
});