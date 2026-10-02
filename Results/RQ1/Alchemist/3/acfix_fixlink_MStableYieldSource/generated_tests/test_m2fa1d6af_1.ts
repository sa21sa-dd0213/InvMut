import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant m2fa1d6af (missing ReentrancyGuard() in constructor)", function () {
  it("should detect missing ReentrancyGuard initialization by exploiting reentrancy", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy a mock savings contract that allows reentrancy
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy the mutant MStableYieldSource (missing ReentrancyGuard())
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const ReentrancyAttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttackerFactory.deploy(await yieldSource.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the yield source with mAsset tokens
    const mAsset = await ethers.getContractAt("IERC20", await mockSavings.underlying());
    await mAsset.transfer(await yieldSource.getAddress(), ethers.parseEther("1000"));

    // Attempt the reentrancy attack - should succeed on mutant but fail on original
    // The attacker contract will call supplyTokenTo and then re-enter
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("100"))
    ).to.not.be.reverted; // Mutant allows reentrancy due to uninitialized guard

    // Verify the attacker gained more tokens than they should have
    const attackerBalance = await yieldSource.imBalances(await attackerContract.getAddress());
    expect(attackerBalance).to.be.gt(ethers.parseEther("100")); // More than legitimate amount
  });
});

// Helper contracts to be deployed in test
contract MockERC20 {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }
    
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }
    
    function totalSupply() external view returns (uint256) { return 0; }
}

contract MockSavingsContract {
    MockERC20 public underlyingToken;
    mapping(address => uint256) public creditBalances;
    uint256 public exchangeRate = 1e18;
    
    constructor() {
        underlyingToken = new MockERC20();
        underlyingToken.balances[address(this)] = type(uint256).max;
    }
    
    function underlying() external view returns (address) {
        return address(underlyingToken);
    }
    
    function depositSavings(uint256 amount) external returns (uint256) {
        underlyingToken.transferFrom(msg.sender, address(this), amount);
        creditBalances[msg.sender] += amount;
        return amount;
    }
    
    function redeemUnderlying(uint256 amount) external returns (uint256) {
        uint256 creditsToBurn = amount;
        creditBalances[msg.sender] -= creditsToBurn;
        underlyingToken.transfer(msg.sender, amount);
        return creditsToBurn;
    }
    
    function balanceOfUnderlying(address user) external view returns (uint256) {
        return creditBalances[user];
    }
    
    function underlyingToCredits(uint256 underlying) external view returns (uint256) { return underlying; }
    function creditsToUnderlying(uint256 credits) external view returns (uint256) { return credits; }
}

contract ReentrancyAttacker {
    MStableYieldSource public yieldSource;
    bool public reentered = false;
    
    constructor(address _yieldSource) {
        yieldSource = MStableYieldSource(_yieldSource);
    }
    
    function attack(uint256 amount) external {
        // Get mAsset tokens from somewhere (simplified)
        IERC20 mAsset = IERC20(yieldSource.depositToken());
        mAsset.approve(address(yieldSource), amount);
        
        // This call will trigger reentrancy if guard is not initialized
        yieldSource.supplyTokenTo(amount, address(this));
    }
    
    // Fallback to be called during reentrancy
    receive() external payable {
        if (!reentered) {
            reentered = true;
            // Re-enter supplyTokenTo again
            IERC20 mAsset = IERC20(yieldSource.depositToken());
            mAsset.approve(address(yieldSource), 100);
            yieldSource.supplyTokenTo(100, address(this));
        }
    }
}