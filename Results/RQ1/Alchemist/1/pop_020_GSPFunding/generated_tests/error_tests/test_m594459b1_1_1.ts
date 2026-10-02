import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m594459b1 - quoteInput calculation", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;
  const BASE_AMOUNT = ethers.parseEther("1000");
  const QUOTE_AMOUNT = ethers.parseEther("2000");

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    instance = await Factory.deploy(
      baseToken.target,
      quoteToken.target,
      ethers.parseEther("1"), // _I_ (initial price)
      ethers.parseEther("0.5"), // _K_
      ethers.parseEther("0.003"), // _LP_FEE_RATE_
      ethers.parseEther("0.001"), // _MT_FEE_RATE_
      owner.address, // _MAINTAINER_
      false // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();

    // Fund the contract with initial liquidity to make totalSupply > 0
    await baseToken.transfer(instance.target, BASE_AMOUNT);
    await quoteToken.transfer(instance.target, QUOTE_AMOUNT);

    // Call buyShares to initialize liquidity
    await instance.connect(owner).buyShares(owner.address);
  });

  it("should correctly calculate quoteInput as the difference between balance and reserve, not as a division", async function () {
    // Get initial reserves and balances before new deposit
    const vaultReserveBefore = await instance.getVaultReserve();
    const baseBalanceBefore = await baseToken.balanceOf(instance.target);
    const quoteBalanceBefore = await quoteToken.balanceOf(instance.target);

    // Calculate the actual quote input we will deposit
    const depositQuoteAmount = ethers.parseEther("500");
    const depositBaseAmount = ethers.parseEther("250");

    // Transfer tokens to the contract
    await baseToken.transfer(instance.target, depositBaseAmount);
    await quoteToken.transfer(instance.target, depositQuoteAmount);

    // Call buyShares and capture the returned quoteInput
    const tx = await instance.connect(owner).buyShares(addr1.address);
    const receipt = await tx.wait();

    // Get the quoteInput from the event or compute it from state
    // The function returns (shares, baseInput, quoteInput)
    // We need to decode the return value
    const returnData = await instance.callStatic.buyShares(addr1.address);
    const quoteInput = returnData.quoteInput;

    // The correct quoteInput should be: depositQuoteAmount
    // The mutant would compute: quoteBalance / quoteReserve which would be a tiny number
    // (quoteBalance = quoteBalanceBefore + depositQuoteAmount, quoteReserve = vaultReserveBefore.quoteReserve)

    // Assert that quoteInput equals the actual deposited amount (the difference)
    expect(quoteInput).to.equal(depositQuoteAmount);

    // Additionally verify that the mutant division would produce a completely different value
    const quoteBalanceAfter = await quoteToken.balanceOf(instance.target);
    const quoteReserveAfter = (await instance.getVaultReserve()).quoteReserve;
    const mutantValue = quoteBalanceAfter / quoteReserveAfter; // This would be ~1 or very small
    expect(quoteInput).to.not.equal(mutantValue);
  });
});