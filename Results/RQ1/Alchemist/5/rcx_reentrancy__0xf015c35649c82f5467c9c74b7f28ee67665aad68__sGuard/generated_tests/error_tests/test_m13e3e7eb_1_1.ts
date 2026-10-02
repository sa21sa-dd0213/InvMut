import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m13e3e7eb by exploiting the OR operator change", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with the Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    const MinSum = ethers.parseEther("1");

    // addr1 deposits 1 ether with unlock time far in the future
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 100000;
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(futureUnlockTime, { value: depositAmount });

    // Try to withdraw 0.5 ether before unlock time
    const smallWithdrawal = ethers.parseEther("0.5");

    // This transaction should not revert on the mutant (because OR operator allows it)
    // On the original contract it would revert because block.timestamp <= unlockTime
    const tx = await instance.connect(addr1).Collect(smallWithdrawal);
    await tx.wait();

    // Verify the transaction succeeded (didn't revert)
    // This proves the mutant behavior is different from the original
  });
});