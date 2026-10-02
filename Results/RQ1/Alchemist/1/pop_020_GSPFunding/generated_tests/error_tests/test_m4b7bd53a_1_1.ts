import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m4b7bd53a - kill test", function () {
  it("should revert when shares equals exactly 2001 in buyShares (original behavior) and mutant should pass", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the GSPFunding contract (no constructor arguments needed as per the contract code)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", ethers.parseEther("1000000"));
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", ethers.parseEther("1000000"));
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Setup the GSPFunding with tokens and initial parameters
    // First, transfer tokens to the contract
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("10000"));

    // Set the token addresses in storage
    const baseTokenSlot = ethers.hexlify(ethers.toBeArray(2)); // Slot 2 for _BASE_TOKEN_
    const quoteTokenSlot = ethers.hexlify(ethers.toBeArray(3)); // Slot 3 for _QUOTE_TOKEN_

    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      baseTokenSlot,
      ethers.zeroPadValue(await baseToken.getAddress(), 32)
    ]);

    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      quoteTokenSlot,
      ethers.zeroPadValue(await quoteToken.getAddress(), 32)
    ]);

    // Set _I_ to 1 * 10^18
    const iSlot = ethers.hexlify(ethers.toBeArray(27)); // Slot 27 for _I_
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      iSlot,
      ethers.zeroPadValue(ethers.parseEther("1"), 32)
    ]);

    // Set reserves to 0
    const baseReserveSlot = ethers.hexlify(ethers.toBeArray(4));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      baseReserveSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);

    const quoteReserveSlot = ethers.hexlify(ethers.toBeArray(5));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      quoteReserveSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);

    // Set targets to 0
    const baseTargetSlot = ethers.hexlify(ethers.toBeArray(8));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      baseTargetSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);

    const quoteTargetSlot = ethers.hexlify(ethers.toBeArray(9));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      quoteTargetSlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);

    // Set totalSupply to 0
    const totalSupplySlot = ethers.hexlify(ethers.toBeArray(12));
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      totalSupplySlot,
      ethers.zeroPadValue(ethers.toBeArray(0), 32)
    ]);

    // Now transfer exactly 2001 base tokens and 3000 quote tokens to the contract
    await baseToken.transfer(await instance.getAddress(), 2001);
    await quoteToken.transfer(await instance.getAddress(), 3000);

    // Test that buyShares reverts (original behavior)
    await expect(
      instance.connect(user).buyShares(user.address)
    ).to.be.revertedWith("MINT_AMOUNT_NOT_ENOUGH");
  });
});