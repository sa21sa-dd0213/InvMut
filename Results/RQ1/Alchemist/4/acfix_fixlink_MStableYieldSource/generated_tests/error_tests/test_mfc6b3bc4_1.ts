import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - balanceOfToken", function () {
  it("should detect mutant that replaces multiplication with addition in balanceOfToken", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock savings contract that implements ISavingsContractV2
    // We need a mock because the actual savings contract requires complex setup
    const MockSavings = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy the MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // First, supply some tokens to addr1 to set imBalances
    // We need to fund the contract with mAsset first
    const mAssetAddress = await instance.mAsset();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);
    
    // Owner sends mAsset to addr1 so they can supply
    const supplyAmount = ethers.parseEther("100");
    await mAsset.transfer(addr1.address, supplyAmount);
    
    // Approve the contract to spend addr1's tokens
    await mAsset.connect(addr1).approve(await instance.getAddress(), supplyAmount);
    
    // Supply tokens to addr1
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    
    // Now get the exchange rate from the mock (returns 1e18 * 2 = 2x)
    const exchangeRate = await instance.savings().then(s => s.exchangeRate());
    
    // Calculate expected balance using original formula: (imBalances * exchangeRate) / 1e18
    const imBalance = await instance.imBalances(addr1.address);
    const expectedBalance = (imBalance * exchangeRate) / ethers.parseEther("1");
    
    // Call balanceOfToken - mutant will return (imBalances + exchangeRate) / 1e18
    const actualBalance = await instance.balanceOfToken(addr1.address);
    
    // If mutant is present, this assertion will fail because addition != multiplication
    expect(actualBalance).to.equal(expectedBalance);
  });
});

// Mock contract to simulate ISavingsContractV2 for testing
// This should be deployed separately or included in the test file
contract MockSavingsV2 {
    IERC20 public underlying_;
    uint256 public exchangeRate = 2e18; // 2x exchange rate for testing
    
    constructor() {
        underlying_ = new MockERC20("Mock mAsset", "mASSET");
    }
    
    function underlying() external view returns (IERC20) {
        return underlying_;
    }
    
    function depositSavings(uint256 amount) external returns (uint256 creditsIssued) {
        // Transfer tokens from caller
        underlying_.transferFrom(msg.sender, address(this), amount);
        // Return credits at current exchange rate
        creditsIssued = amount * 1e18 / exchangeRate;
        return creditsIssued;
    }
    
    function redeemUnderlying(uint256 amount) external returns (uint256 creditsBurned) {
        creditsBurned = amount * 1e18 / exchangeRate;
        underlying_.transfer(msg.sender, amount);
        return creditsBurned;
    }
    
    function balanceOfUnderlying(address user) external view returns (uint256) {
        return 0;
    }
    
    function underlyingToCredits(uint256 underlying) external view returns (uint256) {
        return underlying * 1e18 / exchangeRate;
    }
    
    function creditsToUnderlying(uint256 credits) external view returns (uint256) {
        return credits * exchangeRate / 1e18;
    }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        balanceOf[msg.sender] = 1000000e18;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}