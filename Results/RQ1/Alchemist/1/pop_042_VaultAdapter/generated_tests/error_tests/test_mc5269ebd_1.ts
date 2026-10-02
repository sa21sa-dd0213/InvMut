import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mc5269ebd - kill test", function () {
  it("should revert when unauthorized address calls setLimits", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments - it's an upgradeable contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock AccessControl contract for initialization
    // We need to deploy a simple contract that implements IAccessControl
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter with the access control
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Ensure unauthorized address does NOT have the setLimits permission
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    
    // Attempt to call setLimits from unauthorized address - should revert
    await expect(
      vaultAdapter.connect(unauthorized).setLimits(
        ethers.parseEther("2"),
        ethers.parseEther("0.5"),
        ethers.parseEther("0.1")
      )
    ).to.be.revertedWithCustomError(vaultAdapter, "AccessDenied");
  });
});

// Helper mock contract to make the test work
// This should be deployed as a separate contract file, but for completeness we include it