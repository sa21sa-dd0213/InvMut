import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - m713b29cc", function () {
  it("should emit Transfer event when _tokenBuyTransferReward is executed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSD = await MockERC20.deploy();
    await mockUSD.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapRouter");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const token = await ANCHToken.deploy(
      await mockRouter.getAddress(),
      await mockUSD.getAddress()
    );
    await token.waitForDeployment();
    
    // Get the uniswap pair address
    const pairAddress = await token.uniswapV2Pair();
    
    // Transfer tokens to the pair address to fund it
    const transferAmount = ethers.parseEther("1000");
    await token.connect(owner).transfer(pairAddress, transferAmount);
    
    // Prepare test amount above minTxnAmount
    const testAmount = ethers.parseEther("50000");
    
    // Fund the pair with enough tokens
    await token.connect(owner).transfer(pairAddress, testAmount);
    
    // Approve addr1 to spend from pair (since pair is allowed role)
    // First we need to get the pair to approve addr1
    // We'll impersonate the pair by using the token's own approval mechanism
    // Since pair is the owner of the tokens, we need to approve from pair
    // For simplicity, we'll use the token's transferFrom directly after setting allowance
    
    // Get the pair contract as a signer (simplified approach)
    const pairSigner = await ethers.getImpersonatedSigner(pairAddress);
    await ethers.provider.send("hardhat_setBalance", [
      pairAddress,
      "0x1000000000000000000000000"
    ]);
    
    // Approve addr1 to spend tokens from pair
    await token.connect(pairSigner).approve(addr1.address, testAmount);
    
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