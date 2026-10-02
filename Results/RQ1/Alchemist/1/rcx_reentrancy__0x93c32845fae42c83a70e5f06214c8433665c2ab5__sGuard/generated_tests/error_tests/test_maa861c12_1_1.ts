import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - Kill mutant maa861c12 (balance >= MinSum changed to >)", function () {
  let instance: any;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
  });

  it("should allow collect when balance equals MinSum (1 ether) - kills mutant", async function () {
    const MinSum = ethers.parseEther("1");

    // User deposits exactly 1 ether (MinSum) via Put
    const putTx = await instance.connect(user).Put(0, { value: MinSum });
    await putTx.wait();

    // Verify balance equals MinSum
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(MinSum);

    // Wait for unlock time (Put with unlockTime=0 sets unlockTime to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect 1 ether - should succeed in original, fail in mutant
    const collectTx = instance.connect(user).Collect(MinSum);

    // The original contract would allow this, mutant would revert because balance > MinSum is false
    await expect(collectTx).to.not.be.reverted;

    // Verify balance decreased
    const holderAfter = await instance.Acc(user.address);
    expect(holderAfter.balance).to.equal(0);
  });
});