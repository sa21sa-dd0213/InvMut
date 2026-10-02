import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m427c3738 test", function () {
  it("should revert when Collect is called before unlockTime but balance conditions are met (original behavior)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Fund the bank contract so it can send ether
    await owner.sendTransaction({
      to: bankAddress,
      value: ethers.parseEther("10")
    });

    // User puts 2 ether into the bank with a future unlock time
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 10000; // ~2.8 hours in the future
    const putTx = await bank.connect(user).Put(futureUnlockTime, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Verify user has balance >= MinSum (1 ether)
    const userAccount = await bank.Acc(user.address);
    expect(userAccount.balance).to.equal(ethers.parseEther("2"));
    expect(userAccount.balance).to.be.gte(await bank.MinSum());

    // Try to collect 1 ether BEFORE unlockTime
    // In original: should revert because block.timestamp <= acc.unlockTime
    // In mutant: would succeed because balance conditions are true (allowing || bypass)
    await expect(
      bank.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});