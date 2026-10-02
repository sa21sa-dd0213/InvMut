import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant detection - me003e634", function () {
  it("should detect the mutant that changes >= to > in Collect condition", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const unlockTime = currentTimestamp + 100; // Future unlock time
    
    // User puts exactly MinSum (1 ether) into the contract
    const putTx = await bank.connect(user).Put(unlockTime, { value: MinSum });
    await putTx.wait();
    
    // Advance time past unlockTime
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);
    
    // Now try to collect exactly MinSum (balance == MinSum)
    // Original contract: should succeed (>=)
    // Mutant: should fail (requires >)
    const collectTx = bank.connect(user).Collect(MinSum);
    
    // If mutant is present, this transaction will revert
    // If original, it will succeed
    // We expect the original behavior (success), so any revert indicates mutant
    await expect(collectTx).to.not.be.reverted;
    
    // Additional check: balance should be reduced in original
    const userBalance = await bank.Acc(user.address);
    expect(userBalance.balance).to.equal(0);
  });
});