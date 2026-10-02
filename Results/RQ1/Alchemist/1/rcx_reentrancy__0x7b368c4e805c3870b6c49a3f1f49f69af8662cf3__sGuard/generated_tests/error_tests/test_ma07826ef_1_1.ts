import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant ma07826ef test", function () {
  it("should detect mutant by testing Collect after Put with past unlockTime", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (needed as constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Fund the user with some ether
    await owner.sendTransaction({
      to: await user.getAddress(),
      value: ethers.parseEther("10")
    });

    // User calls Put with unlockTime = 0 (past timestamp)
    const putTx = await instance.connect(user).Put(0, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Check user's balance and unlockTime
    const holder = await instance.Acc(await user.getAddress());
    expect(holder.balance).to.equal(ethers.parseEther("2"));

    // Attempt Collect - on original should succeed (unlockTime = block.timestamp, which is now in past)
    // On mutant, unlockTime = block.prevrandao (random), so Collect should fail
    const collectTx = instance.connect(user).Collect(ethers.parseEther("1"));

    // In original: transaction succeeds, balance decreases
    // In mutant: transaction reverts because block.timestamp <= unlockTime (prevrandao)
    await expect(collectTx).to.be.reverted;
  });
});