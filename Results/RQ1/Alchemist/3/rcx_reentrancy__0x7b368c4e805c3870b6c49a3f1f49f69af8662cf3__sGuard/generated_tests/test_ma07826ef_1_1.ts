import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - ma07826ef", function () {
  it("should detect mutant by using past unlockTime to expose block.prevrandao vs block.timestamp difference", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // User puts 1 ether with _unlockTime set to 0 (in the past)
    const putTx = await instance.connect(user).Put(0, { value: ethers.parseEther("1") });
    await putTx.wait();

    // Get the user's unlockTime after Put
    const holder = await instance.Acc(user.address);
    const unlockTime = holder.unlockTime;

    // Get block.prevrandao value (accessible via block.difficulty in pre-Merge contexts,
    // but in post-Merge it's prevrandao; we use it to verify the mutant's behavior)
    const blockAfterPut = await ethers.provider.getBlock("latest");

    // On the original contract, unlockTime would equal block.timestamp (since _unlockTime=0 < block.timestamp)
    // On the mutant, unlockTime would equal block.prevrandao instead

    // To kill the mutant: Call Collect after ensuring enough time has passed
    // Wait for next block to ensure block.timestamp > unlockTime in original
    await ethers.provider.send("evm_mine", []);

    // Now try to collect 0.5 ether - should succeed on original, fail on mutant
    // because block.prevrandao is typically a very large number (> block.timestamp)
    const collectTx = instance.connect(user).Collect(ethers.parseEther("0.5"));

    // In the original contract this would succeed (unlockTime = block.timestamp < new block.timestamp)
    // In the mutant, block.prevrandao >> block.timestamp, so it will revert
    await expect(collectTx).to.be.reverted;
  });
});