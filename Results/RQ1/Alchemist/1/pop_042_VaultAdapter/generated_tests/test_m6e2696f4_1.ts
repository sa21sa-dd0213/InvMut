import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m6e2696f4 - event emission", function () {
  it("should emit SetSlopes event when setSlopes is called with valid parameters", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the VaultAdapter contract
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const accessControlAddress = owner.address; // Using owner as access control for simplicity
    await instance.initialize(accessControlAddress);
    
    // Set up valid slope data
    const validKink = ethers.parseEther("0.5"); // 0.5e18, must be less than 1e27 and not zero
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    const slopeData = {
      kink: validKink,
      slope0: slope0,
      slope1: slope1
    };
    
    const testAsset = ethers.Wallet.createRandom().address;
    
    // Expect the SetSlopes event to be emitted with correct parameters
    await expect(instance.setSlopes(testAsset, slopeData))
      .to.emit(instance, "SetSlopes")
      .withArgs(testAsset, slopeData);
  });
});