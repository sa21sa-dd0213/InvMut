import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m4f583c86", function () {
  it("should revert when withdrawing exact balance on mutant (uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Fund addr1 with some ether and deposit it into the wallet
    const depositAmount = ethers.parseEther("2");
    const txPut = await instance.connect(addr1).Put(0, { value: depositAmount });
    await txPut.wait();

    // Verify balance was deposited (MinSum = 1 ether, so 2 ether is sufficient)
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Wait for the unlock time to pass (block.timestamp was set at deposit time)
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = holder.unlockTime;
    if (currentBlock!.timestamp <= unlockTime) {
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(unlockTime) + 1]);
      await ethers.provider.send("evm_mine", []);
    }

    // Attempt to withdraw the EXACT full balance (this should pass on original, fail on mutant)
    const withdrawAmount = depositAmount; // Withdraw exact balance
    await expect(
      instance.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted; // Mutant will revert because acc.balance > _am is false when equal
  });
});