import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mc9fb58a5 - sellShares callback test", function () {
  it("should revert when calling sellShares with non-empty data on a contract that expects the callback, but the mutant never calls it", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the GSPFunding contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple callback contract that implements IDODOCallee
    // This contract will set a flag when DVMSellShareCall is called
    const CallbackFactory = await ethers.getContractFactory(
      "contracts/test/TestDODOCallee.sol:TestDODOCallee"
    );
    const callbackContract = await CallbackFactory.deploy();
    await callbackContract.waitForDeployment();

    // First, we need to initialize the pool by buying shares
    // We need to have some base and quote tokens - deploy mock ERC20 tokens
    const MockERC20Factory = await ethers.getContractFactory(
      "contracts/test/MockERC20.sol:MockERC20"
    );
    const baseToken = await MockERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await MockERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Mint tokens to user
    await baseToken.mint(user.address, ethers.parseEther("10000"));
    await quoteToken.mint(user.address, ethers.parseEther("10000"));

    // Set tokens in the GSPFunding contract (need to use the internal setup)
    // Since there's no setter, we'll need to transfer tokens directly and call buyShares
    await baseToken.connect(user).transfer(instance.target, ethers.parseEther("1000"));
    await quoteToken.connect(user).transfer(instance.target, ethers.parseEther("1000"));

    // Call buyShares to initialize the pool
    await instance.connect(user).buyShares(user.address);

    // Now user has shares, let's try to sell with non-empty data
    const shareBalance = await instance.balanceOf(user.address);
    
    // Prepare non-empty data for the callback
    const callbackData = ethers.hexlify(ethers.toUtf8Bytes("test"));

    // In the original contract, calling sellShares with non-empty data would trigger
    // the callback on the recipient. In the mutant, the condition `data.length < 0`
    // is always false, so the callback is never called.
    // We expect the transaction to succeed (not revert) in both cases,
    // but we can check that the callback was actually called on the recipient contract.
    
    // Execute sellShares with the callback contract as recipient
    await instance.connect(user).sellShares(
      shareBalance,
      callbackContract.target,
      0,
      0,
      callbackData,
      Math.floor(Date.now() / 1000) + 3600
    );

    // Check if the callback was invoked by verifying the flag on the callback contract
    const wasCallbackCalled = await callbackContract.wasCalled();
    
    // In the original contract, wasCalled should be true
    // In the mutant, wasCalled will be false because the callback is never triggered
    expect(wasCallbackCalled).to.equal(true);
  });
});