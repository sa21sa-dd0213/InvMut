import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m5998c066 - block.prevrandao vs block.timestamp", function () {
  it("should kill the mutant by proving the condition uses block.prevrandao instead of block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Set MinSum to 0 to simplify test (bypass minimum balance requirement)
    await instance.setMinSum(0);

    // Deposit 1 ether with an unlock time far in the future
    const futureTime = Math.floor(Date.now() / 1000) + 1000000;
    const depositTx = await instance.connect(addr1).Put(futureTime, { value: ethers.parseEther("1") });
    await depositTx.wait();

    // Wait until unlockTime passes
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now block.timestamp > unlockTime, so original should succeed
    const collectTx = await instance.connect(addr1).Collect(ethers.parseEther("0.5"));
    await collectTx.wait();

    // After successful collect, balance should be reduced
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("0.5"));

    // Now test the mutant: deploy a fresh instance and do the same
    const instance2 = await Factory.deploy(await log.getAddress());
    await instance2.waitForDeployment();
    await instance2.setMinSum(0);

    const depositTx2 = await instance2.connect(addr1).Put(futureTime, { value: ethers.parseEther("1") });
    await depositTx2.wait();

    // Set block.prevrandao to a value less than unlockTime to simulate mutant failure
    await ethers.provider.send("hardhat_setPrevRandao", ["0x" + (futureTime - 100).toString(16)]);

    // Now collect should fail in the mutant (because block.prevrandao < unlockTime)
    // In original, block.timestamp is still > unlockTime so it would succeed
    await expect(
      instance2.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;

    // This proves the mutant is killed because the original would succeed here.
  });
});