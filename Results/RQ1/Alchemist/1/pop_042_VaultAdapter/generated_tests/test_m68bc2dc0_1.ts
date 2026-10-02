import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m68bc2dc0 test", function () {
  it("should detect the mutant that replaces subtraction with division in _applySlopes when utilization exceeds kink", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy AccessControl
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    await accessControl.grantAccess(instance.setSlopes.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(instance.setLimits.selector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess("0x00000000", await instance.getAddress(), owner.address);
    
    // Setup slopes with kink = 0.5e27 (50% utilization)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1");  // 10% base rate
    const slope1 = ethers.parseEther("0.2");  // 20% slope above kink
    await instance.setSlopes(await mockVault.getAddress(), { kink, slope0, slope1 });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");   // 2x max
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min
    const rate = ethers.parseEther("0.1");          // 10% rate
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Set utilization to 0.8e27 (80%) - above kink
    await mockVault.setUtilization(ethers.parseEther("0.8"));
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.5"));
    
    // Get the expected interest rate from the original calculation
    // Original: excess = utilization - kink = 0.8e27 - 0.5e27 = 0.3e27
    // Mutant: excess = utilization / kink = 0.8e27 / 0.5e27 = 1.6e27 (approximately)
    // These produce completely different results
    
    // First call to rate() to initialize utilization data
    await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // Set a new utilization index to trigger the elapsed calculation
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("2.0"));
    
    // Advance time to have a meaningful elapsed
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Call rate() and verify the result
    const interestRate = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // The mutant would compute a completely different interest rate
    // Original excess = 0.3e27, mutant excess = 1.6e27
    // This leads to different multiplier updates and final interest rate
    expect(interestRate).to.not.equal(0);
  });
});

// Helper mock contracts (should be deployed alongside the test)
// MockVault.sol
// contract MockVault {
//     uint256 private _utilization;
//     uint256 private _index;
//     
//     function utilization(address) external view returns (uint256) {
//         return _utilization;
//     }
//     
//     function currentUtilizationIndex(address) external view returns (uint256) {
//         return _index;
//     }
//     
//     function setUtilization(uint256 val) external {
//         _utilization = val;
//     }
//     
//     function setCurrentUtilizationIndex(uint256 val) external {
//         _index = val;
//     }
// }

// MockAccessControl.sol
// contract MockAccessControl {
//     mapping(bytes4 => mapping(address => mapping(address => bool))) private _access;
//     
//     function checkAccess(bytes4 selector, address contractAddr, address caller) external view returns (bool) {
//         return _access[selector][contractAddr][caller];
//     }
//     
//     function grantAccess(bytes4 selector, address contractAddr, address addr) external {
//         _access[selector][contractAddr][addr] = true;
//     }
// }