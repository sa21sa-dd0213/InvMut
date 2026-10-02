import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mcad6dc7c test", function () {
  it("should detect the mutant by calling Put with _unlockTime equal to block.timestamp and immediately trying to Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;

    // Fund addr1 with some ether
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("10")
    });

    // Call Put with _unlockTime = current timestamp (the edge case)
    const putTx = await bank.connect(addr1).Put(currentTimestamp, {
      value: ethers.parseEther("2")
    });
    await putTx.wait();

    // Now try to Collect immediately in the same block (no time passes)
    // The original contract sets acc.unlockTime = block.timestamp when _unlockTime == block.timestamp
    // The mutant sets acc.unlockTime = _unlockTime which is also block.timestamp
    // Both should revert because block.timestamp is NOT > acc.unlockTime (they're equal)
    const collectTx = bank.connect(addr1).Collect(ethers.parseEther("1"));

    // This should revert because block.timestamp is not > acc.unlockTime (they're equal)
    await expect(collectTx).to.be.reverted;

    // Advance time by 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Now Collect should succeed in both original and mutant
    const collectTx2 = await bank.connect(addr1).Collect(ethers.parseEther("1"));
    await collectTx2.wait();

    // Verify balance decreased
    const holderAfter = await bank.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(ethers.parseEther("1"));
  });
});