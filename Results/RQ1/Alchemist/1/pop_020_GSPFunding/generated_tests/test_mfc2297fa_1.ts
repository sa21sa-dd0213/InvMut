import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GSPFunding mutant kill test - mfc2297fa", function () {
  it("should revert on sellShares with empty data when to is a contract that reverts on any call", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a simple contract that reverts on any call (no fallback)
    const RevertContract = await ethers.getContractFactory(
      "contracts/test/Reverter.sol:Reverter"
    );
    const revertingContract = await RevertContract.deploy();
    await revertingContract.waitForDeployment();

    // Deploy the main GSPFunding contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: mint some base and quote tokens to user, approve, deposit, buy shares
    // First we need to create base and quote tokens for testing
    const BaseToken = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await BaseToken.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    
    const QuoteToken = await ethers.getContractFactory("ERC20Mock");
    const quoteToken = await QuoteToken.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Mint tokens to user
    await baseToken.mint(user.address, ethers.parseEther("1000"));
    await quoteToken.mint(user.address, ethers.parseEther("1000"));

    // Approve and buy shares to get initial liquidity
    await baseToken.connect(user).approve(instance.target, ethers.parseEther("1000"));
    await quoteToken.connect(user).approve(instance.target, ethers.parseEther("1000"));
    
    // Transfer tokens to contract directly to simulate deposit
    await baseToken.connect(user).transfer(instance.target, ethers.parseEther("500"));
    await quoteToken.connect(user).transfer(instance.target, ethers.parseEther("500"));

    // Buy shares
    await instance.connect(user).buyShares(user.address);

    // Now test: sellShares with empty data to the reverting contract
    const shareAmount = ethers.parseEther("1");
    const baseMin = 0;
    const quoteMin = 0;
    const emptyData = "0x";
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;

    // This should revert on mutant because it tries to call the reverting contract with empty data
    await expect(
      instance.connect(user).sellShares(
        shareAmount,
        revertingContract.target,
        baseMin,
        quoteMin,
        emptyData,
        deadline
      )
    ).to.be.reverted;
  });
});