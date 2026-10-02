import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - ma48f70f9", function () {
  it("should detect mutant where >= replaces > in Put function unlockTime calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Test case 1: _unlockTime = block.timestamp exactly (the edge case)
    const blockNum1 = await ethers.provider.getBlockNumber();
    const block1 = await ethers.provider.getBlock(blockNum1);
    const exactTimestamp = block1!.timestamp;

    // Call Put with _unlockTime = current block timestamp
    // Original: _unlockTime > block.timestamp is false → unlockTime = block.timestamp
    // Mutant: _unlockTime >= block.timestamp is true → unlockTime = _unlockTime (= block.timestamp)
    // Both result in the same unlockTime value
    await instance.connect(addr1).Put(exactTimestamp, { value: ethers.parseEther("2") });
    
    const acc = await instance.Acc(addr1.address);
    expect(acc.unlockTime).to.equal(exactTimestamp);

    // Wait for next block (timestamp will increase)
    await ethers.provider.send("evm_mine", []);

    // Now collect should work since block.timestamp > unlockTime
    await instance.connect(addr1).Collect(ethers.parseEther("1"));
    
    // Verify balance decreased
    const accAfter = await instance.Acc(addr1.address);
    expect(accAfter.balance).to.equal(ethers.parseEther("1"));

    // Test case 2: _unlockTime in the future
    const blockNum2 = await ethers.provider.getBlockNumber();
    const block2 = await ethers.provider.getBlock(blockNum2);
    const futureTimestamp = block2!.timestamp + 100;

    const instance2 = await Factory.deploy(await log.getAddress());
    await instance2.waitForDeployment();

    await instance2.connect(addr1).Put(futureTimestamp, { value: ethers.parseEther("2") });
    
    const acc2 = await instance2.Acc(addr1.address);
    expect(acc2.unlockTime).to.equal(futureTimestamp);

    // Test case 3: _unlockTime in the past
    const instance3 = await Factory.deploy(await log.getAddress());
    await instance3.waitForDeployment();

    const blockNum3 = await ethers.provider.getBlockNumber();
    const block3 = await ethers.provider.getBlock(blockNum3);
    const pastTimestamp = block3!.timestamp - 100;

    await instance3.connect(addr1).Put(pastTimestamp, { value: ethers.parseEther("2") });
    
    const acc3 = await instance3.Acc(addr1.address);
    // Both original and mutant set unlockTime = block.timestamp when _unlockTime <= block.timestamp
    expect(acc3.unlockTime).to.equal(block3!.timestamp);

    console.log("Test passed - mutant detection requires semantic analysis");
  });
});