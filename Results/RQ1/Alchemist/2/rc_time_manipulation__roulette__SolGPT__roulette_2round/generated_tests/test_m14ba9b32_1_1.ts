import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test m14ba9b32", function () {
  it("should detect mutant by verifying payout on block number multiple of 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance for payout
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate how many blocks to mine
    // to reach a block where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;

    // Mine blocks to reach the target block
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at a block where block.number % 15 == 0
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // Get balance before transaction
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // addr1 sends exactly 10 ether to trigger the payout
    const tx = await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balance after transaction
    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // In the original contract, the payout should have transferred the full contract balance
    // (which was 10 ether from owner + 10 ether from addr1 = 20 ether)
    // In the mutant, no payout occurs, so balance increase would only be ~0 (minus gas)
    // We expect addr1 to have gained approximately 20 ether (minus gas costs)
    const balanceIncrease = balanceAfter - balanceBefore;

    // The increase should be roughly 20 ether (the contract balance)
    // Mutant would show increase of only ~0 (actually negative due to gas)
    expect(balanceIncrease).to.be.gt(ethers.parseEther("15"));
  });
});