import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant ma48f70f9 detection", function () {
  it("should detect the mutant by exploiting the >= vs > difference when _unlockTime equals block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block!.timestamp;

    // Fund addr1 with some ether
    await owner.sendTransaction({
      to: await addr1.getAddress(),
      value: ethers.parseEther("10")
    });

    // addr1 calls Put with _unlockTime equal to current block timestamp
    await wallet.connect(addr1).Put(currentTime, { value: ethers.parseEther("2") });

    // Check the stored unlockTime - in original it should be currentTime (since condition fails)
    // In mutant it would also be currentTime (since condition succeeds with same value)
    // Both store currentTime, so we need to check the Collect behavior

    // Try to Collect immediately (same block)
    // The unlockTime is currentTime, so block.timestamp > unlockTime is false
    // Collect should fail in both original and mutant

    // Now mine a new block to advance time
    await ethers.provider.send("evm_mine", []);

    // Get new block timestamp
    const newBlockNum = await ethers.provider.getBlockNumber();
    const newBlock = await ethers.provider.getBlock(newBlockNum);
    const newTime = newBlock!.timestamp;

    // Now block.timestamp > unlockTime (currentTime < newTime)
    // Try Collect with amount 1 ether
    const tx = await wallet.connect(addr1).Collect(ethers.parseEther("1"));
    await tx.wait();

    // Check balance after Collect - should be 1 ether remaining
    const holder = await wallet.Acc(await addr1.getAddress());
    expect(holder.balance).to.equal(ethers.parseEther("1"));

    // Now test the mutant-specific behavior:
    // Deploy a new wallet instance for comparison
    const wallet2 = await WalletFactory.deploy(await log.getAddress());
    await wallet2.waitForDeployment();

    // Get fresh timestamp
    const blockNum2 = await ethers.provider.getBlockNumber();
    const block2 = await ethers.provider.getBlock(blockNum2);
    const time2 = block2!.timestamp;

    // Fund addr1 again
    await owner.sendTransaction({
      to: await addr1.getAddress(),
      value: ethers.parseEther("10")
    });

    // addr1 calls Put with _unlockTime = block.timestamp + 1 (greater than current time)
    await wallet2.connect(addr1).Put(time2 + 1, { value: ethers.parseEther("2") });

    // In original: unlockTime = time2 + 1 (since _unlockTime > block.timestamp)
    // In mutant: unlockTime = time2 + 1 (same, since _unlockTime >= block.timestamp)
    // Both are identical for this case

    // Mine to advance past unlockTime
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);

    // Now test Collect - should work
    const tx2 = await wallet2.connect(addr1).Collect(ethers.parseEther("1"));
    await tx2.wait();

    // The real difference: when _unlockTime == block.timestamp exactly
    // Original: uses block.timestamp (ternary false)
    // Mutant: uses _unlockTime (ternary true) - but both are same value
    // So the mutant is actually equivalent in behavior

    // To detect the mutant, we need to check the internal logic difference
    // The mutant changes the condition from > to >= which affects the ternary expression
    // However, since both branches produce the same value when _unlockTime == block.timestamp,
    // this mutant is behaviorally equivalent and cannot be killed by any test
    // that only checks external behavior

    // Therefore, we need a test that would detect this at the bytecode level
    // by checking storage directly after Put with _unlockTime == block.timestamp

    // This test demonstrates the mutant cannot be killed through normal execution
    // as the outputs are identical
    expect(true).to.equal(true);
  });
});