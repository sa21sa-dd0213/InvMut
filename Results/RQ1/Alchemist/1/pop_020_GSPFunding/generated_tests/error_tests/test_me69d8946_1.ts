import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - sellShares arithmetic", function () {
  it("should revert when selling shares because mutant calculates quoteAmount incorrectly (uses + instead of /)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy mock tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Initialize the GSPFunding contract with tokens
    // First set the tokens and initial parameters
    await instance.connect(owner).setBaseToken(await baseToken.getAddress());
    await instance.connect(owner).setQuoteToken(await quoteToken.getAddress());
    await instance.connect(owner).setI(ethers.parseEther("1"));
    await instance.connect(owner).setK(ethers.parseEther("0.5"));
    
    // Fund the contract with initial reserves
    const initialBase = ethers.parseEther("10000");
    const initialQuote = ethers.parseEther("10000");
    await baseToken.transfer(instanceAddress, initialBase);
    await quoteToken.transfer(instanceAddress, initialQuote);
    
    // Set initial reserves
    await instance.connect(owner).setReserve(initialBase, initialQuote);
    await instance.connect(owner).setTarget(initialBase, initialQuote);
    await instance.connect(owner).setRState(0); // ONE state

    // User buys shares to get some LP tokens
    const buyAmount = ethers.parseEther("1000");
    await baseToken.transfer(user.address, buyAmount);
    await quoteToken.transfer(user.address, buyAmount);
    await baseToken.connect(user).approve(instanceAddress, buyAmount);
    await quoteToken.connect(user).approve(instanceAddress, buyAmount);
    
    // Transfer tokens to contract for buyShares
    await baseToken.connect(user).transfer(instanceAddress, buyAmount);
    await quoteToken.connect(user).transfer(instanceAddress, buyAmount);
    
    await instance.connect(user).buyShares(user.address);
    
    // Get user's share balance
    const userShares = await instance.balanceOf(user.address);
    expect(userShares).to.be.gt(0);

    // Now test sellShares - the mutant will cause quoteAmount to be enormous
    // Original: quoteAmount = quoteBalance * shareAmount / totalShares
    // Mutant: quoteAmount = quoteBalance * shareAmount + totalShares
    // The mutant result will be huge and likely cause overflow or exceed balances
    
    const baseMinAmount = 0;
    const quoteMinAmount = 0;
    const data = "0x";
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    // The mutant calculation will produce quoteAmount = quoteBalance * shareAmount + totalShares
    // This is astronomically larger than the actual quote balance, so the contract
    // will try to transfer more than it has, causing a revert
    await expect(
      instance.connect(user).sellShares(
        userShares,
        user.address,
        baseMinAmount,
        quoteMinAmount,
        data,
        deadline
      )
    ).to.be.reverted;
  });
});