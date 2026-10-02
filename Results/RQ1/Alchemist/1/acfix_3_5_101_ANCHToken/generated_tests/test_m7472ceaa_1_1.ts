import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test for totalSupply", function () {
  it("should return correct total supply after deployment, not zero", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a simple ERC20 token for USDToken parameter
    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testToken = await TestERC20.deploy();
    await testToken.waitForDeployment();

    // Deploy a mock Uniswap V2 Router that implements factory()
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();

    // Deploy ANCHToken with mock router and test token
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