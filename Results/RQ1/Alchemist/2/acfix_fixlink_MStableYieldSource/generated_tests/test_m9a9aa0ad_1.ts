import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - reentrancy test for redeemToken", function () {
  it("should prevent reentrancy attack on redeemToken when nonReentrant modifier is present", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContract");
    
    const mAsset = await MockERC20.deploy("Mock Asset", "mASSET", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();
    
    const savings = await MockSavingsContract.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await savings.getAddress());
    await instance.waitForDeployment();
    
    // Fund the yield source with mAsset
    await mAsset.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Deploy malicious reentrancy contract
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund attacker contract with mAsset and approve
    await mAsset.transfer(await attackerContract.getAddress(), ethers.parseEther("100"));
    await mAsset.connect(attacker).approve(await attackerContract.getAddress(), ethers.parseEther("100"));
    
    // Set up the reentrancy attack
    await attackerContract.connect(attacker).setReentrancyTarget(await savings.getAddress());
    
    // This should revert if nonReentrant is present
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("10"))
    ).to.be.reverted;
  });
});

// Helper contracts for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    
    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockSavingsContract {
    IERC20 public underlying;
    mapping(address => uint256) public creditBalances;
    uint256 public exchangeRate = 1e18;
    
    constructor(address _underlying) {
        underlying = IERC20(_underlying);
    }
    
    function depositSavings(uint256 amount) external returns (uint256) {
        underlying.transferFrom(msg.sender, address(this), amount);
        uint256 credits = amount;
        creditBalances[msg.sender] += credits;
        return credits;
    }
    
    function redeemUnderlying(uint256 amount) external returns (uint256) {
        // This external call is the reentrancy vector
        // In a real attack, this would call back into redeemToken
        uint256 credits = amount;
        creditBalances[msg.sender] -= credits;
        underlying.transfer(msg.sender, amount);
        return credits;
    }
}

contract ReentrancyAttacker {
    MStableYieldSource public target;
    address public reentrancyTarget;
    
    constructor(address _target) {
        target = MStableYieldSource(_target);
    }
    
    function setReentrancyTarget(address _target) external {
        reentrancyTarget = _target;
    }
    
    function attack(uint256 amount) external {
        // First call to redeemToken
        target.redeemToken(amount);
    }
    
    // Fallback to re-enter
    receive() external payable {
        if (msg.sender == reentrancyTarget) {
            // Attempt reentrancy
            target.redeemToken(0);
        }
    }
}