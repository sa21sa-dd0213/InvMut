import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m74f225aa test", function () {
  it("should revert when kink is exactly 1e27 (boundary condition test)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter - constructor takes no arguments
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Initialize the contract
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes function
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    
    // Attempt to set slopes with kink exactly equal to 1e27
    const kinkValue = ethers.parseEther("1000000000"); // 1e27 in wei terms
    const slopeData = {
      kink: kinkValue,
      slope0: ethers.parseEther("1"),
      slope1: ethers.parseEther("1")
    };
    
    // Original contract reverts with InvalidKink when kink >= 1e27
    // Mutant allows kink == 1e27, so this should revert on original but not on mutant
    await expect(
      vaultAdapter.setSlopes(owner.address, slopeData)
    ).to.be.revertedWithCustomError(vaultAdapter, "InvalidKink");
  });
});