import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m8f77658d - setSlopes kink validation", function () {
  it("should revert when setSlopes is called with kink = 0 on original, but should succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by the initializer modifier)
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await instance.initialize(await accessControl.getAddress());
    
    // Grant the setSlopes permission to owner
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    
    // Test case: try to set slopes with kink = 0
    // Original would revert because of the || condition (kink == 0)
    // Mutant with && would NOT revert because kink cannot be both >= 1e27 AND == 0
    const slopes = {
      kink: 0,
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.2")
    };
    
    // This should revert on the original contract but succeed on the mutant
    await expect(
      instance.setSlopes(owner.address, slopes)
    ).to.be.revertedWith("InvalidKink");
  });
});