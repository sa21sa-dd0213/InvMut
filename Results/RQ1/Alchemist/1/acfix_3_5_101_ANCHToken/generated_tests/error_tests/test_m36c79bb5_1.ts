import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken - Kill mutant m36c79bb5 (tokenFromReflection inequality operator)", function () {
  it("should revert when rAmount equals _rTotal after mutation (mutant uses < instead of <=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ANCHToken with constructor arguments
    // Need a router address and a USD token address for deployment
    // For testing, we'll use a mock approach with actual contract addresses
    const USDTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const usdToken = await USDTokenFactory.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();
    
    // Deploy a mock Uniswap V2 router for testing
    const RouterFactory = await ethers.getContractFactory("UniswapV2Router02Mock");
    const router = await RouterFactory.deploy();
    await router.waitForDeployment();
    
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const token = await ANCHTokenFactory.deploy(await router.getAddress(), await usdToken.getAddress());
    await token.waitForDeployment();
    
    // Get the total reflection value (_rTotal) by minting and checking
    // The _rTotal is set in constructor: _rTotal = (MAX - (MAX % _tTotal))
    // We can compute it or read it indirectly through the tokenFromReflection function
    
    // Call tokenFromReflection with a value that equals _rTotal
    // Since we can't directly read _rTotal, we need to find it through the function behavior
    // The original allows rAmount == _rTotal, mutant reverts on equality
    
    // We know from constructor that _rTotal is calculated as (MAX - (MAX % _tTotal))
    // where _tTotal = 10000000 * 10^18 = 10^25
    // MAX = 2^256 - 1
    const MAX = ethers.MaxUint256;
    const tTotal = ethers.parseEther("10000000");
    const rTotal = MAX.sub(MAX.mod(tTotal));
    
    // This should pass on original (allows equality) but revert on mutant (requires strict less than)
    await expect(token.tokenFromReflection(rTotal)).to.not.be.reverted;
  });
});