import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant me003e634 test", function () {
  it("should revert when balance equals MinSum due to > instead of >=", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const MinSum = ethers.parseEther("1");
    const depositAmount = MinSum; // Exactly 1 ether

    // User deposits exactly MinSum
    await bank.connect(user).Put(0, { value: depositAmount });

    // Verify balance equals MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(MinSum);

    // Attempt to collect exactly the balance (which equals MinSum)
    // This should revert on the mutant because acc.balance > MinSum is false
    await expect(
      bank.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});