import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant md99bf5e4 test", function () {
  it("should revert when baseAmount < baseMinAmount but quoteAmount >= quoteMinAmount (kills || mutant)", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy GSPFunding - Note: GSPFunding inherits from GSPVault and GSPStorage
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Set tokens using the contract's storage (slot 2 and 3 for _BASE_TOKEN_ and _QUOTE_TOKEN_)
    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Set storage slots directly
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x2",
      ethers.zeroPadValue(baseTokenAddress, 32)
    ]);
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x3",
      ethers.zeroPadValue(quoteTokenAddress, 32)
    ]);

    // Mint tokens to user1 and approve GSPFunding to spend them
    const mintAmount = ethers.parseEther("10000");
    await baseToken.mint(user1.address, mintAmount);
    await quoteToken.mint(user1.address, mintAmount);

    // Transfer some tokens to the contract for initial reserves
    await baseToken.connect(user1).transfer(await instance.getAddress(), ethers.parseEther("1000"));
    await quoteToken.connect(user1).transfer(await instance.getAddress(), ethers.parseEther("1000"));

    // Set initial reserves directly via storage slots
    const reserveValue = ethers.parseEther("500");
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x4",
      ethers.zeroPadValue(reserveValue, 32)
    ]);
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x5",
      ethers.zeroPadValue(reserveValue, 32)
    ]);
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x8",
      ethers.zeroPadValue(reserveValue, 32)
    ]);
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x9",
      ethers.zeroPadValue(reserveValue, 32)
    ]);

    // Mint shares to user1 so they can sell them
    const shareAmount = ethers.parseEther("100");
    await instance.connect(owner)._mint(user1.address, shareAmount);

    // Set totalSupply via storage slot (slot 11)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0xb",
      ethers.zeroPadValue(shareAmount, 32)
    ]);

    // Now test the sellShares function with conditions:
    // baseAmount < baseMinAmount but quoteAmount >= quoteMinAmount
    const sellAmount = ethers.parseEther("50");
    const baseMinAmount = ethers.parseEther("300"); // Higher than expected 250
    const quoteMinAmount = ethers.parseEther("200"); // Lower than expected 250

    // Approve and call sellShares
    await expect(
      instance.connect(user1).sellShares(
        sellAmount,
        user2.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      )
    ).to.be.reverted; // Original contract reverts because baseAmount < baseMinAmount (250 < 300)
  });
});