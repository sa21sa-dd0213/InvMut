import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant test - md3940f0f", function () {
  it("should kill mutant by detecting incorrect excess calculation when utilization > kink", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const adapter = await VaultAdapterFactory.deploy();
    await adapter.waitForDeployment();
    
    // Deploy a mock vault contract for testing
    // Since we need a contract that implements IVault interface for the rate function
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Setup: initialize the adapter
    // First deploy a mock access control
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await adapter.initialize(await accessControl.getAddress());
    
    // Setup slopes for the asset
    const kink = ethers.parseEther("0.5"); // 50% kink
    const slope0 = ethers.parseEther("0.1"); // 10% slope0
    const slope1 = ethers.parseEther("0.2"); // 20% slope1
    
    // Grant access to owner for setSlopes
    const setSlopesSelector = adapter.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await adapter.getAddress(), owner.address);
    
    await adapter.connect(owner).setSlopes(await asset.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Setup limits
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate
    
    const setLimitsSelector = adapter.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setLimitsSelector, await adapter.getAddress(), owner.address);
    
    await adapter.connect(owner).setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup mock vault to return specific utilization values
    // Set utilization to 80% (above kink of 50%)
    const utilization = ethers.parseEther("0.8");
    const utilizationIndex = ethers.parseEther("1000");
    
    // Mock vault functions
    await mockVault.setUtilization(await asset.getAddress(), utilization);
    await mockVault.setCurrentUtilizationIndex(await asset.getAddress(), utilizationIndex);
    
    // Grant access for rate function (checkAccess with bytes4(0) for internal _authorizeUpgrade)
    const zeroSelector = "0x00000000";
    await accessControl.grantAccess(zeroSelector, await adapter.getAddress(), owner.address);
    
    // Call rate function - this should trigger the _applySlopes with utilization > kink
    const result = await adapter.connect(owner).rate(await mockVault.getAddress(), await asset.getAddress());
    
    // Calculate expected result for original contract:
    // excess = utilization - kink = 0.8 - 0.5 = 0.3
    // multiplier update (first call, assume multiplier starts at 1e27):
    // initial multiplier = 1e27
    // elapsed = block.timestamp - 0 = some value, but for first call lastUpdate is 0
    // Actually for first call, utilizationData.lastUpdate = 0, so elapsed = block.timestamp
    // But we can't predict exact block timestamp, so we verify the multiplier gets clamped to maxMultiplier
    // due to the inflated excess from the mutant
    
    // For the mutant: excess = utilization + kink = 0.8 + 0.5 = 1.3 (130%)
    // This will cause much higher multiplier and interest rate
    // Expected original interest rate (approximate, since elapsed varies):
    // excess = 0.3, multiplier starts at 1e27
    // multiplier = 1e27 * (1e27 + (1e27 * 0.3 / 0.5) * elapsed * 0.1 / 1e27) / 1e27
    // = 1e27 * (1 + 0.6 * elapsed * 0.1) = 1e27 * (1 + 0.06 * elapsed)
    // Since multiplier will likely exceed maxMultiplier (2e27), it gets clamped to 2e27
    // interestRate = (0.1 + (0.2 * 0.3 / 1)) * 2 / 1 = (0.1 + 0.06) * 2 = 0.32
    
    // For mutant: excess = 1.3
    // multiplier = 1e27 * (1e27 + (1e27 * 1.3 / 0.5) * elapsed * 0.1 / 1e27) / 1e27
    // = 1e27 * (1 + 2.6 * elapsed * 0.1) = 1e27 * (1 + 0.26 * elapsed)
    // interestRate = (0.1 + (0.2 * 1.3 / 1)) * 2 / 1 = (0.1 + 0.26) * 2 = 0.72
    
    // The mutant result should be significantly higher (0.72 vs 0.32 in simplest case)
    // Since we can't predict exact elapsed, we verify the result is unreasonable
    // For original with max multiplier: max interest = (slope0 + slope1 * 1) * maxMultiplier = (0.1 + 0.2) * 2 = 0.6
    // For mutant: interest can exceed 0.6 due to excess > 1
    
    // The mutant with excess = 1.3 gives interest rate that exceeds maximum possible
    // Even with multiplier clamped to 2e27: interest = (0.1 + 0.2 * 1.3 / 1) * 2 = (0.1 + 0.26) * 2 = 0.72
    // This is above the theoretical maximum of 0.6
    
    // Verify the result is unreasonably high (mutant behavior)
    const maxPossibleRate = ethers.parseEther("0.6");
    expect(result).to.be.gt(maxPossibleRate);
    
    // Also verify the result is not zero (would be suspicious)
    expect(result).to.not.equal(0);
  });
});

// Helper contracts need to be deployed alongside
contract MockVault {
    mapping(address => uint256) private _utilization;
    mapping(address => uint256) private _currentUtilizationIndex;
    
    function setUtilization(address asset, uint256 value) external {
        _utilization[asset] = value;
    }
    
    function setCurrentUtilizationIndex(address asset, uint256 value) external {
        _currentUtilizationIndex[asset] = value;
    }
    
    function utilization(address asset) external view returns (uint256) {
        return _utilization[asset];
    }
    
    function currentUtilizationIndex(address asset) external view returns (uint256) {
        return _currentUtilizationIndex[asset];
    }
}

contract MockAccessControl {
    mapping(bytes32 => bool) private _grants;
    
    function grantAccess(bytes4 selector, address contractAddr, address caller) external {
        _grants[keccak256(abi.encodePacked(selector, contractAddr, caller))] = true;
    }
    
    function checkAccess(bytes4 selector, address contractAddr, address caller) external view returns (bool) {
        return _grants[keccak256(abi.encodePacked(selector, contractAddr, caller))];
    }
    
    function initialize(address) external {}
    function revokeAccess(bytes4, address, address) external {}
    function role(bytes4, address) external pure returns (bytes32) { return bytes32(0); }
}