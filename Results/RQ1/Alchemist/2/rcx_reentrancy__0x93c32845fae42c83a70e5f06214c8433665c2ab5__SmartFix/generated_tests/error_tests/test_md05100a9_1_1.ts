import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant md05100a9 test", function () {
  it("should detect mutant by calling Collect when balance < MinSum but time condition is met", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xWallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await xWallet.waitForDeployment();

    // Setup: addr1 deposits exactly 0.5 ether (less than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("0.5");
    await xWallet.connect(addr1).Put(0, { value: depositAmount });

    // Verify addr1's balance is less than MinSum
    const holder = await xWallet.Acc(addr1.address);
    expect(holder.balance).to.be.lessThan(await xWallet.MinSum());

    // Attempt to collect 0.1 ether - this should fail on original (balance < MinSum)
    // but would succeed on mutant (because || allows when time condition is true)
    // The unlockTime was set to 0 in Put, and block.timestamp > 0, so time condition is true
    const collectAmount = ethers.parseEther("0.1");

    // This should revert on the original contract because balance < MinSum
    // The mutant would incorrectly allow it, so we expect revert to kill the mutant
    await expect(
      xWallet.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});