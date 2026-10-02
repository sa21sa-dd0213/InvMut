import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - m57928af2 (DVMSellShareCall callback disabled)", function () {
  let baseToken: any;
  let quoteToken: any;
  let gspFunding: any;
  let owner: any;
  let user: any;
  let recipient: any;
  const INITIAL_BASE = ethers.parseEther("1000");
  const INITIAL_QUOTE = ethers.parseEther("2000");
  const BUY_AMOUNT = ethers.parseEther("100");
  const SELL_SHARES = ethers.parseEther("50");

  // A simple contract that implements IDODOCallee and records calls
  let calleeContract: any;

  before(async function () {
    [owner, user, recipient] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Mint tokens to user
    await baseToken.mint(user.address, INITIAL_BASE);
    await quoteToken.mint(user.address, INITIAL_QUOTE);

    // Deploy a minimal callee contract that implements DVMSellShareCall
    const CalleeFactory = await ethers.getContractFactory("DODOCalleeRecorder");
    calleeContract = await CalleeFactory.deploy();
    await calleeContract.waitForDeployment();
  });

  beforeEach(async function () {
    // Deploy a fresh GSPFunding for each test
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    // Constructor arguments: baseToken, quoteToken, mtFeeRate, lpFeeRate, K, I, priceLimit
    gspFunding = await GSPFundingFactory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      0, // mtFeeRate
      0, // lpFeeRate
      ethers.parseEther("0.5"), // K = 0.5
      ethers.parseEther("2"), // I = 2
      1000 // priceLimit
    );
    await gspFunding.waitForDeployment();

    // Approve and buy initial shares to have liquidity
    await baseToken.connect(user).approve(await gspFunding.getAddress(), INITIAL_BASE);
    await quoteToken.connect(user).approve(await gspFunding.getAddress(), INITIAL_QUOTE);
    
    // Transfer tokens to user and then to GSPFunding for initial liquidity
    await baseToken.connect(owner).transfer(user.address, INITIAL_BASE);
    await quoteToken.connect(owner).transfer(user.address, INITIAL_QUOTE);
    
    // Buy shares to initialize the pool
    await baseToken.connect(user).transfer(await gspFunding.getAddress(), INITIAL_BASE);
    await quoteToken.connect(user).transfer(await gspFunding.getAddress(), INITIAL_QUOTE);
    await gspFunding.connect(user).buyShares(user.address);
  });

  it("should call DVMSellShareCall when data.length > 0 on sellShares (mutant kills this callback)", async function () {
    // Reset the callee contract's recorded state
    await calleeContract.reset();

    // User needs to have shares to sell
    const userShares = await gspFunding.balanceOf(user.address);
    expect(userShares).to.be.gt(SELL_SHARES);

    // Prepare callback data (non-empty bytes)
    const callbackData = ethers.hexlify(ethers.toUtf8Bytes("test callback"));

    // Approve the GSPFunding to transfer shares from user (if needed - sellShares doesn't need approval, it uses msg.sender)
    // No approval needed since user is the caller

    // Execute sellShares with non-empty data to recipient (the callee contract)
    const tx = await gspFunding.connect(user).sellShares(
      SELL_SHARES,
      await calleeContract.getAddress(), // recipient implements IDODOCallee
      0, // baseMinAmount
      0, // quoteMinAmount
      callbackData, // non-empty data
      (await ethers.provider.getBlock("latest"))!.timestamp + 1000 // deadline
    );
    await tx.wait();

    // Check if the callback was invoked - if the mutant is active, this will be 0
    const callCount = await calleeContract.callCount();
    
    // The original code should have incremented callCount to 1
    // The mutant (with if(false)) will NOT call DVMSellShareCall, so callCount stays 0
    expect(callCount).to.equal(1, "DVMSellShareCall was not invoked - mutant is alive");
  });
});