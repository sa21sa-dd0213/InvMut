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
    
    const storageSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [await mockVault.getAddress(), ethers.hexlify(ethers.toBeHex(0, 32))]
      )
    );
    
    // Wait enough time for the multiplier to exceed maxMultiplier
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rate() to update multiplier
    await vaultAdapter.rate(await mockVault.getAddress(), testAsset);
    
    // Now set mock vault to return utilization below kink so next call will decrease multiplier
    await mockVault.setUtilization(ethers.parseEther("0.3")); // 30% utilization
    
    // Wait some time
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rate() again - this should decrease multiplier from above maxMultiplier down to exactly maxMultiplier
    // due to the decay formula when utilization < kink
    await vaultAdapter.rate(await mockVault.getAddress(), testAsset);
    
    // Now set utilization above kink again to trigger the cap check
    await mockVault.setUtilization(ethers.parseEther("0.8")); // 80% utilization
    
    // Call rate() - this should try to increase multiplier
    // In the original: if (multiplier > maxMultiplier) cap it
    // In mutant: if (multiplier >= maxMultiplier) cap it
    // If multiplier is exactly maxMultiplier, original doesn't cap, mutant does
    
    const result = await vaultAdapter.rate(await mockVault.getAddress(), testAsset);
    
    // Get the stored multiplier after the call
    // Read from storage to verify
    // The multiplier is at offset 0 of UtilizationData struct
    // We need to read the storage slot
    
    // For the test, we just check that the function doesn't revert and returns something
    // The key assertion is that the mutant would incorrectly cap the multiplier
    // while the original would not
    
    // To properly detect the mutant, we need to verify the exact value
    // We'll calculate what the original should return and compare
    
    // Get current stored multiplier from contract
    const storedMultiplier = await ethers.provider.getStorage(
      vaultAddress,
      ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "bytes32"],
          [testAsset, storageSlot]
        )
      )
    );
    
    // If multiplier == maxMultiplier, original keeps it, mutant caps it
    // We can detect this by checking if the result changes when we call again
    // with utilization below kink (which would decrease multiplier from maxMultiplier)
    
    // Actually, the simplest way: set multiplier exactly to maxMultiplier via storage manipulation
    // then call rate() with utilization above kink and check if multiplier changed
    
    // Let's directly set the multiplier storage to maxMultiplier
    const multiplierSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [testAsset, storageSlot]
      )
    );
    
    // Set multiplier to exactly maxMultiplier
    await ethers.provider.send("hardhat_setStorageAt", [
      vaultAddress,
      multiplierSlot,
      ethers.zeroPadValue(ethers.toBeHex(maxMultiplier), 32)
    ]);
    
    // Set lastUpdate to a past time so elapsed > 0
    const lastUpdateSlot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes32"],
        [testAsset, ethers.keccak256(ethers.concat([storageSlot, ethers.toBeHex(2, 32)]))]
      )
    );
    
    // Now call rate() with utilization above kink
    await mockVault.setUtilization(ethers.parseEther("0.8"));
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("200"));
    
    // Increase time so elapsed > 0
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    const result2 = await vaultAdapter.rate(await mockVault.getAddress(), testAsset);
    
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
    // Simplified: original multiplier would be > maxMultiplier, so result differs
    
    // Assert that the result is different from what mutant would give
    // If mutant, multiplier stays at maxMultiplier, so interest = (slope0 + slope1*excess/1e27) * maxMultiplier / 1e27
    const expectedMutantInterest = (slope0 + (slope1 * excess / oneE27)) * maxMultiplier / oneE27;
    
    // Original would have higher multiplier, thus higher interest
    // So if result equals expectedMutantInterest, the mutant is active (capped)
    // If result > expectedMutantInterest, the original is active (not capped)
    
    expect(result2).to.be.gt(expectedMutantInterest);
  });
});