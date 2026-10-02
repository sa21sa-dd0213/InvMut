import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m8a75c582 - event emission test", function () {
  it("should emit SetLimits event when setLimits is called with valid parameters", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the VaultAdapter contract (constructor has no arguments as it calls _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock AccessControl contract for initialization
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to the owner for the setLimits function selector
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    
    // Define test values for limits
    const maxMultiplier = ethers.parseEther("2"); // 2e18
    const minMultiplier = ethers.parseEther("0.5"); // 0.5e18
    const rate = ethers.parseEther("0.1"); // 0.1e18
    
    // Call setLimits and expect the SetLimits event to be emitted
    await expect(instance.connect(owner).setLimits(maxMultiplier, minMultiplier, rate))
      .to.emit(instance, "SetLimits")
      .withArgs(maxMultiplier, minMultiplier, rate);
  });
});