import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - me003e634", function () {
  it("should revert when balance equals MinSum (1 ether) due to > instead of >=", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(log.target);
    await bank.waitForDeployment();

    // User deposits exactly 1 ether (MinSum)
    const depositTx = await bank.connect(user).Put(0, { value: ethers.parseEther("1") });
    await depositTx.wait();

    // Verify balance is exactly MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));

    // Wait for unlock time to pass (unlockTime is set to block.timestamp since _unlockTime=0 < block.timestamp)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect exactly 1 ether
    // On original contract: should succeed because balance >= MinSum
    // On mutant: should revert because balance > MinSum is false (balance equals MinSum)
    await expect(
      bank.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});