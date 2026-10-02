import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - m713b29cc", function () {
  it("should emit Transfer event when _tokenBuyTransferReward is executed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract with constructor arguments
    // Note: We need a Uniswap router address and a USD token address
    // For testing purposes, we'll use a mock or deploy a simple ERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSD = await MockERC20.deploy();
    await mockUSD.waitForDeployment();
    
    // Deploy a mock Uniswap router (simplified for testing)
    const MockRouter = await ethers.getContractFactory("MockUniswapRouter");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const token = await ANCHToken.deploy(
      await mockRouter.getAddress(),
      await mockUSD.getAddress()
    );
    await token.waitForDeployment();

    // Get the uniswap pair address that was created during deployment
    const pairAddress = await token.uniswapV2Pair();
    
    // Add the owner as an allowed role (to trigger _tokenBuyTransferReward path)
    // We need to find a way to set _allowedRoles - let's check if there's a setter
    // Since _allowedRoles is private, we'll use the uniswapV2Pair as the sender
    // which should be an allowed role by default
    
    // Transfer some tokens to the pair address first
    const transferAmount = ethers.parseEther("1000");
    await token.connect(owner).transfer(pairAddress, transferAmount);
    
    // Now transfer from pair (allowed role) to another address
    // This should trigger _tokenBuyTransferReward since sender (pair) has allowed role
    const testAmount = ethers.parseEther("50000"); // Above minTxnAmount (10000 * 1e18)
    
    // First, we need to fund the pair with enough tokens
    await token.connect(owner).transfer(pairAddress, testAmount);
    
    // Listen for the Transfer event
    await expect(
      token.connect(addr1).transferFrom(pairAddress, addr1.address, testAmount)
    )
      .to.emit(token, "Transfer")
      .withArgs(pairAddress, addr1.address, testAmount);
  });
});

// Helper contracts for testing
contract MockERC20 {
    string public name = "MockUSD";
    string public symbol = "mUSD";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
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

contract MockUniswapRouter {
    address public factory;
    address public WETH;
    
    constructor() {
        factory = address(this);
        WETH = address(this);
    }
    
    function createPair(address tokenA, address tokenB) external returns (address) {
        return address(this);
    }
}