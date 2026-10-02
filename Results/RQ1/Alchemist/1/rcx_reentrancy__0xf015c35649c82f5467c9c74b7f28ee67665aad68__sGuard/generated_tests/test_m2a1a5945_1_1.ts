import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m2a1a5945 test", function () {
  it("should kill mutant by checking that Collect uses block.timestamp, not block.prevrandao", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await logInstance.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 100; // 100 seconds in the future

    // Step 1: User deposits ether with a future unlock time
    await bank.connect(user).Put(unlockTime, { value: depositAmount });

    // Step 2: Mine blocks until unlock time has passed
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");

    // Step 3: Now block.timestamp > unlockTime, but block.prevrandao may still be less
    // (prevrandao is set per block, not time-based - on Hardhat it's usually 0 or a constant)
    // This should succeed on original (timestamp check passes) but fail on mutant (prevrandao check fails)
    const collectAmount = ethers.parseEther("1");

    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify the balance was reduced (proves Collect succeeded)
    const userAcc = await bank.Acc(user.address);
    expect(userAcc.balance).to.equal(depositAmount - collectAmount);
  });
});