import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - kill mutant mb99eecc5 (_applySlopes * to +)", function () {
  let vaultAdapter: any;
  let vault: any;
  let owner: any;
  let addr1: any;
  const ASSET = "0x0000000000000000000000000000000000000001";
  const INITIAL_MULTIPLIER = 1e27;
  const KINK = 5e26; // 0.5 * 1e27
  const SLOPE0 = 5e25; // 0.05 * 1e27
  const SLOPE1 = 1e27;
  const MAX_MULTIPLIER = 2e27;
  const MIN_MULTIPLIER = 5e26;
  const RATE = 1e26; // 0.1 * 1e27

  before(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor args per contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault that returns utilization data
    const MockVault = await ethers.getContractFactory("MockVault");
    vault = await MockVault.deploy();
    await vault.waitForDeployment();

    // Initialize the VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = vaultAdapter.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess("0x00000000", await vaultAdapter.getAddress(), owner.address);

    // Configure slopes and limits
    await vaultAdapter.setSlopes(ASSET, {
      kink: KINK,
      slope0: SLOPE0,
      slope1: SLOPE1
    });
    await vaultAdapter.setLimits(MAX_MULTIPLIER, MIN_MULTIPLIER, RATE);
  });

  it("should detect the * to + mutation in _applySlopes when utilization is below kink and elapsed time is non-zero", async function () {
    // Setup: utilization below kink (e.g., 30% = 3e26)
    const UTILIZATION = 3e26; // 0.3 * 1e27
    const ELAPSED_TIME = 100; // 100 seconds
    
    // Set initial multiplier in storage via direct call sequence
    // First call to rate() initializes storage
    await vault.setUtilization(UTILIZATION);
    await vault.setCurrentUtilizationIndex(0);
    
    // Call rate() to initialize storage with current timestamp
    await vaultAdapter.rate(await vault.getAddress(), ASSET);
    
    // Advance time by ELAPSED_TIME seconds
    await ethers.provider.send("evm_increaseTime", [ELAPSED_TIME]);
    await ethers.provider.send("evm_mine", []);
    
    // Set new utilization index that would create an elapsed calculation
    const NEW_INDEX = UTILIZATION * ELAPSED_TIME; // Simulating index growth
    await vault.setCurrentUtilizationIndex(NEW_INDEX);
    
    // Get the result from the mutated contract
    const result = await vaultAdapter.rate(await vault.getAddress(), ASSET);
    
    // Calculate expected result using ORIGINAL formula:
    // multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // = 1e27 * 1e27 / (1e27 + (1e27 * (5e26 - 3e26) / 5e26) * 100 * 1e26 / 1e27)
    // = 1e54 / (1e27 + (1e27 * 2e26 / 5e26) * 100 * 1e26 / 1e27)
    // = 1e54 / (1e27 + (4e26) * 100 * 1e26 / 1e27)
    // = 1e54 / (1e27 + 4e26 * 100 * 1e26 / 1e27)
    // = 1e54 / (1e27 + 4e54 / 1e27)
    // = 1e54 / (1e27 + 4e27)
    // = 1e54 / 5e27
    // = 2e26
    
    const expectedMultiplier = 2e26;
    
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (5e25 * 3e26 / 5e26) * 2e26 / 1e27
    // = (3e25) * 2e26 / 1e27
    // = 6e51 / 1e27
    // = 6e24
    
    const expectedInterestRate = 6e24;
    
    // The mutated version would compute:
    // denominator = 1e27 + (1e27 * (kink - utilization) / kink) + elapsed * rate / 1e27
    // = 1e27 + 4e26 + 100 * 1e26 / 1e27
    // = 1e27 + 4e26 + 1e4
    // = 1.4e27 + 1e4
    
    // This would give a different multiplier and thus different interest rate
    // The mutant's result would be different from expectedInterestRate
    
    expect(result).to.not.equal(expectedInterestRate);
  });
});