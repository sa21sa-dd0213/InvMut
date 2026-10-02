import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - m1979f4bf", function () {
  it("should detect the mutant by calling Collect when balance is below MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const MinSum = ethers.parseEther("1");

    // addr1 puts 0.5 ether (below MinSum)
    const putAmount = ethers.parseEther("0.5");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await bank.connect(addr1).Put(unlockTime, { value: putAmount });

    // Fast-forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    // addr1 tries to collect 0.5 ether (balance < MinSum)
    // Original contract would revert because balance (0.5) < MinSum (1)
    // Mutant allows it because balance <= MinSum
    await expect(
      bank.connect(addr1).Collect(putAmount)
    ).to.be.reverted;
  });
});