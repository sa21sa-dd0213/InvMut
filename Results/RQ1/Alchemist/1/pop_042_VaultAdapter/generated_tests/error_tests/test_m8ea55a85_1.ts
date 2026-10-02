import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m8ea55a85 test", function () {
  it("should successfully setSlopes with valid kink value (kills mutant that always reverts)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a minimal access control contract for initialization
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes function
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    
    // Valid kink value (between 0 and 1e27)
    const validKink = ethers.parseEther("0.5"); // 0.5 * 10^18
    const slopes = {
      kink: validKink,
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.2")
    };
    
    // This should succeed on original but fail (revert) on mutant
    await expect(instance.connect(owner).setSlopes(ethers.ZeroAddress, slopes)).to.not.be.reverted;
  });
});