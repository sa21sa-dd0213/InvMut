import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m5fb5e187 test", function () {
  it("should detect the * vs + mutation in unlockTime calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: set MinSum to 0 and initialize the contract
    await instance.SetMinSum(0);
    await instance.SetLogFile(await ethers.Wallet.createRandom().getAddress()); // dummy address, not used in test
    await instance.Initialized();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;

    // Put with _lockTime = 1 second
    const tx = await instance.connect(addr1).Put(1, { value: ethers.parseEther("1") });
    await tx.wait();

    // Check the stored unlockTime
    const holder = await instance.Acc(addr1.address);
    
    // Original: unlockTime = block.timestamp + 1
    // Mutant: unlockTime = block.timestamp * 1 = block.timestamp
    // So if mutant is deployed, unlockTime will equal block.timestamp (since *1)
    // If original, unlockTime will be block.timestamp + 1
    const expectedOriginal = currentTime + 1;
    const expectedMutant = currentTime; // because timestamp * 1 = timestamp

    // The test will fail on mutant because unlockTime will be currentTime instead of currentTime+1
    expect(holder.unlockTime).to.equal(expectedOriginal);
    
    // Additionally, verify Collect behavior: at currentTime, mutant allows collect (since unlockTime = currentTime)
    // but original should revert (since unlockTime = currentTime + 1 > currentTime)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});