import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - m57195325", function () {
  it("should detect constructor exponentiation mutant by verifying totalSupply", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock UniswapV2Router for constructor arguments
    const MockRouterFactory = await ethers.getContractFactory("MockUniswapV2Router");
    const mockRouter = await MockRouterFactory.deploy();
    await mockRouter.waitForDeployment();
    
    // Deploy a mock USD token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdToken = await MockERC20Factory.deploy("USD Token", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy ANCHToken with constructor arguments
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const anchToken = await ANCHTokenFactory.deploy(
      await mockRouter.getAddress(),
      await usdToken.getAddress()
    );
    await anchToken.waitForDeployment();
    
    // Expected total supply: 10000000 * 10^18 = 10^25
    const expectedTotalSupply = ethers.parseEther("10000000");
    const actualTotalSupply = await anchToken.totalSupply();
    
    // The mutant computes 10000000 ** 10^18 which overflows or gives wrong result
    // Original computes 10000000 * 10^18 = 10^25
    expect(actualTotalSupply).to.equal(expectedTotalSupply);
  });
});