import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test for totalSupply", function () {
  it("should return correct total supply after deployment, not zero", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy mock WETH-like token for constructor
    const MockTokenFactory = await ethers.getContractFactory("ANCHToken");
    
    // We need to deploy a simple ERC20 token to use as the USDToken parameter
    // Create a minimal ERC20 for testing purposes
    const MinimalERC20 = await ethers.getContractFactory(
      "contracts/test/TestERC20.sol:TestERC20" // Assuming we have a test helper
    );
    
    // Since we can't deploy without proper Uniswap router, we'll mock it
    // For this test, we need to deploy ANCHToken with proper constructor args
    // The constructor requires: address _route, address _USDToken
    
    // Deploy a simple mock router (we need a contract that implements factory())
    const MockRouterFactory = await ethers.getContractFactory(
      "contracts/test/MockUniswapV2Router02.sol:MockUniswapV2Router02"
    );
    
    // For simplicity, let's directly test the totalSupply function
    // by deploying with a minimal setup
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testToken = await TestERC20.deploy();
    await testToken.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const anchorToken = await ANCHTokenFactory.deploy(
      await mockRouter.getAddress(),
      await testToken.getAddress()
    );
    await anchorToken.waitForDeployment();
    
    // Test: totalSupply should be 10,000,000 * 10^18
    const expectedTotalSupply = ethers.parseEther("10000000");
    const actualTotalSupply = await anchorToken.totalSupply();
    
    // The original returns _tTotal (10000000 * 10^18)
    // The mutant returns 0 (default uint256)
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
    expect(actualTotalSupply).to.not.equal(0);
  });
});