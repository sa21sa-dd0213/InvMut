import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - md0996f0f", function () {
  it("should revert when calling sellShares with empty data on a contract that does not implement DVMSellShareCall", async function () {
    const [owner, user, recipient] = await ethers.getSigners();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup initial state: need base and quote tokens, mint some shares first
    // First, we need to add liquidity via buyShares
    // Get token addresses (assuming they're set in constructor or we need to mock)
    // For this test, we'll deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the GSP contract (assuming there's an init function)
    // For simplicity, we'll call buyShares to add initial liquidity
    await baseToken.mint(owner.address, ethers.parseEther("1000"));
    await quoteToken.mint(owner.address, ethers.parseEther("1000"));
    await baseToken.approve(instance.target, ethers.parseEther("1000"));
    await quoteToken.approve(instance.target, ethers.parseEther("1000"));

    // Transfer tokens to contract to simulate initial reserves
    await baseToken.transfer(instance.target, ethers.parseEther("100"));
    await quoteToken.transfer(instance.target, ethers.parseEther("100"));

    // Call buyShares to create initial liquidity
    await instance.connect(owner).buyShares(owner.address);

    // Now user buys some shares
    await baseToken.mint(user.address, ethers.parseEther("10"));
    await quoteToken.mint(user.address, ethers.parseEther("10"));
    await baseToken.connect(user).approve(instance.target, ethers.parseEther("10"));
    await quoteToken.connect(user).approve(instance.target, ethers.parseEther("10"));
    await baseToken.connect(user).transfer(instance.target, ethers.parseEther("10"));
    await quoteToken.connect(user).transfer(instance.target, ethers.parseEther("10"));
    await instance.connect(user).buyShares(user.address);

    // Get user's share balance
    const userShares = await instance.balanceOf(user.address);

    // Deploy a contract that does NOT implement DVMSellShareCall
    const RevertingContract = await ethers.getContractFactory("RevertingContract");
    const revertingContract = await RevertingContract.deploy();
    await revertingContract.waitForDeployment();

    // Attempt to sell shares with empty data to the reverting contract
    // Original: if (data.length > 0) -> callback only called with non-empty data
    // Mutant: if (data.length >= 0) -> callback always called, reverts on non-implementing contract
    await expect(
      instance.connect(user).sellShares(
        userShares,
        revertingContract.target,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // empty data
        9999999999 // deadline far in future
      )
    ).to.be.reverted;

    // In the original, this would succeed because data.length is 0 (not > 0)
    // In the mutant, it reverts because the callback is always called
  });
});

// Helper contracts for testing
// MockERC20 contract
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

// Contract that does NOT implement DVMSellShareCall - will revert on any call
contract RevertingContract {
    fallback() external payable {
        revert("NO_IMPLEMENTATION");
    }
}