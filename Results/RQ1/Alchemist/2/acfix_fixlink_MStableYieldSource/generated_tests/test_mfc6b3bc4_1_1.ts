import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant test - balanceOfToken operator mutation", function () {
  it("should kill mutant mfc6b3bc4 by verifying balanceOfToken uses multiplication not addition", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock savings contract that returns a known exchange rate
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Get the mAsset address from the yield source
    const mAssetAddress = await instance.mAsset();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    const supplyAmount = ethers.parseEther("100");
    const exchangeRate = ethers.parseEther("1.5");

    // Set exchange rate in mock
    await mockSavings.setExchangeRate(exchangeRate);

    // Mint tokens to user for supply
    await mockSavings.mintTokens(user.address, supplyAmount);

    // User approves yield source to spend tokens
    await mAsset.connect(user).approve(await instance.getAddress(), supplyAmount);

    // User supplies tokens to yield source
    await instance.connect(user).supplyTokenTo(supplyAmount, user.address);

    // Calculate expected balance: (100 * 1.5) / 1 = 150 tokens
    const expectedBalance = (supplyAmount * exchangeRate) / ethers.parseEther("1");
    const actualBalance = await instance.balanceOfToken(user.address);

    expect(actualBalance).to.equal(expectedBalance);
  });
});

// Mock contract to support testing
// This would be deployed separately in a real test setup
contract MockSavingsContractV2 {
    IERC20 public underlyingToken;
    uint256 public exchangeRate = 1e18;
    mapping(address => uint256) public creditBalances;

    constructor() {
        underlyingToken = new MockERC20("Mock MAsset", "mMASA");
    }

    function underlying() external view returns (IERC20) {
        return underlyingToken;
    }

    function setExchangeRate(uint256 _rate) external {
        exchangeRate = _rate;
    }

    function mintTokens(address to, uint256 amount) external {
        underlyingToken.mint(to, amount);
    }

    function depositSavings(uint256 amount) external returns (uint256) {
        // Credits issued = amount (1:1 for simplicity)
        underlyingToken.transferFrom(msg.sender, address(this), amount);
        creditBalances[msg.sender] += amount;
        return amount;
    }

    function redeemUnderlying(uint256 amount) external returns (uint256) {
        // Burn credits equal to amount
        creditBalances[msg.sender] -= amount;
        underlyingToken.transfer(msg.sender, amount);
        return amount;
    }

    function balanceOfUnderlying(address user) external view returns (uint256) {
        return (creditBalances[user] * exchangeRate) / 1e18;
    }

    function underlyingToCredits(uint256 underlying) external view returns (uint256) {
        return (underlying * 1e18) / exchangeRate;
    }

    function creditsToUnderlying(uint256 credits) external view returns (uint256) {
        return (credits * exchangeRate) / 1e18;
    }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}