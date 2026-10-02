import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - kill mutant m91ac840a (nonReentrant removed)", function () {
  it("should revert on reentrancy in supplyTokenTo when nonReentrant modifier is present", async function () {
    const [owner, attacker, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token to act as the underlying mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock", "MCK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();

    // Deploy a mock SavingsContract that returns the mock token address from underlying()
    const MockSavings = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavings.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy the MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await Factory.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();

    // Transfer some tokens to attacker for testing
    await mockToken.transfer(attacker.address, ethers.parseEther("1000"));
    await mockToken.connect(attacker).approve(await yieldSource.getAddress(), ethers.parseEther("1000"));

    // Deploy a malicious reentrancy contract
    const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
    const reentrancyContract = await ReentrancyAttacker.deploy(await yieldSource.getAddress(), await mockToken.getAddress());
    await reentrancyContract.waitForDeployment();

    // Fund the reentrancy contract with tokens and approve
    await mockToken.transfer(await reentrancyContract.getAddress(), ethers.parseEther("500"));
    await mockToken.connect(reentrancyContract).approve(await yieldSource.getAddress(), ethers.parseEther("500"));

    // Attempt the reentrancy attack - this should revert if nonReentrant is present
    // The attacker contract will call supplyTokenTo which will trigger a reentrant call back into supplyTokenTo
    await expect(
      reentrancyContract.connect(attacker).attack(ethers.parseEther("100"), user.address)
    ).to.be.reverted;

    // Additional check: the attacker's imBalances should not have been increased by the reentrant call
    // Only the first call should have succeeded (if any), but since it reverted, nothing should change
    const attackerBalance = await yieldSource.imBalances(attacker.address);
    expect(attackerBalance).to.equal(0);
  });
});

// Helper contracts for testing (to be deployed alongside)
// Note: In a real test environment, these would be separate contract files
// They are included here as inline definitions for completeness
contract MockERC20 {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
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
        uint256 credits = amount; // 1:1 rate for simplicity
        creditBalances[msg.sender] += credits;
        return credits;
    }

    function redeemUnderlying(uint256 amount) external returns (uint256) {
        uint256 credits = amount;
        creditBalances[msg.sender] -= credits;
        underlying.transfer(msg.sender, amount);
        return credits;
    }
}

contract ReentrancyAttacker {
    address public yieldSource;
    address public token;
    
    constructor(address _yieldSource, address _token) {
        yieldSource = _yieldSource;
        token = _token;
    }

    function attack(uint256 amount, address to) external {
        // Approve and call supplyTokenTo
        IERC20(token).approve(yieldSource, amount);
        IMStableYieldSource(yieldSource).supplyTokenTo(amount, to);
    }

    // Fallback to attempt reentrancy - this would be called if the contract receives a callback
    receive() external payable {
        // Attempt to re-enter supplyTokenTo
        IERC20(token).approve(yieldSource, 1 ether);
        IMStableYieldSource(yieldSource).supplyTokenTo(1 ether, address(this));
    }
}

interface IMStableYieldSource {
    function supplyTokenTo(uint256 mAssetAmount, address to) external;
    function imBalances(address) external view returns (uint256);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}