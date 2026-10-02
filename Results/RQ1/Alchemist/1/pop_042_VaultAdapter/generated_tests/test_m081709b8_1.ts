import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - kill mutant m081709b8 (remove revert InvalidKink)", function () {
  let vaultAdapter: any;
  let owner: any;
  let addr1: any;
  let accessControl: any;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock access control contract that allows all access
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Initialize the VaultAdapter with the access control contract
    await vaultAdapter.initialize(await accessControl.getAddress());
  });

  it("should revert when setSlopes is called with kink == 0 (detect mutant removing revert)", async function () {
    // Create SlopeData with kink = 0 (invalid according to the original contract)
    const invalidSlopes = {
      kink: 0,
      slope0: ethers.parseEther("1"),
      slope1: ethers.parseEther("2")
    };
    
    // The original contract reverts with InvalidKink when kink == 0
    // The mutant removes this revert, so the transaction would succeed
    await expect(
      vaultAdapter.connect(owner).setSlopes(ethers.ZeroAddress, invalidSlopes)
    ).to.be.revertedWithCustomError(vaultAdapter, "InvalidKink");
  });

  it("should revert when setSlopes is called with kink >= 1e27 (detect mutant removing revert)", async function () {
    // Create SlopeData with kink = 1e27 (invalid according to the original contract)
    const invalidSlopes = {
      kink: ethers.parseEther("1000000000000000000000000000"), // 1e27
      slope0: ethers.parseEther("1"),
      slope1: ethers.parseEther("2")
    };
    
    // The original contract reverts with InvalidKink when kink >= 1e27
    // The mutant removes this revert, so the transaction would succeed
    await expect(
      vaultAdapter.connect(owner).setSlopes(ethers.ZeroAddress, invalidSlopes)
    ).to.be.revertedWithCustomError(vaultAdapter, "InvalidKink");
  });
});