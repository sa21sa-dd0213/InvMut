import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant maa9431d9 - sellShares withdrawal validation", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;
  let baseTokenFactory: any;
  let quoteTokenFactory: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with required constructor arguments
    // GSPStorage constructor: _MAINTAINER_, _BASE_TOKEN_, _QUOTE_TOKEN_, _I_, _K_, _LP_FEE_RATE_, _MT_FEE_RATE_, _IS_OPEN_TWAP_, symbol, decimals, name
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    instance = await GSPFundingFactory.deploy(
      owner.address,
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("1"), // _I_ = 1
      ethers.parseEther("0.5"), // _K_ = 0.5
      ethers.parseEther("0.003"), // _LP_FEE_RATE_ = 0.3%
      ethers.parseEther("0.001"), // _MT_FEE_RATE_ = 0.1%
      false, // _IS_OPEN_TWAP_ = false
      "GSP", // symbol
      18, // decimals
      "GSP Funding" // name
    );
    await instance.waitForDeployment();

    // Fund the contract with base and quote tokens
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));

    // Set initial reserves and targets via buyShares to initialize the pool
    await instance.connect(owner).buyShares(owner.address, { value: 0 });
  });

  it("should revert when baseAmount or quoteAmount is less than minimum specified amounts", async function () {
    // First, buy shares for addr1 so they have shares to sell
    await baseToken.transfer(addr1.address, ethers.parseEther("1000"));
    await quoteToken.transfer(addr1.address, ethers.parseEther("1000"));
    await baseToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Transfer base and quote to contract for addr1's buy
    await baseToken.connect(addr1).transfer(await instance.getAddress(), ethers.parseEther("500"));
    await quoteToken.connect(addr1).transfer(await instance.getAddress(), ethers.parseEther("500"));
    
    await instance.connect(addr1).buyShares(addr1.address);

    // Get addr1's share balance
    const shares = await instance.balanceOf(addr1.address);
    
    // Set min amounts higher than what would be calculated (e.g., 100x higher)
    const baseMinAmount = ethers.parseEther("1000000");
    const quoteMinAmount = ethers.parseEther("1000000");
    
    // This should revert because the actual baseAmount and quoteAmount will be far less than the minimum
    await expect(
      instance.connect(addr1).sellShares(
        shares,
        addr1.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        9999999999
      )
    ).to.be.revertedWith("WITHDRAW_NOT_ENOUGH");
  });
});