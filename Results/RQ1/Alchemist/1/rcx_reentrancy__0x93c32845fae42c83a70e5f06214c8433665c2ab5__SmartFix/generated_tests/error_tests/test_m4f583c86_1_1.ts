import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m4f583c86", function () {
  it("should detect mutant that changed >= to > in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("X_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Fund user with some ether for gas
    await owner.sendTransaction({
      to: user.address,
      value: ethers.parseEther("10")
    });

    // Deposit exactly MinSum (1 ether) into the wallet from user
    const depositAmount = ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await wallet.connect(user).Put(unlockTime, { value: depositAmount });

    // Verify balance is exactly MinSum
    const holderInfo = await wallet.Acc(user.address);
    expect(holderInfo.balance).to.equal(depositAmount);

    // Advance time past unlockTime
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect exactly the deposited amount (which equals MinSum)
    // Original contract allows this (balance >= _am), mutant requires balance > _am
    await expect(
      wallet.connect(user).Collect(depositAmount)
    ).to.not.be.reverted;
  });
});