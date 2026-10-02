import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - CashOut revert removal", function () {
  it("should revert when CashOut external call fails due to recipient contract rejecting ether", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a contract that rejects ether (no receive/fallback function)
    const rejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await rejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the bank contract with ether for the test
    await owner.sendTransaction({
      to: await bank.getAddress(),
      value: ethers.parseEther("10")
    });

    // Deposit ether to addr1's balance from the bank's funds
    // First, send ether to addr1 so they can deposit
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("2")
    });

    // addr1 deposits 1 ether (meets MinDeposit of 1 ether)
    await bank.connect(addr1).Deposit({ value: ethers.parseEther("1") });

    // Now addr1 tries to cash out to the rejecting contract
    // The call should fail because Rejector cannot receive ether
    await expect(
      bank.connect(addr1).CashOut(ethers.parseEther("1"))
    ).to.be.reverted;

    // Additionally verify that the balance was NOT deducted (mutant would deduct)
    const balanceAfter = await bank.balances(addr1.address);
    expect(balanceAfter).to.equal(ethers.parseEther("1"));
  });
});