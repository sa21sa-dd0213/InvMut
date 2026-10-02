import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - m72919fe6", function () {
  it("should emit Transfer event when _takeTransfer is called (non-allowed role transfer)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract with required constructor arguments
    // Note: The constructor requires _route (Uniswap router) and _USDToken addresses
    // For testing purposes, we need to deploy a mock router or use a known address
    // Since this is a test, we'll deploy a simple mock that returns the factory
    const MockFactory = await ethers.getContractFactory("MockUniswapV2Factory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy(mockFactory.target);
    await mockRouter.waitForDeployment();
    
    const MockUSDToken = await ethers.getContractFactory("MockERC20");
    const mockUSDToken = await MockUSDToken.deploy();
    await mockUSDToken.waitForDeployment();
    
    const ANCHToken = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHToken.deploy(mockRouter.target, mockUSDToken.target);
    await instance.waitForDeployment();
    
    // Get initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);
    
    // Transfer tokens from owner to addr1 (owner is not an allowed role by default)
    const transferAmount = ethers.parseEther("100");
    
    // This transfer will go through the else branch in _transfer which calls _takeTransfer
    // and should emit a Transfer event
    const tx = await instance.connect(owner).transfer(addr1.address, transferAmount);
    const receipt = await tx.wait();
    
    // Assert that Transfer event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, addr1.address, transferAmount);
    
    // Verify the balance changed (optional additional check)
    const finalBalance = await instance.balanceOf(addr1.address);
    expect(finalBalance).to.equal(initialBalance + transferAmount);
  });
});

// Helper mock contracts for testing
contract MockUniswapV2Factory {
  address public feeTo;
  address public feeToSetter;
  
  function createPair(address tokenA, address tokenB) external returns (address pair) {
    // Return a mock pair address
    return address(0x1234567890123456789012345678901234567890);
  }
  
  function getPair(address, address) external view returns (address) {
    return address(0);
  }
  
  function allPairs(uint256) external view returns (address) {
    return address(0);
  }
  
  function allPairsLength() external view returns (uint256) {
    return 0;
  }
  
  function setFeeTo(address) external {}
  function setFeeToSetter(address) external {}
}

contract MockUniswapV2Router02 {
  address private _factory;
  
  constructor(address factory) {
    _factory = factory;
  }
  
  function factory() external view returns (address) {
    return _factory;
  }
  
  function WETH() external pure returns (address) {
    return address(0);
  }
}

contract MockERC20 {
  function totalSupply() external pure returns (uint256) { return 0; }
  function balanceOf(address) external pure returns (uint256) { return 0; }
  function transfer(address, uint256) external pure returns (bool) { return true; }
  function allowance(address, address) external pure returns (uint256) { return 0; }
  function approve(address, uint256) external pure returns (bool) { return true; }
  function transferFrom(address, address, uint256) external pure returns (bool) { return true; }
}