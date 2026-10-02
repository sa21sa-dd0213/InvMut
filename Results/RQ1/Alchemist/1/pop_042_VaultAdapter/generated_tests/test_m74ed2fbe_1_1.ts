import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - m74ed2fbe", function () {
  it("should kill mutant m74ed2fbe by setting utilization equal to kink and verifying the interest rate calculation", async function () {
    const [owner, vault, user] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy AccessControl
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    const zeroSelector = "0x00000000";
    
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), await owner.getAddress());
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), await owner.getAddress());
    await accessControl.grantAccess(zeroSelector, await vaultAdapter.getAddress(), await owner.getAddress());
    
    // Setup slopes with a specific kink
    const assetAddress = ethers.Wallet.createRandom().address;
    const kink = ethers.parseEther("0.5"); // 50% utilization as kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.2"); // 20% excess slope
    
    await vaultAdapter.setSlopes(assetAddress, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.01"); // 1% rate
    
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set vault to return utilization exactly equal to kink
    await mockVault.setUtilization(kink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Set lastUpdate to block.timestamp - 100 to have elapsed time
    const elapsed = 100;
    await ethers.provider.send("evm_increaseTime", [elapsed]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rate function
    const result = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);
    
    // Expected rate for original contract: slope0 = 0.1 ether
    const expectedRate = ethers.parseEther("0.1");
    
    // The mutant should produce a different result
    expect(result).to.not.equal(expectedRate, "Mutant should produce a different interest rate when utilization equals kink");
  });
});