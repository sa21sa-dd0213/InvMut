import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m0972b875 - Deposit condition changed to false", function () {
  it("should revert when depositing 1 ether because condition is always false", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy PrivateBank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await privateBank.waitForDeployment();

    // Attempt to deposit 1 ether (which meets MinDeposit requirement in original)
    const depositAmount = ethers.parseEther("1");

    // The mutant changes msg.value >= MinDeposit to false, so the deposit should never execute
    // We expect the balance to remain 0 after attempting to deposit
    await owner.sendTransaction({
      to: await privateBank.getAddress(),
      value: depositAmount
    });

    // Check that balance was NOT updated (since condition is always false)
    const balance = await privateBank.balances(owner.address);
    expect(balance).to.equal(0);
  });
});