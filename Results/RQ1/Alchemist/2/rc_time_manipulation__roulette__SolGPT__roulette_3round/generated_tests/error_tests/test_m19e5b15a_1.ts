import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m19e5b15a test", function () {
  it("should detect mutant by testing payout in block multiple of 15", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance (optional, for clarity)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Send exactly 10 ether from player in a block where block.number is multiple of 15
    // We need to mine blocks to reach the right block number
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));
    
    // Mine blocks until we reach a multiple of 15
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Get balance before transaction
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    // Player sends 10 ether via fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Verify the block number is indeed a multiple of 15
    const blockAfterTx = await ethers.provider.getBlockNumber();
    expect(blockAfterTx % 15).to.equal(0);
    
    // Check that player received the payout (contract balance transferred)
    // In original: balance should transfer, in mutant: should not transfer
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    
    // The player should have received more than they sent (including the 1 ether from owner)
    // If mutant is present, player only loses 10 ether (no payout)
    // Original: player gets ~11 ether back (contract balance)
    // Mutant: player gets nothing back (balance decreases by ~10 ether)
    expect(playerBalanceAfter).to.be.gt(playerBalanceBefore.sub(ethers.parseEther("9.5")));
  });
});