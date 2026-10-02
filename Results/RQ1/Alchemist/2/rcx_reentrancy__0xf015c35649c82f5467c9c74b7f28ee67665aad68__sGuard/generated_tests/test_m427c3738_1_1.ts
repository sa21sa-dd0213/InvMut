import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - m427c3738", function () {
  it("should revert when balance is below MinSum and below _am but unlock time has passed (original) but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get MinSum (1 ether)
    const minSum = await instance.MinSum();

    // addr1 deposits 0.5 ether (less than MinSum) with unlock time = 0 (already passed)
    const depositTx = await instance.connect(addr1).Put(0, { value: ethers.parseEther("0.5") });
    await depositTx.wait();

    // Fast forward time to ensure block.timestamp > unlockTime (unlockTime = 0, so already true)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect 0.3 ether (balance 0.5 < MinSum 1 ether AND 0.5 >= 0.3 is true but fails first condition)
    // On original: acc.balance(0.5) >= MinSum(1) is FALSE -> whole AND chain fails -> revert
    // On mutant: (acc.balance(0.5) >= MinSum(1) && acc.balance(0.5) >= 0.3) is FALSE, but block.timestamp > 0 is TRUE -> OR passes -> success
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.3"))
    ).to.be.reverted;
  });
});