import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank - Kill mutant m9393f7fe (CashOut <= replaced with >=)", function () {
  it("should revert when withdrawing more than balance on original, but mutant would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor arg for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Fund addr1 with some ether for gas and deposit
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("10")
    });

    // Deposit 2 ether (above MinDeposit of 1 ether)
    await bank.connect(addr1).Deposit({ value: ethers.parseEther("2") });

    // Verify balance is 2 ether
    expect(await bank.balances(addr1.address)).to.equal(ethers.parseEther("2"));

    // Attempt to withdraw 3 ether (more than balance)
    // Original contract: should revert because 3 > 2
    // Mutant: would succeed because condition is _am >= balances (3 >= 2 is true)
    await expect(
      bank.connect(addr1).CashOut(ethers.parseEther("3"))
    ).to.be.reverted;

    // Verify balance unchanged after failed withdrawal
    expect(await bank.balances(addr1.address)).to.equal(ethers.parseEther("2"));
  });
});