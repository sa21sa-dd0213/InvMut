import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test", function () {
  it("should detect mutant mfa455904 by testing collection after unlock time", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Set unlock time to 1 hour in the future
    const currentTime = (await ethers.provider.getBlock("latest")).timestamp;
    const unlockTime = currentTime + 3600;

    // Deposit 2 ether with future unlock time
    await wallet.connect(user).Put(unlockTime, { value: ethers.parseEther("2") });

    // Verify balance was recorded
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));
    expect(holder.unlockTime).to.equal(unlockTime);

    // Fast forward time past unlock
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect - should succeed on original but fail on mutant
    // because mutant requires block.timestamp < unlockTime (which is now false)
    await expect(
      wallet.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});