import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - mb956662c", function () {
  it("should detect mutant that replaces Collect condition with false", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Initial deposit: send 2 ether with unlock time = current block timestamp + 1 hour
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600;

    // User deposits funds
    await bank.connect(user).Put(unlockTime, { value: depositAmount });

    // Verify initial balance
    let holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(depositAmount);

    // Wait until after unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");

    // Get user balance before Collect
    const userBalanceBefore = await ethers.provider.getBalance(await user.getAddress());
    const contractBalanceBefore = await ethers.provider.getBalance(bankAddress);

    // Attempt to collect 1 ether (less than balance, and >= MinSum of 1 ether)
    const collectAmount = ethers.parseEther("1");
    const tx = await bank.connect(user).Collect(collectAmount);
    const receipt = await tx.wait();

    // Check user balance increased (original contract would send ether)
    const userBalanceAfter = await ethers.provider.getBalance(await user.getAddress());
    const contractBalanceAfter = await ethers.provider.getBalance(bankAddress);

    // In original: user receives ether, contract balance decreases
    // In mutant (condition false): no transfer happens, balances unchanged
    // Therefore we expect the balance to have changed (which will fail on mutant)
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);
    expect(contractBalanceAfter).to.be.lt(contractBalanceBefore);

    // Also verify the holder's balance was reduced in the original
    holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(depositAmount - collectAmount);
  });
});