import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m50fe087d test", function () {
  it("should kill mutant that changes * to ** in else branch of _applySlopes", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault contract for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize VaultAdapter
    // First deploy a simple AccessControl mock for initialization
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to owner for all selectors
    await accessControl.grantAccess(ethers.id(""), await vaultAdapter.getAddress(), owner.address);
    
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Set slopes with kink value (must be < 1e27 and > 0)
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    
    // Need to call setSlopes with proper access - use the selector
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    
    const mockAsset = addr1.address;
    await vaultAdapter.setSlopes(mockAsset, { kink, slope0, slope1 });
    
    // Set limits
    const setLimitsSelector = vaultAdapter.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    
    await vaultAdapter.setLimits(
      ethers.parseEther("2"),   // maxMultiplier = 2
      ethers.parseEther("0.5"), // minMultiplier = 0.5
      ethers.parseEther("0.1")  // rate = 0.1
    );
    
    // Configure mock vault to return utilization below kink (e.g., 30%)
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));
    
    // Call rate() to trigger the else branch (utilization < kink)
    const vaultAddress = await mockVault.getAddress();
    const rateResult = await vaultAdapter.rate(vaultAddress, mockAsset);
    
    // With the original code: multiplier starts at 0, then after first call:
    // multiplier = 0 * 1e27 / (1e27 + ...) = 0
    // interestRate = (0.05 * 0.3 / 0.5) * 0 / 1e27 = 0
    // With mutant: multiplier = 0 ** 1e27 = 0 (same result for multiplier=0)
    // But if multiplier was initialized to non-zero, mutant would explode
    
    // To properly kill the mutant, we need to call rate() twice to get non-zero multiplier
    // Second call should have elapsed time > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // increase by 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Set utilization index to simulate update
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.1"));
    
    const rateResult2 = await vaultAdapter.rate(vaultAddress, mockAsset);
    
    // The mutant would produce astronomically large number due to exponentiation
    // Original would produce a reasonable number (small fraction of ether)
    // Assert that the result is within reasonable bounds (not astronomical)
    expect(rateResult2).to.be.lessThan(ethers.parseEther("100")); // Reasonable max rate
    
    // Also verify it's not zero (since we have non-zero multiplier now)
    expect(rateResult2).to.be.gt(0);
  });
});

// Mock contracts for testing
contract MockVault {
    uint256 private _utilization;
    uint256 private _utilizationIndex;
    
    function setUtilization(uint256 _val) external {
        _utilization = _val;
    }
    
    function setCurrentUtilizationIndex(uint256 _val) external {
        _utilizationIndex = _val;
    }
    
    function utilization(address) external view returns (uint256) {
        return _utilization;
    }
    
    function currentUtilizationIndex(address) external view returns (uint256) {
        return _utilizationIndex;
    }
}

contract MockAccessControl {
    mapping(bytes4 => mapping(address => mapping(address => bool))) public access;
    
    function grantAccess(bytes4 _selector, address _contract, address _address) external {
        access[_selector][_contract][_address] = true;
    }
    
    function checkAccess(bytes4 _selector, address _contract, address _caller) external view returns (bool) {
        return access[_selector][_contract][_caller];
    }
    
    function initialize(address) external {}
    function revokeAccess(bytes4, address, address) external {}
    function role(bytes4, address) external pure returns (bytes32) { return bytes32(0); }
}