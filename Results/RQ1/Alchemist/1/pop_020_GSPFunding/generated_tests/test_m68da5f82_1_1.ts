import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant detection - sellShares multiplication replaced with addition", function () {
  it("should kill mutant by verifying proportional baseAmount calculation when selling small shares with large baseBalance", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const mockBase = await MockERC20.deploy("Base", "BASE", 18);
    const mockQuote = await MockERC20.deploy("Quote", "QUOTE", 18);
    await mockBase.waitForDeployment();
    await mockQuote.waitForDeployment();

    // Mint tokens to owner
    await mockBase.mint(owner.address, ethers.parseEther("1000000"));
    await mockQuote.mint(owner.address, ethers.parseEther("1000000"));

    // Transfer tokens to the contract to set initial reserves
    await mockBase.transfer(instance.target, ethers.parseEther("10000"));
    await mockQuote.transfer(instance.target, ethers.parseEther("10000"));

    // We need to call buyShares to initialize the contract state
    // First, give user1 some tokens to buy shares
    await mockBase.mint(user1.address, ethers.parseEther("1000"));
    await mockQuote.mint(user1.address, ethers.parseEther("1000"));

    // Approve and buy shares for user1
    await mockBase.connect(user1).approve(instance.target, ethers.parseEther("1000"));
    await mockQuote.connect(user1).approve(instance.target, ethers.parseEther("1000"));
    await instance.connect(user1).buyShares(user1.address);

    // Get initial state
    const initialTotalShares = await instance.totalSupply();
    const initialBaseReserve = await instance._BASE_RESERVE_();
    const initialQuoteReserve = await instance._QUOTE_RESERVE_();

    // User1 sells a small portion of shares
    const shareAmount = ethers.parseEther("1");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Call sellShares and verify proportional calculation
    const tx = await instance.connect(user1).sellShares(
      shareAmount,
      user2.address,
      0,  // baseMinAmount
      0,  // quoteMinAmount
      "0x",  // data
      deadline
    );

    // Get the result from the transaction
    const receipt = await tx.wait();
    
    // Parse the event to get baseAmount and quoteAmount
    const event = receipt.logs.find(log => {
      try {
        const parsed = instance.interface.parseLog({
          topics: [...log.topics],
          data: log.data
        });
        return parsed?.name === "SellShares";
      } catch {
        return false;
      }
    });
    
    const parsedEvent = instance.interface.parseLog({
      topics: [...event.topics],
      data: event.data
    });
    
    // The event emits: SellShares(address payer, address to, uint256 decreaseShares, uint256 totalShares)
    // We need to compute the baseAmount and quoteAmount from the contract state changes
    const newTotalShares = await instance.totalSupply();
    const newBaseReserve = await instance._BASE_RESERVE_();
    const newQuoteReserve = await instance._QUOTE_RESERVE_();

    // Calculate actual baseAmount and quoteAmount that were transferred
    const baseAmount = initialBaseReserve - newBaseReserve;
    const quoteAmount = initialQuoteReserve - newQuoteReserve;

    // Calculate expected proportional amounts
    const expectedBaseAmount = (initialBaseReserve * shareAmount) / initialTotalShares;
    const expectedQuoteAmount = (initialQuoteReserve * shareAmount) / initialTotalShares;

    // Verify proportional calculation (original formula)
    // The mutant would produce: baseAmount = baseBalance + shareAmount / totalShares ≈ baseBalance (nearly the entire reserve)
    // Original produces: baseAmount = baseBalance * shareAmount / totalShares ≈ small proportional amount
    expect(baseAmount).to.equal(expectedBaseAmount);
    expect(quoteAmount).to.equal(expectedQuoteAmount);

    // Verify that the result is proportional (small), not nearly the entire reserve
    // If mutant was present, baseAmount would be close to initialBaseReserve
    expect(baseAmount).to.be.lessThan(initialBaseReserve / 100n); // Less than 1% of reserve
    expect(quoteAmount).to.be.lessThan(initialQuoteReserve / 100n); // Less than 1% of reserve
  });
});