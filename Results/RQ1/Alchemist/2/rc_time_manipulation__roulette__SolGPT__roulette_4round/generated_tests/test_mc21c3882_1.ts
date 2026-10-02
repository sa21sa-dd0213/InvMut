import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant mc21c3882 - block.timestamp >= pastBlockTime", function () {
  it("should revert on second call in same block with original (>) but succeed with mutant (>=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Send first transaction with exactly 10 ether
    const tx1 = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to ensure we're not at the same timestamp as deployment
    await ethers.provider.send("evm_mine", []);

    // Send second transaction in the same block by using a custom block mining
    // First, get the current block number and prepare both transactions
    const blockBefore = await ethers.provider.getBlock("latest");
    const targetBlockNumber = blockBefore.number + 1;

    // Send first tx for target block
    const tx2 = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });

    // Send second tx for same block (both will be included in the next mined block)
    const tx3 = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });

    // Mine a single block to include both transactions
    await ethers.provider.send("evm_mine", []);

    // The second transaction (tx3) should revert in the original (>) but succeed in mutant (>=)
    // We check tx3 receipt status: 0 = revert, 1 = success
    const receipt3 = await ethers.provider.getTransactionReceipt(tx3.hash);
    
    // For the mutant (>=), the second call should succeed (status 1)
    // For the original (>), it would revert (status 0)
    // This test will fail on original (as expected for mutation testing) and pass on mutant
    expect(receipt3.status).to.equal(1);
  });
});