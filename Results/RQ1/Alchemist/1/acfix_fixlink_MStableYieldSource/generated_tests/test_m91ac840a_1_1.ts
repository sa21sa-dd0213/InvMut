import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant m91ac840a (nonReentrant removed)", function () {
  it("should revert on reentrant call to supplyTokenTo when nonReentrant is present (original), but pass on mutant", async function () {
    const [owner, attacker, user] = await ethers.getSigners();

    // Deploy a mock savings contract that allows reentrancy
    const MockSavings = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavings.deploy();
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Deploy a malicious contract that will attempt reentrancy
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttacker.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with mAsset tokens
    const mAssetAddress = await instance.mAsset();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);

    // Transfer some mAsset to attacker contract for the attack
    await mAsset.connect(owner).transfer(await attackerContract.getAddress(), ethers.parseEther("1000"));

    // Approve the MStableYieldSource to spend attacker's tokens
    await mAsset.connect(attacker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // The attack: call supplyTokenTo which will trigger a reentrant call back into supplyTokenTo
    // In the original contract with nonReentrant, this should revert
    // In the mutant without nonReentrant, it should succeed (killing the mutant)
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("100"), user.address)
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });
});

// Helper contracts for testing
contract MockSavingsV2 {
    IERC20 public underlying;
    mapping(address => uint256) public creditBalances;
    uint256 public exchangeRate = 1e18;
    
    constructor() {
        underlying = IERC20(address(new MockERC20("Mock mAsset", "mAsset")));
    }
    
    function depositSavings(uint256 amount) external returns (uint256) {
        // Transfer tokens from caller
        underlying.transferFrom(msg.sender, address(this), amount);
        // Issue credits 1:1
        creditBalances[msg.sender] += amount;
        return amount;
    }
    
    function redeemUnderlying(uint256 amount) external returns (uint256) {
        require(creditBalances[msg.sender] >= amount, "Insufficient credits");
        creditBalances[msg.sender] -= amount;
        underlying.transfer(msg.sender, amount);
        return amount;
    }
    
    function underlyingToCredits(uint256 underlyingAmount) external view returns (uint256) {
        return underlyingAmount;
    }
    
    function creditsToUnderlying(uint256 credits) external view returns (uint256) {
        return credits;
    }
}

contract MockERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

contract ReentrancyAttacker {
    MStableYieldSource public target;
    IERC20 public mAsset;
    
    constructor(address _target) {
        target = MStableYieldSource(_target);
        mAsset = IERC20(target.mAsset());
    }
    
    function attack(uint256 amount, address to) external {
        // Approve target to spend our tokens
        mAsset.approve(address(target), amount);
        // First call to supplyTokenTo
        target.supplyTokenTo(amount, to);
    }
    
    // Fallback function - this will be called when the savings contract transfers tokens
    // and will attempt reentrancy
    receive() external payable {
        if (address(target).code.length > 0) {
            // Attempt reentrant call to supplyTokenTo
            target.supplyTokenTo(100, address(this));
        }
    }
}