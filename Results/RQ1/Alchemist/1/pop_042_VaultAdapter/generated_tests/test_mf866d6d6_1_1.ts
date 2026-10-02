import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mf866d6d6 test", function () {
  it("should kill mutant that changes > to >= in multiplier cap check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor takes no arguments)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault to use for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy AccessControl contract (needed for initialize)
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess("0x00000000", await vaultAdapter.getAddress(), owner.address);
    
    // Set slopes for a test asset
    const testAsset = addr1.address;
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base rate
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    await vaultAdapter.setSlopes(testAsset, { kink, slope0, slope1 });
    
    // Set limits - maxMultiplier will be used to test the boundary
    const maxMultiplier = ethers.parseEther("2"); // 2x multiplier
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x multiplier
    const rate = ethers.parseEther("0.01"); // 1% rate per second
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup: Make first call to rate() to initialize utilizationData with some multiplier
    // We'll make a call with utilization below kink first, then manipulate state
    
    // First call to rate() - this initializes the data
    await vaultAdapter.rate(await mockVault.getAddress(), testAsset);
    
    // Now we need to set up the scenario where multiplier == maxMultiplier exactly
    // We'll call rate() multiple times to build up the multiplier
    
    // Get current storage to check multiplier
    // The storage layout: slot for VaultAdapterStorage
    // utilizationData[_vault][_asset] is stored in mapping
    
    // For simplicity, we'll set up the exact conditions by making multiple calls
    // with utilization above kink to increase multiplier
    
    // Set mock vault to return high utilization (above kink)
    await mockVault.setUtilization(ethers.parseEther("0.8")); // 80% utilization
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("100"));
    
    // Call rate multiple times to build multiplier up to exactly maxMultiplier
    // The multiplier calculation: multiplier = multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // We need to calculate elapsed time such that multiplier reaches exactly maxMultiplier
    
    // For testing, we can directly manipulate storage to set multiplier exactly at maxMultiplier
    // Using storage slot calculation for the mapping
    const vaultAddress = await vaultAdapter.getAddress();
    
    // Calculate storage slot for utilizationData[_vault][_asset]
    // mapping(address => mapping(address => UtilizationData)) utilizationData
    // Slot for mapping is keccak256(abi.encode(_vault, mappingSlot))
    // Then for nested mapping: keccak256(abi.encode(_asset, innerSlot))
    
    const mappingSlot = "0x" + "0".repeat(63) + "1"; // Slot 1 for the second mapping in struct
    
    const innerSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [await mockVault.getAddress(), ethers.zeroPadValue(ethers.toBeHex(1, 32), 32)]
      )
    );
    
    const multiplierSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [testAsset, innerSlot]
      )
    );
    
    // Set multiplier to exactly maxMultiplier
    await ethers.provider.send("hardhat_setStorageAt", [
      vaultAddress,
      multiplierSlot,
      ethers.zeroPadValue(ethers.toBeHex(maxMultiplier), 32)
    ]);
    
    // Set lastUpdate to a past time so elapsed > 0
    // Last update is at slot offset 2 in the struct (multiplier=0, index=1, lastUpdate=2)
    const lastUpdateSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [testAsset, ethers.keccak256(ethers.concat([innerSlot, ethers.toBeHex(2, 32)]))]
      )
    );
    
    // Set lastUpdate to a past block timestamp
    const pastTime = (await ethers.provider.getBlock("latest")).timestamp - 100;
    await ethers.provider.send("hardhat_setStorageAt", [
      vaultAddress,
      lastUpdateSlot,
      ethers.zeroPadValue(ethers.toBeHex(pastTime), 32)
    ]);
    
    // Now call rate() with utilization above kink
    await mockVault.setUtilization(ethers.parseEther("0.8"));
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("200"));
    
    // Increase time so elapsed > 0
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    const result = await vaultAdapter.rate(await mockVault.getAddress(), testAsset);
    
    // Read the multiplier again after the call
    const storedMultiplierAfter = await ethers.provider.getStorage(
      vaultAddress,
      multiplierSlot
    );
    
    // In the original: multiplier > maxMultiplier is false (they're equal), so no cap
    // multiplier becomes: maxMultiplier * (1e27 + ...) / 1e27 > maxMultiplier
    // In the mutant: multiplier >= maxMultiplier is true, so cap to maxMultiplier
    // multiplier stays at maxMultiplier
    
    // The mutant would return a different (lower) interest rate because multiplier is capped
    // The original would return a higher interest rate because multiplier increased
    
    // Calculate expected original result (no cap)
    const excess = ethers.parseEther("0.8") - kink; // 0.8 - 0.5 = 0.3
    const oneE27 = ethers.parseEther("1000000000"); // 10^27 / 10^18 = 10^9
    
    // If multiplier stays at maxMultiplier (mutant case), interest rate is:
    const expectedMutantInterest = (slope0 + (slope1 * excess / oneE27)) * maxMultiplier / oneE27;
    
    // Original would have higher multiplier, thus higher interest
    // So if result equals expectedMutantInterest, the mutant is active (capped)
    // If result > expectedMutantInterest, the original is active (not capped)
    
    expect(result).to.be.gt(expectedMutantInterest);
  });
});