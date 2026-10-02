import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test for depositToken", function () {
  it("should kill the mutant by verifying depositToken returns the correct mAsset address", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock ERC20 token to serve as the underlying mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockERC20 = await MockERC20.deploy("Mock MAsset", "mASSET", 18);
    await mockERC20.waitForDeployment();

    // Deploy a mock SavingsContractV2 that returns our mock ERC20 as underlying
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy(await mockERC20.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Call depositToken and verify it returns the correct mAsset address
    const returnedAddress = await instance.depositToken();
    expect(returnedAddress).to.equal(await mockERC20.getAddress());
  });
});

// Helper contracts for testing (these would be in separate files or inline)
// MockERC20 minimal implementation
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
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

// MockSavingsContractV2 minimal implementation
contract MockSavingsContractV2 {
    address public underlyingToken;
    
    constructor(address _underlying) {
        underlyingToken = _underlying;
    }
    
    function underlying() external view returns (address) {
        return underlyingToken;
    }
    
    function depositSavings(uint256) external returns (uint256) {
        return 0;
    }
    
    function redeemUnderlying(uint256) external returns (uint256) {
        return 0;
    }
    
    function exchangeRate() external view returns (uint256) {
        return 1e18;
    }
}