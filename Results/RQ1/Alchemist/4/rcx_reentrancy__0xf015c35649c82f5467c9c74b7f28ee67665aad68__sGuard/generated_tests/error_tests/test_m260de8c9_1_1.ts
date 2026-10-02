import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m260de8c9 test", function () {
  it("should revert when trying to collect more than balance (original behavior) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await bank.connect(addr1).Put(0, { value: depositAmount });

    // Verify balance is 1 ether
    const holderInfo = await bank.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);

    // Wait for block timestamp to pass unlockTime (which was set to block.timestamp at deposit)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect 2 ether (more than balance)
    const collectAmount = ethers.parseEther("2");

    // This should revert on original (balance < _am) but pass on mutant (balance <= _am)
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});