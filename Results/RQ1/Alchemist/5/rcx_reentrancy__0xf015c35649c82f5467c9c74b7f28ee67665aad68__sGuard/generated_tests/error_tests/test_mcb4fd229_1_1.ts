import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mcb4fd229 detection test", function () {
  it("should detect mutant that changes >= to == in Collect condition", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // addr1 deposits 2 ether (more than MinSum = 1 ether)
    await bank.connect(addr1).Put(0, { value: ethers.parseEther("2") });

    // Verify initial balance is 2 ether
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));

    // addr1 attempts to collect 1 ether (partial withdrawal, balance > _am)
    // In original: should succeed because 2 >= 1
    // In mutant: should revert because 2 != 1
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify balance unchanged (mutant failed the transaction)
    const holderAfter = await bank.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(ethers.parseEther("2"));
  });
});