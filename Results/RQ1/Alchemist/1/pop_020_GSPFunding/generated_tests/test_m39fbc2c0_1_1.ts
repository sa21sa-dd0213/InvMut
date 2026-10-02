import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant detection test", function () {
  it("should kill mutant m39fbc2c0 by testing sellShares with exact balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy GSPFunding with required constructor arguments
    // The constructor requires: _BASE_TOKEN_, _QUOTE_TOKEN_, _MT_FEE_RATE_, _LP_FEE_RATE_, _K_, _I_, _MAINTAINER_
    // For testing, we need to deploy mock ERC20 tokens first
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      0, // _MT_FEE_RATE_
      0, // _LP_FEE_RATE_
      ethers.parseEther("1"), // _K_ = 1 (no price impact)
      ethers.parseEther("1"), // _I_ = 1 (one-to-one price)
      owner.address // _MAINTAINER_
    );
    await instance.waitForDeployment();

    // Setup: Transfer tokens to the contract to simulate initial liquidity
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));

    // Call buyShares to mint shares for user
    // First approve tokens for the contract
    await baseToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.approve(await instance.getAddress(), ethers.parseEther("1000"));

    await instance.connect(user).buyShares(user.address);

    // Get user's share balance
    const shareBalance = await instance.balanceOf(user.address);

    // This should succeed on original (shareAmount <= balance)
    // On mutant (shareAmount >= balance), it will revert because shareAmount equals balance,
    // and the require check `shareAmount >= balance` passes, but then the subtraction
    // `_SHARES_[msg.sender] - shareAmount` in _burn will underflow or the subsequent
    // arithmetic will fail. Actually, if shareAmount == balance, the mutant check passes
    // but the burn will underflow since balance becomes 0 - balance = underflow.
    // The original would succeed.
    await expect(
      instance.connect(user).sellShares(
        shareBalance,
        user.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        Math.floor(Date.now() / 1000) + 3600 // deadline
      )
    ).to.not.be.reverted;
  });
});