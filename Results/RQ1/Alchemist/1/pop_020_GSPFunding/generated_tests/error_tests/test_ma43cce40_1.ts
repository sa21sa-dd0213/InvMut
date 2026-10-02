import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GSPFunding mutant ma43cce40 test", function () {
  it("should revert when buyShares is called with zero base input", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for BASE and QUOTE
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Deploy GSPFunding with required constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("1"), // _I_ (initial price)
      ethers.parseEther("0.003"), // _K_ (initial K)
      ethers.parseEther("0.001"), // _LP_FEE_RATE_
      ethers.parseEther("0.001"), // _MT_FEE_RATE_
      owner.address, // _MAINTAINER_
      false // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();
    
    // First, provide initial liquidity to set reserves
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Call buyShares to establish initial reserves and totalSupply
    await instance.connect(owner).buyShares(owner.address);
    
    // Now, send only quote tokens to the contract (no base tokens)
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("100"));
    
    // Attempt to buyShares - this should revert because baseInput = 0
    // (baseBalance hasn't changed since last sync, so baseInput = 0)
    await expect(
      instance.connect(addr1).buyShares(addr1.address)
    ).to.be.revertedWith("NO_BASE_INPUT");
  });
});