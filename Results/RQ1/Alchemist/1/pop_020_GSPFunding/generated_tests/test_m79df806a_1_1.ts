import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - buyShares baseInput calculation", function () {
  it("should revert or produce incorrect shares when baseInput uses addition instead of subtraction", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the GSP contract with tokens and initial parameters
    await instance.setBaseToken(baseToken.target);
    await instance.setQuoteToken(quoteToken.target);

    // Set initial I and K values
    await instance.setI(ethers.parseEther("1")); // 1:1 ratio
    await instance.setK(ethers.parseEther("0.5")); // 50% K

    // Mint tokens to user
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("1000");
    await baseToken.mint(user.address, baseAmount);
    await quoteToken.mint(user.address, quoteAmount);

    // Approve GSP contract to spend user's tokens
    await baseToken.connect(user).approve(instance.target, baseAmount);
    await quoteToken.connect(user).approve(instance.target, quoteAmount);

    // First buy: deposit both tokens to initialize liquidity
    // User deposits 100 base and 100 quote
    const initialBase = ethers.parseEther("100");
    const initialQuote = ethers.parseEther("100");
    await baseToken.connect(user).transfer(instance.target, initialBase);
    await quoteToken.connect(user).transfer(instance.target, initialQuote);

    // Execute first buyShares
    const tx1 = await instance.connect(user).buyShares(user.address);
    const receipt1 = await tx1.wait();

    // Get the shares minted from the BuyShares event
    const buySharesEvent1 = receipt1!.logs.find(
      (log: any) => log.fragment && log.fragment.name === "BuyShares"
    );
    const firstShares = buySharesEvent1!.args[1];

    // Now user deposits additional base tokens only
    const additionalBase = ethers.parseEther("50");
    await baseToken.connect(user).transfer(instance.target, additionalBase);

    // Execute second buyShares
    const tx2 = await instance.connect(user).buyShares(user.address);
    const receipt2 = await tx2.wait();

    // Get the second BuyShares event
    const buySharesEvent2 = receipt2!.logs.find(
      (log: any) => log.fragment && log.fragment.name === "BuyShares"
    );
    const secondShares = buySharesEvent2!.args[1];

    // Expected shares with original: ~50% of firstShares
    const expectedShares = firstShares * BigInt(50) / BigInt(100);

    // If the mutant is active, secondShares will be much larger than expectedShares
    // If the original is active, secondShares will be close to expectedShares
    expect(secondShares).to.be.lt(firstShares); // Second deposit should give less shares than first
    expect(secondShares).to.be.gt(ethers.parseEther("0")); // Should still get some shares

    // A direct check: verify the state after buyShares
    const baseReserve = await instance._BASE_RESERVE_();
    const quoteReserve = await instance._QUOTE_RESERVE_();

    // After second buyShares, baseReserve should be 150 (100 initial + 50 additional)
    expect(baseReserve).to.equal(ethers.parseEther("150"));

    // The shares minted in second buy should be proportional to 50/100 of first shares
    // Allow some rounding error
    const diff = secondShares > expectedShares ? 
      secondShares - expectedShares : 
      expectedShares - secondShares;

    // If mutant is active, diff will be huge (minting ~250/100 = 2.5x instead of 0.5x)
    // If original is active, diff should be small (rounding only)
    expect(diff).to.be.lt(ethers.parseEther("1")); // Should be within rounding error

    console.log("First shares:", firstShares.toString());
    console.log("Second shares:", secondShares.toString());
    console.log("Expected shares:", expectedShares.toString());
    console.log("Difference:", diff.toString());
  });
});