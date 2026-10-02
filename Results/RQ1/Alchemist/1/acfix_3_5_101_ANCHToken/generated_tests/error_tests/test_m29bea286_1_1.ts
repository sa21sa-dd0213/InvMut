import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m29bea286 test", function () {
  it("should detect mutant that changes _rTotal calculation from subtraction to division", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock USD token (simple ERC20)
    const USDTokenFactory = await ethers.getContractFactory("ERC20");
    const usdToken = await USDTokenFactory.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Create mock contracts for UniswapV2Factory and UniswapV2Router02
    const MockFactory = await ethers.getContractFactory("MockUniswapV2Factory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy(mockFactory.target);
    await mockRouter.waitForDeployment();
    
    // Deploy the ANCHToken with our mock router and USD token
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHTokenFactory.deploy(mockRouter.target, usdToken.target);
    await instance.waitForDeployment();
    
    // The key invariant: totalSupply() should equal the initial mint amount
    // In the original: _rTotal = MAX - (MAX % _tTotal)
    // In the mutant: _rTotal = MAX / (MAX % _tTotal)
    // This changes the reflection math, causing totalSupply() to return incorrect value
    
    const expectedSupply = ethers.parseEther("10000000"); // 10,000,000 * 10^18
    const actualSupply = await instance.totalSupply();
    
    // The mutant should cause totalSupply() to return a different value
    // because the reflection rate calculation is broken
    expect(actualSupply).to.equal(expectedSupply);
    
    // Additional check: the initial owner should have the correct balance
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(expectedSupply);
    
    // The mutant will fail because the division-based _rTotal calculation
    // results in a different _getRate() which breaks the tokenFromReflection math
  });
});