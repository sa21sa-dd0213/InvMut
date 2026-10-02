import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m15a653c7 test", function () {
  it("should detect mutant that adds 1 extra wei to balance on Put", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // User sends exactly 1 ether to Put
    const depositAmount = ethers.parseEther("1");
    const tx = await bank.connect(user).Put(0, { value: depositAmount });
    await tx.wait();

    // Check recorded balance - should be depositAmount in original, but depositAmount+1 in mutant
    const holder = await bank.Acc(user.address);

    // Attempt to withdraw exactly the deposited amount
    const withdrawTx = bank.connect(user).Collect(depositAmount);

    // In the original, this would succeed (balance >= depositAmount)
    // In the mutant, balance = depositAmount + 1, so withdrawal also succeeds
    await expect(withdrawTx).to.not.be.reverted;
    await (await withdrawTx).wait();

    // Check contract's ETH balance after all operations
    // Original: user deposited 1 ETH, withdrew 1 ETH → contract balance = 0
    // Mutant: user deposited 1 ETH, balance recorded as 1 ETH + 1 wei, withdrew 1 ETH → contract balance = 1 wei leftover
    const contractBalance = await ethers.provider.getBalance(bankAddress);

    // The mutant leaves 1 wei in the contract, while original leaves 0
    expect(contractBalance).to.equal(0);
  });
});