import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - mutant m4fbe7668 (block.timestamp replaced with block.prevrandao)", function () {
  let vaultAdapter: any;
  let vaultMock: any;
  let accessControl: any;
  let owner: any;
  let addr1: any;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock vault that returns deterministic values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    vaultMock = await MockVaultFactory.deploy();
    await vaultMock.waitForDeployment();
    
    // Deploy AccessControl mock
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Deploy VaultAdapter (no constructor args - uses _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Initialize the vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Grant access for setSlopes and setLimits to owner
    await accessControl.grantAccess(
      ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10),
      await vaultAdapter.getAddress(),
      owner.address
    );
    await accessControl.grantAccess(
      ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10),
      await vaultAdapter.getAddress(),
      owner.address
    );
    await accessControl.grantAccess(
      "0x00000000",
      await vaultAdapter.getAddress(),
      owner.address
    );
  });

  it("should correctly update lastUpdate with block.timestamp, not block.prevrandao", async function () {
    // Configure slopes for an asset
    const asset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.5"), // 50% slope above kink
    };
    
    await vaultAdapter.setSlopes(asset, slopes);
    
    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("5"),   // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.1")  // rate
    );
    
    // Get the current block timestamp
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore!.timestamp;
    
    // First call to rate() to set lastUpdate
    await vaultAdapter.rate(await vaultMock.getAddress(), asset);
    
    // Mine a new block with a known timestamp advancement
    await ethers.provider.send("evm_increaseTime", [100]); // Advance 100 seconds
    await ethers.provider.send("evm_mine", []);
    
    const blockAfter = await ethers.provider.getBlock("latest");
    const timestampAfter = blockAfter!.timestamp;
    const expectedElapsed = timestampAfter - timestampBefore;
    
    // Second call to rate() - this reads lastUpdate and calculates elapsed
    // If mutant is present, lastUpdate was set to block.prevrandao (a huge number),
    // causing the elapsed calculation to be incorrect or cause an overflow revert
    // If original, lastUpdate was timestamp, and elapsed should be ~100
    
    // We expect this call to succeed with original code (elapsed ≈ 100)
    // With mutant, block.prevrandao is typically a very large number, so
    // block.timestamp - block.prevrandao would underflow (since block.prevrandao >> block.timestamp)
    // causing a revert in the subtraction or producing a nonsensical result
    
    // Check that the call succeeds (original behavior)
    await expect(
      vaultAdapter.rate(await vaultMock.getAddress(), asset)
    ).to.not.be.reverted;
    
    // Get the actual result to verify correct elapsed calculation
    const result = await vaultAdapter.rate(await vaultMock.getAddress(), asset);
    
    // The result should be a reasonable number (between 0 and some max)
    // With the mutant, the result would be astronomically large or zero
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("100")); // Reasonable interest rate
  });
});

// Helper mock contracts (to be deployed separately or defined inline)
contract MockVault {
  function currentUtilizationIndex(address) external pure returns (uint256) {
    return 1e18; // Fixed index
  }
  
  function utilization(address) external pure returns (uint256) {
    return 5e17; // 50% utilization
  }
}

contract MockAccessControl {
  mapping(bytes32 => mapping(address => mapping(address => bool))) public access;
  
  function initialize(address) external {}
  
  function grantAccess(bytes4 _selector, address _contract, address _address) external {
    access[keccak256(abi.encodePacked(_selector, _contract))][_address] = true;
  }
  
  function revokeAccess(bytes4 _selector, address _contract, address _address) external {
    access[keccak256(abi.encodePacked(_selector, _contract))][_address] = false;
  }
  
  function checkAccess(bytes4 _selector, address _contract, address _caller) external view returns (bool) {
    return access[keccak256(abi.encodePacked(_selector, _contract))][_caller];
  }
  
  function role(bytes4, address) external pure returns (bytes32) {
    return bytes32(0);
  }
}