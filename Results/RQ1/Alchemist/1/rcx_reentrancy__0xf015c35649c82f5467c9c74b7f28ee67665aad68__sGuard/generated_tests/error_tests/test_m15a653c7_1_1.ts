import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m15a653c7", function () {
  it("should detect mutant that adds 1 wei to msg.value in Put", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future

    // User deposits exactly 1 ether
    const tx = await bank.connect(user).Put(unlockTime, { value: depositAmount });
    await tx.wait();

    // Check balance stored in contract
    const holder = await bank.Acc(user.address);
    const expectedBalance = depositAmount; // Should be exactly 1 ether in original
    const mutantBalance = depositAmount + 1n; // Mutant adds 1 wei

    // Verify the balance is as expected (should be depositAmount, not depositAmount + 1)
    expect(holder.balance).to.equal(expectedBalance);

    // Now try to collect the exact amount deposited
    // This should succeed in original but fail in mutant due to balance mismatch
    await ethers.provider.send("evm_increaseTime", [3601]); // Advance past unlock time
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect the full deposit amount
    const collectTx = bank.connect(user).Collect(depositAmount);

    // In original: should succeed (balance = 1 ether, withdraw 1 ether)
    // In mutant: will fail because actual contract balance is 1 ether but user balance is 1 ether + 1 wei
    // The call will revert due to insufficient contract balance when trying to send the extra wei
    await expect(collectTx).to.be.reverted;
  });
});