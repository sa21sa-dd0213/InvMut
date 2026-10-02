import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - updateAlloSettings mutation", function () {
  it("should revert when updateAlloSettings sets alloSettings to address(this) instead of newAlloSettings", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up a mock round implementation (can be any contract address)
    const mockImplementation = addr1.address;
    
    // Update round implementation to avoid "roundImplementation is 0x" error
    await instance.connect(owner).updateRoundImplementation(mockImplementation);
    
    // Try to update alloSettings to addr2's address
    await instance.connect(owner).updateAlloSettings(addr2.address);
    
    // Verify that alloSettings was NOT set to addr2.address (mutant sets it to address(this))
    const alloSettings = await instance.alloSettings();
    
    // The mutant sets alloSettings = address(this), so it should equal the contract address
    // The original would set it to addr2.address
    // This test kills the mutant because the mutant incorrectly sets it to the contract itself
    expect(alloSettings).to.not.equal(addr2.address);
    expect(alloSettings).to.equal(await instance.getAddress());
  });
});