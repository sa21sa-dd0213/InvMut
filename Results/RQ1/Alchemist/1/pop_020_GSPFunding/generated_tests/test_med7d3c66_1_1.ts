import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - med7d3c66", function () {
  it("should revert when buyShares is called with quoteReserve == 0 and baseReserve > 0", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Set _BASE_TOKEN_ (slot 3)
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0x3",
      ethers.zeroPadValue(baseToken.target, 32)
    ]);

    // Set _QUOTE_TOKEN_ (slot 4)
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0x4",
      ethers.zeroPadValue(quoteToken.target, 32)
    ]);

    // Set _MAINTAINER_ (slot 2)
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0x2",
      ethers.zeroPadValue(owner.address, 32)
    ]);

    // Transfer base tokens to contract to set baseReserve > 0
    const baseAmount = ethers.parseEther("1000");
    await baseToken.transfer(instance.target, baseAmount);

    // Set reserves: baseReserve > 0, quoteReserve == 0
    // Slot 5: _BASE_RESERVE_ (lower 112 bits) + _QUOTE_RESERVE_ (next 112 bits) + _BLOCK_TIMESTAMP_LAST_ (32 bits)
    const packed = BigInt(0); // quoteReserve = 0, timestamp = 0, baseReserve = baseAmount
    const packedWithBase = (BigInt(0) << BigInt(224)) | (BigInt(0) << BigInt(112)) | baseAmount;
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0x5",
      ethers.zeroPadValue(ethers.toBeHex(packedWithBase), 32)
    ]);

    // Set totalSupply > 0 (slot 11) to enter the else if branch
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0xb",
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("100")), 32)
    ]);

    // Set _I_ value (slot 21 based on storage layout)
    // Need to find correct slot for _I_ - it comes after _K_ (slot 20)
    // _MT_FEE_RATE_ (slot 18), _LP_FEE_RATE_ (slot 19), _K_ (slot 20), _I_ (slot 21)
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      "0x15", // slot 21 in hex
      ethers.zeroPadValue(ethers.toBeHex(ethers.parseEther("1")), 32)
    ]);

    // Transfer some base tokens to user for the call
    await baseToken.transfer(user.address, ethers.parseEther("10"));
    await baseToken.connect(user).approve(instance.target, ethers.parseEther("10"));

    // User sends base tokens to the contract to create baseInput
    await baseToken.connect(user).transfer(instance.target, ethers.parseEther("5"));

    // Now call buyShares - should revert because quoteReserve == 0 in the else if branch
    await expect(
      instance.connect(user).buyShares(user.address)
    ).to.be.reverted;
  });
});