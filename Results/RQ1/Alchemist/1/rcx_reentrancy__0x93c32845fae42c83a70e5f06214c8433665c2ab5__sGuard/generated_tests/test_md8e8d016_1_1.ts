import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant md8e8d016 test", function () {
  it("should kill mutant by detecting balance inflation when sending 1 wei", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with the Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // User sends exactly 1 wei via Put with a future unlock time
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await wallet.connect(user).Put(unlockTime, { value: 1 });

    // Advance time past the unlock time
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect exactly 1 wei
    // In the original contract, this should succeed (balance = 1, am = 1)
    // In the mutant, balance is 2 (msg.value+1 = 2), so collecting 1 should succeed
    // but the balance will become 1 instead of 0, which we can detect
    await wallet.connect(user).Collect(1);

    // Check the remaining balance - should be 0 in original, but 1 in mutant
    const acc = await wallet.Acc(user.address);
    expect(acc.balance).to.equal(0); // This will fail on the mutant, killing it
  });
});