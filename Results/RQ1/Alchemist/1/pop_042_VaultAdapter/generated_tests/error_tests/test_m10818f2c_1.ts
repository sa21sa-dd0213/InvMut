import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m10818f2c test", function () {
  let vaultAdapter: any;
  let mockVault: any;
  let owner: any;
  let addr1: any;
  let accessControl: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy AccessControl mock
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Initialize VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    await accessControl.grantAccess(
      vaultAdapter.interface.getFunction("setSlopes").selector,
      await vaultAdapter.getAddress(),
      owner.address
    );
    await accessControl.grantAccess(
      vaultAdapter.interface.getFunction("setLimits").selector,
      await vaultAdapter.getAddress(),
      owner.address
    );

    // Deploy a simple mock vault
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Set slopes with kink and slopes
    await vaultAdapter.connect(owner).setSlopes(await mockVault.getAddress(), {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base slope
      slope1: ethers.parseEther("0.1"), // 10% slope above kink
    });

    // Set limits
    await vaultAdapter.connect(owner).setLimits(
      ethers.parseEther("2"), // maxMultiplier = 2
      ethers.parseEther("0.5"), // minMultiplier = 0.5
      ethers.parseEther("0.1") // rate = 0.1
    );
  });

  it("should correctly calculate interest rate when utilization is below kink", async function () {
    // Set mock vault to return utilization below kink (e.g., 30%)
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.0"));

    // Call rate function
    const vaultAddress = await mockVault.getAddress();
    const tx = await vaultAdapter.rate(vaultAddress, vaultAddress);
    const receipt = await tx.wait();

    // The interest rate should be calculated using the else branch:
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // With initial multiplier = 1e27, slope0 = 0.05e18, utilization = 0.3e18, kink = 0.5e18
    // Expected: (0.05e18 * 0.3e18 / 0.5e18) * 1e27 / 1e27 = 0.03e18
    
    const expectedRate = ethers.parseEther("0.03"); // 3%
    
    // Get the actual rate from the event or calculate
    const rate = await vaultAdapter.rate.staticCall(vaultAddress, vaultAddress);
    
    expect(rate).to.equal(expectedRate);
  });
});

// Mock contracts need to be deployed
contract AccessControlMock {
    mapping(bytes4 => mapping(address => mapping(address => bool))) public access;
    
    function grantAccess(bytes4 _selector, address _contract, address _address) external {
        access[_selector][_contract][_address] = true;
    }
    
    function checkAccess(bytes4 _selector, address _contract, address _caller) external view returns (bool) {
        return access[_selector][_contract][_caller];
    }
    
    function role(bytes4, address) external pure returns (bytes32) {
        return bytes32(0);
    }
}

contract MockVault {
    uint256 private _utilization;
    uint256 private _utilizationIndex;
    
    function setUtilization(uint256 _value) external {
        _utilization = _value;
    }
    
    function setCurrentUtilizationIndex(uint256 _value) external {
        _utilizationIndex = _value;
    }
    
    function utilization(address) external view returns (uint256) {
        return _utilization;
    }
    
    function currentUtilizationIndex(address) external view returns (uint256) {
        return _utilizationIndex;
    }
    
    function totalSupplies(address) external pure returns (uint256) { return 0; }
    function totalBorrows(address) external pure returns (uint256) { return 0; }
    function paused(address) external pure returns (bool) { return false; }
    function availableBalance(address) external pure returns (uint256) { return 0; }
    function insuranceFund() external pure returns (address) { return address(0); }
}