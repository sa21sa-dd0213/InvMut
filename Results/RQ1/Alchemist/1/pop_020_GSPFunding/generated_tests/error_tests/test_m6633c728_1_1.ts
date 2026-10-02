import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - sellShares division replaced with subtraction", function () {
  it("should kill mutant m6633c728 by verifying correct baseAmount calculation", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with required constructor arguments
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const instance = await GSPFundingFactory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("1"),    // _I_ (initial price)
      ethers.parseEther("0.5"),  // _K_ (initial K value)
      ethers.parseEther("0.003"), // _LP_FEE_RATE_
      ethers.parseEther("0.001"), // _MT_FEE_RATE_
      owner.address,              // _MAINTAINER_
      false                       // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();

    // Setup: transfer tokens to contract and initialize reserves
    const baseAmount = ethers.parseEther("10000");
    const quoteAmount = ethers.parseEther("10000");

    await baseToken.transfer(await instance.getAddress(), baseAmount);
    await quoteToken.transfer(await instance.getAddress(), quoteAmount);

    // First buy shares to initialize the pool and get shares
    await instance.connect(user1).buyShares(user1.address);

    // Get total shares after first buy
    const totalSupplyBefore = await instance.totalSupply();

    // Get current reserves
    const vaultReserve = await instance.getVaultReserve();
    const baseReserve = vaultReserve.baseReserve;
    const quoteReserve = vaultReserve.quoteReserve;

    // Get current balances including fees
    const baseBalance = await baseToken.balanceOf(await instance.getAddress());
    const quoteBalance = await quoteToken.balanceOf(await instance.getAddress());
    const mtFeeBase = await instance._MT_FEE_BASE_();
    const mtFeeQuote = await instance._MT_FEE_QUOTE_();

    // Calculate actual baseBalance available (excluding fees)
    const actualBaseBalance = baseBalance - mtFeeBase;
    const actualQuoteBalance = quoteBalance - mtFeeQuote;

    // User2 buys more shares to have something to sell
    await baseToken.transfer(user2.address, ethers.parseEther("1000"));
    await quoteToken.transfer(user2.address, ethers.parseEther("1000"));
    await baseToken.connect(user2).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.connect(user2).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(user2).buyShares(user2.address);

    // Get user2's share balance
    const user2Shares = await instance.balanceOf(user2.address);

    // Calculate expected baseAmount using original formula: baseBalance * shareAmount / totalShares
    const newTotalSupply = await instance.totalSupply();
    const expectedBaseAmount = actualBaseBalance * user2Shares / newTotalSupply;

    // Call sellShares and capture the result
    const tx = await instance.connect(user2).sellShares(
      user2Shares,
      user2.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      ethers.MaxUint256 // deadline
    );

    const receipt = await tx.wait();

    // The mutant would compute baseAmount = actualBaseBalance * user2Shares - newTotalSupply
    // which would be different from expectedBaseAmount
    // We can verify this by checking the event or the transfer amount

    // Check the SellShares event to get actual amounts
    const event = receipt.logs.find(log => {
      try {
        const parsed = instance.interface.parseLog(log);
        return parsed?.name === "SellShares";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = instance.interface.parseLog(event);
      const actualBaseAmount = parsedEvent.args.baseAmount;

      // The original should match expected, mutant should fail
      expect(actualBaseAmount).to.equal(expectedBaseAmount);
    } else {
      // If no event, check the transfer
      const user2BaseBalanceAfter = await baseToken.balanceOf(user2.address);
      const actualBaseTransfer = user2BaseBalanceAfter - ethers.parseEther("1000"); // user2 had 1000 initially
      expect(actualBaseTransfer).to.equal(expectedBaseAmount);
    }
  });
});